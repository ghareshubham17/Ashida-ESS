import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Navbar } from '@/components';
import { useFrappeService } from '@/services/frappeService';
import { COLORS } from '@/constants';
import { lightTheme, darkTheme } from '@/constants/TabTheme';
import type { Update } from '@/types';

const { width } = Dimensions.get('window');

export default function UpdatesScreen() {
  const frappeService = useFrappeService();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    try {
      setLoading(true);
      // Try to get recent activity/updates from Activity Log
      const response = await frappeService.getList('Activity Log', {
        fields: ['name', 'subject', 'content', 'creation', 'user'],
        limitPageLength: 50,
        orderBy: 'creation desc',
      });

      if (response && Array.isArray(response)) {
        setUpdates(response);
      } else {
        // Fallback to sample data if no Activity Log
        loadSampleData();
      }
    } catch (error) {
      console.error('❌ Failed to load updates:', error);
      // Fallback to sample data if Activity Log doesn't exist
      loadSampleData();
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    const sampleUpdates: Update[] = [
      {
        name: 'update-1',
        subject: 'System Update',
        content: 'Your account has been successfully synchronized with the server.',
        creation: new Date().toISOString(),
        user: 'System',
      },
      {
        name: 'update-2',
        subject: 'New Feature Available',
        content: 'A new reporting feature has been added to your dashboard.',
        creation: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        user: 'Admin',
      },
      {
        name: 'update-3',
        subject: 'Attendance Reminder',
        content: 'Please remember to mark your attendance for today.',
        creation: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        user: 'HR',
      },
    ];
    setUpdates(sampleUpdates);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUpdates();
    setRefreshing(false);
  };

  const getUpdateIcon = (subject: string): keyof typeof Ionicons.glyphMap => {
    const lowerSubject = subject?.toLowerCase() || '';
    if (lowerSubject.includes('system')) return 'settings-outline';
    if (lowerSubject.includes('feature')) return 'sparkles-outline';
    if (lowerSubject.includes('update')) return 'refresh-outline';
    if (lowerSubject.includes('reminder')) return 'alarm-outline';
    return 'notifications-outline';
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const renderUpdateItem = ({ item }: { item: Update }) => (
    <TouchableOpacity
      style={[styles.updateItem, { backgroundColor: theme.colors.card }]}
      onPress={() => Alert.alert('Update Details', item.content || 'No additional details')}
      activeOpacity={0.7}
    >
      <View style={[styles.updateIcon, { backgroundColor: theme.colors.background }]}>
        <Ionicons name={getUpdateIcon(item.subject)} size={24} color={COLORS.primary} />
      </View>

      <View style={styles.updateContent}>
        <Text style={[styles.updateTitle, { color: theme.colors.text }]} numberOfLines={2}>
          {item.subject || 'Update'}
        </Text>
        <Text
          style={[styles.updateDescription, { color: theme.colors.textSecondary }]}
          numberOfLines={3}
        >
          {item.content || 'No description available'}
        </Text>
        <View style={styles.updateMeta}>
          <Text style={[styles.updateTime, { color: theme.colors.textSecondary }]}>
            {getTimeAgo(item.creation)}
          </Text>
          <Text style={[styles.updateUser, { color: COLORS.primary }]}>
            by {item.user || 'System'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {loading ? 'Loading updates...' : 'No updates yet'}
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
        {loading ? 'Please wait' : 'Check back later for new updates and notifications'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Navbar */}
      <Navbar onProfilePress={() => router.push('/(tabs)/profile')} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Updates & Notifications
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          Stay updated with latest changes
        </Text>
      </View>

      {/* Updates List */}
      <FlatList
        data={updates}
        renderItem={renderUpdateItem}
        keyExtractor={(item) => item.name}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={updates.length === 0 ? styles.emptyList : styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: width > 768 ? 22 : 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: width > 768 ? 16 : 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 120, // Space for floating tab bar
  },
  updateItem: {
    flexDirection: 'row',
    padding: width > 768 ? 20 : 16,
    marginBottom: 12,
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
  updateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  updateContent: {
    flex: 1,
  },
  updateTitle: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  updateDescription: {
    fontSize: width > 768 ? 16 : 14,
    lineHeight: width > 768 ? 24 : 20,
    marginBottom: 8,
  },
  updateMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updateTime: {
    fontSize: width > 768 ? 14 : 12,
  },
  updateUser: {
    fontSize: width > 768 ? 14 : 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyList: {
    flexGrow: 1,
    paddingBottom: 120, // Space for floating tab bar
  },
  emptyText: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: width > 768 ? 16 : 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
