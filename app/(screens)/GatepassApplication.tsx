import { Navbar } from '@/components';
import { COLORS } from '@/constants';
import { darkTheme, lightTheme } from '@/constants/TabTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useFrappeService } from '@/services/frappeService';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const PURPOSE_OPTIONS = ['Personal', 'Official'];

interface Employee {
  name: string;
  employee_name: string;
  user_id: string;
  attendance_device_id: string;
  department: string;
}

interface MonthlyUsage {
  total_hours_used: number;
  monthly_limit: number;
  remaining_hours: number;
  total_overall_hours: number;
}

interface GatepassApplication {
  employee: string;
  employee_name: string;
  department: string;
  attendance_device_id: string;
  date_of_application: string;
  gp_start_time: string;
  gp_end_time: string;
  purpose_of_gp: string;
  approval_status: string;
}

export default function GatepassApplicationScreen() {
  const frappeService = useFrappeService();
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  // Auto-filled fields (disabled)
  const [employee, setEmployee] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [department, setDepartment] = useState('');
  const [attendanceDeviceId, setAttendanceDeviceId] = useState('');
  const [approvalStatus] = useState('Pending'); // Always Pending for new applications

  // User-filled fields
  const [applicationDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(() => {
    const end = new Date();
    end.setHours(end.getHours() + 2);
    return end;
  });
  const [purpose, setPurpose] = useState<'Personal' | 'Official'>('Personal');

  // UI State
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPurposeDropdown, setShowPurposeDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);
  const [loadingUsage, setLoadingUsage] = useState(true);

  // Monthly usage state
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsage | null>(null);

  // Fetch employee details and monthly usage on mount
  useEffect(() => {
    const fetchEmployeeAndUsage = async () => {
      try {
        setIsLoadingEmployee(true);
        setLoadingUsage(true);

        if (user?.employee_id) {
          const empData = await frappeService.getDoc<any>('Employee', user.employee_id);

          setEmployee(empData.name || user.employee_id);
          setEmployeeName(empData.employee_name || user.employee_name || '');
          setDepartment(empData.department || '');
          setAttendanceDeviceId(empData.attendance_device_id || '');

          // Fetch monthly usage
          try {
            const usage = await frappeService.call<MonthlyUsage>(
              'ashida.ashida_gaxis.doctype.gate_pass_application.gate_pass_application.get_employee_monthly_usage',
              {
                employee: empData.name || user.employee_id,
                date: formatDateForAPI(new Date()),
              }
            );

            if (usage) {
              setMonthlyUsage({
                total_hours_used: usage.total_hours_used ?? 0,
                monthly_limit: usage.monthly_limit ?? 4.0,
                remaining_hours: usage.remaining_hours ?? 4.0,
                total_overall_hours: usage.total_overall_hours ?? 0,
              });
            }
          } catch (usageError) {
            console.error('Error fetching monthly usage:', usageError);
            // Set default values if API fails
            setMonthlyUsage({
              total_hours_used: 0,
              monthly_limit: 4.0,
              remaining_hours: 4.0,
              total_overall_hours: 0,
            });
          } finally {
            setLoadingUsage(false);
          }
        }
      } catch (error) {
        console.error('Error fetching employee details:', error);
        // Fallback to user data
        setEmployee(user?.employee_id || '');
        setEmployeeName(user?.employee_name || '');
        setAttendanceDeviceId(user?.device_id || '');
        setDepartment('');

        // Set default usage values
        setMonthlyUsage({
          total_hours_used: 0,
          monthly_limit: 4.0,
          remaining_hours: 4.0,
          total_overall_hours: 0,
        });
        setLoadingUsage(false);
      } finally {
        setIsLoadingEmployee(false);
      }
    };

    fetchEmployeeAndUsage();
  }, [user, frappeService]);

  // Format date to YYYY-MM-DD for API
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format time to HH:MM:SS for API
  const formatTimeForAPI = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}:00`;
  };

  // Format date for display (e.g., "Dec 10, 2025")
  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format time for display (e.g., "14:30")
  const formatTimeForDisplay = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!purpose) {
      Alert.alert('Validation Error', 'Please select a purpose');
      return false;
    }

    if (!monthlyUsage) {
      Alert.alert('Validation Error', 'Loading usage data...');
      return false;
    }

    // Validate start time is not in the past
    const now = new Date();
    const startDateTime = new Date(applicationDate);
    startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());

    if (startDateTime < now) {
      Alert.alert('Validation Error', 'GP Start Time cannot be in the past. Please select a future time.');
      return false;
    }

    // Check sufficient hours (2-hour gatepass)
    if (monthlyUsage.remaining_hours < 2.0) {
      Alert.alert(
        'Validation Error',
        `Insufficient hours. You have ${monthlyUsage.remaining_hours.toFixed(2)} hours remaining this month.`
      );
      return false;
    }

    return true;
  };

  // Handle start time change
  const onStartTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      // Validate that selected time is not in the past
      const now = new Date();
      const selectedDateTime = new Date(applicationDate);
      selectedDateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), selectedTime.getSeconds());

      if (selectedDateTime < now) {
        Alert.alert(
          'Invalid Time',
          'GP Start Time cannot be in the past. Please select a future time.',
          [{ text: 'OK' }]
        );
        return;
      }

      setStartTime(selectedTime);
      // Auto-calculate end time (start + 2 hours)
      const end = new Date(selectedTime);
      end.setHours(end.getHours() + 2);
      setEndTime(end);
    }
  };

  // Parse Frappe error and return user-friendly message
  const parseErrorMessage = (error: any): string => {
    // Only log debug info for non-validation errors
    const isTestAdmin = user?.employee_id === 'EMP-TEST-ADMIN';
    const isValidationError = error?.message && typeof error.message === 'string' && error.message.includes('exceeding the');
    if (!(isTestAdmin && isValidationError)) {
      console.log('=== ERROR DEBUGGING ===');
      console.log('Error type:', typeof error);
      console.log('Error:', error);
      console.log('Error.message type:', typeof error?.message);
      console.log('Error.message:', error?.message);
      console.log('Is array?', Array.isArray(error?.message));
      console.log('======================');
    }

    // Handle different error formats from Frappe
    try {
      let tracebackStr = null;

      // Case 1: error.message is an array (Frappe traceback format)
      if (error?.message && Array.isArray(error.message)) {
        tracebackStr = error.message[0];
      }
      // Case 2: error.message is a stringified array
      else if (error?.message && typeof error.message === 'string') {
        // Try to parse it as JSON array
        if (error.message.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(error.message);
            if (Array.isArray(parsed) && parsed.length > 0) {
              tracebackStr = parsed[0];
            }
          } catch (e) {
            // Not a valid JSON array, treat as regular string
            console.log('Not a JSON array, treating as string');
          }
        }
      }

      // If we have a traceback string, extract the actual error message
      if (tracebackStr && typeof tracebackStr === 'string') {
        try {
          console.log('Parsing traceback string...');

          // Extract the last line which contains the actual error
          const lines = tracebackStr.split('\n').filter((line: string) => line.trim());
          const lastLine = lines[lines.length - 1];

          console.log('Last line of traceback:', lastLine);

          // Extract message after the exception type (e.g., "ValidationError: Message")
          if (lastLine.includes(':')) {
            const colonIndex = lastLine.indexOf(':');
            const message = lastLine.substring(colonIndex + 1).trim();

            console.log('Extracted message:', message);

            if (message) {
              return message;
            }
          }

          return lastLine;
        } catch (e) {
          console.error('Error parsing traceback string:', e);
        }
      }

      // Check if error has _server_messages
      if (error?._server_messages) {
        try {
          const messages = JSON.parse(error._server_messages);
          if (Array.isArray(messages) && messages.length > 0) {
            const parsed = JSON.parse(messages[0]);
            return parsed.message || 'An error occurred while submitting the application.';
          }
        } catch (e) {
          // If parsing fails, continue to next check
        }
      }

      // Check if error has exc_type (exception messages)
      if (error?.exc_type) {
        return error.exc_type;
      }

      // Check if error has exception message
      if (error?.exception) {
        // Extract readable message from exception
        const exceptionStr = typeof error.exception === 'string' ? error.exception : JSON.stringify(error.exception);

        // Common Frappe error patterns
        if (exceptionStr.includes('Duplicate entry')) {
          return 'A similar gatepass application already exists. Please check your pending applications.';
        }
        if (exceptionStr.includes('Mandatory field')) {
          const fieldMatch = exceptionStr.match(/Mandatory field: (.+)/);
          return fieldMatch ? `Required field missing: ${fieldMatch[1]}` : 'Some required fields are missing.';
        }
        if (exceptionStr.includes('does not have permission')) {
          return 'You do not have permission to submit this application. Please contact your administrator.';
        }
        if (exceptionStr.includes('ValidationError')) {
          return 'Validation failed. Please check your input and try again.';
        }

        // Return first line of exception if it's readable
        const firstLine = exceptionStr.split('\n')[0];
        if (firstLine && firstLine.length < 100 && !firstLine.includes('Traceback')) {
          return firstLine;
        }
      }

      // Check for message property as string
      if (error?.message && typeof error.message === 'string') {
        const message = error.message;

        // Filter out technical error messages
        if (message.includes('fetch') || message.includes('Network')) {
          return 'Network error. Please check your internet connection and try again.';
        }
        if (message.includes('timeout')) {
          return 'Request timeout. Please try again.';
        }

        // If it's a reasonably short message without code traces, show it
        if (!message.includes('Error:') && !message.includes('at ') && message.length < 200) {
          return message;
        }

        // As a last resort, show the raw message even if technical
        console.log('Showing raw error message as fallback');
        return message;
      }

      // Check if error is a string
      if (typeof error === 'string') {
        return error;
      }

      // Default fallback
      console.log('Reached default fallback - no error message found');
      return 'Failed to submit gatepass application. Please try again or contact support.';
    } catch (e) {
      console.error('Error parsing error message:', e);
      // Even in catch, try to show something useful
      if (error?.message) {
        return String(error.message);
      }
      return 'An unexpected error occurred. Please try again.';
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const applicationData: GatepassApplication = {
        employee: employee,
        employee_name: employeeName,
        department: department,
        attendance_device_id: attendanceDeviceId,
        date_of_application: formatDateForAPI(applicationDate),
        gp_start_time: formatTimeForAPI(startTime),
        gp_end_time: formatTimeForAPI(endTime),
        purpose_of_gp: purpose,
        approval_status: approvalStatus,
      };

      console.log('Submitting Gatepass Application:', applicationData);

      // Create the document
      const createdDoc = await frappeService.createDoc('Gate Pass Application', applicationData);
      console.log('Document created:', createdDoc);

      // Submit the document (change docstatus to 1)
      if (createdDoc?.name) {
        console.log('Submitting document:', createdDoc.name);
        await frappeService.submitDoc('Gate Pass Application', createdDoc.name);
        console.log('Document submitted successfully');
      }

      Alert.alert('Success', 'Your gatepass application has been submitted successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);

      // Reset form
      setStartTime(new Date());
      const newEndTime = new Date();
      newEndTime.setHours(newEndTime.getHours() + 2);
      setEndTime(newEndTime);
      setPurpose('Personal');
    } catch (error: any) {
      const errorMessage = parseErrorMessage(error);

      // Only log non-validation errors to avoid cluttering console
      const isTestAdmin = user?.employee_id === 'EMP-TEST-ADMIN';
      const isValidationError = errorMessage.includes('exceeding the');
      if (!(isTestAdmin && isValidationError)) {
        console.error('Error submitting gatepass:', error);
      }

      Alert.alert('Submission Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUsageColor = () => {
    if (!monthlyUsage) return COLORS.primary;
    const percentage = (monthlyUsage.total_hours_used / monthlyUsage.monthly_limit) * 100;
    if (percentage >= 90) return '#EF4444'; // Red
    if (percentage >= 70) return '#F59E0B'; // Orange
    return '#10B981'; // Green
  };

  const getUsagePercentage = () => {
    if (!monthlyUsage) return 0;
    return Math.min((monthlyUsage.total_hours_used / monthlyUsage.monthly_limit) * 100, 100);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Navbar onProfilePress={() => router.push('/(tabs)/profile')} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Apply for Gatepass
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {isLoadingEmployee ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading employee details...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!showPurposeDropdown}
          >
            {/* User Info Card */}
            {employeeName && attendanceDeviceId && (
              <View style={styles.userInfoCard}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.userInfoGradient}
                >
                  <Ionicons name="person" size={24} color="#fff" />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{employeeName}</Text>
                    <Text style={styles.userEmployee}>ECode: {attendanceDeviceId}</Text>
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Monthly Usage Card */}
            {loadingUsage ? (
              <View style={styles.usageLoadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={[styles.usageLoadingText, { color: theme.colors.textSecondary }]}>
                  Loading usage data...
                </Text>
              </View>
            ) : monthlyUsage && (
              <View style={styles.usageCard}>
                <Text style={[styles.usageTitle, { color: theme.colors.text }]}>Monthly Gatepass Usage</Text>
                <View style={styles.usageRow}>
                  <Text style={[styles.usageLabel, { color: theme.colors.textSecondary }]}>Used:</Text>
                  <Text style={[styles.usageValue, { color: theme.colors.text }]}>
                    {monthlyUsage.total_hours_used.toFixed(2)} / {monthlyUsage.monthly_limit.toFixed(2)} hours
                  </Text>
                </View>
                <View style={styles.usageRow}>
                  <Text style={[styles.usageLabel, { color: theme.colors.textSecondary }]}>Remaining:</Text>
                  <Text style={[styles.usageValue, { color: getUsageColor() }]}>
                    {monthlyUsage.remaining_hours.toFixed(2)} hours
                  </Text>
                </View>
                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${getUsagePercentage()}%`,
                          backgroundColor: getUsageColor(),
                        },
                      ]}
                    />
                  </View>
                </View>
                {/* Warning message if insufficient hours */}
                {monthlyUsage.remaining_hours < 2.0 && (
                  <View style={styles.warningContainer}>
                    <Ionicons name="warning" size={16} color="#EF4444" />
                    <Text style={styles.warningText}>
                      Insufficient hours remaining for a 2-hour gatepass
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Application Date */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Application Date
              </Text>
              <View style={[styles.datePickerButtonDisabled, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.datePickerText, { color: theme.colors.textSecondary }]}>
                  {formatDateForDisplay(applicationDate)}
                </Text>
              </View>
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                Auto-filled to today's date
              </Text>
            </View>

            {/* Start Time Picker */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Start Time <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.datePickerButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => {
                  setShowTimePicker(true);
                  setShowPurposeDropdown(false);
                }}
              >
                <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                <Text style={[styles.datePickerText, { color: theme.colors.text }]}>
                  {formatTimeForDisplay(startTime)}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                Tap to select time (Future time only)
              </Text>
              {showTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onStartTimeChange}
                />
              )}
            </View>

            {/* End Time Display (Auto-calculated) */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                End Time (Auto-calculated)
              </Text>
              <View style={[styles.datePickerButtonDisabled, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.datePickerText, { color: theme.colors.textSecondary }]}>
                  {formatTimeForDisplay(endTime)}
                </Text>
              </View>
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                Auto-calculated as Start Time + 2 hours
              </Text>
            </View>

            {/* Purpose (Dropdown) */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Purpose <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.dropdown, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => setShowPurposeDropdown(!showPurposeDropdown)}
              >
                <Text style={[styles.dropdownText, { color: theme.colors.text }]}>
                  {purpose}
                </Text>
                <Ionicons
                  name={showPurposeDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
              {showPurposeDropdown && (
                <View style={[styles.dropdownMenu, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  {PURPOSE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => {
                        setPurpose(option as 'Personal' | 'Official');
                        setShowPurposeDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>
                        {option}
                      </Text>
                      {purpose === option && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Duration:</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>2.00 hours</Text>
              </View>
              {monthlyUsage && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Will use:</Text>
                  <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                    {(monthlyUsage.total_hours_used + 2.0).toFixed(2)} / {monthlyUsage.monthly_limit.toFixed(2)} hours
                  </Text>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: COLORS.primary }]}
              onPress={handleSubmit}
              disabled={isSubmitting || loadingUsage}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Submit Application</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: width > 768 ? 20 : 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  userInfoCard: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  userInfoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: width > 768 ? 20 : 18,
    fontWeight: '600',
    color: '#fff',
  },
  userEmployee: {
    fontSize: width > 768 ? 16 : 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  usageLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  usageLoadingText: {
    marginLeft: 12,
    fontSize: width > 768 ? 16 : 14,
  },
  usageCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  usageTitle: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageLabel: {
    fontSize: width > 768 ? 16 : 14,
  },
  usageValue: {
    fontSize: width > 768 ? 16 : 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  warningText: {
    marginLeft: 8,
    fontSize: width > 768 ? 14 : 12,
    color: '#EF4444',
    fontWeight: '600',
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  datePickerButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    opacity: 0.6,
  },
  datePickerText: {
    fontSize: 16,
    flex: 1,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownMenu: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryTitle: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: width > 768 ? 16 : 14,
  },
  summaryValue: {
    fontSize: width > 768 ? 16 : 14,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
