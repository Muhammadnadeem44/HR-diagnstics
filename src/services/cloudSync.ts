import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, testFirestoreConnection } from '../firebase';
import { StorageService } from './storage';

export interface CloudSyncStatus {
  isOnline: boolean;
  isConnectedToFirestore: boolean;
  isSyncing: boolean;
  lastSyncTimestamp: number | null;
  pendingOfflineCount: number;
  activeDeviceId: string;
}

interface QueuedMutation {
  id: string;
  collectionName: string;
  docId: string;
  data?: any;
  action: 'set' | 'delete';
  timestamp: number;
}

// Map from StorageService key to Firestore collection name
export const SYNC_COLLECTIONS: { storageKey: string; collectionName: string; isSingleDoc?: boolean }[] = [
  { storageKey: 'hr_diag_inventory', collectionName: 'inventory' },
  { storageKey: 'hr_diag_inventory_usage', collectionName: 'inventory_usage' },
  { storageKey: 'hr_diag_transfers', collectionName: 'transfers' },
  { storageKey: 'hr_diag_pos', collectionName: 'purchase_orders' },
  { storageKey: 'hr_diag_grns', collectionName: 'grns' },
  { storageKey: 'hr_diag_vendor_invoices', collectionName: 'vendor_invoices' },
  { storageKey: 'hr_diag_assets', collectionName: 'assets' },
  { storageKey: 'hr_diag_maintenance_logs', collectionName: 'maintenance_logs' },
  { storageKey: 'hr_diag_branches', collectionName: 'branches' },
  { storageKey: 'hr_diag_warehouses', collectionName: 'warehouses' },
  { storageKey: 'hr_diag_departments', collectionName: 'departments' },
  { storageKey: 'hr_diag_vendors', collectionName: 'vendors' },
  { storageKey: 'hr_diag_audits', collectionName: 'audits' },
  { storageKey: 'hr_diag_narcotics', collectionName: 'narcotics' },
  { storageKey: 'hr_diag_recalls', collectionName: 'recalls' },
  { storageKey: 'hr_diag_temp_logs', collectionName: 'temp_logs' },
  { storageKey: 'hr_diag_audit_logs', collectionName: 'audit_logs' },
  { storageKey: 'hr_diag_approval_requests', collectionName: 'approval_requests' },
  { storageKey: 'hr_diag_notifications', collectionName: 'notifications' },
  { storageKey: 'hr_diag_users', collectionName: 'users' },
  { storageKey: 'hr_diag_test_protocols', collectionName: 'test_protocols' },
  { storageKey: 'hr_diag_test_logs', collectionName: 'test_logs' },
  { storageKey: 'hr_diag_branding', collectionName: 'system_branding', isSingleDoc: true },
  // Clinic Point of Sale (POS), Billing, Tokens & Radiology Real-Time Sync
  { storageKey: 'hr_diag_clinic_patients', collectionName: 'clinic_patients' },
  { storageKey: 'hr_diag_clinic_doctors', collectionName: 'clinic_doctors' },
  { storageKey: 'hr_diag_clinic_services', collectionName: 'clinic_services' },
  { storageKey: 'hr_diag_clinic_invoices', collectionName: 'clinic_invoices' },
  { storageKey: 'hr_diag_clinic_visits', collectionName: 'clinic_visits' },
  { storageKey: 'hr_diag_clinic_tokens', collectionName: 'clinic_tokens' },
  { storageKey: 'hr_diag_cash_shifts', collectionName: 'cash_shifts' },
  { storageKey: 'hr_diag_cash_expenses', collectionName: 'cash_expenses' },
  { storageKey: 'hr_diag_radiology_studies', collectionName: 'radiology_studies' },
  { storageKey: 'hr_diag_radiology_templates', collectionName: 'radiology_templates' },
  { storageKey: 'hr_diag_medical_shortcuts', collectionName: 'medical_shortcuts' },
];

const DEVICE_ID_KEY = 'hr_diag_device_id';
const QUEUE_KEY = 'hr_diag_firestore_offline_queue';

class CloudSyncService {
  private deviceId: string;
  private unsubscribers: Unsubscribe[] = [];
  private isInitialized = false;
  private isCurrentlyFlushing = false;
  private statusListeners: ((status: CloudSyncStatus) => void)[] = [];
  private syncStatus: CloudSyncStatus;

  constructor() {
    let savedDeviceId = '';
    try {
      savedDeviceId = localStorage.getItem(DEVICE_ID_KEY) || '';
    } catch {}
    if (!savedDeviceId) {
      savedDeviceId = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      try {
        localStorage.setItem(DEVICE_ID_KEY, savedDeviceId);
      } catch {}
    }
    this.deviceId = savedDeviceId;

    this.syncStatus = {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isConnectedToFirestore: false,
      isSyncing: false,
      lastSyncTimestamp: null,
      pendingOfflineCount: this.getPendingQueue().length,
      activeDeviceId: this.deviceId,
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  public getStatus(): CloudSyncStatus {
    return { ...this.syncStatus };
  }

  public subscribeStatus(listener: (status: CloudSyncStatus) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private updateStatus(partial: Partial<CloudSyncStatus>): void {
    const next = { ...this.syncStatus, ...partial };
    if (
      next.isOnline === this.syncStatus.isOnline &&
      next.isConnectedToFirestore === this.syncStatus.isConnectedToFirestore &&
      next.isSyncing === this.syncStatus.isSyncing &&
      next.lastSyncTimestamp === this.syncStatus.lastSyncTimestamp &&
      next.pendingOfflineCount === this.syncStatus.pendingOfflineCount &&
      next.activeDeviceId === this.syncStatus.activeDeviceId
    ) {
      return;
    }
    this.syncStatus = next;
    this.statusListeners.forEach((listener) => {
      try {
        listener(this.getStatus());
      } catch (err) {
        console.error('Error in sync status listener:', err);
      }
    });
  }

  /**
   * Initializes real-time two-way synchronization with Firestore
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Check network connectivity
    this.updateStatus({ isOnline: navigator.onLine });

    if (!navigator.onLine) {
      console.log('App starting in offline mode. Local cached state active.');
      return;
    }

    try {
      this.updateStatus({ isSyncing: true });
      const reachable = await testFirestoreConnection();
      this.updateStatus({ isConnectedToFirestore: reachable });

      // 2. Perform initial seed to cloud if cloud is empty (first deployment)
      await this.initialHydrateAndSeed();

      // 3. Process any pending offline mutation queue
      await this.flushOfflineQueue();

      // 4. Attach real-time Firestore listeners for all collections
      this.startRealtimeListeners();

      this.updateStatus({
        isSyncing: false,
        lastSyncTimestamp: Date.now(),
        pendingOfflineCount: this.getPendingQueue().length,
      });
    } catch (error) {
      console.warn('Cloud sync initialization encountered an error:', error);
      this.updateStatus({ isSyncing: false, isConnectedToFirestore: false });
    }
  }

  /**
   * Start real-time Firestore collection listeners (Multi-Branch & Multi-Device Live Sync)
   */
  private startRealtimeListeners(): void {
    // Unsubscribe any previous listeners
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    SYNC_COLLECTIONS.forEach(({ storageKey, collectionName, isSingleDoc }) => {
      try {
        if (isSingleDoc) {
          const docRef = doc(db, collectionName, 'current');
          const unsub = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const cloudData = docSnap.data();
              if (cloudData && cloudData._deviceId !== this.deviceId) {
                const localData = StorageService.get(storageKey, null);
                const localTimestamp = (localData as any)?._updatedAt || 0;
                const cloudTimestamp = cloudData._updatedAt || 0;

                // Conflict Resolution: Latest timestamp wins
                if (cloudTimestamp >= localTimestamp) {
                  StorageService.set(storageKey, cloudData, true, false);
                  this.notifyAppUpdate(storageKey);
                }
              }
            }
          }, (err) => console.warn(`Snapshot listener for ${collectionName} error:`, err));

          this.unsubscribers.push(unsub);
        } else {
          const colRef = collection(db, collectionName);
          const unsub = onSnapshot(colRef, (snapshot) => {
            let hasIncomingUpdates = false;
            const localArray: any[] = StorageService.get(storageKey, []) || [];
            const localMap = new Map<string, any>(localArray.map((item) => [item.id, item]));

            snapshot.docChanges().forEach((change) => {
              const docData = change.doc.data();
              const docId = change.doc.id;

              // Ignore mutations triggered directly by this device to avoid loops
              if (docData && docData._deviceId === this.deviceId) {
                return;
              }

              if (change.type === 'removed' || docData._deleted === true) {
                if (localMap.has(docId)) {
                  localMap.delete(docId);
                  hasIncomingUpdates = true;
                }
              } else if (change.type === 'added' || change.type === 'modified') {
                if (storageKey === 'hr_diag_users') {
                  const deletedUserIds = StorageService.getDeletedUserIds();
                  if (deletedUserIds.includes(docId)) return;
                  if (docData.email && docData.email.toLowerCase().includes('@hrdiagnostics.com')) return;
                }
                const localExisting = localMap.get(docId);
                const localTime = localExisting?._updatedAt || (localExisting?.updatedAt ? new Date(localExisting.updatedAt).getTime() : 0);
                const cloudTime = docData._updatedAt || (docData.updatedAt ? new Date(docData.updatedAt).getTime() : Date.now());

                // Conflict resolution: Latest timestamp wins
                if (!localExisting || cloudTime >= localTime) {
                  // Merge clean document into local state
                  localMap.set(docId, { ...docData, id: docId });
                  hasIncomingUpdates = true;
                }
              }
            });

            if (hasIncomingUpdates) {
              const updatedList = Array.from(localMap.values());
              // Update local storage without re-broadcasting cloud loop
              StorageService.set(storageKey, updatedList, true, false);
              this.notifyAppUpdate(storageKey);
              this.updateStatus({ lastSyncTimestamp: Date.now() });
            }
          }, (err) => {
            console.warn(`Snapshot listener for collection ${collectionName} warning:`, err);
          });

          this.unsubscribers.push(unsub);
        }
      } catch (err) {
        console.warn(`Failed to bind snapshot listener for ${collectionName}:`, err);
      }
    });
  }

  /**
   * Broadcast an in-app system update so all open tabs and components refresh their views
   */
  private notifyAppUpdate(storageKey: string): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hr-cloud-sync-update', {
          detail: { storageKey, timestamp: Date.now() },
        })
      );
    }
  }

  /**
   * Handle transitions between online and offline states
   */
  private async handleNetworkChange(isOnline: boolean): Promise<void> {
    this.updateStatus({ isOnline });

    if (isOnline) {
      console.log('Internet connectivity restored. Synchronizing pending offline mutations...');
      this.updateStatus({ isSyncing: true });
      try {
        const reachable = await testFirestoreConnection();
        this.updateStatus({ isConnectedToFirestore: reachable });
        await this.flushOfflineQueue();
        this.startRealtimeListeners();
        this.updateStatus({ isSyncing: false, lastSyncTimestamp: Date.now() });
      } catch (e) {
        console.warn('Re-sync failed on online event:', e);
        this.updateStatus({ isSyncing: false });
      }
    } else {
      console.log('Internet connection lost. Switching to local offline mode.');
      this.updateStatus({ isConnectedToFirestore: false, isSyncing: false });
    }
  }

  /**
   * Upload an item or update to Firestore with conflict resolution timestamp and device tag.
   * If offline or error, automatically queues locally.
   */
  public async syncRecord(
    storageKey: string,
    docId: string,
    data: any,
    action: 'set' | 'delete' = 'set'
  ): Promise<void> {
    const collConfig = SYNC_COLLECTIONS.find((c) => c.storageKey === storageKey);
    if (!collConfig) return;

    const timestamp = Date.now();
    const enrichedData = action === 'set' ? {
      ...data,
      id: docId,
      _updatedAt: timestamp,
      _deviceId: this.deviceId,
    } : { _deleted: true, _updatedAt: timestamp, _deviceId: this.deviceId };

    // If completely offline, enqueue immediately
    if (!navigator.onLine) {
      this.enqueueOfflineMutation({
        id: `${docId}_${timestamp}`,
        collectionName: collConfig.collectionName,
        docId,
        data: enrichedData,
        action,
        timestamp,
      });
      return;
    }

    try {
      if (collConfig.isSingleDoc) {
        const docRef = doc(db, collConfig.collectionName, 'current');
        await setDoc(docRef, enrichedData, { merge: true });
      } else {
        const docRef = doc(db, collConfig.collectionName, docId);
        if (action === 'delete') {
          // Set soft delete tombstone first, then permanently remove document
          await setDoc(docRef, { _deleted: true, _updatedAt: timestamp, _deviceId: this.deviceId }, { merge: true });
          try {
            await deleteDoc(docRef);
          } catch (delErr) {
            console.warn(`deleteDoc note for ${collConfig.collectionName}/${docId}:`, delErr);
          }
        } else {
          await setDoc(docRef, enrichedData, { merge: true });
        }
      }
      this.updateStatus({ lastSyncTimestamp: Date.now() });
    } catch (err) {
      console.warn(`Direct write to Firestore failed for ${collConfig.collectionName}/${docId}, enqueuing for offline retry:`, err);
      this.enqueueOfflineMutation({
        id: `${docId}_${timestamp}`,
        collectionName: collConfig.collectionName,
        docId,
        data: enrichedData,
        action,
        timestamp,
      });
    }
  }

  /**
   * Synchronize an entire collection array (e.g. after a bulk update or seed)
   */
  public async syncCollection(storageKey: string, items: any[]): Promise<void> {
    const collConfig = SYNC_COLLECTIONS.find((c) => c.storageKey === storageKey);
    if (!collConfig || !Array.isArray(items)) return;

    const timestamp = Date.now();
    for (const item of items) {
      if (item && item.id) {
        await this.syncRecord(storageKey, item.id, item, 'set');
      }
    }
  }

  /**
   * Queue mutation in localStorage for offline persistence
   */
  private enqueueOfflineMutation(mutation: QueuedMutation): void {
    const queue = this.getPendingQueue();
    // Replace any older pending mutation for the same document
    const filtered = queue.filter((m) => !(m.collectionName === mutation.collectionName && m.docId === mutation.docId));
    filtered.push(mutation);
    this.savePendingQueue(filtered);
    this.updateStatus({ pendingOfflineCount: filtered.length });
  }

  private getPendingQueue(): QueuedMutation[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private savePendingQueue(queue: QueuedMutation[]): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to save offline queue to localStorage:', err);
    }
  }

  /**
   * Flushes offline queue to Firestore once connection is active
   */
  public async flushOfflineQueue(): Promise<void> {
    if (this.isCurrentlyFlushing) return;
    const queue = this.getPendingQueue();
    if (queue.length === 0) return;

    this.isCurrentlyFlushing = true;
    this.updateStatus({ isSyncing: true });

    try {
      const remaining: QueuedMutation[] = [];
      for (const item of queue) {
        try {
          const docRef = doc(db, item.collectionName, item.docId);
          if (item.action === 'delete') {
            await setDoc(docRef, { _deleted: true, _updatedAt: item.timestamp, _deviceId: this.deviceId }, { merge: true });
          } else {
            await setDoc(docRef, { ...item.data, _updatedAt: item.timestamp, _deviceId: this.deviceId }, { merge: true });
          }
        } catch (err) {
          console.warn(`Failed to flush queued mutation ${item.id}:`, err);
          remaining.push(item);
        }
      }
      this.savePendingQueue(remaining);
      this.updateStatus({
        pendingOfflineCount: remaining.length,
        lastSyncTimestamp: Date.now(),
      });
    } finally {
      this.isCurrentlyFlushing = false;
      this.updateStatus({ isSyncing: false });
    }
  }

  /**
   * Initial check: If cloud database is empty, seed it with local configuration.
   * If cloud database has records, merge them into local storage with timestamp resolution.
   */
  private async initialHydrateAndSeed(): Promise<void> {
    try {
      // Check inventory collection as primary benchmark
      const inventoryRef = collection(db, 'inventory');
      const invSnap = await getDocs(inventoryRef);

      if (invSnap.empty) {
        // First cloud launch: Seed cloud from initial local storage catalog
        console.log('Firestore is empty. Seeding initial baseline data to Cloud Firestore...');
        for (const { storageKey, collectionName, isSingleDoc } of SYNC_COLLECTIONS) {
          const localData: any = StorageService.get<any>(storageKey, null);
          if (!localData) continue;

          if (isSingleDoc) {
            const docRef = doc(db, collectionName, 'current');
            await setDoc(docRef, { ...localData, _updatedAt: Date.now(), _deviceId: this.deviceId });
          } else if (Array.isArray(localData) && localData.length > 0) {
            // Write in batches of up to 400 to respect Firestore batch limits
            const batches: any[][] = [];
            for (let i = 0; i < localData.length; i += 400) {
              batches.push(localData.slice(i, i + 400));
            }
            for (const chunk of batches) {
              const batch = writeBatch(db);
              chunk.forEach((item) => {
                if (item && item.id) {
                  const docRef = doc(db, collectionName, item.id);
                  batch.set(docRef, { ...item, _updatedAt: Date.now(), _deviceId: this.deviceId });
                }
              });
              await batch.commit();
            }
          }
        }
        console.log('Initial cloud seeding completed successfully.');
      } else {
        // Cloud has existing data: Hydrate local collections from Cloud
        console.log('Hydrating local database from Cloud Firestore...');
        for (const { storageKey, collectionName, isSingleDoc } of SYNC_COLLECTIONS) {
          try {
            if (isSingleDoc) {
              const docRef = doc(db, collectionName, 'current');
              const snap = await getDocs(collection(db, collectionName));
              const currentDoc = snap.docs.find((d) => d.id === 'current');
              if (currentDoc && currentDoc.exists()) {
                const cloudData = currentDoc.data();
                StorageService.set(storageKey, cloudData, false, false);
              }
            } else {
              const snap = await getDocs(collection(db, collectionName));
              if (!snap.empty) {
                const deletedUserIds = StorageService.getDeletedUserIds();
                const cloudList = snap.docs
                  .map((d) => ({ ...d.data(), id: d.id }))
                  .filter((item: any) => {
                    if (item._deleted) return false;
                    if (storageKey === 'hr_diag_users') {
                      if (deletedUserIds.includes(item.id)) return false;
                      if (item.email && item.email.toLowerCase().includes('@hrdiagnostics.com')) {
                        deleteDoc(doc(db, 'users', item.id)).catch(() => {});
                        return false;
                      }
                      if (['usr_superadmin', 'usr_manager', 'usr_manager_gulberg', 'usr_pathologist', 'usr_inventory', 'usr_biomed', 'usr_tech', 'usr_store', 'usr_demo'].includes(item.id)) {
                        deleteDoc(doc(db, 'users', item.id)).catch(() => {});
                        return false;
                      }
                    }
                    return true;
                  });

                const localList: any[] = StorageService.get(storageKey, []) || [];
                const localMap = new Map<string, any>(localList.map((item) => [item.id, item]));

                // Merge with conflict resolution: latest timestamp wins
                cloudList.forEach((cItem: any) => {
                  const lItem = localMap.get(cItem.id);
                  const lTime = lItem?._updatedAt || (lItem?.updatedAt ? new Date(lItem.updatedAt).getTime() : 0);
                  const cTime = cItem._updatedAt || (cItem.updatedAt ? new Date(cItem.updatedAt).getTime() : Date.now());

                  if (!lItem || cTime >= lTime) {
                    localMap.set(cItem.id, cItem);
                  }
                });

                StorageService.set(storageKey, Array.from(localMap.values()), false, false);
              }
            }
          } catch (err) {
            console.warn(`Error hydrating ${collectionName}:`, err);
          }
        }
        this.notifyAppUpdate('all');
      }
    } catch (err) {
      console.warn('Initial cloud hydration note:', err);
    }
  }

  /**
   * Force manual synchronization trigger
   */
  public async forceSync(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline. Please connect to internet.');
    }
    this.updateStatus({ isSyncing: true });
    try {
      await this.flushOfflineQueue();
      this.updateStatus({
        isSyncing: false,
        lastSyncTimestamp: Date.now(),
        isConnectedToFirestore: true,
      });
    } catch (err) {
      this.updateStatus({ isSyncing: false });
      throw err;
    }
  }
}

export const cloudSyncService = new CloudSyncService();

// Bind StorageService with CloudSyncService so every local change automatically synchronizes to Firestore
StorageService.setSyncListener((key, value, meta) => {
  if (meta && meta.docId) {
    cloudSyncService.syncRecord(key, meta.docId, value, meta.action || 'set').catch((e) => console.warn('Sync error:', e));
  } else if (Array.isArray(value)) {
    cloudSyncService.syncCollection(key, value).catch((e) => console.warn('Collection sync error:', e));
  } else if (value && typeof value === 'object') {
    cloudSyncService.syncRecord(key, 'current', value, 'set').catch((e) => console.warn('Single doc sync error:', e));
  }
});
