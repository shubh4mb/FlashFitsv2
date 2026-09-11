import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/api/axiosConfig';
import { AppUpdateType, getUpdateStatus } from '@/utils/versionCompare';

const ASYNC_DISMISSED_VERSION_KEY = 'flashfits_dismissed_update_version';
const ASYNC_DISMISSED_TIME_KEY = 'flashfits_dismissed_update_time';
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours snooze for optional updates

export interface VersionPolicy {
  minVersion: string;
  latestVersion: string;
  storeUrl?: string;
  webUrl?: string;
  mandatoryTitle?: string;
  mandatoryMessage?: string;
  optionalTitle?: string;
  optionalMessage?: string;
  releaseNotes?: string[];
}

export function useAppUpdate() {
  const [updateType, setUpdateType] = useState<AppUpdateType>('UP_TO_DATE');
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [versionPolicy, setVersionPolicy] = useState<VersionPolicy | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // App version defined in app.json
  const currentAppVersion = Constants.expoConfig?.version || '1.1.0';

  const checkVersion = useCallback(async () => {
    try {
      setIsChecking(true);
      const res = await api.get('/user/app-version', {
        params: { app: 'customer' },
      });

      const policy: VersionPolicy = res.data;
      if (!policy || !policy.minVersion || !policy.latestVersion) {
        return;
      }

      setVersionPolicy(policy);
      const status = getUpdateStatus(
        currentAppVersion,
        policy.minVersion,
        policy.latestVersion
      );

      if (status === 'MANDATORY') {
        setUpdateType('MANDATORY');
        setIsModalVisible(true);
      } else if (status === 'OPTIONAL') {
        setUpdateType('OPTIONAL');

        // Check if user previously dismissed this exact latest version within 24h
        const [dismissedVersion, dismissedTimeStr] = await Promise.all([
          AsyncStorage.getItem(ASYNC_DISMISSED_VERSION_KEY),
          AsyncStorage.getItem(ASYNC_DISMISSED_TIME_KEY),
        ]);

        const dismissedTime = dismissedTimeStr ? parseInt(dismissedTimeStr, 10) : 0;
        const isSnoozed =
          dismissedVersion === policy.latestVersion &&
          Date.now() - dismissedTime < SNOOZE_DURATION_MS;

        if (!isSnoozed) {
          setIsModalVisible(true);
        } else {
          setIsModalVisible(false);
        }
      } else {
        setUpdateType('UP_TO_DATE');
        setIsModalVisible(false);
      }
    } catch (err) {
      console.warn('[useAppUpdate] Could not fetch version policy:', err);
    } finally {
      setIsChecking(false);
    }
  }, [currentAppVersion]);

  // Dismiss optional update and snooze for 24 hours
  const dismissOptionalUpdate = useCallback(async () => {
    if (updateType === 'MANDATORY') return;

    setIsModalVisible(false);
    if (versionPolicy?.latestVersion) {
      try {
        await Promise.all([
          AsyncStorage.setItem(
            ASYNC_DISMISSED_VERSION_KEY,
            versionPolicy.latestVersion
          ),
          AsyncStorage.setItem(
            ASYNC_DISMISSED_TIME_KEY,
            Date.now().toString()
          ),
        ]);
      } catch (e) {
        console.warn('Failed to save update dismiss state to AsyncStorage', e);
      }
    }
  }, [updateType, versionPolicy]);

  useEffect(() => {
    checkVersion();

    // Re-check update status whenever the user returns to the app from background/Play Store
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          checkVersion();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [checkVersion]);

  return {
    updateType,
    isModalVisible,
    versionPolicy,
    currentAppVersion,
    isChecking,
    checkVersion,
    dismissOptionalUpdate,
  };
}
