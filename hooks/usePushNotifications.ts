import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../api/axiosConfig'; // Adjust import based on the actual path if needed

// Safe import of expo-device — native module may not be available in Expo Go
let Device: { isDevice: boolean } = { isDevice: Platform.OS !== 'web' };
try {
  Device = require('expo-device');
} catch (e) {
  console.warn('expo-device native module not available, using fallback');
}

// Wrap in try-catch to prevent crash in Expo Go (SDK 53+ removed remote notification support)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.warn('Push notifications not supported in this environment:', e);
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  async function registerForPushNotificationsAsync() {
    let token;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notification!');
          return;
        }
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!projectId) {
          console.warn("Project ID not found for push notifications.");
        }
        token = (await Notifications.getExpoPushTokenAsync({
          projectId,
        })).data;
        console.log("Expo Push Token:", token);
      } else {
        console.log('Must use physical device for Push Notifications');
      }
    } catch (e) {
      console.warn("Push notification registration failed (expected in Expo Go):", e);
    }

    return token;
  }

  const sendPushTokenToBackend = async (token: string) => {
    try {
      await api.put('/users/push-token', { token });
      console.log("Push token sent to backend successfully.");
    } catch (error) {
      console.error("Failed to send push token to backend:", error);
    }
  }

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
      }
    }).catch(e => {
      console.warn("Push notification setup failed:", e);
    });

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        setNotification(notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log(response);
      });
    } catch (e) {
      console.warn("Failed to add notification listeners (expected in Expo Go):", e);
    }

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  return { expoPushToken, notification, sendPushTokenToBackend };
}
