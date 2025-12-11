import React from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Navbar } from '@/components';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants';
import { lightTheme, darkTheme } from '@/constants/TabTheme';

const { width } = Dimensions.get('window');

interface ProfileItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
}

export default function ProfileScreen() {
  const { user, logout, siteUrl } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: logout, style: 'destructive' },
    ]);
  };

  const handleSettingPress = (setting: string) => {
    Alert.alert('Settings', `${setting} feature coming soon`);
  };

  const ProfileItem: React.FC<ProfileItemProps> = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
  }) => (
    <TouchableOpacity
      style={[styles.profileItem, { backgroundColor: theme.colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.profileItemIcon, { backgroundColor: theme.colors.background }]}>
        <Ionicons name={icon} size={24} color={COLORS.primary} />
      </View>
      <View style={styles.profileItemContent}>
        <Text style={[styles.profileItemTitle, { color: theme.colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.profileItemSubtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {showArrow && <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Navbar */}
      <Navbar />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.profileHeaderContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={48} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.userName}>
              {user?.employee_name || 'User'}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || 'No email available'}
            </Text>

            <View style={styles.connectionStatus}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.connectionText}>Connected</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account</Text>

          <ProfileItem
            icon="person-outline"
            title="Profile Details"
            subtitle="View your complete employee information"
            onPress={() => router.push('/(screens)/ProfileDetailsScreen')}
          />

          <ProfileItem
            icon="shield-checkmark-outline"
            title="Privacy & Security"
            subtitle="Manage your privacy settings"
            onPress={() => handleSettingPress('Privacy & Security')}
          />

          <ProfileItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Configure push notifications"
            onPress={() => handleSettingPress('Notifications')}
          />
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>App Settings</Text>

          <ProfileItem
            icon="color-palette-outline"
            title="Theme"
            subtitle={colorScheme === 'dark' ? 'Dark mode' : 'Light mode'}
            onPress={() => handleSettingPress('Theme')}
          />

          <ProfileItem
            icon="language-outline"
            title="Language"
            subtitle="English"
            onPress={() => handleSettingPress('Language')}
          />

          <ProfileItem
            icon="download-outline"
            title="Offline Data"
            subtitle="Sync and storage settings"
            onPress={() => handleSettingPress('Offline Data')}
          />
        </View>

        {/* Connection Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Connection</Text>

          <ProfileItem
            icon="globe-outline"
            title="Frappe Site"
            subtitle={
              siteUrl
                ? siteUrl.replace('https://', '').replace('http://', '')
                : 'Not Connected'
            }
            onPress={() => Alert.alert('Frappe Site', siteUrl || 'Not Connected')}
            showArrow={false}
          />

          <ProfileItem
            icon="sync-outline"
            title="Last Sync"
            subtitle="Just now"
            onPress={() => handleSettingPress('Sync Status')}
            showArrow={false}
          />
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Support</Text>

          <ProfileItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help and contact support"
            onPress={() => handleSettingPress('Help & Support')}
          />

          <ProfileItem
            icon="information-circle-outline"
            title="About"
            subtitle="App version 1.0.0"
            onPress={() => handleSettingPress('About')}
          />
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: theme.colors.card }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing for Tab Bar */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  profileHeader: {
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  profileHeaderContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  userName: {
    fontSize: width > 768 ? 26 : 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: width > 768 ? 18 : 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  connectionText: {
    color: '#FFFFFF',
    fontSize: width > 768 ? 16 : 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: width > 768 ? 20 : 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: width > 768 ? 20 : 16,
    marginBottom: 2,
    borderRadius: 12,
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
  profileItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileItemContent: {
    flex: 1,
  },
  profileItemTitle: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileItemSubtitle: {
    fontSize: width > 768 ? 16 : 14,
  },
  logoutContainer: {
    paddingHorizontal: 16,
    marginTop: 32,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: width > 768 ? 20 : 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
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
  logoutText: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: '600',
    color: COLORS.error,
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 120,
  },
});
