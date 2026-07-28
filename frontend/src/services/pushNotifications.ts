// Push Notification Service for Expo
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '../api/client';
import { COLORS } from '../utils/constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // deprecated, kept for older Expo Go/SDK clients
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;

  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Will be set automatically by Expo
      });
      
      this.expoPushToken = tokenData.data;
      console.log('Expo Push Token:', this.expoPushToken);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Match Sport 24',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: COLORS.primary,
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async registerTokenWithBackend(): Promise<void> {
    if (!this.expoPushToken) {
      await this.registerForPushNotifications();
    }

    if (this.expoPushToken) {
      try {
        await apiClient.updatePushToken(this.expoPushToken);
        console.log('Push token registered with backend');
      } catch (error) {
        console.error('Failed to register push token with backend:', error);
      }
    }
  }

  setupNotificationListeners(): void {
    // Handle notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification response (user tapped on notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification response:', data);

      // Navigate based on notification type
      this.handleNotificationNavigation(data);
    });
  }

  handleNotificationNavigation(data: any): void {
    const { type, match_id, notification_id } = data;

    switch (type) {
      case 'chat_message':
      case 'MATCH_CHAT_MESSAGE':
        if (match_id) {
          router.push(`/match/${match_id}/chat`);
        }
        break;

      case 'player_joined':
      case 'MATCH_PLAYER_JOINED':
        if (match_id) {
          router.push(`/match/${match_id}`);
        }
        break;

      case 'match_full':
      case 'MATCH_FULL':
        if (match_id) {
          router.push(`/match/${match_id}`);
        }
        break;

      case 'result_submitted':
      case 'MATCH_RESULT_SUBMITTED':
        if (match_id) {
          router.push(`/match/${match_id}`);
        }
        break;

      case 'result_confirmed':
      case 'MATCH_RESULT_CONFIRMED':
        if (match_id) {
          router.push(`/match/${match_id}`);
        }
        break;

      case 'booking':
      case 'BOOKING':
        if (match_id) {
          router.push(`/match/${match_id}`);
        }
        break;

      default:
        // Navigate to notifications screen
        router.push('/player/notifications');
        break;
    }
  }

  removeListeners(): void {
    this.notificationListener?.remove();
    this.responseListener?.remove();
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  getToken(): string | null {
    return this.expoPushToken;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
