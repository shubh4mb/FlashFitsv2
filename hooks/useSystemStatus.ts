import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import api from '@/api/axiosConfig';

export interface SystemStatus {
  isOrderPlacementEnabled: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
}

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus>({
    isOrderPlacementEnabled: true, // Optimistic default
    maintenanceTitle: 'Maintenance in Progress',
    maintenanceMessage: 'We are currently gearing up for launch! Live ordering is temporarily paused. Please check back soon.',
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/user/system-status');
      if (res.data && typeof res.data.isOrderPlacementEnabled === 'boolean') {
        setStatus({
          isOrderPlacementEnabled: res.data.isOrderPlacementEnabled,
          maintenanceTitle: res.data.maintenanceTitle || 'Maintenance in Progress',
          maintenanceMessage: res.data.maintenanceMessage || 'We are currently gearing up for launch! Live ordering is temporarily paused. Please check back soon.',
        });
      }
    } catch (err) {
      console.warn('Failed to fetch system status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Re-check when app comes back to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        fetchStatus();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [fetchStatus]);

  return {
    ...status,
    loading,
    refreshSystemStatus: fetchStatus,
  };
}
