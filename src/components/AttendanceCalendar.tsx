import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFrappeService } from '@/services/frappeService';
import { lightTheme, darkTheme } from '@/constants/TabTheme';
import type { Employee, EmployeeCheckin } from '@/types';

const { width } = Dimensions.get('window');
const CELL_WIDTH = (width - 40) / 7;

interface AttendanceCalendarProps {
  visible: boolean;
  onClose: () => void;
  currentEmployee: Employee | null;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
}

interface DayData {
  date: string;
  checkIns: string[];
  checkOuts: string[];
  status: 'present' | 'incomplete' | 'absent' | 'on_leave' | 'half_day' | 'work_from_home';
  attendanceStatus: string | null;
}

interface ProcessedData {
  [dateKey: string]: DayData;
}

interface DayInfo {
  day: number;
  dateKey: string;
  data: DayData | undefined;
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  visible,
  onClose,
  currentEmployee,
  currentMonth,
  setCurrentMonth,
}) => {
  const frappeService = useFrappeService();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [monthlyRecords, setMonthlyRecords] = useState<EmployeeCheckin[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedData>({});

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayData, setSelectedDayData] = useState<DayData | null>(null);
  const [checkoutTime, setCheckoutTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getMonthDateRange = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    return {
      startTime: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')} 00:00:00`,
      endTime: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')} 23:59:59`,
    };
  }, []);

  const processAttendanceData = useCallback((records: EmployeeCheckin[], attendanceRecords: any[] = []): ProcessedData => {
    const dailyData: ProcessedData = {};

    // First, process Attendance records (for official status like Leave, Half Day, WFH)
    attendanceRecords.forEach(record => {
      if (!record.attendance_date) return;

      const dateKey = record.attendance_date; // Already in YYYY-MM-DD format

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          checkIns: [],
          checkOuts: [],
          status: 'absent',
          attendanceStatus: null
        };
      }

      // Map Frappe attendance status to our status
      const status = record.status?.toLowerCase().replace(/\s+/g, '_');
      dailyData[dateKey].attendanceStatus = status;

      // Set initial status from Attendance record
      if (status === 'on_leave') {
        dailyData[dateKey].status = 'on_leave';
      } else if (status === 'half_day') {
        dailyData[dateKey].status = 'half_day';
      } else if (status === 'work_from_home') {
        dailyData[dateKey].status = 'work_from_home';
      } else if (status === 'present') {
        dailyData[dateKey].status = 'present';
      } else if (status === 'absent') {
        dailyData[dateKey].status = 'absent';
      }
    });

    // Then process Employee Checkin records
    records.forEach(record => {
      if (!record.time) {
        console.warn('Skipping record without time field:', record);
        return;
      }

      const recordDate = new Date(record.time);
      if (isNaN(recordDate.getTime())) {
        console.warn('Invalid date for record:', record);
        return;
      }

      const dateKey = recordDate.toISOString().split('T')[0];

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          checkIns: [],
          checkOuts: [],
          status: 'absent',
          attendanceStatus: null
        };
      }

      if (record.log_type === 'IN') {
        dailyData[dateKey].checkIns.push(record.time);
      } else if (record.log_type === 'OUT') {
        dailyData[dateKey].checkOuts.push(record.time);
      }
    });

    // Determine final status for each day
    Object.keys(dailyData).forEach(dateKey => {
      const dayData = dailyData[dateKey];

      // If there's an official Attendance status, it takes precedence
      if (dayData.attendanceStatus && ['on_leave', 'half_day', 'work_from_home'].includes(dayData.attendanceStatus)) {
        // Keep the attendance status
        return;
      }

      // Otherwise, determine from check-in/check-out records
      const hasCheckIn = dayData.checkIns.length > 0;
      const hasCheckOut = dayData.checkOuts.length > 0;

      if (hasCheckIn && hasCheckOut) {
        if (dayData.checkOuts.length >= dayData.checkIns.length) {
          dayData.status = 'present';
        } else {
          dayData.status = 'incomplete';
        }
      } else if (hasCheckIn && !hasCheckOut) {
        dayData.status = 'incomplete';
      } else if (!hasCheckIn && hasCheckOut) {
        dayData.status = 'incomplete';
      } else if (!dayData.attendanceStatus) {
        dayData.status = 'absent';
      }
    });

    return dailyData;
  }, []);

  const fetchMonthlyRecords = useCallback(async () => {
    if (!currentEmployee) return;

    try {
      console.log('=== FETCHING MONTHLY RECORDS ===');
      console.log('Employee:', currentEmployee);
      console.log('Current Month:', currentMonth);

      const { startTime, endTime } = getMonthDateRange(currentMonth);
      console.log('Date range:', { startTime, endTime });

      // Fetch Employee Checkin records
      const records = await frappeService.getList<EmployeeCheckin>('Employee Checkin', {
        fields: ['name', 'employee', 'time', 'log_type'],
        filters: {
          employee: currentEmployee.name,
          time: ['between', [startTime, endTime]]
        },
        orderBy: 'time asc',
        limitPageLength: 1000
      });

      console.log('Fetched checkin records:', records);
      console.log('Number of records:', records?.length || 0);

      // Fetch Attendance records (for status like On Leave, Half Day, WFH)
      const startDate = startTime.split(' ')[0];
      const endDate = endTime.split(' ')[0];

      const attendanceRecords = await frappeService.getList('Attendance', {
        fields: ['name', 'employee', 'attendance_date', 'status'],
        filters: {
          employee: currentEmployee.name,
          attendance_date: ['between', [startDate, endDate]]
        },
        orderBy: 'attendance_date asc',
        limitPageLength: 1000
      });

      console.log('Fetched attendance records:', attendanceRecords);
      console.log('Number of attendance records:', attendanceRecords?.length || 0);

      setMonthlyRecords(records || []);
      const processed = processAttendanceData(records || [], attendanceRecords || []);
      setProcessedData(processed);
      console.log('Processed data:', processed);

    } catch (error) {
      console.error('Error fetching monthly records:', error);
      Alert.alert('Error', 'Failed to fetch calendar data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [currentEmployee, currentMonth, getMonthDateRange, frappeService, processAttendanceData]);

  useEffect(() => {
    if (visible && currentEmployee) {
      console.log('Calendar opened, fetching records...');
      fetchMonthlyRecords();
    }
  }, [visible, currentMonth, currentEmployee?.name, fetchMonthlyRecords]);

  const formatTime = (timeString: string): string => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleIncompleteClick = (day: number, dayData: DayData) => {
    const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateKey);
    setSelectedDayData(dayData);
    setCheckoutTime('17:00');
    setShowDialog(true);
  };

  const handleSubmitCheckout = async () => {
    if (!checkoutTime || !selectedDate || !currentEmployee) {
      Alert.alert('Error', 'Please enter a valid checkout time');
      return;
    }

    setIsSubmitting(true);
    try {
      const checkoutTimestamp = `${selectedDate} ${checkoutTime}:00`;

      console.log('Creating checkout record:', {
        employee: currentEmployee.name,
        time: checkoutTimestamp,
        log_type: 'OUT'
      });

      const result = await frappeService.createDoc<EmployeeCheckin>('Employee Checkin', {
        employee: currentEmployee.name,
        time: checkoutTimestamp,
        log_type: 'OUT'
      });

      console.log('Checkout record created:', result);

      setShowDialog(false);
      setCheckoutTime('');
      setSelectedDate(null);
      setSelectedDayData(null);

      Alert.alert('Success', 'Checkout record added successfully!');

      await fetchMonthlyRecords();

    } catch (error) {
      console.error('Error creating checkout record:', error);
      Alert.alert('Error', 'Failed to add checkout record: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCalendarGrid = (): (DayInfo | null)[][] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const weeks: (DayInfo | null)[][] = [];
    let currentWeek: (DayInfo | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = processedData[dateKey];

      currentWeek.push({
        day,
        dateKey,
        data: dayData
      });
    }

    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);

    return weeks;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'present':
        return '#4CAF50'; // Green
      case 'absent':
        return '#F44336'; // Red
      case 'on_leave':
        return '#9C27B0'; // Purple
      case 'half_day':
        return '#FF9800'; // Orange
      case 'work_from_home':
        return '#2196F3'; // Blue
      case 'incomplete':
        return '#FFC107'; // Amber/Yellow
      default:
        return '#E0E0E0'; // Light gray
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'present':
        return 'P';
      case 'absent':
        return 'A';
      case 'on_leave':
        return 'L';
      case 'half_day':
        return 'H';
      case 'work_from_home':
        return 'W';
      case 'incomplete':
        return 'I';
      default:
        return '';
    }
  };

  const renderDayCell = (dayInfo: DayInfo | null, index: number) => {
    if (!dayInfo) {
      return <View style={[styles.dayCell, styles.emptyCell, { backgroundColor: theme.colors.background }]} key={`empty-${index}`} />;
    }

    const { day, data } = dayInfo;
    const today = new Date();
    const isToday =
      today.getFullYear() === currentMonth.getFullYear() &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getDate() === day;

    return (
      <TouchableOpacity
        key={day}
        style={[
          styles.dayCell,
          { backgroundColor: theme.colors.card },
          isToday && { backgroundColor: theme.colors.primary + '20' },
          data && { backgroundColor: getStatusColor(data.status) + '20' }
        ]}
        onPress={() => {
          if (data) {
            const formattedDate = `${day}/${currentMonth.getMonth() + 1}/${currentMonth.getFullYear()}`;

            if (data.status === 'incomplete') {
              handleIncompleteClick(day, data);
            } else if (data.status === 'present') {
              Alert.alert(
                `Present - ${formattedDate}`,
                `Check-ins: ${data.checkIns.length}\nCheck-outs: ${data.checkOuts.length}\n\n${data.checkIns.map((time) => `In: ${formatTime(time)}`).join('\n')}\n${data.checkOuts.map((time) => `Out: ${formatTime(time)}`).join('\n')}`
              );
            } else if (data.status === 'absent') {
              Alert.alert(
                `Absent - ${formattedDate}`,
                `No check-in or check-out records found for this day.`
              );
            } else if (data.status === 'on_leave') {
              Alert.alert(
                `On Leave - ${formattedDate}`,
                `Employee is on approved leave for this day.`
              );
            } else if (data.status === 'half_day') {
              Alert.alert(
                `Half Day - ${formattedDate}`,
                `Employee worked half day.\n\nCheck-ins: ${data.checkIns.length}\nCheck-outs: ${data.checkOuts.length}`
              );
            } else if (data.status === 'work_from_home') {
              Alert.alert(
                `Work From Home - ${formattedDate}`,
                `Employee worked from home on this day.\n\nCheck-ins: ${data.checkIns.length}\nCheck-outs: ${data.checkOuts.length}`
              );
            }
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={`Day ${day}, ${data ? `Status: ${data.status}` : 'No attendance'}`}
      >
        <Text style={[styles.dayNumber, { color: theme.colors.text }, isToday && { color: theme.colors.primary, fontWeight: 'bold' }]}>
          {day}
        </Text>
        {data && (
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(data.status) }]}>
            <Text style={styles.statusText}>{getStatusText(data.status)}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderWeek = (week: (DayInfo | null)[], weekIndex: number) => (
    <View key={weekIndex} style={styles.weekRow}>
      {week.map((dayInfo, dayIndex) => renderDayCell(dayInfo, dayIndex))}
    </View>
  );

  const weeks = renderCalendarGrid();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.colors.background }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close calendar"
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Attendance Calendar</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Current Month Display */}
          <View style={[styles.monthDisplay, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.monthText, { color: theme.colors.text }]}>
              {currentMonth?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </View>

          {/* Legend */}
          <View style={[styles.legendContainer, { backgroundColor: theme.colors.card }]}>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Absent</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#9C27B0' }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>On Leave</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Half Day</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>WFH</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#FFC107' }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Incomplete</Text>
              </View>
            </View>
          </View>

          {/* Day Headers */}
          <View style={[styles.dayHeaders, { backgroundColor: theme.colors.card }]}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={[styles.dayHeader, { color: theme.colors.textSecondary }]}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={[styles.calendarGrid, { backgroundColor: theme.colors.card }]}>
            {weeks.map((week, weekIndex) => renderWeek(week, weekIndex))}
          </View>

          {/* Refresh Button */}
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: theme.colors.primary }]}
            onPress={fetchMonthlyRecords}
            accessibilityRole="button"
            accessibilityLabel="Refresh calendar data"
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.refreshButtonText}>Refresh Data</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Checkout Dialog */}
        <Modal
          visible={showDialog}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDialog(false)}
        >
          <View style={styles.dialogOverlay}>
            <View style={[styles.dialogContainer, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.dialogHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.dialogTitle, { color: theme.colors.text }]}>Add Missing Checkout</Text>
                <TouchableOpacity
                  onPress={() => setShowDialog(false)}
                  style={styles.dialogCloseButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close dialog"
                >
                  <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.dialogContent}>
                <Text style={[styles.dialogDate, { color: theme.colors.text }]}>
                  Date: {selectedDate}
                </Text>

                {selectedDayData && (
                  <View style={[styles.existingRecords, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Existing Records:</Text>
                    {selectedDayData.checkIns.map((checkIn, index) => (
                      <Text key={index} style={[styles.recordText, { color: theme.colors.textSecondary }]}>
                        Check-in: {formatTime(checkIn)}
                      </Text>
                    ))}
                    {selectedDayData.checkOuts.map((checkOut, index) => (
                      <Text key={index} style={[styles.recordText, { color: theme.colors.textSecondary }]}>
                        Check-out: {formatTime(checkOut)}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.inputSection}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Checkout Time (24-hour format):</Text>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                    value={checkoutTime}
                    onChangeText={setCheckoutTime}
                    placeholder="17:00"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>Format: HH:MM (e.g., 17:30)</Text>
                </View>
              </View>

              <View style={[styles.dialogActions, { borderTopColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowDialog(false)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: theme.colors.primary }, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitCheckout}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isSubmitting }}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Adding...' : 'Add Checkout'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  monthDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  legendContainer: {
    borderRadius: 12,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 9,
    flexShrink: 1,
  },
  dayHeaders: {
    flexDirection: 'row',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingVertical: 12,
  },
  dayHeader: {
    width: CELL_WIDTH,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingBottom: 8,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    width: CELL_WIDTH,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  emptyCell: {
    opacity: 0.3,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  refreshButton: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dialogCloseButton: {
    padding: 4,
  },
  dialogContent: {
    padding: 20,
  },
  dialogDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  existingRecords: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  recordText: {
    fontSize: 14,
    marginBottom: 4,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    marginTop: 4,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 14,
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AttendanceCalendar;
