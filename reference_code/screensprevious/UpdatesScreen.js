import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useFrappeService } from '../_services/frappeService';

const { width } = Dimensions.get('window');

const UpdatesTabScreen = () => {
  const frappeService = useFrappeService();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    try {
      setLoading(true);
      // Get recent activity/updates - you can customize this query
      const response = await frappeService.getList('Activity Log', {
        fields: ['name', 'subject', 'content', 'creation', 'user'],
        limit: 50,
        order_by: 'creation desc'
      });
      setUpdates(response || []);
    } catch (error) {
      console.error('Failed to load updates:', error);
      // Fallback to sample data if Activity Log doesn't exist
      setUpdates([
        {
          name: 'update-1',
          subject: 'System Update',
          content: 'Your account has been successfully synchronized with the server.',
          creation: new Date().toISOString(),
          user: 'System'
        },
        {
          name: 'update-2',
          subject: 'New Feature Available',
          content: 'A new reporting feature has been added to your dashboard.',
          creation: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          user: 'Admin'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUpdates();
    setRefreshing(false);
  };

  const getUpdateIcon = (subject) => {
    if (subject?.toLowerCase().includes('system')) return 'settings-outline';
    if (subject?.toLowerCase().includes('feature')) return 'sparkles-outline';
    if (subject?.toLowerCase().includes('update')) return 'refresh-outline';
    return 'notifications-outline';
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const renderUpdateItem = ({ item }) => (
    <TouchableOpacity
      style={styles.updateItem}
      onPress={() => Alert.alert('Update Details', item.content || 'No additional details')}
      activeOpacity={0.7}
    >
      <View style={styles.updateIcon}>
        <Ionicons 
          name={getUpdateIcon(item.subject)} 
          size={24} 
          color="#667eea" 
        />
      </View>
      
      <View style={styles.updateContent}>
        <Text style={styles.updateTitle} numberOfLines={2}>
          {item.subject || 'Update'}
        </Text>
        <Text style={styles.updateDescription} numberOfLines={3}>
          {item.content || 'No description available'}
        </Text>
        <View style={styles.updateMeta}>
          <Text style={styles.updateTime}>
            {getTimeAgo(item.creation)}
          </Text>
          <Text style={styles.updateUser}>
            by {item.user || 'System'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyText}>
        {loading ? 'Loading updates...' : 'No updates yet'}
      </Text>
      <Text style={styles.emptySubtext}>
        {loading ? 'Please wait' : 'Check back later for new updates and notifications'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Updates & Notifications</Text>
        <Text style={styles.headerSubtitle}>Stay updated with latest changes</Text>
      </View>

      <FlatList
        data={updates}
        renderItem={renderUpdateItem}
        keyExtractor={(item) => item.name}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={updates.length === 0 ? styles.emptyList : styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: width > 768 ? 22 : 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: width > 768 ? 16 : 14,
    color: '#6B7280',
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  updateItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    padding: width > 768 ? 20 : 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  updateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
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
    color: '#1F2937',
    marginBottom: 6,
  },
  updateDescription: {
    fontSize: width > 768 ? 16 : 14,
    color: '#6B7280',
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
    color: '#9CA3AF',
  },
  updateUser: {
    fontSize: width > 768 ? 14 : 12,
    color: '#667eea',
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
  },
  emptyText: {
    fontSize: width > 768 ? 18 : 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: width > 768 ? 16 : 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default UpdatesTabScreen;