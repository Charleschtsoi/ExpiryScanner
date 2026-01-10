import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and return the Expo push token
 * @returns Promise<string | null> - Expo push token or null if registration fails
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Check if running on a physical device
  if (!Device.isDevice) {
    console.warn('Must use physical device for Push Notifications');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notification!');
    return null;
  }

  // Get the Expo push token
  try {
    // Get project ID from environment variable, app.json extra, or use the configured one
    const projectId = 
      process.env.EXPO_PUBLIC_PROJECT_ID || 
      Constants.expoConfig?.extra?.eas?.projectId ||
      'dab599a4-4cde-4dcf-9a07-8a2bc4760023'; // Fallback to configured project ID
    
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    
    console.log('✅ Push notification token registered:', token.data);
    console.log('📱 Project ID:', projectId);
    return token.data;
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    return null;
  }

  // Configure Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}
