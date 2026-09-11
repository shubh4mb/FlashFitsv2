import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SESSION_COUNT = 'flashfits_app_session_count';
const KEY_RATE_COMPLETED = 'flashfits_rate_app_completed';
const KEY_SNOOZED_UNTIL = 'flashfits_rate_app_snoozed_until';

const SESSIONS_BEFORE_PROMPT = 3; // Trigger after 3rd session
const SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days snooze
const EVENT_TRIGGER_RATE = 'trigger_rate_app';

export const triggerRateAppPrompt = () => {
  DeviceEventEmitter.emit(EVENT_TRIGGER_RATE);
};

export function useRateApp() {
  const [isRateModalVisible, setIsRateModalVisible] = useState(false);

  const checkRatingPrompt = useCallback(async () => {
    try {
      const [completed, snoozedUntilStr, sessionCountStr] = await Promise.all([
        AsyncStorage.getItem(KEY_RATE_COMPLETED),
        AsyncStorage.getItem(KEY_SNOOZED_UNTIL),
        AsyncStorage.getItem(KEY_SESSION_COUNT),
      ]);

      // If user has already rated, do not prompt automatically
      if (completed === 'true') {
        return;
      }

      // If snoozed, check if snooze duration has passed
      const now = Date.now();
      if (snoozedUntilStr) {
        const snoozedUntil = parseInt(snoozedUntilStr, 10);
        if (now < snoozedUntil) {
          return;
        }
      }

      // Increment session count
      const currentSessions = sessionCountStr ? parseInt(sessionCountStr, 10) : 0;
      const newSessionCount = currentSessions + 1;
      await AsyncStorage.setItem(KEY_SESSION_COUNT, newSessionCount.toString());

      // If reached threshold, trigger prompt after a short delay so user has landed
      if (newSessionCount >= SESSIONS_BEFORE_PROMPT) {
        setTimeout(() => {
          setIsRateModalVisible(true);
        }, 2500);
      }
    } catch (error) {
      console.warn('[useRateApp] Failed to check rating status:', error);
    }
  }, []);

  useEffect(() => {
    checkRatingPrompt();

    const sub = DeviceEventEmitter.addListener(EVENT_TRIGGER_RATE, () => {
      setIsRateModalVisible(true);
    });

    return () => {
      sub.remove();
    };
  }, [checkRatingPrompt]);

  const openRateModal = useCallback(() => {
    setIsRateModalVisible(true);
  }, []);

  const closeRateModal = useCallback(async () => {
    setIsRateModalVisible(false);
    try {
      // Snooze for 7 days when dismissed
      const snoozeTarget = Date.now() + SNOOZE_DURATION_MS;
      await AsyncStorage.setItem(KEY_SNOOZED_UNTIL, snoozeTarget.toString());
    } catch (e) {
      console.warn('Failed to set rating snooze:', e);
    }
  }, []);

  const markAsRated = useCallback(async () => {
    setIsRateModalVisible(false);
    try {
      await AsyncStorage.setItem(KEY_RATE_COMPLETED, 'true');
    } catch (e) {
      console.warn('Failed to mark rating completed:', e);
    }
  }, []);

  return {
    isRateModalVisible,
    openRateModal,
    closeRateModal,
    markAsRated,
  };
}
