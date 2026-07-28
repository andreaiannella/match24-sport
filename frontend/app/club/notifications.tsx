// Club Notifications Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, LoadingSpinner, EmptyState } from '../../src/components';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { COLORS } from '../../src/utils/constants';
import { apiClient } from '../../src/api/client';
import { Notification } from '../../src/types';
import { format, parseISO } from 'date-fns';
import { GradientBackground } from '../../src/components';

export default function ClubNotificationsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'chat_message':
      case 'MATCH_CHAT_MESSAGE':
        return 'chatbubble-outline';
      case 'player_joined':
      case 'MATCH_PLAYER_JOINED':
        return 'person-add-outline';
      case 'match_full':
      case 'MATCH_FULL':
        return 'checkmark-circle-outline';
      case 'result_submitted':
      case 'MATCH_RESULT_SUBMITTED':
        return 'trophy-outline';
      case 'result_confirmed':
      case 'MATCH_RESULT_CONFIRMED':
        return 'ribbon-outline';
      case 'booking':
        return 'calendar-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'chat_message':
      case 'MATCH_CHAT_MESSAGE':
        return COLORS.primary;
      case 'player_joined':
      case 'MATCH_PLAYER_JOINED':
        return COLORS.secondary; // court teal
      case 'match_full':
      case 'MATCH_FULL':
        return COLORS.success;
      case 'result_submitted':
      case 'MATCH_RESULT_SUBMITTED':
        return COLORS.warning;
      case 'result_confirmed':
      case 'MATCH_RESULT_CONFIRMED':
        return COLORS.primary;
      default:
        return COLORS.secondary;
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await apiClient.markNotificationRead(notification.notification_id);
        setNotifications(prev => 
          prev.map(n => n.notification_id === notification.notification_id ? {...n, is_read: true} : n)
        );
      } catch (error) {
        console.error('Error marking notification read:', error);
      }
    }

    // Navigate based on type
    const matchId = (notification as any).match_id;
    if (matchId) {
      switch (notification.type) {
        case 'result_submitted':
        case 'MATCH_RESULT_SUBMITTED':
          // Navigate to pending results
          router.push('/club/pending-results');
          break;
        default:
          router.push(`/match/${matchId}`);
      }
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await apiClient.getNotifications(50);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (isLoading) {
    return <LoadingSpinner fullScreen message={t('loading')} />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('notifications')}</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllRead}>Letto</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
        }
      >
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <TouchableOpacity 
              key={notification.notification_id}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              <Card
                style={[styles.notificationCard, !notification.is_read && styles.unreadCard]}
              >
                <View style={styles.notificationContent}>
                  <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(notification.type) + '20' }]}>
                    <Ionicons 
                      name={getNotificationIcon(notification.type)} 
                      size={20} 
                      color={getNotificationColor(notification.type)} 
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationTime}>
                      {format(parseISO(notification.created_at), 'dd/MM/yyyy HH:mm')}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState
            icon="notifications-off-outline"
            title={t('no_notifications')}
            message="Le notifiche appariranno qui"
          />
        )}
      </ScrollView>
    </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  markAllRead: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  notificationCard: {
    marginBottom: 8,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
