import { useState, useEffect, useCallback, useRef } from 'react';
import { StorageService } from '../services/storage';
import { cloudSyncService, CloudSyncStatus } from '../services/cloudSync';
import { UserAccount } from '../types';

export function useRealTimeSync(onSync?: () => void) {
  const [syncTick, setSyncTick] = useState<number>(0);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>(() =>
    cloudSyncService.getStatus()
  );
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() =>
    StorageService.getActiveUser()
  );
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number>(1800); // 30 mins

  const onSyncRef = useRef(onSync);
  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  const triggerUpdate = useCallback(() => {
    setSyncTick((prev) => prev + 1);
    onSyncRef.current?.();
  }, []);

  // Initialize and subscribe to CloudSyncService
  useEffect(() => {
    // Start two-way Firestore synchronization
    cloudSyncService.init().catch((err) => {
      console.warn('Cloud sync service initialization note:', err);
    });

    const unsubscribeStatus = cloudSyncService.subscribeStatus((status) => {
      setCloudStatus((prev) => {
        if (
          prev.isOnline === status.isOnline &&
          prev.isConnectedToFirestore === status.isConnectedToFirestore &&
          prev.isSyncing === status.isSyncing &&
          prev.lastSyncTimestamp === status.lastSyncTimestamp &&
          prev.pendingOfflineCount === status.pendingOfflineCount &&
          prev.activeDeviceId === status.activeDeviceId
        ) {
          return prev;
        }
        return status;
      });
    });

    // Listen to in-app custom event broadcast when Firestore updates
    const handleCloudSyncUpdate = () => {
      triggerUpdate();
    };

    window.addEventListener('hr-cloud-sync-update', handleCloudSyncUpdate);

    return () => {
      unsubscribeStatus();
      window.removeEventListener('hr-cloud-sync-update', handleCloudSyncUpdate);
    };
  }, [triggerUpdate]);

  // Listen to cross-tab BroadcastChannel and storage events
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('hr_diagnostics_enterprise_sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'STORAGE_UPDATE') {
            triggerUpdate();
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel error', e);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('hr_diag_')) {
        triggerUpdate();
        if (e.key === 'hr_diag_active_user') {
          setCurrentUser(StorageService.getActiveUser());
        }
      }
    };

    const handleOnline = () => {
      triggerUpdate();
    };

    const handleOffline = () => {
      triggerUpdate();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerUpdate]);

  // Session timeout management (30-minute auto logout)
  useEffect(() => {
    if (!currentUser) return;

    const timer = setInterval(() => {
      const expiry = StorageService.getSessionExpiry();
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setSessionSecondsLeft(remaining);

      if (remaining <= 0) {
        // Auto logout
        StorageService.setActiveUser(null);
        setCurrentUser(null);
        StorageService.logAction('Security', `Session timed out after 30 minutes of inactivity.`);
      }
    }, 1000);

    // Activity listener to extend session upon user interaction
    const handleActivity = () => {
      StorageService.extendSession();
    };

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });

    return () => {
      clearInterval(timer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [currentUser]);

  const login = (user: UserAccount) => {
    StorageService.setActiveUser(user);
    setCurrentUser(user);
    setSessionSecondsLeft(1800);
    triggerUpdate();
  };

  const logout = () => {
    StorageService.setActiveUser(null);
    setCurrentUser(null);
    triggerUpdate();
  };

  const forceCloudSync = async () => {
    await cloudSyncService.forceSync();
    triggerUpdate();
  };

  return {
    syncTick,
    triggerUpdate,
    isOnline: cloudStatus.isOnline,
    isConnectedToFirestore: cloudStatus.isConnectedToFirestore,
    isSyncing: cloudStatus.isSyncing,
    lastSyncTimestamp: cloudStatus.lastSyncTimestamp,
    offlineQueueCount: cloudStatus.pendingOfflineCount,
    activeDeviceId: cloudStatus.activeDeviceId,
    forceCloudSync,
    currentUser,
    login,
    logout,
    sessionSecondsLeft,
  };
}

