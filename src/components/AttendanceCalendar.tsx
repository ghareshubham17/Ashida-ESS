//new code
import { darkTheme, lightTheme } from '@/constants/TabTheme';
import { useFrappeService } from '@/services/frappeService';
import type { Employee, EmployeeCheckin } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CELL_WIDTH = (width - 40) / 7;

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_COLORS = {
  present: '#4CAF50',      // Green
  absent: '#F44336',       // Red
  on_leave: '#9C27B0',     // Purple
  half_day: '#00BCD4',     // Cyan
  work_from_home: '#2196F3', // Blue
  incomplete: '#FFC107',   // Amber/Yellow
  default: '#E0E0E0',      // Light gray
  wfh: '#2196F3',          // Blue
  od: '#FF9800',           // Orange
} as const;

const STATUS_TEXT = {
  present: 'P',
  absent: 'A',
  on_leave: 'L',
  half_day: 'H',
  work_from_home: 'W',
  incomplete: 'I',
} as const;

const OPACITY = {
  FULL: '80',    // For both attendance + checkins
  MEDIUM: '60',  // For single record type
  LIGHT: '20',   // For WFH/OD without attendance
} as const;

const DATE_RANGE = {
  EDITABLE_DAYS: 7, // Last 7 days are editable
} as const;

const API_LIMITS = {
  MAX_RECORDS: 1000,
} as const;

// ============================================================================
// INTERFACES
// ============================================================================

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
  isWFH?: boolean;
  isOD?: boolean;
}

interface ProcessedData {
  [dateKey: string]: DayData;
}

interface DayInfo {
  day: number;
  dateKey: string;
  data: DayData | undefined;
}

interface WFHApplication {
  name: string;
  employee: string;
  wfh_start_date: string;
  wfh_end_date: string;
  approval_status: string;
  purpose_of_wfh: string;
}

interface ODApplication {
  name: string;
  employee: string;
  od_start_date: string;
  od_end_date: string;
  approval_status: string;
  od_type_description: string;
}

interface Attendance {
  name: string;
  employee: string;
  attendance_date: string;
  status: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  visible,
  onClose,
  currentEmployee,
  currentMonth,
  setCurrentMonth,
}) => {
  // --------------------------------------------------------------------------
  // Hooks & Theme
  // --------------------------------------------------------------------------
  const frappeService = useFrappeService();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  // --------------------------------------------------------------------------
  // State - Data
  // --------------------------------------------------------------------------
  const [monthlyRecords, setMonthlyRecords] = useState<EmployeeCheckin[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedData>({});
  const [wfhDates, setWfhDates] = useState<Set<string>>(new Set());
  const [odDates, setOdDates] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // --------------------------------------------------------------------------
  // State - Dialog
  // --------------------------------------------------------------------------
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayData, setSelectedDayData] = useState<DayData | null>(null);
  const [entryTime, setEntryTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowedLogType, setAllowedLogType] = useState<'IN' | 'OUT' | null>(null);

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------

  // Format date as YYYY-MM-DD
  const formatDateKey = useCallback((year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }, []);

  // Get month's start and end date range
  const getMonthDateRange = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const startDateKey = formatDateKey(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateKey = formatDateKey(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    return {
      startTime: `${startDateKey} 00:00:00`,
      endTime: `${endDateKey} 23:59:59`,
      startDate: startDateKey,
      endDate: endDateKey,
    };
  }, [formatDateKey]);

  // --------------------------------------------------------------------------
  // Data Processing
  // --------------------------------------------------------------------------

  // Process attendance and checkin records to determine daily status
  const processAttendanceData = useCallback((
    records: EmployeeCheckin[],
    attendanceRecords: Attendance[] = [],
    wfhDateSet: Set<string> = new Set(),
    odDateSet: Set<string> = new Set()
  ): ProcessedData => {
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
          attendanceStatus: null,
          isWFH: wfhDateSet.has(dateKey),
          isOD: odDateSet.has(dateKey),
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
          attendanceStatus: null,
          isWFH: wfhDateSet.has(dateKey),
          isOD: odDateSet.has(dateKey),
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

  // --------------------------------------------------------------------------
  // API Functions
  // --------------------------------------------------------------------------

  // Fetch all monthly records (checkins, attendance, WFH, OD)
  const fetchMonthlyRecords = useCallback(async () => {
    if (!currentEmployee) return;

    try {
      console.log('=== FETCHING MONTHLY RECORDS ===');
      console.log('Employee:', currentEmployee);
      console.log('Current Month:', currentMonth);

      const { startTime, endTime, startDate, endDate } = getMonthDateRange(currentMonth);
      console.log('Date range:', { startTime, endTime });

      // Fetch all data in parallel
      const [records, attendanceRecords, wfhRecords, odRecords] = await Promise.all([
        // Employee Checkin records
        frappeService.getList<EmployeeCheckin>('Employee Checkin', {
          fields: ['name', 'employee', 'time', 'log_type'],
          filters: {
            employee: currentEmployee.name,
            time: ['between', [startTime, endTime]]
          },
          orderBy: 'time asc',
          limitPageLength: API_LIMITS.MAX_RECORDS
        }),
        // Attendance records
        frappeService.getList<Attendance>('Attendance', {
          fields: ['name', 'employee', 'attendance_date', 'status'],
          filters: {
            employee: currentEmployee.name,
            attendance_date: ['between', [startDate, endDate]],
            docstatus: 1,
          },
          orderBy: 'attendance_date asc',
          limitPageLength: API_LIMITS.MAX_RECORDS
        }),
        // WFH Applications
        frappeService.getList<WFHApplication>('Work From Home Application', {
          fields: ['name', 'employee', 'wfh_start_date', 'wfh_end_date', 'approval_status', 'purpose_of_wfh'],
          filters: {
            employee: currentEmployee.name,
            approval_status: 'Approved',
            docstatus: 1,
          },
          limitPageLength: API_LIMITS.MAX_RECORDS
        }),
        // OD Applications
        frappeService.getList<ODApplication>('OD Application', {
          fields: ['name', 'employee', 'od_start_date', 'od_end_date', 'approval_status', 'od_type_description'],
          filters: {
            employee: currentEmployee.name,
            approval_status: 'Approved',
            docstatus: 1,
          },
          limitPageLength: API_LIMITS.MAX_RECORDS
        })
      ]);

      console.log('Fetched checkin records:', records?.length || 0);
      console.log('Fetched attendance records:', attendanceRecords?.length || 0);
      console.log('Fetched WFH records:', wfhRecords?.length || 0);
      console.log('Fetched OD records:', odRecords?.length || 0);

      // Process WFH dates
      const wfhDateSet = new Set<string>();
      (wfhRecords || []).forEach(wfh => {
        const start = new Date(wfh.wfh_start_date);
        const end = new Date(wfh.wfh_end_date);
        const currentDate = new Date(start);
        while (currentDate <= end) {
          const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
          wfhDateSet.add(dateKey);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      setWfhDates(wfhDateSet);

      // Process OD dates
      const odDateSet = new Set<string>();
      (odRecords || []).forEach(od => {
        const start = new Date(od.od_start_date);
        const end = new Date(od.od_end_date);
        const currentDate = new Date(start);
        while (currentDate <= end) {
          const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
          odDateSet.add(dateKey);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      setOdDates(odDateSet);

      setMonthlyRecords(records || []);
      const processed = processAttendanceData(records || [], attendanceRecords || [], wfhDateSet, odDateSet);
      setProcessedData(processed);
      console.log('Processed data:', processed);

    } catch (error) {
      console.error('Error fetching monthly records:', error);
      Alert.alert('Error', 'Failed to fetch calendar data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [currentEmployee, currentMonth, getMonthDateRange, frappeService, processAttendanceData, formatDateKey]);

  // Refresh calendar data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchMonthlyRecords();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchMonthlyRecords]);

  // --------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (visible && currentEmployee) {
      console.log('Calendar opened, fetching records...');
      fetchMonthlyRecords();
    }
  }, [visible, currentMonth, currentEmployee?.name, fetchMonthlyRecords]);

  // --------------------------------------------------------------------------
  // Helper Functions
  // --------------------------------------------------------------------------

  // Format time string to 12-hour format
  const formatTime = (timeString: string): string => {
    const time = new Date(timeString);
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Check if date is within editable range (last N days)
  const isWithinLast7Days = (dateKey: string): boolean => {
    const selectedDate = new Date(dateKey);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - selectedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays >= 0 && diffDays <= DATE_RANGE.EDITABLE_DAYS - 1;
  };

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------

  // Handle day cell click - open dialog if within editable range
  const handleDayClick = async (day: number, dayData: DayData | undefined) => {
    const dateKey = formatDateKey(currentMonth.getFullYear(), currentMonth.getMonth(), day);

    // Check if date is within last 7 days
    if (!isWithinLast7Days(dateKey)) {
      // If not in last 7 days, don't open dialog - just return without any action
      return;
    }

    // Within last 7 days - open dialog for entry
    setSelectedDate(dateKey);
    setSelectedDayData(dayData || null);

    // Determine what entry is allowed
    const hasCheckIn = (dayData?.checkIns.length || 0) > 0;
    const hasCheckOut = (dayData?.checkOuts.length || 0) > 0;

    if (hasCheckIn && hasCheckOut) {
      // Both exist
      setAllowedLogType(null);
    } else if (hasCheckIn && !hasCheckOut) {
      // Only check-in exists, allow check-out
      setAllowedLogType('OUT');
    } else if (!hasCheckIn && hasCheckOut) {
      // Only check-out exists, allow check-in
      setAllowedLogType('IN');
    } else {
      // Neither exists, start with check-in
      setAllowedLogType('IN');
    }

    // Set default time in 12-hour format
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    setEntryTime(`${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`);

    setShowDialog(true);
  };

  // Handle check-in/check-out entry submission
  const handleSubmitEntry = async () => {
    if (!entryTime || !selectedDate || !currentEmployee || !allowedLogType) {
      Alert.alert('Error', 'Please enter a valid time');
      return;
    }

    // Convert 12-hour to 24-hour format
    const match = entryTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) {
      Alert.alert('Error', 'Please enter time in format HH:MM AM/PM (e.g., 09:30 AM or 05:30 PM)');
      return;
    }

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    const time24 = `${String(hours).padStart(2, '0')}:${minutes}`;

    setIsSubmitting(true);
    try {
      const timestamp = `${selectedDate} ${time24}:00`;

      console.log(`Creating ${allowedLogType} record:`, {
        employee: currentEmployee.name,
        time: timestamp,
        log_type: allowedLogType
      });

      const result = await frappeService.createDoc<EmployeeCheckin>('Employee Checkin', {
        employee: currentEmployee.name,
        time: timestamp,
        log_type: allowedLogType
      });

      console.log(`${allowedLogType} record created:`, result);

      setShowDialog(false);
      setEntryTime('');
      setSelectedDate(null);
      setSelectedDayData(null);
      setAllowedLogType(null);

      Alert.alert('Success', `${allowedLogType === 'IN' ? 'Check-in' : 'Check-out'} record added successfully!`);

      await fetchMonthlyRecords();

    } catch (error) {
      console.error(`Error creating ${allowedLogType} record:`, error);
      Alert.alert('Error', `Failed to add ${allowedLogType === 'IN' ? 'check-in' : 'check-out'} record: ` + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Rendering Functions
  // --------------------------------------------------------------------------

  // Generate calendar grid data structure
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

      const dateKey = formatDateKey(year, month, day);
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

  // Get status color from constants
  const getStatusColor = (status: string): string => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.default;
  };

  // Get status text indicator from constants
  const getStatusText = (status: string): string => {
    return STATUS_TEXT[status as keyof typeof STATUS_TEXT] || '';
  };

  // Render individual day cell
  const renderDayCell = (dayInfo: DayInfo | null, index: number) => {
    if (!dayInfo) {
      return <View style={[styles.dayCell, styles.emptyCell, { backgroundColor: theme.colors.background }]} key={`empty-${index}`} />;
    }

    const { day, data, dateKey } = dayInfo;

    // Check if this is today
    const today = new Date();
    const isToday =
      today.getFullYear() === currentMonth.getFullYear() &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getDate() === day;

    // Check if WFH or OD application exists for this date
    const isWFH = wfhDates.has(dateKey);
    const isOD = odDates.has(dateKey);

    // Determine background color based on data availability
    let backgroundColor = theme.colors.card;
    if (data) {
      // Has attendance/checkin data
      const hasCheckins = data.checkIns.length > 0 || data.checkOuts.length > 0;
      const hasAttendanceRecord = data.attendanceStatus !== null;

      // Use darker opacity when both attendance and checkins exist
      const opacity = hasAttendanceRecord && hasCheckins ? OPACITY.FULL : OPACITY.MEDIUM;
      backgroundColor = getStatusColor(data.status) + opacity;
    } else if (isWFH) {
      // No attendance but WFH application exists
      backgroundColor = STATUS_COLORS.wfh + OPACITY.LIGHT;
    } else if (isOD) {
      // No attendance but OD application exists
      backgroundColor = STATUS_COLORS.od + OPACITY.LIGHT;
    } else if (isToday) {
      backgroundColor = theme.colors.primary + OPACITY.LIGHT;
    }

    return (
      <TouchableOpacity
        key={day}
        style={[
          styles.dayCell,
          { backgroundColor }
        ]}
        onPress={() => handleDayClick(day, data)}
        accessibilityRole="button"
        accessibilityLabel={`Day ${day}${data ? `, Status: ${data.status}` : ''}${isWFH ? ', Work From Home' : ''}${isOD ? ', On Duty' : ''}`}
      >
        <Text style={[styles.dayNumber, { color: theme.colors.text }, isToday && { color: theme.colors.primary, fontWeight: 'bold' }]}>
          {day}
        </Text>
        {/* Status indicator badge - Priority: WFH > OD > Attendance Status */}
        {isWFH ? (
          <View style={[styles.statusIndicator, { backgroundColor: STATUS_COLORS.wfh }]}>
            <Text style={styles.statusText}>W</Text>
          </View>
        ) : isOD ? (
          <View style={[styles.statusIndicator, { backgroundColor: STATUS_COLORS.od }]}>
            <Text style={styles.statusText}>O</Text>
          </View>
        ) : data ? (
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(data.status) }]}>
            <Text style={styles.statusText}>{getStatusText(data.status)}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  // Render week row
  const renderWeek = (week: (DayInfo | null)[], weekIndex: number) => (
    <View key={weekIndex} style={styles.weekRow}>
      {week.map((dayInfo, dayIndex) => renderDayCell(dayInfo, dayIndex))}
    </View>
  );

  const weeks = renderCalendarGrid();

  // --------------------------------------------------------------------------
  // Main Render
  // --------------------------------------------------------------------------

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

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary, theme.colors.activeTab]}
              tintColor={theme.colors.primary}
              title="Pull to refresh"
              titleColor={theme.colors.primary}
            />
          }
        >
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
                <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS.present }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS.absent }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Absent</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS.on_leave }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>On Leave</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS.half_day }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Half Day</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS.work_from_home }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>WFH</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS.incomplete }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Incomplete</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: STATUS_COLORS.od }]} />
                <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>OD</Text>
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
                <Text style={[styles.dialogTitle, { color: theme.colors.text }]}>
                  {allowedLogType === 'IN' ? 'Add Check-in' : allowedLogType === 'OUT' ? 'Add Check-out' : 'Attendance Entry'}
                </Text>
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

                {allowedLogType === null && (
                  <Text style={[styles.warningText, { color: STATUS_COLORS.od }]}>
                    You have already completed both check-in and check-out for this day.
                  </Text>
                )}

                {selectedDayData && (selectedDayData.checkIns.length > 0 || selectedDayData.checkOuts.length > 0) && (
                  <View style={[styles.existingRecords, { backgroundColor: theme.colors.background }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Existing Records:</Text>
                    {selectedDayData.checkIns.map((checkIn, index) => (
                      <Text key={`in-${index}`} style={[styles.recordText, { color: theme.colors.textSecondary }]}>
                        Check-in: {formatTime(checkIn)}
                      </Text>
                    ))}
                    {selectedDayData.checkOuts.map((checkOut, index) => (
                      <Text key={`out-${index}`} style={[styles.recordText, { color: theme.colors.textSecondary }]}>
                        Check-out: {formatTime(checkOut)}
                      </Text>
                    ))}
                  </View>
                )}

                {allowedLogType && (
                  <View style={styles.inputSection}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                      {allowedLogType === 'IN' ? 'Check-in' : 'Check-out'} Time (12-hour format):
                    </Text>
                    <TextInput
                      style={[styles.timeInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                      value={entryTime}
                      onChangeText={setEntryTime}
                      placeholder={allowedLogType === 'IN' ? '09:00 AM' : '05:00 PM'}
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                    <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
                      Format: HH:MM AM/PM (e.g., {allowedLogType === 'IN' ? '09:30 AM' : '05:30 PM'})
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.dialogActions, { borderTopColor: theme.colors.border }]}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowDialog(false)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                {allowedLogType && (
                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.colors.primary }, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleSubmitEntry}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isSubmitting }}
                  >
                    <Text style={styles.submitButtonText}>
                      {isSubmitting ? 'Adding...' : `Add ${allowedLogType === 'IN' ? 'Check-in' : 'Check-out'}`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

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
  warningText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
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
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AttendanceCalendar;
