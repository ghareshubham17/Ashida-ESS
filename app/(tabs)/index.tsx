import { AttendanceCalendar, Navbar } from '@/components';
import { darkTheme, lightTheme } from '@/constants/TabTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useFrappeService } from '@/services/frappeService';
import type { Employee, QuickAction } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  I18nManager,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const frappeService = useFrappeService();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  // State management
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Calendar state
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Quick Actions Configuration
  const quickActions: QuickAction[] = [
    {
      id: 'report',
      title: 'Report',
      icon: 'document-text-outline' as keyof typeof Ionicons.glyphMap,
      color: '#00BCD4',
      onPress: () => Alert.alert('Coming Soon', 'Reports feature will be available soon!')
    },
    {
      id: 'gatepass',
      title: 'Gatepass',
      icon: 'exit-outline' as keyof typeof Ionicons.glyphMap,
      color: '#4CAF50',
      onPress: () => router.push('/(screens)/GatepassApplicationList')
    },
    {
      id: 'od',
      title: 'Outdoor',
      icon: 'briefcase-outline' as keyof typeof Ionicons.glyphMap,
      color: '#2196F3',
      onPress: () => router.push('/(screens)/ODApplicationList')
    },
    {
      id: 'wfh',
      title: 'WFH',
      icon: 'home-outline' as keyof typeof Ionicons.glyphMap,
      color: '#FF9800',
      onPress: () => router.push('/(screens)/WFHApplicationList')
    },
    {
      id: 'leave',
      title: 'Leave',
      icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
      color: '#9C27B0',
      onPress: () => router.push('/(screens)/LeaveApplicationList')
    },
    {
      id: 'holidays',
      title: 'Holidays',
      icon: 'calendar' as keyof typeof Ionicons.glyphMap,
      color: '#FF5722',
      onPress: () => router.push('/(screens)/Holidays')
    }
  ];
  // Core functions
  const checkEmployeeExist = useCallback(async () => {
    if (!user?.email) {
      setCurrentEmployee(null);
      return;
    }

    try {
      console.log('Checking employee for user:', user.email);

      const employees = await frappeService.getList<Employee>('Employee', {
        fields: ['name', 'employee_name', 'user_id', 'status'],
        filters: { user_id: user.email },
        limitPageLength: 1
      });

      if (employees && employees.length > 0) {
        const employeeData = employees[0];
        console.log('Found employee:', employeeData);
        setCurrentEmployee(employeeData);
      } else {
        console.log('No employee found for user:', user.email);
        setCurrentEmployee(null);
      }
    } catch (error) {
      console.error('Error checking employee:', error);
      if (!refreshing) {
        Alert.alert('Error', 'Failed to check employee status: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
      setCurrentEmployee(null);
    }
  }, [user?.email, frappeService, refreshing]);


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
  }, [user?.email, checkEmployeeExist]);


  const renderQuickAction = (action: QuickAction) => (
    <TouchableOpacity
      key={action.id}
      style={styles.quickActionItem}
      onPress={action.onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${action.title} quick action`}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
        <Ionicons name={action.icon as any} size={24} color="#fff" />
      </View>
      <Text style={[styles.quickActionText, { color: theme.colors.text }]}>{action.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Navbar */}
      <Navbar onProfilePress={() => router.push('/(tabs)/profile')} />

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
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
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.activeTab]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.welcomeGradient}
          >
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.welcomeName}>
                {currentEmployee?.employee_name || user?.employee_name || 'User'}
              </Text>
              <Text style={styles.lastRefreshText}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Calendar Button */}
        {currentEmployee && (
          <View style={styles.calendarCard}>
            <TouchableOpacity
              style={styles.calendarButton}
              onPress={() => {
                // Set to November 2024
                // setCurrentMonth(new Date(2025, 10, 1)); // Month is 0-indexed, so 10 = November
                setCurrentMonth(new Date());
                setShowCalendar(true);
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="View attendance calendar"
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.activeTab]}
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
          <View style={[styles.quickActionsCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Quick Actions</Text>
              <Ionicons name="apps" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.quickActionsGrid}>
              {quickActions.map(renderQuickAction)}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Attendance Calendar Modal */}
      <AttendanceCalendar
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        currentEmployee={currentEmployee}
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    textAlign: 'center',
    fontWeight: '500',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
});
