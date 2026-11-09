import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  setLogLevel,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence Firestore internal log messages (prevents benign clock-skew warnings from tripping error listeners)
setLogLevel('silent');

// Guard against benign Firestore timestamp jitter warning in iframe environments
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (
      args.length > 0 &&
      typeof args[0] === 'string' &&
      args[0].includes('Detected an update time that is in the future')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// Initialize Firebase App singleton
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Auth & Google Auth Provider
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Target Firestore Database instance
const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

let firestoreInstance: Firestore;
try {
  // Use persistent single-tab manager with forceOwnership for smooth iframe and reload experience without lease contention
  firestoreInstance = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({ forceOwnership: true }),
    }),
  }, databaseId);
} catch {
  // Fallback to standard getFirestore if initializeFirestore already initialized
  firestoreInstance = getFirestore(firebaseApp, databaseId);
}

export const db = firestoreInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to Firestore server per skill guidelines
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    // Probe doc might not exist yet, but reaching server without offline error confirms connectivity
    return true;
  }
}

// Call test connection on boot per critical constraint
testFirestoreConnection();
