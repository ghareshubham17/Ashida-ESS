import { Navbar } from '@/components';
import { darkTheme, lightTheme } from '@/constants/TabTheme';
import { useAuth } from '@/contexts/AuthContext';
import { useFrappeService } from '@/services/frappeService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Type Definitions
type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Closed' | 'Expired' | 'Open';
type SortBy = 'date' | 'employee';

interface GatepassApplication {
  id: string;
  employee: string;
  employee_name: string;
  date_of_application: string;
  gp_start_time: string;
  gp_end_time: string;
  purpose_of_gp: string;
  approval_status: ApprovalStatus;
  date_of_approval?: string;
  reason_for_rejection?: string;
}

interface Employee {
  id: string;
  name: string;
}

export default function GatepassApprovalApplicationList() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const frappeService = useFrappeService();
  const { user } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<'pending' | 'complete'>('pending');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState<string>('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);

  // Applications data from API
  const [allApplications, setAllApplications] = useState<GatepassApplication[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);

  // Employee data from API
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [applicationToReject, setApplicationToReject] = useState<GatepassApplication | null>(null);

  // Fetch employees with server-side search
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);

        if (!user?.employee_id) {
          setEmployees([]);
          return;
        }

        // Get user's team first
        const employeeData = await frappeService.getList<any>('Employee', {
          fields: ['team'],
          filters: [['name', '=', user.employee_id]],
          limitPageLength: 1
        });

        if (employeeData.length === 0 || !employeeData[0].team) {
          setEmployees([]);
          return;
        }

        const userTeam = employeeData[0].team;

        // Get all team members
        const filters: any[] = [
          ['team', '=', userTeam],
          ['name', '!=', user.employee_id]
        ];

        // Add search filter if user has typed something
        if (employeeSearchQuery.trim()) {
          filters.push(['employee_name', 'like', `%${employeeSearchQuery}%`]);
        }

        const empList = await frappeService.getList<any>('Employee', {
          fields: ['name', 'employee_name'],
          filters: filters,
          limitPageLength: 10,
          orderBy: 'employee_name asc'
        });

        const formattedEmployees = empList.map((emp: any) => ({
          id: emp.name,
          name: emp.employee_name
        }));

        setEmployees(formattedEmployees);
      } catch (err) {
        console.error('Error fetching team employees:', err);
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    // Debounce: Only fetch after user stops typing for 300ms
    const timeoutId = setTimeout(() => {
      if (showEmployeeDropdown) {
        fetchEmployees();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [employeeSearchQuery, showEmployeeDropdown, frappeService, user?.employee_id]);

  // Fetch all gatepass applications for team members
  const fetchApplications = useCallback(async () => {
    try {
      setIsLoadingApplications(true);
      setApplicationsError(null);

      if (!user?.employee_id) {
        setAllApplications([]);
        return;
      }

      // Step 1: Check if logged-in user has "Gatepass Approver" role
      const loggedinEmp = await frappeService.getList<any>('Employee', {
        fields: ['user_id', 'name'],
        filters: [['name', '=', user?.employee_id]],
        limitPageLength: 1
      });

      if (loggedinEmp.length === 0 || !loggedinEmp[0].user_id) {
        throw new Error('Employee not found or not linked to user');
      }

      const userData = await frappeService.getDoc<any>('User', loggedinEmp[0].user_id);

      const hasApproverRole = userData?.roles?.some(
        (roleObj: any) => roleObj.role === 'Gatepass Approver'
      );

      if (!hasApproverRole) {
        console.log('User does not have Gatepass Approver role');
        setAllApplications([]);
        setIsLoadingApplications(false);
        return;
      }

      // Step 2: Get the employee's team
      const employeeData = await frappeService.getList<any>('Employee', {
        fields: ['name', 'team'],
        filters: [['user_id', '=', loggedinEmp[0].user_id]],
        limitPageLength: 1
      });

      if (employeeData.length === 0 || !employeeData[0].team) {
        console.log('Employee not found or not assigned to a team');
        setAllApplications([]);
        setIsLoadingApplications(false);
        return;
      }

      const userTeam = employeeData[0].team;

      // Step 3: Get all employees in the same team
      const teamMembers = await frappeService.getList<any>('Employee', {
        fields: ['name'],
        filters: [
          ['team', '=', userTeam],
          ['name', '!=', user?.employee_id] // Exclude the logged-in user
        ],
        limitPageLength: 999999
      });

      if (teamMembers.length === 0) {
        console.log('No team members found');
        setAllApplications([]);
        setIsLoadingApplications(false);
        return;
      }

      const employeeIds = teamMembers.map((emp: any) => emp.name);

      // Step 4: Fetch Gatepass Applications for team members
      const gatepassApps = await frappeService.getList<any>('Gate Pass Application', {
        fields: [
          'name',
          'employee',
          'employee_name',
          'date_of_application',
          'gp_start_time',
          'gp_end_time',
          'purpose_of_gp',
          'approval_status',
          'creation',
          'date_of_approval',
          'reason_for_rejection'
        ],
        filters: [['employee', 'in', employeeIds]],
        limitPageLength: 0 // Get all
      });

      // Transform applications
      const transformedApps: GatepassApplication[] = gatepassApps.map((app: any): GatepassApplication => ({
        id: app.name,
        employee: app.employee,
        employee_name: app.employee_name,
        date_of_application: app.date_of_application,
        gp_start_time: app.gp_start_time,
        gp_end_time: app.gp_end_time,
        purpose_of_gp: app.purpose_of_gp,
        approval_status: app.approval_status,
        date_of_approval: app.date_of_approval,
        reason_for_rejection: app.reason_for_rejection
      }));

      setAllApplications(transformedApps);
    } catch (err) {
      console.error('Error fetching gatepass applications for approval:', err);
      setApplicationsError('Failed to load gatepass applications');
    } finally {
      setIsLoadingApplications(false);
    }
  }, [frappeService, user?.employee_id]);

  // Fetch applications on mount
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Filter and sort applications
  const filteredApplications = useMemo(() => {
    let filtered = allApplications;

    // Filter by tab (pending or complete)
    if (activeTab === 'pending') {
      filtered = filtered.filter(app => app.approval_status === 'Pending' || app.approval_status === 'Open');
    } else {
      filtered = filtered.filter(app => app.approval_status === 'Approved' || app.approval_status === 'Rejected' || app.approval_status === 'Closed' || app.approval_status === 'Expired');
    }

    // Filter by employee
    if (selectedEmployee) {
      filtered = filtered.filter(app => app.employee === selectedEmployee);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date_of_application).getTime() - new Date(a.date_of_application).getTime();
      } else {
        return a.employee_name.localeCompare(b.employee_name);
      }
    });

    return filtered;
  }, [allApplications, activeTab, selectedEmployee, sortBy]);

  // Paginated applications
  const displayedApplications = useMemo(() => {
    return filteredApplications.slice(0, displayCount);
  }, [filteredApplications, displayCount]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchApplications();
    setRefreshing(false);
    setDisplayCount(20);
  }, [fetchApplications]);

  // Load more handler
  const onLoadMore = useCallback(() => {
    if (loadingMore || displayedApplications.length >= filteredApplications.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      setDisplayCount(prev => prev + 20);
      setLoadingMore(false);
    }, 500);
  }, [loadingMore, displayedApplications.length, filteredApplications.length]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(20);
  }, [activeTab, selectedEmployee, sortBy]);

  // Handle Approve
  const handleApprove = async (application: GatepassApplication) => {
    Alert.alert(
      'Approve Application',
      `Are you sure you want to approve ${application.employee_name}'s gatepass application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              // Update the application status
              await frappeService.updateDoc('Gate Pass Application', application.id, {
                approval_status: 'Approved',
                date_of_approval: new Date().toISOString().split('T')[0]
              });

              Alert.alert('Success', 'Gatepass application approved successfully');

              // Refresh applications
              await fetchApplications();
            } catch (err: any) {
              console.error('Error approving application:', err);
              Alert.alert('Error', err.message || 'Failed to approve application');
            }
          }
        }
      ]
    );
  };

  // Handle Reject - Open Modal
  const handleReject = (application: GatepassApplication) => {
    setApplicationToReject(application);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  // Confirm Rejection
  const confirmReject = async () => {
    if (!applicationToReject) return;

    if (!rejectionReason || rejectionReason.trim() === '') {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      // Update the application status
      await frappeService.updateDoc('Gate Pass Application', applicationToReject.id, {
        approval_status: 'Rejected',
        reason_for_rejection: rejectionReason.trim()
      });

      Alert.alert('Success', 'Gatepass application rejected successfully');

      // Close modal and reset
      setShowRejectModal(false);
      setApplicationToReject(null);
      setRejectionReason('');

      // Refresh applications
      await fetchApplications();
    } catch (err: any) {
      console.error('Error rejecting application:', err);
      Alert.alert('Error', err.message || 'Failed to reject application');
    }
  };

  // Get status color
  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'Approved':
      case 'Closed':
        return '#4CAF50';
      case 'Rejected':
        return '#F44336';
      case 'Expired':
        return '#9E9E9E';
      case 'Pending':
      case 'Open':
        return '#FF9800';
      default:
        return theme.colors.textSecondary;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Format time
  const formatTime = (timeString: string) => {
    // timeString format: "HH:MM:SS"
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  // Calculate end time (start + 2 hours)
  const calculateEndTime = (startTime: string) => {
    const [hours, minutes, seconds] = startTime.split(':').map(Number);
    const endHours = (hours + 2) % 24;
    return `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Render gatepass application card
  const renderGatepassCard = ({ item }: { item: GatepassApplication }) => (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
      {/* Header with Status */}
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: '#4CAF50' + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: '#4CAF50' }]}>
            Gate Pass
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.approval_status) + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.approval_status) }]} />
          <Text style={[styles.statusBadgeText, { color: getStatusColor(item.approval_status) }]}>
            {item.approval_status}
          </Text>
        </View>
      </View>

      {/* Employee Info */}
      <Text style={[styles.employeeName, { color: theme.colors.text }]}>
        {item.employee_name}
      </Text>
      <Text style={[styles.employeeId, { color: theme.colors.textSecondary }]}>
        {item.employee}
      </Text>

      {/* Date */}
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={[styles.infoText, { color: theme.colors.text, fontWeight: '600' }]}>
          {formatDate(item.date_of_application)}
        </Text>
      </View>

      {/* Time Range */}
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          {formatTime(item.gp_start_time)} - {calculateEndTime(item.gp_start_time)} (2.00 hours)
        </Text>
      </View>

      {/* Purpose */}
      <View style={styles.infoRow}>
        <Ionicons name="document-text-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          Purpose: {item.purpose_of_gp}
        </Text>
      </View>

      {/* Approval Date */}
      {(item.approval_status === 'Approved' || item.approval_status === 'Closed') && item.date_of_approval && (
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Approved on {formatDate(item.date_of_approval)}
          </Text>
        </View>
      )}

      {/* Rejection Reason */}
      {item.approval_status === 'Rejected' && item.reason_for_rejection && (
        <View style={[styles.rejectionBox, { backgroundColor: '#F4433620' }]}>
          <Ionicons name="alert-circle-outline" size={16} color="#F44336" />
          <Text style={[styles.rejectionText, { color: '#F44336' }]} numberOfLines={2}>
            {item.reason_for_rejection}
          </Text>
        </View>
      )}

      {/* Application Date */}
      <View style={[styles.footer, { borderTopWidth: 0, paddingTop: 4 }]}>
        <Text style={[styles.footerText, { color: theme.colors.textSecondary, fontSize: 11 }]}>
          Applied on {formatDate(item.date_of_application)}
        </Text>
      </View>

      {/* Action Buttons - Only show on Pending tab */}
      {activeTab === 'pending' && (item.approval_status === 'Pending' || item.approval_status === 'Open') && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.rejectButton, { backgroundColor: '#F44336' }]}
            onPress={() => handleReject(item)}
          >
            <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.approveButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => handleApprove(item)}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Navbar onProfilePress={() => router.push('/(tabs)/profile')} />

      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Gatepass Approval Requests
            </Text>
          </View>
        </View>

        {/* Filters Section */}
        <View style={[styles.filtersContainer, { backgroundColor: theme.colors.card }]}>
          {/* Employee Filter */}
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>
                Employee
              </Text>
              <TouchableOpacity
                style={[styles.filterInput, { borderColor: theme.colors.border }]}
                onPress={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
              >
                <TextInput
                  style={[styles.filterInputText, { color: theme.colors.text }]}
                  placeholder="Search employee..."
                  placeholderTextColor={theme.colors.textSecondary}
                  value={employeeSearchQuery}
                  onChangeText={setEmployeeSearchQuery}
                  onFocus={() => setShowEmployeeDropdown(true)}
                />
                <Ionicons
                  name={showEmployeeDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
              {showEmployeeDropdown && (
                <View style={[styles.dropdown, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  {loadingEmployees ? (
                    <View style={styles.dropdownLoading}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                      <Text style={[styles.dropdownLoadingText, { color: theme.colors.textSecondary }]}>
                        Loading employees...
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={[{ id: 'all', name: 'All Employees' }, ...employees]}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            if (item.id === 'all') {
                              setSelectedEmployee('');
                              setEmployeeSearchQuery('');
                            } else {
                              setSelectedEmployee(item.id);
                              setEmployeeSearchQuery(item.name);
                            }
                            setShowEmployeeDropdown(false);
                          }}
                        >
                          <Text style={[styles.dropdownItemText, { color: theme.colors.text }]}>
                            {item.name}
                          </Text>
                          {item.id !== 'all' && (
                            <Text style={[styles.dropdownItemSubtext, { color: theme.colors.textSecondary }]}>
                              {item.id}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={true}
                      keyboardShouldPersistTaps="handled"
                      bounces={false}
                    />
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Sort and Stats Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.sortButton, { backgroundColor: theme.colors.primary + '20' }]}
              onPress={() => setSortBy(sortBy === 'date' ? 'employee' : 'date')}
            >
              <Ionicons name="swap-vertical" size={16} color={theme.colors.primary} />
              <Text style={[styles.sortButtonText, { color: theme.colors.primary }]}>
                Sort by {sortBy === 'date' ? 'Date' : 'Employee'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.statsText, { color: theme.colors.textSecondary }]}>
              {filteredApplications.length} application{filteredApplications.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowEmployeeDropdown(false)}
        >
          <View style={[styles.tabsContainer, { backgroundColor: theme.colors.card }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
              onPress={() => setActiveTab('pending')}
            >
              <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'pending' && styles.activeTabText, activeTab === 'pending' && { color: theme.colors.primary }]}>
                Pending ({allApplications.filter(app => app.approval_status === 'Pending' || app.approval_status === 'Open').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'complete' && styles.activeTab]}
              onPress={() => setActiveTab('complete')}
            >
              <Text style={[styles.tabText, { color: theme.colors.textSecondary }, activeTab === 'complete' && styles.activeTabText, activeTab === 'complete' && { color: theme.colors.primary }]}>
                Completed
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Applications List */}
        {isLoadingApplications ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Loading gatepass applications...
            </Text>
          </View>
        ) : applicationsError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
            <Text style={styles.errorText}>{applicationsError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchApplications()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={displayedApplications}
            keyExtractor={(item) => item.id}
            renderItem={renderGatepassCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No {activeTab} gatepass applications
                </Text>
              </View>
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.loadingMoreText, { color: theme.colors.textSecondary }]}>
                    Loading more...
                  </Text>
                </View>
              ) : null
            }
          />
        )}

        {/* Rejection Modal */}
        <Modal
          visible={showRejectModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRejectModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Reject Gatepass Application
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                {applicationToReject?.employee_name}
              </Text>

              <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                Reason for Rejection <Text style={{ color: '#F44336' }}>*</Text>
              </Text>
              <TextInput
                style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Enter reason for rejection..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={4}
                value={rejectionReason}
                onChangeText={setRejectionReason}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowRejectModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton, { backgroundColor: '#F44336' }]}
                  onPress={confirmReject}
                >
                  <Text style={styles.confirmButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  filterItem: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  filterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterInputText: {
    flex: 1,
    fontSize: 14,
  },
  dropdown: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10000,
    overflow: 'hidden',
  },
  dropdownLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  dropdownLoadingText: {
    fontSize: 13,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 13,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  rejectionText: {
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingMoreText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#F44336',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
