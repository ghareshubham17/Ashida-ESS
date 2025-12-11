import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useFrappeService } from '@/services/frappeService';
import { COLORS } from '@/constants';

const { width } = Dimensions.get('window');

interface EmployeeData {
  name: string;
  employee_name: string;
  employee_number?: string;
  designation?: string;
  department?: string;
  company?: string;
  branch?: string;
  gender?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  status?: string;
  company_email?: string;
  user_id?: string;
  personal_email?: string;
  cell_number?: string;
  current_address?: string;
  permanent_address?: string;
  reports_to?: string;
  attendance_device_id?: string;
  employment_type?: string;
  contract_end_date?: string;
  relieving_date?: string;
  blood_group?: string;
  marital_status?: string;
  pan_number?: string;
  passport_number?: string;
  aadhaar_number?: string;
  date_of_retirement?: string;
  notice_number_of_days?: number;
  prefered_contact_email?: string;
  emergency_phone_number?: string;
  person_to_be_contacted?: string;
}

interface DetailItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | number;
  valueColor?: string;
}

const DetailItem: React.FC<DetailItemProps> = ({ icon, label, value, valueColor = '#1F2937' }) => {
  if (!value || value === 'N/A') return null;

  return (
    <View style={styles.detailItem}>
      <View style={styles.detailHeader}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
};

export default function ProfileDetailsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { getDoc } = useFrappeService();

  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployeeDetails = async () => {
    try {
      if (!user?.employee_id) {
        throw new Error('Employee ID not available');
      }

      const data = await getDoc<EmployeeData>('Employee', user.employee_id);
      setEmployeeData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching employee details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch employee details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployeeDetails();
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading employee details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Failed to load employee details</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEmployeeDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Details</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.employeeName}>{employeeData?.employee_name || 'N/A'}</Text>
          <Text style={styles.employeeId}>
            {employeeData?.name || employeeData?.employee_number || 'N/A'}
          </Text>
          {employeeData?.status && (
            <View
              style={[
                styles.statusBadge,
                employeeData.status === 'Active' ? styles.statusActive : styles.statusInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  employeeData.status === 'Active'
                    ? styles.statusTextActive
                    : styles.statusTextInactive,
                ]}
              >
                {employeeData.status}
              </Text>
            </View>
          )}
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.sectionContent}>
            <DetailItem
              icon="briefcase-outline"
              label="Designation"
              value={employeeData?.designation}
            />
            <DetailItem
              icon="business-outline"
              label="Department"
              value={employeeData?.department}
            />
            <DetailItem icon="home-outline" label="Company" value={employeeData?.company} />
            <DetailItem icon="location-outline" label="Branch" value={employeeData?.branch} />
            <DetailItem icon="person-outline" label="Gender" value={employeeData?.gender} />
            <DetailItem
              icon="calendar-outline"
              label="Date of Birth"
              value={formatDate(employeeData?.date_of_birth)}
            />
            <DetailItem
              icon="calendar-outline"
              label="Date of Joining"
              value={formatDate(employeeData?.date_of_joining)}
            />
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.sectionContent}>
            <DetailItem
              icon="mail-outline"
              label="Company Email"
              value={employeeData?.company_email || employeeData?.user_id}
            />
            <DetailItem
              icon="mail-outline"
              label="Personal Email"
              value={employeeData?.personal_email}
            />
            <DetailItem
              icon="call-outline"
              label="Mobile Number"
              value={employeeData?.cell_number}
            />
            <DetailItem
              icon="home-outline"
              label="Current Address"
              value={employeeData?.current_address}
            />
            <DetailItem
              icon="home-outline"
              label="Permanent Address"
              value={employeeData?.permanent_address}
            />
          </View>
        </View>

        {/* Employment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employment Details</Text>
          <View style={styles.sectionContent}>
            <DetailItem icon="person-outline" label="Reports To" value={employeeData?.reports_to} />
            <DetailItem
              icon="people-outline"
              label="Employee Number"
              value={employeeData?.employee_number}
            />
            <DetailItem
              icon="card-outline"
              label="Attendance Device ID"
              value={employeeData?.attendance_device_id}
            />
            <DetailItem
              icon="briefcase-outline"
              label="Employment Type"
              value={employeeData?.employment_type}
            />
            <DetailItem
              icon="calendar-outline"
              label="Contract End Date"
              value={formatDate(employeeData?.contract_end_date)}
            />
            <DetailItem
              icon="calendar-outline"
              label="Relieving Date"
              value={formatDate(employeeData?.relieving_date)}
            />
          </View>
        </View>

        {/* Personal Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          <View style={styles.sectionContent}>
            <DetailItem
              icon="water-outline"
              label="Blood Group"
              value={employeeData?.blood_group}
            />
            <DetailItem
              icon="heart-outline"
              label="Marital Status"
              value={employeeData?.marital_status}
            />
            <DetailItem icon="card-outline" label="PAN Number" value={employeeData?.pan_number} />
            <DetailItem
              icon="card-outline"
              label="Passport Number"
              value={employeeData?.passport_number}
            />
            <DetailItem
              icon="shield-outline"
              label="Aadhaar Number"
              value={employeeData?.aadhaar_number}
            />
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          <View style={styles.sectionContent}>
            <DetailItem
              icon="calendar-outline"
              label="Date of Retirement"
              value={formatDate(employeeData?.date_of_retirement)}
            />
            <DetailItem
              icon="alert-circle-outline"
              label="Notice Period (Days)"
              value={employeeData?.notice_number_of_days?.toString()}
            />
            <DetailItem
              icon="mail-outline"
              label="Preferred Contact Email"
              value={employeeData?.prefered_contact_email}
            />
            <DetailItem
              icon="call-outline"
              label="Emergency Contact"
              value={employeeData?.emergency_phone_number}
            />
            <DetailItem
              icon="person-outline"
              label="Emergency Contact Name"
              value={employeeData?.person_to_be_contacted}
            />
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: width > 768 ? 22 : 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  employeeName: {
    fontSize: width > 768 ? 26 : 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  employeeId: {
    fontSize: width > 768 ? 18 : 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: width > 768 ? 16 : 14,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextInactive: {
    color: '#DC2626',
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: width > 768 ? 20 : 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  detailItem: {
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: width > 768 ? 16 : 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  detailValue: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: '500',
    marginLeft: 28,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: width > 768 ? 18 : 16,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 16,
    fontSize: width > 768 ? 20 : 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: width > 768 ? 16 : 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: width > 768 ? 18 : 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 32,
  },
});
