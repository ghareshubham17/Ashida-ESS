import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../_contexts/AuthContext';
import { useFrappeService } from '../_services/frappeService';
import AttendanceCalendar from '../components/AttendanceCalendar';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const frappeService = useFrappeService();

  // State management
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [todayCheckins, setTodayCheckins] = useState([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [showCheckButton, setShowCheckButton] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Quick Actions Configuration
  const quickActions = [
    {
      id: 'reports',
      title: 'View Reports',
      icon: 'bar-chart',
      color: '#6366F1',
      onPress: () => router.push('/(screens)/ReportsScreen')
    },
    {
      id: 'leave',
      title: 'Apply Leave',
      icon: 'time',
      color: '#4CAF50',
      onPress: () => router.push('/(screens)/LeaveApplicationScreen')
    },
    {
      id: 'salary',
      title: 'Salary Slip',
      icon: 'receipt',
      color: '#2196F3',
      onPress: () => Alert.alert('Salary Slip', 'Navigate to salary slip')
    },
    {
      id: 'expense',
      title: 'Expense Claim',
      icon: 'card',
      color: '#FF9800',
      onPress: () => Alert.alert('Expense Claim', 'Navigate to expense claim')
    },
    {
      id: 'directory',
      title: 'Team Directory',
      icon: 'people',
      color: '#9C27B0',
      onPress: () => Alert.alert('Team Directory', 'Navigate to team directory')
    },
    {
      id: 'holidays',
      title: 'Holidays',
      icon: 'calendar',
      color: '#FF5722',
      onPress: () => router.push('/(screens)/HolidaysScreen')
    }
  ];

  // Calendar related state
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Utility functions
  const formatTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const getTodayDateRange = useCallback(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    return {
      startTime: `${yyyy}-${mm}-${dd} 00:00:00`,
      endTime: `${yyyy}-${mm}-${dd} 23:59:59`,
    };
  }, []);

  const formatTime = (timeString) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else if (hour >= 17 && hour < 21) {
      return 'Good Evening';
    } else {
      return 'Good Night';
    }
  };

  // Get dynamic icon based on time of day
  const getGreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { name: 'sunny', color: '#FF9800' }; // Morning - orange sun
    } else if (hour >= 12 && hour < 17) {
      return { name: 'sunny-outline', color: '#FFC107' }; // Afternoon - bright sun
    } else if (hour >= 17 && hour < 21) {
      return { name: 'partly-sunny', color: '#FF6F00' }; // Evening - sunset
    } else {
      return { name: 'moon', color: '#7B1FA2' }; // Night - moon
    }
  };

  // Core functions
  const checkTodayCheckinStatus = useCallback(async (employeeName) => {
    try {
      const { startTime, endTime } = getTodayDateRange();

      const checkins = await frappeService.getList('Employee Checkin', {
        fields: ['name', 'employee', 'time', 'log_type', 'creation'],
        filters: {
          employee: employeeName,
          creation: ['between', [startTime, endTime]]
        },
        order_by: 'creation asc'
      });

      console.log('Today checkins:', checkins);
      setTodayCheckins(checkins || []);

      if (checkins && checkins.length > 0) {
        const inLog = checkins.find(entry => entry.log_type === 'IN');
        const outLog = checkins.find(entry => entry.log_type === 'OUT');

        if (inLog && outLog) {
          setShowCheckButton(false);
          setCheckInTime('');
          setIsCheckedIn(false);
        } else if (inLog) {
          setShowCheckButton(true);

          // Try to get time from the inLog (time field or creation field)
          let checkinTime = inLog.time || inLog.creation;

          // If still missing, fetch the full document
          if (!checkinTime) {
            console.log('Time field missing in list response, fetching full document:', inLog.name);
            try {
              const fullDoc = await frappeService.getDoc('Employee Checkin', inLog.name);
              console.log('Full checkin document:', fullDoc);
              // Try time field first, fall back to creation
              checkinTime = fullDoc.time || fullDoc.creation;
            } catch (fetchError) {
              console.error('Error fetching full checkin document:', fetchError);
            }
          }

          // Parse the time from Frappe (format can be "DD-MM-YYYY HH:MM:SS" or "YYYY-MM-DD HH:MM:SS")
          try {
            console.log('Raw check-in time from DB:', checkinTime);

            if (!checkinTime) {
              console.warn('Check-in record has no time field');
              setCheckInTime('--:--');
              setIsCheckedIn(true);
              return;
            }

            const timeStr = String(checkinTime);

            // Check if format is "DD-MM-YYYY HH:MM:SS" or "YYYY-MM-DD HH:MM:SS"
            let parsedDate;

            if (timeStr.includes(' ')) {
              // Split date and time parts
              const [datePart, timePart] = timeStr.split(' ');

              if (datePart.includes('-')) {
                const parts = datePart.split('-');

                // Check if it's DD-MM-YYYY or YYYY-MM-DD format
                if (parts[0].length === 4) {
                  // YYYY-MM-DD format
                  parsedDate = new Date(timeStr.replace(' ', 'T'));
                } else {
                  // DD-MM-YYYY format - convert to YYYY-MM-DD
                  const [day, month, year] = parts;
                  parsedDate = new Date(`${year}-${month}-${day}T${timePart}`);
                }
              }
            } else {
              // Try direct parsing
              parsedDate = new Date(timeStr);
            }

            // Check if date is valid
            if (!parsedDate || isNaN(parsedDate.getTime())) {
              throw new Error('Invalid date');
            }

            const formattedTime = parsedDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });

            console.log('Formatted check-in time:', formattedTime);
            setCheckInTime(formattedTime);
          } catch (error) {
            console.error('Error parsing check-in time:', error, checkinTime);
            // Fallback: extract just the time portion and manually format
            try {
              const timeStr = String(checkinTime);
              const timePart = timeStr.split(' ')[1]; // Get "HH:MM:SS" part
              if (timePart) {
                const [hours, minutes] = timePart.split(':');
                const hour = parseInt(hours);
                const minute = parseInt(minutes);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 || 12;
                const formattedTime = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;
                console.log('Fallback formatted time:', formattedTime);
                setCheckInTime(formattedTime);
              } else {
                setCheckInTime('--:--');
              }
            } catch (fallbackError) {
              console.error('Fallback parsing also failed:', fallbackError);
              setCheckInTime('--:--');
            }
          }

          setIsCheckedIn(true);
        } else {
          setShowCheckButton(true);
          setCheckInTime('');
          setIsCheckedIn(false);
        }
      } else {
        setShowCheckButton(true);
        setCheckInTime('');
        setIsCheckedIn(false);
      }
    } catch (error) {
      console.error('Error checking today checkin status:', error);
      throw error;
    }
  }, [getTodayDateRange, frappeService]);

  const checkEmployeeExist = useCallback(async () => {
    if (!user?.email) {
      setShowCheckButton(false);
      setCurrentEmployee(null);
      return;
    }

    try {
      console.log('Checking employee for user:', user.email);

      const employees = await frappeService.getList('Employee', {
        fields: ['name', 'employee_name', 'user_id', 'status'],
        filters: { user_id: user.email },
        limit: 1
      });

      if (employees && employees.length > 0) {
        const employeeData = employees[0];
        console.log('Found employee:', employeeData);
        setCurrentEmployee(employeeData);
        await checkTodayCheckinStatus(employeeData.name);
      } else {
        console.log('No employee found for user:', user.email);
        setShowCheckButton(false);
        setCurrentEmployee(null);
        setIsCheckedIn(false);
        setCheckInTime('');
      }
    } catch (error) {
      console.error('Error checking employee:', error);
      if (!refreshing) {
        Alert.alert('Error', 'Failed to check employee status: ' + error.message);
      }
      setShowCheckButton(false);
      setCurrentEmployee(null);
    }
  }, [user?.email, frappeService, checkTodayCheckinStatus, refreshing]);

  const handleEmployeeCheckIn = useCallback(async () => {
    if (!currentEmployee) {
      Alert.alert('Error', 'Employee information not found. Please try refreshing.');
      return;
    }

    setCheckInLoading(true);
    try {
      const logType = isCheckedIn ? 'OUT' : 'IN';
      const timestamp = formatTimestamp();

      // Get location data and format for device_id field
      let locationString = null;
      let hasLocation = false;

      // Capture fresh GPS location for both CHECK-IN and CHECK-OUT
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
          // Get current position
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          const latitude = location.coords.latitude;
          const longitude = location.coords.longitude;

          console.log(`Location captured for ${isCheckedIn ? 'check-out' : 'check-in'}:`, { lat: latitude, lng: longitude });

          // Build location string starting with coordinates
          let locationParts = [`${latitude}, ${longitude}`];

          // Try to get address from coordinates (reverse geocoding)
          try {
            const [address] = await Location.reverseGeocodeAsync({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });

            if (address) {
              // Build address components
              const addressComponents = [];

              if (address.name) addressComponents.push(address.name);
              if (address.street) {
                const street = address.streetNumber
                  ? `${address.streetNumber} ${address.street}`
                  : address.street;
                addressComponents.push(street);
              }
              if (address.district) addressComponents.push(address.district);
              if (address.city) addressComponents.push(address.city);
              if (address.postalCode) addressComponents.push(address.postalCode);
              if (address.country) addressComponents.push(address.country);

              const fullAddress = addressComponents.join(', ');
              if (fullAddress) {
                locationParts.push(fullAddress);
              }

              console.log('Address resolved:', fullAddress);
            }
          } catch (geocodeError) {
            console.warn('Could not get address from coordinates:', geocodeError);
            // Continue with just coordinates
          }

          // Combine coordinates and address into single string
          locationString = locationParts.join(' | ');
          hasLocation = true;

          console.log(`${isCheckedIn ? 'Check-out' : 'Check-in'} location:`, locationString);
        } else {
          console.warn('Location permission denied');
          Alert.alert(
            'Location Permission',
            'Location permission is required for attendance tracking. ' +
            (isCheckedIn ? 'Check-out' : 'Check-in') + ' will continue without location.',
            [{ text: 'OK' }]
          );
        }
      } catch (locationError) {
        console.error('Error getting location:', locationError);
        // Continue with check-in/out even if location fails
      }

      console.log('Creating checkin record:', {
        employee: currentEmployee.name,
        time: timestamp,
        log_type: logType,
        device_id: locationString
      });

      const result = await frappeService.createDoc('Employee Checkin', {
        employee: currentEmployee.name,
        time: timestamp,
        log_type: logType,
        device_id: locationString, // Store location in device_id field
      });

      console.log('Checkin result:', result);

      if (result) {
        if (!isCheckedIn) {
          setIsCheckedIn(true);
          // Use the timestamp to set check-in time
          const time = new Date(timestamp);
          const formattedTime = time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          setCheckInTime(formattedTime);
          console.log('Check-in time set to:', formattedTime);

          let successMessage = `Successfully checked in at ${formatTime(result.creation || timestamp)}`;
          if (hasLocation) {
            successMessage += `\n📍 Location captured`;
          }

          Alert.alert('Success', successMessage);
        } else {
          setShowCheckButton(false);
          setCheckInTime('');
          setIsCheckedIn(false);

          let successMessage = 'Successfully checked out. Have a great day!';
          if (hasLocation) {
            successMessage += '\n📍 Location captured';
          }

          Alert.alert('Success', successMessage);
        }

        await checkTodayCheckinStatus(currentEmployee.name);
      }
    } catch (error) {
      console.error('Checkin error:', error);
      Alert.alert('Error', `Failed to ${isCheckedIn ? 'check out' : 'check in'}: ${error.message}`);
    } finally {
      setCheckInLoading(false);
    }
  }, [currentEmployee, isCheckedIn, frappeService, checkTodayCheckinStatus, formatTimestamp]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await checkEmployeeExist();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [checkEmployeeExist]);

  // Effects
  useEffect(() => {
    let isMounted = true;

    const initializeEmployee = async () => {
      if (isMounted && user?.email) {
        await checkEmployeeExist();
      }
    };

    initializeEmployee();

    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  // Render functions
  const renderCheckinStatus = () => {
    if (!currentEmployee) {
      return (
        <View style={styles.statusContainer}>
          <View style={styles.statusIconContainer}>
            <Ionicons name="alert-circle" size={32} color="#F44336" />
          </View>
          <Text style={styles.statusText}>Employee Not Found</Text>
          <Text style={styles.statusSubtext}>
            Please contact HR or try refreshing the page.
          </Text>
        </View>
      );
    }

    if (!showCheckButton) {
      return (
        <View style={styles.statusContainer}>
          <View style={styles.statusIconContainer}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
          </View>
          <Text style={styles.statusText}>Work Day Complete!</Text>
          <Text style={styles.statusSubtext}>
            You've successfully completed your work day. Have a great evening!
          </Text>
        </View>
      );
    }

    const greeting = getGreeting();
    const greetingIcon = getGreetingIcon();

    return (
      <View style={styles.statusContainer}>
        {isCheckedIn ? (
          <>
            <View style={styles.statusIconContainer}>
              <Ionicons name="checkmark-done-circle" size={32} color="#4CAF50" />
            </View>
            <Text style={styles.statusText}>Already Checked In!</Text>
            <Text style={styles.statusSubtext}>
              You started your day at <Text style={styles.timeHighlight}>{checkInTime}</Text>
            </Text>
            <Text style={styles.statusReminder}>
              Don't forget to check out when you're done!
            </Text>
          </>
        ) : (
          <>
            <View style={styles.statusIconContainer}>
              <Ionicons name={greetingIcon.name} size={32} color={greetingIcon.color} />
            </View>
            <Text style={styles.statusText}>{greeting}!</Text>
            <Text style={styles.statusSubtext}>
              You haven't checked in today. Ready to start your day?
            </Text>
          </>
        )}
      </View>
    );
  };

  const renderQuickAction = (action) => (
    <TouchableOpacity
      key={action.id}
      style={styles.quickActionItem}
      onPress={action.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
        <Ionicons name={action.icon} size={24} color="#fff" />
      </View>
      <Text style={styles.quickActionText}>{action.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea', '#764ba2']}
            tintColor="#667eea"
            title="Pull to refresh"
            titleColor="#667eea"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.welcomeGradient}
          >
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.welcomeName}>
                {currentEmployee?.employee_name || user?.full_name || user?.name || 'User'}
              </Text>
              <Text style={styles.lastRefreshText}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </Text>
            </View>
          </LinearGradient>
        </View>

         {/* Welcome Card */}
        {/* <View style={styles.welcomeCard}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.welcomeGradient}
          >
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.welcomeName}>
                {currentEmployee?.employee_name || user?.full_name || user?.name || 'User'}
              </Text>
              <Text style={styles.lastRefreshText}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </Text>
            </View>
          </LinearGradient>
        </View> */}

        {/* Check-in/Check-out Card */}
        <View style={styles.checkinCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Attendance</Text>
            <Ionicons name="time" size={24} color="#667eea" />
          </View>

          {renderCheckinStatus()}

          {/* Check-in/Check-out Button */}
          {showCheckButton && (
            <TouchableOpacity
              onPress={handleEmployeeCheckIn}
              disabled={checkInLoading}
              style={[
                styles.checkinButton,
                checkInLoading && styles.checkinButtonDisabled
              ]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isCheckedIn ? ['#F44336', '#D32F2F'] : ['#4CAF50', '#388E3C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.checkinButtonGradient}
              >
                {checkInLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={isCheckedIn ? "log-out" : "log-in"}
                      size={20}
                      color="#fff"
                      style={styles.checkinIcon}
                    />
                    <Text style={styles.checkinButtonText}>
                      {isCheckedIn ? "Check-Out" : "Check-In"}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Calendar Button */}
        {currentEmployee && (
          <View style={styles.calendarCard}>
            <TouchableOpacity
              style={styles.calendarButton}
              onPress={() => {
                setCurrentMonth(new Date()); // Always reset to current month
                setShowCalendar(true);
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.calendarButtonGradient}
              >
                <Ionicons name="calendar" size={24} color="#fff" style={styles.calendarIcon} />
                <Text style={styles.calendarButtonText}>View Attendance Calendar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions Card */}
        {currentEmployee && (
          <View style={styles.quickActionsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Quick Actions</Text>
              <Ionicons name="apps" size={24} color="#667eea" />
            </View>
            <View style={styles.quickActionsGrid}>
              {quickActions.map(renderQuickAction)}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Calendar Modal */}
      <AttendanceCalendar
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        currentEmployee={currentEmployee}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 16,
  },
  welcomeCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  welcomeGradient: {
    padding: 24,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  lastRefreshText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  checkinCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
  },
  statusIconContainer: {
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  timeHighlight: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statusReminder: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  checkinButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkinButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  checkinButtonDisabled: {
    opacity: 0.6,
  },
  checkinIcon: {
    marginRight: 8,
  },
  checkinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  calendarButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  calendarIcon: {
    marginRight: 12,
  },
  calendarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  quickActionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quickActionItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 24,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default HomeScreen;
