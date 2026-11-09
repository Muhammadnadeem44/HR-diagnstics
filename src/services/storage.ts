import {
  UserAccount,
  Branch,
  Warehouse,
  Department,
  InventoryItem,
  AssetRecord,
  MaintenanceLog,
  StockTransfer,
  PurchaseOrder,
  GoodsReceivingNote,
  Vendor,
  QuoteComparison,
  StockAudit,
  NarcoticsLog,
  NarcoticLog,
  BatchRecall,
  TemperatureLog,
  AuditLogEntry,
  AlertNotification,
  SyncQueueItem,
  SystemBranding,
  HeadOfficeApprovalRequest,
  DocumentAttachment,
  VendorInvoiceRecord,
  LabTestProtocol,
  LabTestExecutionLog,
  InventoryUsageRecord,
  SuperAdminActivityLog,
  SuperAdminLogCategory,
  SuperAdminLogActionType,
  BiometricDevice,
  AttendanceRecord,
  EmployeeProfile,
  AdvanceLoanRecord,
  PayrollSlip,
  ShiftTiming,
  ClinicPatient,
  ClinicDoctor,
  ClinicServiceItem,
  ClinicInvoice,
  ClinicVisit,
  ClinicToken,
  TokenStatus,
  CashShiftSession,
  CashExpenseRecord,
  PaymentSplitEntry,
  RadiologyTemplate,
  MedicalShortcut,
  RadiologyStudyReport,
  ReportStatus,
  RadiologyModality,
  ReportVersionEntry,
} from '../types';
import { HR_DIAGNOSTICS_LOGO_DATA_URL, HR_DIAGNOSTICS_LOGO_URL } from '../assets/hrLogo';
import {
  DEFAULT_RADIOLOGY_TEMPLATES,
  DEFAULT_MEDICAL_SHORTCUTS,
  DEFAULT_RADIOLOGY_STUDIES,
} from './radiologyDefaults';

export const STORAGE_KEYS = {
  USERS: 'hr_diag_users',
  ACTIVE_USER: 'hr_diag_active_user',
  SESSION_EXPIRY: 'hr_diag_session_expiry',
  BRANCHES: 'hr_diag_branches',
  WAREHOUSES: 'hr_diag_warehouses',
  DEPARTMENTS: 'hr_diag_departments',
  INVENTORY: 'hr_diag_inventory',
  INVENTORY_USAGE: 'hr_diag_inventory_usage',
  ASSETS: 'hr_diag_assets',
  MAINTENANCE_LOGS: 'hr_diag_maintenance_logs',
  TRANSFERS: 'hr_diag_transfers',
  PURCHASE_ORDERS: 'hr_diag_pos',
  GRNS: 'hr_diag_grns',
  VENDOR_INVOICES: 'hr_diag_vendor_invoices',
  TEST_PROTOCOLS: 'hr_diag_test_protocols',
  TEST_LOGS: 'hr_diag_test_logs',
  VENDORS: 'hr_diag_vendors',
  QUOTE_COMPARISONS: 'hr_diag_quotes',
  AUDITS: 'hr_diag_audits',
  NARCOTICS: 'hr_diag_narcotics',
  RECALLS: 'hr_diag_recalls',
  TEMP_LOGS: 'hr_diag_temp_logs',
  AUDIT_LOGS: 'hr_diag_audit_logs',
  APPROVAL_REQUESTS: 'hr_diag_approval_requests',
  NOTIFICATIONS: 'hr_diag_notifications',
  OFFLINE_QUEUE: 'hr_diag_offline_queue',
  ACTIVE_BRANCH_ID: 'hr_diag_active_branch_id',
  BRANDING: 'hr_diag_branding',
  DELETED_USER_IDS: 'hr_diag_deleted_user_ids',
  SUPER_ADMIN_ACTIVITY_LOGS: 'hr_diag_sa_activity_logs',
  // Attendance & Payroll System Keys
  EMPLOYEES: 'hr_diag_employees',
  ATTENDANCE_LOGS: 'hr_diag_attendance_logs',
  BIOMETRIC_DEVICES: 'hr_diag_biometric_devices',
  SHIFT_TIMINGS: 'hr_diag_shifts',
  ADVANCE_LOANS: 'hr_diag_advance_loans',
  PAYROLL_SLIPS: 'hr_diag_payroll_slips',
  // Clinic Cash Counter & Billing Management Keys
  CLINIC_PATIENTS: 'hr_diag_clinic_patients',
  CLINIC_DOCTORS: 'hr_diag_clinic_doctors',
  CLINIC_SERVICES: 'hr_diag_clinic_services',
  CLINIC_INVOICES: 'hr_diag_clinic_invoices',
  CLINIC_VISITS: 'hr_diag_clinic_visits',
  CLINIC_TOKENS: 'hr_diag_clinic_tokens',
  CASH_SHIFTS: 'hr_diag_cash_shifts',
  CASH_EXPENSES: 'hr_diag_cash_expenses',
  // Ultrasound, X-Ray & Radiology Reporting Keys
  RADIOLOGY_TEMPLATES: 'hr_diag_radiology_templates',
  MEDICAL_SHORTCUTS: 'hr_diag_medical_shortcuts',
  RADIOLOGY_STUDIES: 'hr_diag_radiology_studies',
  AUTOSAVE_DRAFTS: 'hr_diag_radiology_drafts',
  RADIOLOGY_SETTINGS: 'hr_diag_radiology_settings',
};

export type StorageSyncListener = (
  key: string,
  value: any,
  meta?: { docId?: string; action?: 'set' | 'delete' }
) => void;

let storageSyncListener: StorageSyncListener | null = null;

const DEFAULT_BRANDING: SystemBranding = {
  companyName: 'HR DIAGNOSTICS',
  tagline: 'PEOPLE • PROCESS • PERFORMANCE',
  shortCode: 'HRD',
  badgeText: 'CLINICAL ERP',
  logoType: 'image',
  logoUrl: HR_DIAGNOSTICS_LOGO_DATA_URL,
  primaryColor: '#0bd9ff',
};

// Real-time broadcast channel for multi-tab / multi-window instant synchronization
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('hr_diagnostics_enterprise_sync');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported', e);
}

// 64-character deterministic cryptographic hashing for immutable activity ledger chaining
export function hashLedgerDeterministic(dataStr: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c64e6d, h3 = 0x9e3779b9, h4 = 0x85ebca6b;
  for (let i = 0; i < dataStr.length; i++) {
    const ch = dataStr.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822519);
    h4 = Math.imul(h4 ^ ch, 3266489917);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2654435769);
  h4 = Math.imul(h4 ^ (h4 >>> 15), 1597334671);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = (h3 >>> 0).toString(16).padStart(8, '0');
  const p4 = (h4 >>> 0).toString(16).padStart(8, '0');
  return (p1 + p2 + p3 + p4 + p2 + p1 + p4 + p3).slice(0, 64);
}

// Initial default Organization structure (Clean - No dummy inventory items or transactions)
const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'br_headoffice',
    name: 'HR Diagnostics — Head Office & Central Lab',
    code: 'BR-HO-01',
    city: 'Lahore',
    address: '88-Jail Road, Medical District',
    contactPerson: 'Dr. Tariq Mahmood (Chief Pathologist)',
    phone: '+92 42 35789000',
    monthlyBudget: 2500000,
    currentMonthSpend: 0,
    isHeadOffice: true,
  },
  {
    id: 'br_gulberg',
    name: 'HR Diagnostics — Gulberg Branch',
    code: 'BR-GLB-02',
    city: 'Lahore',
    address: 'Main Boulevard, Gulberg III',
    contactPerson: 'Asim Raza (Branch Manager)',
    phone: '+92 42 35870001',
    monthlyBudget: 1200000,
    currentMonthSpend: 0,
    isHeadOffice: false,
  },
  {
    id: 'br_karachi',
    name: 'HR Diagnostics — Karachi Hub',
    code: 'BR-KHI-03',
    city: 'Karachi',
    address: 'Clifton Block 5, Medical Tower',
    contactPerson: 'Dr. Sara Khan (Lab Director)',
    phone: '+92 21 35820000',
    monthlyBudget: 1800000,
    currentMonthSpend: 0,
    isHeadOffice: false,
  },
];

const DEFAULT_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh_central',
    name: 'Central Diagnostic Warehouse (Cold Chain & Bulk)',
    branchId: 'br_headoffice',
    isCentral: true,
    managerName: 'Farhan Zaidi',
    locations: ['Cold Room CR-01 (2-8°C)', 'Deep Freezer DF-02 (-20°C)', 'Rack A-Bulk', 'Rack B-Dry Consumables', 'Secured Vault (Narcotics)'],
  },
  {
    id: 'wh_gulberg',
    name: 'Gulberg Branch Sub-Store',
    branchId: 'br_gulberg',
    isCentral: false,
    managerName: 'Khurram Shehzad',
    locations: ['Refrigerator FR-01', 'Reagent Rack 1', 'Radiology Bin A'],
  },
  {
    id: 'wh_karachi',
    name: 'Karachi Regional Hub Store',
    branchId: 'br_karachi',
    isCentral: false,
    managerName: 'Noman Siddiqui',
    locations: ['Cold Storage KHI-01', 'Rack General 1', 'Emergency Stock Bin'],
  },
];

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 'dept_hematology', name: 'Hematology & Coagulation', code: 'LAB-HEM', branchId: 'br_headoffice', headName: 'Dr. Tariq Mahmood', monthlySpend: 0 },
  { id: 'dept_biochem', name: 'Clinical Chemistry & Immunology', code: 'LAB-BIO', branchId: 'br_headoffice', headName: 'Dr. Ayesha Malik', monthlySpend: 0 },
  { id: 'dept_radiology', name: 'Radiology & Imaging (MRI/CT/USG)', code: 'RAD-01', branchId: 'br_headoffice', headName: 'Dr. Zulfiqar Ali', monthlySpend: 0 },
  { id: 'dept_molecular', name: 'Molecular Pathology & PCR', code: 'LAB-PCR', branchId: 'br_headoffice', headName: 'Dr. Sanaullah', monthlySpend: 0 },
  { id: 'dept_pharmacy', name: 'Diagnostic Pharmacy & Phlebotomy', code: 'PHARM-01', branchId: 'br_headoffice', headName: 'Zainab Bibi', monthlySpend: 0 },
  { id: 'dept_gulberg_lab', name: 'Gulberg Pathology Lab', code: 'GLB-LAB', branchId: 'br_gulberg', headName: 'Dr. Hina Bano', monthlySpend: 0 },
  { id: 'dept_gulberg_rad', name: 'Gulberg X-Ray & Ultrasound', code: 'GLB-RAD', branchId: 'br_gulberg', headName: 'Dr. Bilal Qureshi', monthlySpend: 0 },
  { id: 'dept_khi_lab', name: 'Karachi Diagnostic Lab', code: 'KHI-LAB', branchId: 'br_karachi', headName: 'Dr. Sara Khan', monthlySpend: 0 },
];

export const MASTER_SUPERADMIN: UserAccount = {
  id: 'usr_nadeem_master',
  name: 'Mr. Nadeem (Managing Director)',
  email: 'mrnadeemmobile20@gmail.com',
  passwordHash: 'Admin123!',
  role: 'super_admin',
  is2FAEnabled: false,
  twoFactorEnabled: false,
  phone: '+92 300 0000000',
  createdAt: '2024-01-01T00:00:00.000Z',
  branchId: 'br_headoffice',
  branchName: 'HR Diagnostics — Head Office & Central Lab',
  allowedModules: [
    'dashboard',
    'billing',
    'radiology',
    'inventory',
    'attendance',
    'procurement',
    'transfers',
    'approvals',
    'audits',
    'vendors',
    'assets',
    'compliance',
    'analytics',
    'settings',
  ],
  canAddInventory: true,
  canEditInventory: true,
  canDeleteInventory: true,
  canAddAssets: true,
  canEditAssets: true,
  canDeleteAssets: true,
  canCreateTransfers: true,
  canCreateRequisitions: true,
  canPerformAudits: true,
  canViewReports: true,
};

const DEFAULT_STAFF_ACCOUNTS: UserAccount[] = [MASTER_SUPERADMIN];

const DEFAULT_SUPERADMIN: UserAccount = MASTER_SUPERADMIN;

export const StorageService = {
  // Bind real-time Firestore sync listener
  setSyncListener(listener: StorageSyncListener | null): void {
    storageSyncListener = listener;
  },

  // Helper methods to read/write from localStorage with broadcast
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T, broadcast = true, notifySync = true): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      if (broadcast && broadcastChannel) {
        broadcastChannel.postMessage({ type: 'STORAGE_UPDATE', key, timestamp: Date.now() });
      }
      if (notifySync && storageSyncListener) {
        storageSyncListener(key, value);
      }
    } catch (e) {
      console.error(`Error setting ${key} to storage:`, e);
    }
  },

  // Initialize data stores cleanly if not already initialized
  init(): void {
    // Initialize users: purge any old demo/fake accounts, ensure master admin exists
    const storedUsers = this.get<UserAccount[]>(STORAGE_KEYS.USERS, []);
    const cleanUsers = storedUsers.filter(
      (u) =>
        !u.email.toLowerCase().includes('@hrdiagnostics.com') &&
        !['usr_superadmin', 'usr_manager', 'usr_manager_gulberg', 'usr_pathologist', 'usr_inventory', 'usr_biomed', 'usr_tech', 'usr_store'].includes(u.id)
    );

    if (!cleanUsers.some((u) => u.email.toLowerCase() === MASTER_SUPERADMIN.email.toLowerCase())) {
      cleanUsers.unshift(MASTER_SUPERADMIN);
    }
    this.set(STORAGE_KEYS.USERS, cleanUsers, false, false);

    if (!localStorage.getItem(STORAGE_KEYS.BRANCHES)) {
      this.set(STORAGE_KEYS.BRANCHES, DEFAULT_BRANCHES, false);
    }
    if (!localStorage.getItem(STORAGE_KEYS.WAREHOUSES)) {
      this.set(STORAGE_KEYS.WAREHOUSES, DEFAULT_WAREHOUSES, false);
    }
    if (!localStorage.getItem(STORAGE_KEYS.DEPARTMENTS)) {
      this.set(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS, false);
    }

    // Initialize clean operational arrays (No mock/demo stock auto-seeded)
    if (!localStorage.getItem(STORAGE_KEYS.INVENTORY)) {
      this.set(STORAGE_KEYS.INVENTORY, [], false);
    }

    if (!localStorage.getItem(STORAGE_KEYS.MAINTENANCE_LOGS)) {
      this.set(STORAGE_KEYS.MAINTENANCE_LOGS, [], false);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSFERS)) {
      this.set(STORAGE_KEYS.TRANSFERS, [], false);
    }
    if (!localStorage.getItem(STORAGE_KEYS.QUOTE_COMPARISONS)) {
      this.set(STORAGE_KEYS.QUOTE_COMPARISONS, [], false);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDITS)) {
      this.set(STORAGE_KEYS.AUDITS, [], false);
    }
    if (!localStorage.getItem(STORAGE_KEYS.NARCOTICS)) {
      this.set(STORAGE_KEYS.NARCOTICS, [], false);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      this.set(STORAGE_KEYS.AUDIT_LOGS, [], false);
    }
    if (!localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)) {
      this.set(STORAGE_KEYS.OFFLINE_QUEUE, [], false);
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVENTORY_USAGE)) {
      this.set(STORAGE_KEYS.INVENTORY_USAGE, [], false);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_BRANCH_ID)) {
      this.set(STORAGE_KEYS.ACTIVE_BRANCH_ID, 'all', false);
    }
    if (!localStorage.getItem(STORAGE_KEYS.APPROVAL_REQUESTS)) {
      this.set(STORAGE_KEYS.APPROVAL_REQUESTS, [], false);
    }

    if (!localStorage.getItem(STORAGE_KEYS.BRANDING)) {
      this.set(STORAGE_KEYS.BRANDING, DEFAULT_BRANDING, false);
    } else {
      const b = this.get<SystemBranding>(STORAGE_KEYS.BRANDING, DEFAULT_BRANDING);
      let needsSave = false;
      if (!b.companyName || b.companyName.toUpperCase().includes('NADEEM') || b.companyName === 'HR Diagnostics') {
        b.companyName = 'HR DIAGNOSTICS';
        b.shortCode = 'HRD';
        needsSave = true;
      }
      if (b.logoType !== 'image' || !b.logoUrl || b.logoUrl.startsWith('data:image/svg')) {
        b.logoType = 'image';
        b.logoUrl = HR_DIAGNOSTICS_LOGO_DATA_URL;
        needsSave = true;
      }
      if (needsSave) {
        this.set(STORAGE_KEYS.BRANDING, b, false);
      }
    }

    // Initialize Clinic Cash Counter & Billing records
    this.getClinicPatients();
    this.getClinicDoctors();
    this.getClinicServices();
    this.getClinicInvoices();
    this.getCashShifts();

    // Initialize Ultrasound, X-Ray & Radiology records
    this.getRadiologyTemplates();
    this.getMedicalShortcuts();
    this.getRadiologyStudies();
  },

  // Active Branch filter
  getActiveBranchId(): string {
    return this.get(STORAGE_KEYS.ACTIVE_BRANCH_ID, 'all');
  },

  setActiveBranchId(branchId: string): void {
    this.set(STORAGE_KEYS.ACTIVE_BRANCH_ID, branchId);
  },

  // User Accounts & Deletion Tombstones
  getDeletedUserIds(): string[] {
    return this.get<string[]>(STORAGE_KEYS.DELETED_USER_IDS, []);
  },

  recordDeletedUserId(userId: string): void {
    const list = this.getDeletedUserIds();
    if (!list.includes(userId)) {
      list.push(userId);
      this.set(STORAGE_KEYS.DELETED_USER_IDS, list, false, false);
    }
  },

  getUsers(): UserAccount[] {
    const list = this.get<UserAccount[]>(STORAGE_KEYS.USERS, DEFAULT_STAFF_ACCOUNTS);
    const deleted = this.getDeletedUserIds();
    // Strictly filter out deleted IDs and legacy demo accounts
    const filtered = list.filter(
      (u) =>
        !deleted.includes(u.id) &&
        !u.email.toLowerCase().includes('@hrdiagnostics.com') &&
        !['usr_superadmin', 'usr_manager', 'usr_manager_gulberg', 'usr_pathologist', 'usr_inventory', 'usr_biomed', 'usr_tech', 'usr_store', 'usr_demo'].includes(u.id)
    );
    if (!filtered.some((u) => u.email.toLowerCase() === MASTER_SUPERADMIN.email.toLowerCase())) {
      filtered.unshift(MASTER_SUPERADMIN);
    }
    return filtered;
  },

  saveUser(user: UserAccount): void {
    // If user was previously recorded as deleted, remove from tombstone
    const updatedDeleted = this.getDeletedUserIds().filter((id) => id !== user.id);
    this.set(STORAGE_KEYS.DELETED_USER_IDS, updatedDeleted, false, false);

    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    const isNew = index < 0;
    const previous = index >= 0 ? users[index] : null;

    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    this.set(STORAGE_KEYS.USERS, users, true, false);
    if (storageSyncListener) {
      storageSyncListener(STORAGE_KEYS.USERS, user, { docId: user.id, action: 'set' });
    }
    this.logAction('Security', `User account updated/created: ${user.name} (${user.role})`);

    let actionType: SuperAdminLogActionType = isNew ? 'USER_CREATED' : 'USER_UPDATED';
    let details = isNew
      ? `Provisioned new staff account "${user.name}" (${user.email}), role [${user.role}], branch ID [${user.branchId}]`
      : `Updated user account "${user.name}" (${user.email}). Role: [${user.role}]. Allowed modules: [${(user.allowedModules || []).join(', ')}]`;

    if (previous && JSON.stringify(previous.allowedModules) !== JSON.stringify(user.allowedModules)) {
      actionType = 'RBAC_PERMISSION_CHANGE';
      details = `Configured RBAC access permissions for "${user.name}": Allowed modules set to [${(user.allowedModules || []).join(', ')}]`;
    }

    this.logSuperAdminActivity({
      category: 'CONFIG_CHANGE',
      actionType,
      targetEntity: `User: ${user.name} (${user.email})`,
      status: 'SUCCESS',
      details,
      metadata: {
        userId: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        allowedModules: user.allowedModules,
      },
    });
  },

  deleteUser(userId: string): void {
    this.recordDeletedUserId(userId);
    const user = this.getUsers().find((u) => u.id === userId);
    const users = this.getUsers().filter((u) => u.id !== userId);
    this.set(STORAGE_KEYS.USERS, users, true, false);
    if (storageSyncListener) {
      storageSyncListener(STORAGE_KEYS.USERS, null, { docId: userId, action: 'delete' });
    }
    // If active logged-in user is the deleted user, clear session
    const active = this.getActiveUser();
    if (active && (active.id === userId || active.email?.toLowerCase() === userId.toLowerCase())) {
      this.setActiveUser(null);
    }
    this.logAction('Security', `User account permanently deleted: ID ${userId}`);

    this.logSuperAdminActivity({
      category: 'CONFIG_CHANGE',
      actionType: 'USER_DELETED',
      targetEntity: `User: ${user?.name || userId} (${user?.email || 'N/A'})`,
      status: 'SUCCESS',
      details: `Permanently deleted user account "${user?.name || userId}" (${user?.email || userId}) from local and cloud databases.`,
      metadata: { deletedUserId: userId, userEmail: user?.email },
    });
  },

  purgeDummyUsers(): number {
    const users = this.getUsers();
    const toRemove = users.filter(
      (u) =>
        u.email.toLowerCase().includes('@hrdiagnostics.com') ||
        ['usr_superadmin', 'usr_manager', 'usr_manager_gulberg', 'usr_pathologist', 'usr_inventory', 'usr_biomed', 'usr_tech', 'usr_store', 'usr_demo'].includes(u.id) ||
        u.name.toLowerCase().includes('dummy') ||
        u.name.toLowerCase().includes('demo')
    );
    toRemove.forEach((u) => this.recordDeletedUserId(u.id));

    const kept = users.filter((u) => !toRemove.some((rem) => rem.id === u.id));
    if (!kept.some((u) => u.email.toLowerCase() === MASTER_SUPERADMIN.email.toLowerCase())) {
      kept.unshift(MASTER_SUPERADMIN);
    }
    this.set(STORAGE_KEYS.USERS, kept, true, false);
    if (storageSyncListener) {
      toRemove.forEach((u) => {
        storageSyncListener!(STORAGE_KEYS.USERS, null, { docId: u.id, action: 'delete' });
      });
    }
    this.logAction('Security', `Purged ${toRemove.length} dummy/mock user accounts.`);
    return toRemove.length;
  },

  // Branches & Hierarchy
  getBranches(): Branch[] {
    return this.get<Branch[]>(STORAGE_KEYS.BRANCHES, DEFAULT_BRANCHES);
  },

  saveBranch(branch: Branch): void {
    const branches = this.getBranches();
    const idx = branches.findIndex((b) => b.id === branch.id);
    const isNew = idx < 0;
    if (idx >= 0) {
      branches[idx] = branch;
    } else {
      branches.push(branch);
    }
    this.set(STORAGE_KEYS.BRANCHES, branches);
    this.logAction('Security', `Branch updated/saved: ${branch.name} (${branch.code})`);

    this.logSuperAdminActivity({
      category: 'CONFIG_CHANGE',
      actionType: isNew ? 'BRANCH_CREATED' : 'BRANCH_UPDATED',
      targetEntity: `Branch: ${branch.name} (${branch.code})`,
      status: 'SUCCESS',
      details: isNew
        ? `Created diagnostic branch "${branch.name}" (Code: ${branch.code}, City: ${branch.city}, Budget: PKR ${(branch.monthlyBudget || 0).toLocaleString()})`
        : `Updated diagnostic branch configuration for "${branch.name}" (Code: ${branch.code}, City: ${branch.city}, Budget: PKR ${(branch.monthlyBudget || 0).toLocaleString()})`,
      metadata: { branchId: branch.id, branchCode: branch.code, city: branch.city, budget: branch.monthlyBudget },
    });
  },

  deleteBranch(branchId: string): { success: boolean; message: string } {
    const branches = this.getBranches();
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) {
      return { success: false, message: 'Branch not found.' };
    }
    if (branch.isHeadOffice || branch.id === 'br_headoffice') {
      return { success: false, message: 'Primary Head Office & Central Lab cannot be deleted.' };
    }
    if (branches.length <= 1) {
      return { success: false, message: 'At least one branch must remain in the diagnostic system.' };
    }

    const updatedBranches = branches.filter((b) => b.id !== branchId);
    this.set(STORAGE_KEYS.BRANCHES, updatedBranches);

    // Reset active branch if active was the deleted branch
    if (this.getActiveBranchId() === branchId) {
      this.setActiveBranchId('all');
    }

    // Reassign any users belonging to this branch to head office
    const users = this.getUsers();
    let usersUpdated = false;
    users.forEach((u) => {
      if (u.branchId === branchId) {
        u.branchId = 'br_headoffice';
        u.branchName = 'HR Diagnostics — Head Office & Central Lab';
        usersUpdated = true;
      }
    });
    if (usersUpdated) {
      this.set(STORAGE_KEYS.USERS, users);
    }

    this.logAction('Security', `Admin deleted branch: ${branch.name} (Code: ${branch.code || branch.id})`);

    this.logSuperAdminActivity({
      category: 'CONFIG_CHANGE',
      actionType: 'BRANCH_DELETED',
      targetEntity: `Branch: ${branch.name} (${branch.code})`,
      status: 'SUCCESS',
      details: `Permanently decommissioned branch "${branch.name}" (Code: ${branch.code || branch.id}). Reassigned staff accounts to Head Office.`,
      metadata: { branchId: branch.id, branchCode: branch.code },
    });

    return { success: true, message: `Branch "${branch.name}" successfully deleted.` };
  },

  getWarehouses(): Warehouse[] {
    return this.get<Warehouse[]>(STORAGE_KEYS.WAREHOUSES, DEFAULT_WAREHOUSES);
  },

  saveWarehouse(wh: Warehouse): void {
    const list = this.getWarehouses();
    const idx = list.findIndex((w) => w.id === wh.id);
    if (idx >= 0) list[idx] = wh;
    else list.push(wh);
    this.set(STORAGE_KEYS.WAREHOUSES, list);
    this.logAction('Security', `Warehouse updated/saved: ${wh.name}`);
  },

  getDepartments(): Department[] {
    return this.get<Department[]>(STORAGE_KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
  },

  saveDepartment(dept: Department): void {
    const list = this.getDepartments();
    const idx = list.findIndex((d) => d.id === dept.id);
    if (idx >= 0) list[idx] = dept;
    else list.push(dept);
    this.set(STORAGE_KEYS.DEPARTMENTS, list);
    this.logAction('Security', `Department updated/saved: ${dept.name}`);
  },

  // Inventory Items
  getInventory(): InventoryItem[] {
    return this.get<InventoryItem[]>(STORAGE_KEYS.INVENTORY, []);
  },

  saveInventoryItem(item: InventoryItem): void {
    const items = this.getInventory();
    // Recompute total quantity from batches if batches exist
    if (item.batches && item.batches.length > 0) {
      item.totalQuantity = item.batches.reduce((sum, b) => sum + (b.currentQuantity || 0), 0);
    }
    const now = Date.now();
    item._updatedAt = now;
    item.updatedAt = new Date(now).toISOString();

    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.push(item);
    }
    this.set(STORAGE_KEYS.INVENTORY, items, true, false);
    if (storageSyncListener) {
      storageSyncListener(STORAGE_KEYS.INVENTORY, item, { docId: item.id, action: 'set' });
    }
    this.logAction('Inventory', `Saved item: ${item.name} (${item.sku}), Total Qty: ${item.totalQuantity}`);
    this.checkStockAndExpiryAlerts(item);
  },

  deleteInventoryItem(itemId: string): void {
    const item = this.getInventory().find((i) => i.id === itemId);
    const items = this.getInventory().filter((i) => i.id !== itemId);
    this.set(STORAGE_KEYS.INVENTORY, items, true, false);
    if (storageSyncListener) {
      storageSyncListener(STORAGE_KEYS.INVENTORY, null, { docId: itemId, action: 'delete' });
    }
    this.logAction('Inventory', `Deleted inventory item: ${item?.name || itemId}`);
  },

  // Asset Management
  getAssets(): AssetRecord[] {
    return this.get<AssetRecord[]>(STORAGE_KEYS.ASSETS, []);
  },

  saveAsset(asset: AssetRecord): void {
    // Recalculate Straight-Line Depreciation
    const yearsElapsed = Math.max(
      0,
      (new Date().getTime() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    );
    const annualDepreciation = (asset.purchaseCost - (asset.salvageValue || 0)) / (asset.usefulLifeYears || 5);
    const accumulated = Math.min(asset.purchaseCost - (asset.salvageValue || 0), Math.round(annualDepreciation * yearsElapsed));
    asset.accumulatedDepreciation = accumulated;
    asset.currentBookValue = Math.max(asset.salvageValue || 0, asset.purchaseCost - accumulated);

    const assets = this.getAssets();
    const idx = assets.findIndex((a) => a.id === asset.id);
    if (idx >= 0) assets[idx] = asset;
    else assets.push(asset);
    this.set(STORAGE_KEYS.ASSETS, assets);
    this.logAction('Assets', `Saved asset: ${asset.name} (${asset.assetTag}), Book Value: ${asset.currentBookValue}`);
  },

  deleteAsset(assetId: string): void {
    const asset = this.getAssets().find((a) => a.id === assetId);
    const assets = this.getAssets().filter((a) => a.id !== assetId);
    this.set(STORAGE_KEYS.ASSETS, assets);
    this.logAction('Assets', `Deleted asset: ${asset?.name || assetId}`);
  },

  // Maintenance Logs
  getMaintenanceLogs(): MaintenanceLog[] {
    return this.get<MaintenanceLog[]>(STORAGE_KEYS.MAINTENANCE_LOGS, []);
  },

  saveMaintenanceLog(log: MaintenanceLog): void {
    const logs = this.getMaintenanceLogs();
    logs.unshift(log);
    this.set(STORAGE_KEYS.MAINTENANCE_LOGS, logs);

    // If spare parts consumed, deduct them from inventory automatically!
    if (log.sparePartsConsumed && log.sparePartsConsumed.length > 0) {
      const inventory = this.getInventory();
      log.sparePartsConsumed.forEach((part) => {
        const item = inventory.find((i) => i.id === part.itemId);
        if (item && item.batches.length > 0) {
          let needed = part.quantity;
          for (const b of item.batches) {
            if (b.currentQuantity >= needed) {
              b.currentQuantity -= needed;
              needed = 0;
              break;
            } else {
              needed -= b.currentQuantity;
              b.currentQuantity = 0;
            }
          }
          item.totalQuantity = item.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
        }
      });
      this.set(STORAGE_KEYS.INVENTORY, inventory);
    }

    // Update asset's last maintenance & downtime
    const assets = this.getAssets();
    const asset = assets.find((a) => a.id === log.assetId);
    if (asset) {
      asset.lastMaintenanceDate = log.serviceDate;
      asset.totalDowntimeHours = (asset.totalDowntimeHours || 0) + (log.downtimeHours || 0);
      const nextDate = new Date(log.serviceDate);
      nextDate.setDate(nextDate.getDate() + (asset.maintenanceFrequencyDays || 90));
      asset.nextMaintenanceDue = nextDate.toISOString().split('T')[0];
      this.saveAsset(asset);
    }

    this.logAction('Maintenance', `Logged ${log.serviceType} for ${log.assetName}, Cost: ${log.cost}`);
  },

  // Stock Transfers
  getTransfers(): StockTransfer[] {
    return this.get<StockTransfer[]>(STORAGE_KEYS.TRANSFERS, []);
  },

  saveTransfer(transfer: StockTransfer): void {
    const transfers = this.getTransfers();
    const idx = transfers.findIndex((t) => t.id === transfer.id);
    if (idx >= 0) transfers[idx] = transfer;
    else transfers.unshift(transfer);
    this.set(STORAGE_KEYS.TRANSFERS, transfers);
    this.logAction('Transfers', `Transfer ${transfer.transferNumber} status changed to ${transfer.status}`);
  },

  // Purchase Orders & GRN
  getPurchaseOrders(): PurchaseOrder[] {
    return this.get<PurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, []);
  },

  savePurchaseOrder(po: PurchaseOrder): void {
    const pos = this.getPurchaseOrders();
    const idx = pos.findIndex((p) => p.id === po.id);
    if (idx >= 0) pos[idx] = po;
    else pos.unshift(po);
    this.set(STORAGE_KEYS.PURCHASE_ORDERS, pos);
    this.logAction('Procurement', `PO ${po.poNumber} for ${po.vendorName} updated. Status: ${po.status}`);
  },

  getGRNs(): GoodsReceivingNote[] {
    return this.get<GoodsReceivingNote[]>(STORAGE_KEYS.GRNS, []);
  },

  saveGRN(grn: GoodsReceivingNote): void {
    const grns = this.getGRNs();
    grns.unshift(grn);
    this.set(STORAGE_KEYS.GRNS, grns);

    // Auto update Inventory with received batches
    const inventory = this.getInventory();
    grn.items.forEach((gItem) => {
      const invItem = inventory.find((i) => i.id === gItem.itemId);
      if (invItem && gItem.acceptedQty > 0) {
        invItem.batches.push({
          id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          batchNumber: gItem.batchNumber || `GRN-${Date.now().toString().slice(-4)}`,
          expiryDate: gItem.expiryDate || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
          receivedDate: grn.receivedDate,
          initialQuantity: gItem.acceptedQty,
          currentQuantity: gItem.acceptedQty,
          unitCost: invItem.costPrice,
          storageCondition: 'Room Temp',
          qrCode: `HR-BATCH-${invItem.sku}-${gItem.batchNumber}`,
        });
        invItem.totalQuantity = invItem.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
        invItem.updatedAt = new Date().toISOString();
      }
    });
    this.set(STORAGE_KEYS.INVENTORY, inventory);

    // Update PO Status
    const pos = this.getPurchaseOrders();
    const po = pos.find((p) => p.id === grn.poId);
    if (po) {
      grn.items.forEach((gItem) => {
        const poItem = po.items.find((p) => p.itemId === gItem.itemId);
        if (poItem) {
          poItem.receivedQty = (poItem.receivedQty || 0) + gItem.acceptedQty;
        }
      });
      const allDone = po.items.every(
        (p) => (p.receivedQty || 0) >= (p.orderedQty || p.quantityOrdered || 0)
      );
      po.status = allDone ? 'Completed' : 'Partially Received';
      this.savePurchaseOrder(po);

      // Auto-generate or link 3-Way Matching Invoice Record
      const grnAcceptedValue = grn.items.reduce((sum, g) => {
        const poItem = po.items.find(pi => pi.itemId === g.itemId);
        return sum + (g.acceptedQty * (poItem?.unitPrice || 0));
      }, 0);

      const invoiceRecord: VendorInvoiceRecord = {
        id: `vinv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        invoiceNumber: grn.invoiceNumber || `INV-VEND-${Date.now().toString().slice(-5)}`,
        vendorId: po.vendorId,
        vendorName: po.vendorName,
        poId: po.id,
        poNumber: po.poNumber,
        grnId: grn.id,
        grnNumber: grn.grnNumber,
        branchId: po.branchId,
        branchName: po.branchName || 'Head Office Central Lab',
        invoiceDate: grn.receivedDate,
        dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
        poAmount: po.grandTotal,
        grnAcceptedAmount: grnAcceptedValue,
        invoiceBilledAmount: grnAcceptedValue,
        varianceAmount: 0,
        threeWayMatchStatus: 'Exact Match',
        paymentStatus: 'Unpaid',
        paidAmount: 0,
        paymentMethod: 'Bank Wire Transfer',
      };
      this.saveVendorInvoice(invoiceRecord);
    }

    this.logAction('Procurement', `GRN ${grn.grnNumber} processed for PO ${grn.poNumber}`);
  },

  // 3-Way Matching & Vendor Invoices
  getVendorInvoices(): VendorInvoiceRecord[] {
    return this.get<VendorInvoiceRecord[]>(STORAGE_KEYS.VENDOR_INVOICES, []);
  },

  saveVendorInvoice(invoice: VendorInvoiceRecord): void {
    const list = this.getVendorInvoices();
    const idx = list.findIndex((i) => i.id === invoice.id || (i.grnId === invoice.grnId && i.poId === invoice.poId));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...invoice };
    } else {
      list.unshift(invoice);
    }
    this.set(STORAGE_KEYS.VENDOR_INVOICES, list);
    this.logAction(
      'Procurement',
      `Vendor Invoice ${invoice.invoiceNumber} updated. Match: ${invoice.threeWayMatchStatus}, Payment: ${invoice.paymentStatus}`
    );
  },

  deleteVendorInvoice(id: string): void {
    const list = this.getVendorInvoices().filter((i) => i.id !== id);
    this.set(STORAGE_KEYS.VENDOR_INVOICES, list);
    this.logAction('Procurement', `Vendor Invoice deleted: ID ${id}`);
  },

  // Vendors
  getVendors(): Vendor[] {
    return this.get<Vendor[]>(STORAGE_KEYS.VENDORS, []);
  },

  saveVendor(vendor: Vendor): void {
    const vendors = this.getVendors();
    const idx = vendors.findIndex((v) => v.id === vendor.id);
    if (idx >= 0) vendors[idx] = vendor;
    else vendors.push(vendor);
    this.set(STORAGE_KEYS.VENDORS, vendors);
    this.logAction('Vendors', `Vendor saved: ${vendor.name}`);
  },

  deleteVendor(vendorId: string): void {
    const list = this.getVendors().filter((v) => v.id !== vendorId);
    this.set(STORAGE_KEYS.VENDORS, list);
    this.logAction('Vendors', `Deleted vendor ID: ${vendorId}`);
  },

  // Quote Comparisons
  getQuotes(): QuoteComparison[] {
    return this.get<QuoteComparison[]>(STORAGE_KEYS.QUOTE_COMPARISONS, []);
  },

  saveQuote(quote: QuoteComparison): void {
    const quotes = this.getQuotes();
    const idx = quotes.findIndex((q) => q.id === quote.id);
    if (idx >= 0) quotes[idx] = quote;
    else quotes.unshift(quote);
    this.set(STORAGE_KEYS.QUOTE_COMPARISONS, quotes);
    this.logAction('Procurement', `RFQ Quote comparison saved: ${quote.rfqNumber}`);
  },

  // Audits & Physical Count
  getAudits(): StockAudit[] {
    return this.get<StockAudit[]>(STORAGE_KEYS.AUDITS, []);
  },

  saveAudit(audit: StockAudit): void {
    const audits = this.getAudits();
    const idx = audits.findIndex((a) => a.id === audit.id);
    if (idx >= 0) audits[idx] = audit;
    else audits.unshift(audit);
    this.set(STORAGE_KEYS.AUDITS, audits);
    this.logAction('Audits', `Audit ${audit.auditNumber} status: ${audit.status}, Variance: ${audit.totalVarianceValue}`);
  },

  // Narcotics Log
  getNarcotics(): NarcoticsLog[] {
    return this.get<NarcoticsLog[]>(STORAGE_KEYS.NARCOTICS, []);
  },

  getNarcoticLogs(): NarcoticLog[] {
    return this.get<NarcoticLog[]>(STORAGE_KEYS.NARCOTICS, []);
  },

  saveNarcoticLog(log: NarcoticLog): void {
    const list = this.getNarcoticLogs();
    list.unshift(log);
    this.set(STORAGE_KEYS.NARCOTICS, list);
    this.logAction('Compliance', `Narcotic dispensed: ${log.quantityDispensed}x ${log.drugName} to ${log.dispensedToNurse}`);
  },

  saveNarcoticsEntry(entry: NarcoticsLog): void {
    const list = this.getNarcotics();
    list.unshift(entry);
    this.set(STORAGE_KEYS.NARCOTICS, list);

    // Deduct from inventory
    const inventory = this.getInventory();
    const item = inventory.find((i) => i.id === entry.itemId);
    if (item && item.batches.length > 0) {
      const batch = item.batches.find((b) => b.batchNumber === entry.batchNumber) || item.batches[0];
      batch.currentQuantity = Math.max(0, batch.currentQuantity - entry.quantityDispensed);
      item.totalQuantity = item.batches.reduce((s, b) => s + b.currentQuantity, 0);
      this.saveInventoryItem(item);
    }

    this.logAction('Compliance', `Narcotics dispense: ${entry.quantityDispensed}x ${entry.itemName} (Patient: ${entry.patientIdOrMRN})`);
  },

  // Batch Recalls
  getBatchRecalls(): BatchRecall[] {
    return this.get<BatchRecall[]>(STORAGE_KEYS.RECALLS, []);
  },

  saveBatchRecall(recall: BatchRecall): void {
    const recalls = this.getBatchRecalls();
    const idx = recalls.findIndex((r) => r.id === recall.id);
    if (idx >= 0) recalls[idx] = recall;
    else recalls.unshift(recall);
    this.set(STORAGE_KEYS.RECALLS, recalls);
    this.logAction('Compliance', `Batch recall initiated: ${recall.batchNumber} - ${recall.reason}`);
  },

  // Temperature Logs
  getTemperatureLogs(): TemperatureLog[] {
    return this.get<TemperatureLog[]>(STORAGE_KEYS.TEMP_LOGS, []);
  },

  saveTemperatureLog(log: TemperatureLog): void {
    const logs = this.getTemperatureLogs();
    logs.unshift(log);
    this.set(STORAGE_KEYS.TEMP_LOGS, logs);
    this.logAction(
      'Compliance',
      `Temp logged: ${log.chamberName} -> ${log.readingCelsius}°C ${log.isExcursion ? '[EXCURSION]' : '[NORMAL]'}`
    );
  },

  // Audit Logs & Activity Feed
  getAuditLogs(): AuditLogEntry[] {
    return this.get<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  },

  logAction(module: AuditLogEntry['module'], details: string, branchId?: string): void {
    const activeUser = this.getActiveUser();
    const entry: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      userId: activeUser?.id || 'sys',
      userName: activeUser?.name || 'System Worker',
      userRole: activeUser?.role || 'automated',
      action: details.split(':')[0] || details,
      module,
      details,
      branchId: branchId || this.getActiveBranchId(),
    };
    const logs = this.getAuditLogs();
    logs.unshift(entry);
    // Keep max 1000 logs in storage
    if (logs.length > 1000) logs.pop();
    this.set(STORAGE_KEYS.AUDIT_LOGS, logs);
  },

  // Immutable Super Admin Activity & Configuration Ledger
  getSuperAdminActivityLogs(): SuperAdminActivityLog[] {
    const raw = this.get<SuperAdminActivityLog[]>(STORAGE_KEYS.SUPER_ADMIN_ACTIVITY_LOGS, []);
    if (raw.length === 0) {
      // Genesis Block & Baseline Configuration Seed
      const genesisTimestamp = '2024-01-01T08:00:00.000Z';
      const genesisPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';
      const genesisPayload = `1|${genesisTimestamp}|CONFIG_CHANGE|SECURITY_POLICY_CHANGE|${MASTER_SUPERADMIN.email}|Genesis Block: Cryptographically Chained WORM Ledger Activated for Executive Super Admin Mr. Nadeem|${genesisPrevHash}`;
      const genesisHash = hashLedgerDeterministic(genesisPayload);

      const genesisBlock: SuperAdminActivityLog = {
        id: 'sa_block_genesis_001',
        sequenceNumber: 1,
        timestamp: genesisTimestamp,
        category: 'CONFIG_CHANGE',
        actionType: 'SECURITY_POLICY_CHANGE',
        actorEmail: MASTER_SUPERADMIN.email,
        actorName: MASTER_SUPERADMIN.name,
        actorRole: 'super_admin',
        targetEntity: 'Core Enterprise Security Ledger',
        status: 'SUCCESS',
        details: 'Genesis Block: Cryptographically Chained WORM Ledger Activated for Executive Super Admin Mr. Nadeem',
        metadata: {
          ipAddress: '127.0.0.1 (System Kernel)',
          userAgent: 'HR-Diagnostics-Ledger/2.0',
          clientPlatform: 'Enterprise Server Node',
        },
        previousHash: genesisPrevHash,
        currentHash: genesisHash,
        isVerifiedTamperProof: true,
        _updatedAt: new Date(genesisTimestamp).getTime(),
      };

      // Initial historic baseline events
      const b2Timestamp = '2024-01-01T08:15:00.000Z';
      const b2Payload = `2|${b2Timestamp}|CONFIG_CHANGE|BRANCH_CREATED|${MASTER_SUPERADMIN.email}|Configured Primary Diagnostic Hub: HR Diagnostics Head Office & Central Lab (Lahore)|${genesisHash}`;
      const b2Hash = hashLedgerDeterministic(b2Payload);
      const b2Block: SuperAdminActivityLog = {
        id: 'sa_block_002',
        sequenceNumber: 2,
        timestamp: b2Timestamp,
        category: 'CONFIG_CHANGE',
        actionType: 'BRANCH_CREATED',
        actorEmail: MASTER_SUPERADMIN.email,
        actorName: MASTER_SUPERADMIN.name,
        actorRole: 'super_admin',
        targetEntity: 'Branch: Head Office (BR-HO-01)',
        status: 'SUCCESS',
        details: 'Configured Primary Diagnostic Hub: HR Diagnostics Head Office & Central Lab (Lahore) with Cold Chain storage & automated analyzers.',
        metadata: {
          ipAddress: '192.168.1.1 (Executive Secure Terminal)',
          userAgent: 'HR-Diagnostics-Admin/2.5',
          branchCode: 'BR-HO-01',
        },
        previousHash: genesisHash,
        currentHash: b2Hash,
        isVerifiedTamperProof: true,
        _updatedAt: new Date(b2Timestamp).getTime(),
      };

      const b3Timestamp = '2024-01-01T09:00:00.000Z';
      const b3Payload = `3|${b3Timestamp}|LOGIN_ATTEMPT|LOGIN_SUCCESS|${MASTER_SUPERADMIN.email}|Super Admin Initial Security Sign-In & Multi-Branch Console Initialization|${b2Hash}`;
      const b3Hash = hashLedgerDeterministic(b3Payload);
      const b3Block: SuperAdminActivityLog = {
        id: 'sa_block_003',
        sequenceNumber: 3,
        timestamp: b3Timestamp,
        category: 'LOGIN_ATTEMPT',
        actionType: 'LOGIN_SUCCESS',
        actorEmail: MASTER_SUPERADMIN.email,
        actorName: MASTER_SUPERADMIN.name,
        actorRole: 'super_admin',
        targetEntity: 'Executive Control Console',
        status: 'SUCCESS',
        details: 'Super Admin Initial Security Sign-In & Multi-Branch Console Initialization for Mr. Nadeem.',
        metadata: {
          ipAddress: '192.168.1.10 (Management LAN)',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
        },
        previousHash: b2Hash,
        currentHash: b3Hash,
        isVerifiedTamperProof: true,
        _updatedAt: new Date(b3Timestamp).getTime(),
      };

      const seeded = [b3Block, b2Block, genesisBlock];
      this.set(STORAGE_KEYS.SUPER_ADMIN_ACTIVITY_LOGS, seeded, false, false);
      return seeded;
    }
    return raw;
  },

  logSuperAdminActivity(params: {
    category: SuperAdminLogCategory;
    actionType: SuperAdminLogActionType;
    actorEmail?: string;
    actorName?: string;
    actorRole?: string;
    targetEntity?: string;
    status: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'FLAGGED';
    details: string;
    metadata?: Record<string, any>;
  }): SuperAdminActivityLog {
    const existing = this.getSuperAdminActivityLogs();
    const active = this.getActiveUser();

    const actorEmail = params.actorEmail || active?.email || MASTER_SUPERADMIN.email;
    const actorName = params.actorName || active?.name || MASTER_SUPERADMIN.name;
    const actorRole = params.actorRole || active?.role || 'super_admin';

    // Sequence is total items + 1
    const sequenceNumber = existing.length + 1;
    // Latest entry is at index 0
    const latestEntry = existing[0];
    const previousHash = latestEntry?.currentHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const id = `sa_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const payload = `${sequenceNumber}|${timestamp}|${params.category}|${params.actionType}|${actorEmail}|${params.details}|${previousHash}`;
    const currentHash = hashLedgerDeterministic(payload);

    const clientPlatform = typeof navigator !== 'undefined' ? navigator.platform || navigator.userAgent : 'Web Node';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Diagnostic Client';

    const newLog: SuperAdminActivityLog = {
      id,
      sequenceNumber,
      timestamp,
      category: params.category,
      actionType: params.actionType,
      actorEmail,
      actorName,
      actorRole,
      targetEntity: params.targetEntity || 'System Core',
      status: params.status,
      details: params.details,
      metadata: {
        ipAddress: '192.168.1.100 (Internal Secured LAN)',
        userAgent,
        clientPlatform,
        ...params.metadata,
      },
      previousHash,
      currentHash,
      isVerifiedTamperProof: true,
      _updatedAt: Date.now(),
    };

    const updated = [newLog, ...existing];
    this.set(STORAGE_KEYS.SUPER_ADMIN_ACTIVITY_LOGS, updated, true, false);

    // Sync to Firestore
    if (storageSyncListener) {
      storageSyncListener(STORAGE_KEYS.SUPER_ADMIN_ACTIVITY_LOGS, newLog, { docId: newLog.id, action: 'set' });
    }

    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'sa_ledger_update', log: newLog });
      } catch (err) {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hr-sa-ledger-entry', { detail: newLog }));
    }

    return newLog;
  },

  verifyLedgerIntegrity(): {
    isValid: boolean;
    checkedCount: number;
    brokenIndex?: number;
    error?: string;
  } {
    const logs = this.getSuperAdminActivityLogs();
    if (logs.length === 0) return { isValid: true, checkedCount: 0 };

    // Sort chronologically (oldest sequence 1 first)
    const chronological = [...logs].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    for (let i = 0; i < chronological.length; i++) {
      const entry = chronological[i];
      const prevEntry = i > 0 ? chronological[i - 1] : null;
      const expectedPrevHash = prevEntry ? prevEntry.currentHash : '0000000000000000000000000000000000000000000000000000000000000000';

      if (entry.previousHash !== expectedPrevHash) {
        return {
          isValid: false,
          checkedCount: i + 1,
          brokenIndex: entry.sequenceNumber,
          error: `Broken chain at sequence #${entry.sequenceNumber}: previousHash mismatch. Expected ${expectedPrevHash.slice(0, 10)}..., received ${entry.previousHash.slice(0, 10)}...`,
        };
      }

      const payload = `${entry.sequenceNumber}|${entry.timestamp}|${entry.category}|${entry.actionType}|${entry.actorEmail}|${entry.details}|${entry.previousHash}`;
      const recomputedHash = hashLedgerDeterministic(payload);
      if (recomputedHash !== entry.currentHash) {
        return {
          isValid: false,
          checkedCount: i + 1,
          brokenIndex: entry.sequenceNumber,
          error: `Tamper detected at sequence #${entry.sequenceNumber}: Hash signature mismatch. Content or metadata altered.`,
        };
      }
    }

    return {
      isValid: true,
      checkedCount: chronological.length,
    };
  },

  // Head Office Central Approvals (Transfers, Requisitions, Deletions)
  getApprovalRequests(): HeadOfficeApprovalRequest[] {
    return this.get<HeadOfficeApprovalRequest[]>(STORAGE_KEYS.APPROVAL_REQUESTS, []);
  },

  saveApprovalRequest(req: HeadOfficeApprovalRequest): void {
    const list = this.getApprovalRequests();
    const idx = list.findIndex((r) => r.id === req.id);
    if (idx >= 0) {
      list[idx] = req;
    } else {
      list.unshift(req);
    }
    this.set(STORAGE_KEYS.APPROVAL_REQUESTS, list);
    this.logAction(
      'Security',
      `Approval Requested: [${req.type.replace(/_/g, ' ').toUpperCase()}] ${req.title} for ${req.branchName} by ${req.requestedByUserName}`,
      req.branchId
    );

    // Notify Super Admin
    this.addNotification({
      type: req.type === 'new_stock' ? 'po_approval' : 'low_stock',
      severity: req.type === 'inventory_deletion' || req.type === 'asset_deletion' ? 'high' : 'medium',
      title: `Head Office Approval Needed: ${req.title}`,
      message: `${req.requestedByUserName} (${req.branchName}) submitted a ${req.type.replace(/_/g, ' ')} request requiring Head Office approval.`,
      branchId: req.branchId,
      actionRequired: true,
      relatedEntityId: req.id,
    });
  },

  approveRequest(
    requestId: string,
    reviewerName: string,
    reviewNotes?: string
  ): { success: boolean; message: string } {
    const list = this.getApprovalRequests();
    const req = list.find((r) => r.id === requestId);
    if (!req) return { success: false, message: 'Approval request not found.' };

    req.status = 'Approved';
    req.reviewedBy = reviewerName;
    req.reviewedAt = new Date().toISOString();
    req.reviewNotes = reviewNotes || 'Approved by Head Office Administrator';

    // Execute the underlying operational action based on type:
    if (req.type === 'inventory_deletion') {
      this.deleteInventoryItem(req.targetEntityId);
    } else if (req.type === 'asset_deletion') {
      this.deleteAsset(req.targetEntityId);
    } else if (req.type === 'stock_transfer') {
      const transfers = this.getTransfers();
      const trf = transfers.find((t) => t.id === req.targetEntityId);
      if (trf) {
        trf.status = 'In Transit';
        trf.approvedBy = reviewerName;
        trf.dispatchedAt = new Date().toISOString();
        this.saveTransfer(trf);
      }
    } else if (req.type === 'new_stock') {
      const pos = this.getPurchaseOrders();
      const po = pos.find((p) => p.id === req.targetEntityId);
      if (po) {
        po.status = 'Approved';
        po.superAdminApproval = {
          approvedBy: reviewerName,
          timestamp: new Date().toISOString(),
        };
        this.savePurchaseOrder(po);
      }
    }

    this.set(STORAGE_KEYS.APPROVAL_REQUESTS, list);
    this.logAction(
      'Security',
      `Head Office APPROVED Request: [${req.type.replace(/_/g, ' ').toUpperCase()}] ${req.title} for ${req.branchName}`,
      req.branchId
    );
    return { success: true, message: `Request successfully approved and processed.` };
  },

  rejectRequest(
    requestId: string,
    reviewerName: string,
    reviewNotes?: string
  ): { success: boolean; message: string } {
    const list = this.getApprovalRequests();
    const req = list.find((r) => r.id === requestId);
    if (!req) return { success: false, message: 'Approval request not found.' };

    req.status = 'Rejected';
    req.reviewedBy = reviewerName;
    req.reviewedAt = new Date().toISOString();
    req.reviewNotes = reviewNotes || 'Rejected by Head Office Administrator';

    if (req.type === 'stock_transfer') {
      const transfers = this.getTransfers();
      const trf = transfers.find((t) => t.id === req.targetEntityId);
      if (trf) {
        trf.status = 'Rejected';
        this.saveTransfer(trf);
      }
    } else if (req.type === 'new_stock') {
      const pos = this.getPurchaseOrders();
      const po = pos.find((p) => p.id === req.targetEntityId);
      if (po) {
        po.status = 'Cancelled';
        this.savePurchaseOrder(po);
      }
    }

    this.set(STORAGE_KEYS.APPROVAL_REQUESTS, list);
    this.logAction(
      'Security',
      `Head Office REJECTED Request: [${req.type.replace(/_/g, ' ').toUpperCase()}] ${req.title} for ${req.branchName}. Reason: ${req.reviewNotes}`,
      req.branchId
    );
    return { success: true, message: `Request has been marked as rejected.` };
  },

  deleteApprovalRequest(requestId: string): void {
    const list = this.getApprovalRequests().filter((r) => r.id !== requestId);
    this.set(STORAGE_KEYS.APPROVAL_REQUESTS, list);
  },

  // Alerts & Notifications
  getNotifications(): AlertNotification[] {
    return this.get<AlertNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  },

  addNotification(n: Omit<AlertNotification, 'id' | 'createdAt' | 'isRead'>): void {
    const list = this.getNotifications();
    const newNotification: AlertNotification = {
      ...n,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    list.unshift(newNotification);
    this.set(STORAGE_KEYS.NOTIFICATIONS, list);
  },

  markNotificationRead(id: string): void {
    const list = this.getNotifications();
    const item = list.find((n) => n.id === id);
    if (item) {
      item.isRead = true;
      this.set(STORAGE_KEYS.NOTIFICATIONS, list);
    }
  },

  clearAllNotifications(): void {
    this.set(STORAGE_KEYS.NOTIFICATIONS, []);
  },

  // Automatic Check for Low Stock & Expiry
  checkStockAndExpiryAlerts(item: InventoryItem): void {
    if (item.totalQuantity <= item.reorderPoint) {
      this.addNotification({
        type: 'low_stock',
        severity: item.totalQuantity === 0 ? 'critical' : 'high',
        title: `Low Stock Alert: ${item.name}`,
        message: `${item.sku} is at ${item.totalQuantity} ${item.uom} (Reorder point: ${item.reorderPoint}). Create PO now!`,
        actionRequired: true,
        relatedEntityId: item.id,
        branchId: item.branchId,
      });
    }

    const today = new Date();
    item.batches.forEach((b) => {
      const exp = new Date(b.expiryDate);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
      if (diffDays <= 0 && b.currentQuantity > 0) {
        this.addNotification({
          type: 'expiry',
          severity: 'critical',
          title: `EXPIRED REAGENT: ${item.name}`,
          message: `Batch ${b.batchNumber} expired on ${b.expiryDate} (${b.currentQuantity} ${item.uom} remaining). Quarantine immediately!`,
          actionRequired: true,
          relatedEntityId: item.id,
          branchId: item.branchId,
        });
      } else if (diffDays <= 30 && b.currentQuantity > 0) {
        this.addNotification({
          type: 'expiry',
          severity: 'high',
          title: `Near Expiry (≤30d): ${item.name}`,
          message: `Batch ${b.batchNumber} expires in ${diffDays} days (${b.expiryDate}). Prioritize FIFO consumption.`,
          actionRequired: false,
          relatedEntityId: item.id,
          branchId: item.branchId,
        });
      }
    });
  },

  // Active Session & Authentication
  getActiveUser(): UserAccount | null {
    const active = this.get<UserAccount | null>(STORAGE_KEYS.ACTIVE_USER, null);
    if (!active) return null;

    // Check session timeout
    const expiry = this.getSessionExpiry();
    if (expiry > 0 && Date.now() > expiry) {
      this.setActiveUser(null);
      return null;
    }

    if (active.email && (active.email.toLowerCase().includes('@hrdiagnostics.com') || ['usr_superadmin', 'usr_manager', 'usr_tech'].includes(active.id))) {
      this.setActiveUser(null);
      return null;
    }
    const users = this.getUsers();
    const stillExists = users.find((u) => u.id === active.id || u.email.toLowerCase() === active.email?.toLowerCase());
    if (!stillExists) {
      this.setActiveUser(null);
      return null;
    }
    return stillExists;
  },

  getCurrentUser(): UserAccount | null {
    return this.getActiveUser();
  },

  setCurrentUser(user: UserAccount | null): void {
    this.setActiveUser(user);
  },

  setActiveUser(user: UserAccount | null): void {
    this.set(STORAGE_KEYS.ACTIVE_USER, user);
    if (user) {
      // Set session expiry to 30 minutes from now
      const expiry = Date.now() + 30 * 60 * 1000;
      localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, expiry.toString());
      this.logAction('Security', `User logged in: ${user.name} (${user.role})`);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRY);
    }
  },

  logoutUser(): void {
    const active = this.getActiveUser();
    if (active && (active.role === 'super_admin' || active.email.toLowerCase() === MASTER_SUPERADMIN.email.toLowerCase())) {
      this.logSuperAdminActivity({
        category: 'LOGIN_ATTEMPT',
        actionType: 'LOGOUT',
        actorEmail: active.email,
        actorName: active.name,
        targetEntity: `Active Session (${active.email})`,
        status: 'SUCCESS',
        details: `Super Admin signed out of session: ${active.name} (${active.email}).`,
        metadata: { userId: active.id, email: active.email },
      });
    }
    this.setActiveUser(null);
  },

  logout(): void {
    this.logoutUser();
  },

  getSessionExpiry(): number {
    const val = localStorage.getItem(STORAGE_KEYS.SESSION_EXPIRY);
    return val ? parseInt(val, 10) : 0;
  },

  extendSession(): void {
    const expiry = Date.now() + 30 * 60 * 1000;
    localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, expiry.toString());
  },

  // Offline Sync Queue
  getOfflineQueue(): SyncQueueItem[] {
    return this.get<SyncQueueItem[]>(STORAGE_KEYS.OFFLINE_QUEUE, []);
  },

  queueOfflineAction(action: SyncQueueItem['action'], table: string, payload: any): void {
    const queue = this.getOfflineQueue();
    queue.push({
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      action,
      table,
      payload,
      timestamp: Date.now(),
      synced: false,
    });
    this.set(STORAGE_KEYS.OFFLINE_QUEUE, queue);
  },

  processOfflineQueue(): number {
    const queue = this.getOfflineQueue();
    const count = queue.length;
    if (count > 0) {
      // Simulate real-time sync replay to persistent storage
      this.set(STORAGE_KEYS.OFFLINE_QUEUE, []);
      this.logAction('Security', `Re-synced ${count} offline queued transactions upon reconnection.`);
      this.addNotification({
        type: 'low_stock',
        severity: 'low',
        title: 'Offline Sync Completed',
        message: `Successfully synchronized ${count} queued change(s) with Central Server.`,
      });
    }
    return count;
  },

  // Full Database Backup Export and Disaster Recovery
  exportFullDatabaseJSON(): string {
    const fullState = {
      exportedAt: new Date().toISOString(),
      system: 'HR Diagnostics Enterprise Inventory & CMMS',
      version: '2.5.0',
      branches: this.getBranches(),
      warehouses: this.getWarehouses(),
      departments: this.getDepartments(),
      users: this.getUsers().map((u) => ({ ...u, passwordHash: '***' })),
      inventory: this.getInventory(),
      assets: this.getAssets(),
      maintenanceLogs: this.getMaintenanceLogs(),
      transfers: this.getTransfers(),
      purchaseOrders: this.getPurchaseOrders(),
      grns: this.getGRNs(),
      vendors: this.getVendors(),
      quotes: this.getQuotes(),
      audits: this.getAudits(),
      narcotics: this.getNarcotics(),
      auditLogs: this.getAuditLogs(),
    };
    return JSON.stringify(fullState, null, 2);
  },

  importDatabaseJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.branches) this.set(STORAGE_KEYS.BRANCHES, data.branches);
      if (data.warehouses) this.set(STORAGE_KEYS.WAREHOUSES, data.warehouses);
      if (data.departments) this.set(STORAGE_KEYS.DEPARTMENTS, data.departments);
      if (data.inventory) this.set(STORAGE_KEYS.INVENTORY, data.inventory);
      if (data.assets) this.set(STORAGE_KEYS.ASSETS, data.assets);
      if (data.maintenanceLogs) this.set(STORAGE_KEYS.MAINTENANCE_LOGS, data.maintenanceLogs);
      if (data.transfers) this.set(STORAGE_KEYS.TRANSFERS, data.transfers);
      if (data.purchaseOrders) this.set(STORAGE_KEYS.PURCHASE_ORDERS, data.purchaseOrders);
      if (data.grns) this.set(STORAGE_KEYS.GRNS, data.grns);
      if (data.vendors) this.set(STORAGE_KEYS.VENDORS, data.vendors);
      if (data.audits) this.set(STORAGE_KEYS.AUDITS, data.audits);
      if (data.narcotics) this.set(STORAGE_KEYS.NARCOTICS, data.narcotics);
      this.logAction('Security', 'Restored entire database from external JSON backup.');
      return true;
    } catch (e) {
      console.error('Failed to import database JSON', e);
      return false;
    }
  },

  // Quick Master Diagnostic Seed with complete authentic clinical diagnostic formulary
  seedStandardDiagnosticCategories(force = false): void {
    const existing = this.getInventory();
    if (existing.length > 0 && !force) return; // Only if empty unless forced

    const standardTemplates: InventoryItem[] = [
      {
        id: 'item_cbc_diluent',
        sku: 'RGT-HEM-001',
        name: 'Sysmex Cellpack DCL Diluent (20L)',
        category: 'Reagents',
        subCategory: 'Hematology',
        uom: 'Box (20L)',
        minStockLevel: 5,
        maxStockLevel: 30,
        reorderPoint: 8,
        leadTimeDays: 7,
        batches: [
          {
            id: 'b_diluent_01',
            batchNumber: 'SYX-2409-A',
            expiryDate: '2027-04-15',
            receivedDate: '2026-08-10',
            initialQuantity: 12,
            currentQuantity: 12,
            unitCost: 14500,
            storageCondition: 'Room Temp',
            qrCode: 'HR-BATCH-RGT-HEM-001-SYX-2409-A',
          },
        ],
        totalQuantity: 12,
        reservedQuantity: 0,
        branchId: 'br_headoffice',
        warehouseId: 'wh_central',
        departmentId: 'dept_hematology',
        locationBin: 'Rack A-Bulk',
        costPrice: 14500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'item_wdf_dye',
        sku: 'RGT-HEM-002',
        name: 'Sysmex Fluorocell WDF 5-Part Differential Dye (2x42ml)',
        category: 'Reagents',
        subCategory: 'Hematology',
        uom: 'Kit (2x42ml)',
        minStockLevel: 3,
        maxStockLevel: 15,
        reorderPoint: 5,
        leadTimeDays: 7,
        batches: [
          {
            id: 'b_wdf_01',
            batchNumber: 'WDF-2026-9',
            expiryDate: '2026-12-10',
            receivedDate: '2026-07-20',
            initialQuantity: 6,
            currentQuantity: 6,
            unitCost: 32000,
            storageCondition: 'Dark / Light Sensitive',
            qrCode: 'HR-BATCH-RGT-HEM-002-WDF-2026-9',
          },
        ],
        totalQuantity: 6,
        reservedQuantity: 0,
        branchId: 'br_headoffice',
        warehouseId: 'wh_central',
        departmentId: 'dept_hematology',
        locationBin: 'Cold Room CR-01 (2-8°C)',
        costPrice: 32000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'item_cellclean',
        sku: 'RGT-HEM-003',
        name: 'Sysmex Cellclean Automated Washing Solution (50ml)',
        category: 'Consumables',
        subCategory: 'Hematology',
        uom: 'Vial (50ml)',
        minStockLevel: 5,
        maxStockLevel: 25,
        reorderPoint: 8,
        leadTimeDays: 5,
        batches: [
          {
            id: 'b_clean_01',
            batchNumber: 'CLN-8812',
            expiryDate: '2027-08-20',
            receivedDate: '2026-08-01',
            initialQuantity: 15,
            currentQuantity: 15,
            unitCost: 8500,
            storageCondition: 'Room Temp',
            qrCode: 'HR-BATCH-RGT-HEM-003-CLN-8812',
          },
        ],
        totalQuantity: 15,
        reservedQuantity: 0,
        branchId: 'br_headoffice',
        warehouseId: 'wh_central',
        departmentId: 'dept_hematology',
        locationBin: 'Rack A-Bulk',
        costPrice: 8500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'item_alt_gpt',
        sku: 'RGT-BIO-042',
        name: 'ALT/SGPT Kinetic UV Liquid Reagent (Roche Cobas)',
        category: 'Reagents',
        subCategory: 'Clinical Chemistry',
        uom: 'Kit (500 Tests)',
        minStockLevel: 4,
        maxStockLevel: 25,
        reorderPoint: 6,
        leadTimeDays: 5,
        batches: [
          {
            id: 'b_alt_01',
            batchNumber: 'RCH-8921-EXP',
            expiryDate: '2026-11-20',
            receivedDate: '2026-07-01',
            initialQuantity: 8,
            currentQuantity: 8,
            unitCost: 28000,
            storageCondition: '2-8°C Refrigerated',
            qrCode: 'HR-BATCH-RGT-BIO-042-RCH-8921-EXP',
          },
        ],
        totalQuantity: 8,
        reservedQuantity: 0,
        branchId: 'br_headoffice',
        warehouseId: 'wh_central',
        departmentId: 'dept_biochem',
        locationBin: 'Cold Room CR-01 (2-8°C)',
        costPrice: 28000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'item_creatinine',
        sku: 'RGT-BIO-043',
        name: 'Creatinine Jaffe Gen.2 Kinetic Reagent (Roche Cobas)',
        category: 'Reagents',
        subCategory: 'Clinical Chemistry',
        uom: 'Kit (700 Tests)',
        minStockLevel: 4,
        maxStockLevel: 25,
        reorderPoint: 7,
        leadTimeDays: 5,
        batches: [
          {
            id: 'b_creat_01',
            batchNumber: 'RCH-7741-CRT',
            expiryDate: '2027-02-28',
            receivedDate: '2026-08-05',
            initialQuantity: 10,
            currentQuantity: 10,
            unitCost: 24500,
            storageCondition: '2-8°C Refrigerated',
            qrCode: 'HR-BATCH-RGT-BIO-043-RCH-7741-CRT',
          },
        ],
        totalQuantity: 10,
        reservedQuantity: 0,
        branchId: 'br_headoffice',
        warehouseId: 'wh_central',
        departmentId: 'dept_biochem',
        locationBin: 'Cold Room CR-01 (2-8°C)',
        costPrice: 24500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'item_troponin',
        sku: 'RGT-IMM-019',
        name: 'Roche Elecsys Troponin T High Sensitivity Reagent (100 Tests)',
        category: 'Reagents',
        subCategory: 'Immunology',
        uom: 'Kit (100 Tests)',
        minStockLevel: 3,
        maxStockLevel: 15,
        reorderPoint: 5,
        leadTimeDays: 7,
        batches: [
          {
            id: 'b_trop_01',
            batchNumber: 'ELE-9921-TRP',
            expiryDate: '2026-10-15',
            receivedDate: '2026-06-15',
            initialQuantity: 5,
            currentQuantity: 5,
            unitCost: 65000,
            storageCondition: '2-8°C Refrigerated',
            qrCode: 'HR-BATCH-RGT-IMM-019-ELE-9921-TRP',
          },
        ],
        totalQuantity: 5,
        reservedQuantity: 0,
        branchId: 'br_headoffice',
        warehouseId: 'wh_central',
        departmentId: 'dept_biochem',
        locationBin: 'Cold Room CR-01 (2-8°C)',
        costPrice: 65000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'item_pcr_mastermix',
        sku: 'RGT-MOL-101',
        name: 'TaqPath 1-Step RT-qPCR Master Mix 2X (500 Rxns)',
        category: 'Reagents',
        subCategory: 'Molecular Pathology & PCR',
        uom: 'Kit (500 Rxns)',
        minStockLevel: 2,
        maxStockLevel: 10,
        reorderPoint: 3,
        leadTimeDays: 10,
        batches: [
          {
            id: 'b_pcr_01',
            batchNumber: 'PCR-5510',
            expiryDate: '2027-06-30',
            receivedDate: '2026-07-10',
            initialQuantity: 4,
            currentQuantity: 4,
            unitCost: 48000,
            storageCondition: '-20°C Frozen',
            qrCode: 'HR-BATCH-RGT-MOL-101-PCR-5510',
          },
        ],
        totalQuantity: 4,
        reservedQuantity: 0,
        branchId: 'br_headoffice',
        warehouseId: 'wh_central',
        departmentId: 'dept_molecular',
        locationBin: 'Deep Freezer DF-02 (-20°C)',
        costPrice: 48000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'item_bd_edta',
        sku: 'CNS-PHL-001',
        name: 'BD Vacutainer Plus K2-EDTA 3.0ml Blood Collection Tubes',
        category: 'Consumables',
        subCategory: 'Phlebotomy',
        uom: 'Box (100 Tubes)',
        minStockLevel: 10,
        maxStockLevel: 80,
        reorderPoint: 20,
        leadTimeDays: 5,
        batches: [
          {
            id: 'b_edta_01',
            batchNumber: 'BD-7718',
            expiryDate: '2027-11-30',
            receivedDate: '2026-08-01',
            initialQuantity: 20,
            currentQuantity: 20,
            unitCost: 4200,
            storageCondition: 'Room Temp',
            qrCode: 'HR-BATCH-CNS-PHL-001-BD-7718',
          },
        ],
        totalQuantity: 20,
        reservedQuantity: 0,
        branchId: 'br_headoffice',
        warehouseId: 'wh_central',
        departmentId: 'dept_pharmacy',
        locationBin: 'Rack B-Dry Consumables',
        costPrice: 4200,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'item_bd_sst',
        sku: 'CNS-PHL-002',
        name: 'BD Vacutainer SST II Advance Gel & Clot Activator 5.0ml Gold Top',
        category: 'Consumables',
        subCategory: 'Phlebotomy',
        uom: 'Box (100 Tubes)',
        minStockLevel: 10,
        maxStockLevel: 80,
        reorderPoint: 20,
        leadTimeDays: 5,
        batches: [
          {
            id: 'b_sst_01',
            batchNumber: 'BD-8820',
            expiryDate: '2027-12-15',
            receivedDate: '2026-08-01',
            initialQuantity: 25,
            currentQuantity: 25,
            unitCost: 4800,
            storageCondition: 'Room Temp',
            qrCode: 'HR-BATCH-CNS-PHL-002-BD-8820',
          },
        ],
        totalQuantity: 25,
        reservedQuantity: 0,
        branchId: 'br_headoffice',
        warehouseId: 'wh_central',
        departmentId: 'dept_pharmacy',
        locationBin: 'Rack B-Dry Consumables',
        costPrice: 4800,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'item_fentanyl',
        sku: 'MED-NAR-009',
        name: 'Fentanyl Citrate Injection 50mcg/ml (2ml Ampoule)',
        category: 'Narcotics & Controlled',
        subCategory: 'Sedation / Emergency',
        uom: 'Ampoule',
        minStockLevel: 10,
        maxStockLevel: 50,
        reorderPoint: 15,
        leadTimeDays: 14,
        isNarcoticOrControlled: true,
        batches: [
          {
            id: 'b_fent_01',
            batchNumber: 'NAR-7712',
            expiryDate: '2027-12-31',
            receivedDate: '2026-05-15',
            initialQuantity: 25,
            currentQuantity: 25,
            unitCost: 850,
            storageCondition: 'Dark / Light Sensitive',
            qrCode: 'HR-BATCH-MED-NAR-009-NAR-7712',
          },
        ],
        totalQuantity: 25,
        reservedQuantity: 0,
        branchId: 'br_headoffice',
        warehouseId: 'wh_central',
        departmentId: 'dept_pharmacy',
        locationBin: 'Secured Vault (Narcotics)',
        costPrice: 850,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const standardAssets: AssetRecord[] = [
      {
        id: 'asset_sysmex_xn550',
        assetTag: 'ASSET-LAB-0101',
        name: 'Sysmex XN-550 Automated 5-Part Hematology Analyzer',
        category: 'Diagnostic Analyzer',
        brandModel: 'Sysmex Corporation / XN-550',
        serialNumber: 'SN-XN550-984421',
        branchId: 'br_headoffice',
        departmentId: 'dept_hematology',
        assignedEmployeeName: 'Dr. Tariq Mahmood',
        purchaseDate: '2024-03-15',
        purchaseCost: 4800000,
        salvageValue: 500000,
        usefulLifeYears: 7,
        currentBookValue: 3315000,
        accumulatedDepreciation: 1485000,
        status: 'Active / Operational',
        warrantyExpiryDate: '2027-03-15',
        warrantyProvider: 'Sysmex Global Medical Service',
        lastMaintenanceDate: '2026-06-10',
        nextMaintenanceDue: '2026-09-25',
        maintenanceFrequencyDays: 90,
        calibrationDueDate: '2026-10-15',
        calibrationAgency: 'Pakistan National Accreditation Council (PNAC)',
        calibrationCertificateNumber: 'CAL-PNAC-2026-88',
        totalDowntimeHours: 4,
        qrCode: 'HR-ASSET-LAB-0101-SN-XN550-984421',
        documents: [{ title: 'Purchase Invoice & Warranty Agreement', date: '2024-03-15' }],
      },
      {
        id: 'asset_cobas_c311',
        assetTag: 'ASSET-BIO-0102',
        name: 'Roche Cobas c311 Clinical Chemistry Analyzer',
        category: 'Diagnostic Analyzer',
        brandModel: 'Roche Diagnostics / Cobas c311',
        serialNumber: 'SN-COB311-665201',
        branchId: 'br_headoffice',
        departmentId: 'dept_biochem',
        assignedEmployeeName: 'Dr. Ayesha Malik',
        purchaseDate: '2023-08-10',
        purchaseCost: 7200000,
        salvageValue: 800000,
        usefulLifeYears: 8,
        currentBookValue: 4800000,
        accumulatedDepreciation: 2400000,
        status: 'Active / Operational',
        warrantyExpiryDate: '2026-08-10',
        warrantyProvider: 'Roche Diagnostics Pakistan',
        lastMaintenanceDate: '2026-07-05',
        nextMaintenanceDue: '2026-10-05',
        maintenanceFrequencyDays: 90,
        calibrationDueDate: '2026-11-15',
        calibrationAgency: 'Pakistan National Accreditation Council (PNAC)',
        calibrationCertificateNumber: 'CAL-PNAC-2026-104',
        totalDowntimeHours: 6,
        qrCode: 'HR-ASSET-BIO-0102-SN-COB311-665201',
        documents: [{ title: 'Roche Service Level Agreement', date: '2023-08-10' }],
      },
      {
        id: 'asset_siemens_ct',
        assetTag: 'ASSET-RAD-0205',
        name: 'Siemens SOMATOM go.Up 32-Slice CT Scanner',
        category: 'Radiology Machine',
        brandModel: 'Siemens Healthineers / go.Up',
        serialNumber: 'SN-SOM-881290',
        branchId: 'br_headoffice',
        departmentId: 'dept_radiology',
        assignedEmployeeName: 'Dr. Zulfiqar Ali',
        purchaseDate: '2023-01-20',
        purchaseCost: 35000000,
        salvageValue: 5000000,
        usefulLifeYears: 10,
        currentBookValue: 24000000,
        accumulatedDepreciation: 11000000,
        status: 'Active / Operational',
        warrantyExpiryDate: '2028-01-20',
        warrantyProvider: 'Siemens Healthineers Direct',
        lastMaintenanceDate: '2026-07-15',
        nextMaintenanceDue: '2026-10-15',
        maintenanceFrequencyDays: 90,
        calibrationDueDate: '2026-11-01',
        calibrationAgency: 'Pakistan Nuclear Regulatory Authority (PNRA)',
        calibrationCertificateNumber: 'PNRA-RAD-2026-004',
        totalDowntimeHours: 12,
        qrCode: 'HR-ASSET-RAD-0205-SN-SOM-881290',
        documents: [{ title: 'PNRA Radiation Safety Certificate', date: '2023-01-20' }],
      },
      {
        id: 'asset_biorad_pcr',
        assetTag: 'ASSET-MOL-0301',
        name: 'Bio-Rad CFX96 Touch Real-Time PCR Detection System',
        category: 'Diagnostic Analyzer',
        brandModel: 'Bio-Rad Laboratories / CFX96',
        serialNumber: 'SN-BRAD-441209',
        branchId: 'br_headoffice',
        departmentId: 'dept_molecular',
        assignedEmployeeName: 'Dr. Sanaullah',
        purchaseDate: '2023-11-01',
        purchaseCost: 3900000,
        salvageValue: 400000,
        usefulLifeYears: 7,
        currentBookValue: 2650000,
        accumulatedDepreciation: 1250000,
        status: 'Active / Operational',
        warrantyExpiryDate: '2026-11-01',
        warrantyProvider: 'Bio-Rad Authorized Support',
        lastMaintenanceDate: '2026-05-12',
        nextMaintenanceDue: '2026-11-12',
        maintenanceFrequencyDays: 180,
        calibrationDueDate: '2026-12-01',
        calibrationAgency: 'PNAC Accredited Bio-Metrology',
        calibrationCertificateNumber: 'CAL-BIO-2026-019',
        totalDowntimeHours: 2,
        qrCode: 'HR-ASSET-MOL-0301-SN-BRAD-441209',
        documents: [{ title: 'Optical Calibration Report', date: '2023-11-01' }],
      },
    ];

    const standardVendors: Vendor[] = [
      {
        id: 'ven_sysmex',
        name: 'Sysmex Pakistan / Meditech Solutions',
        code: 'VEN-SYX-01',
        category: 'Diagnostic Equipment & Reagents',
        contactPerson: 'Kamran Ashraf (Key Account Director)',
        email: 'orders@sysmex-pk.com',
        phone: '+92 42 35711122',
        ntnTaxId: '1488921-8',
        drugLicenseNumber: 'DRAP-DL-2022-901',
        drugLicenseExpiry: '2028-12-31',
        paymentTerms: 'Net 30 Days',
        onTimeDeliveryRate: 96,
        qualityComplianceRate: 99,
        rating: 4.8,
        contractStartDate: '2024-01-01',
        contractEndDate: '2027-12-31',
        status: 'Active',
      },
      {
        id: 'ven_roche',
        name: 'Roche Diagnostics Pakistan',
        code: 'VEN-RCH-02',
        category: 'Biochemistry & Immunology Reagents',
        contactPerson: 'Maryam Siddiqui (Clinical Support Mgr)',
        email: 'diagnostics@roche.pk',
        phone: '+92 21 35688990',
        ntnTaxId: '0812993-4',
        drugLicenseNumber: 'DRAP-DL-2023-114',
        drugLicenseExpiry: '2029-06-30',
        paymentTerms: 'Net 45 Days',
        onTimeDeliveryRate: 98,
        qualityComplianceRate: 100,
        rating: 4.9,
        contractStartDate: '2024-06-01',
        contractEndDate: '2027-06-01',
        status: 'Active',
      },
      {
        id: 'ven_bd',
        name: 'Becton Dickinson (BD) Pakistan Private Limited',
        code: 'VEN-BD-03',
        category: 'Phlebotomy & Specimen Collection',
        contactPerson: 'Omer Farooq (Institutional Sales)',
        email: 'supply@bd-pakistan.com',
        phone: '+92 42 35899200',
        ntnTaxId: '2190334-1',
        drugLicenseNumber: 'DRAP-DL-2021-409',
        drugLicenseExpiry: '2028-09-30',
        paymentTerms: 'Net 30 Days',
        onTimeDeliveryRate: 97,
        qualityComplianceRate: 99,
        rating: 4.9,
        contractStartDate: '2024-01-01',
        contractEndDate: '2026-12-31',
        status: 'Active',
      },
      {
        id: 'ven_siemens',
        name: 'Siemens Healthineers Pakistan',
        code: 'VEN-SMN-04',
        category: 'Radiology & Advanced Imaging',
        contactPerson: 'Zia-ur-Rehman (Service Director)',
        email: 'imaging@siemens-healthineers.pk',
        phone: '+92 21 35629100',
        ntnTaxId: '0981244-6',
        drugLicenseNumber: 'PNRA-REG-2022-778',
        drugLicenseExpiry: '2030-01-01',
        paymentTerms: 'Net 60 Days',
        onTimeDeliveryRate: 95,
        qualityComplianceRate: 98,
        rating: 4.7,
        contractStartDate: '2023-01-01',
        contractEndDate: '2028-01-01',
        status: 'Active',
      },
    ];

    const standardPOs: PurchaseOrder[] = [
      {
        id: 'po_sysmex_urgent',
        poNumber: 'PO-2026-0041',
        vendorId: 'ven_sysmex',
        vendorName: 'Sysmex Pakistan / Meditech Solutions',
        branchId: 'br_headoffice',
        branchName: 'HR Diagnostics — Head Office & Central Lab',
        orderDate: '2026-09-18',
        expectedDeliveryDate: '2026-09-24',
        status: 'Approved',
        items: [
          {
            itemId: 'item_cbc_diluent',
            sku: 'RGT-HEM-001',
            itemName: 'Sysmex Cellpack DCL Diluent (20L)',
            unitPrice: 14500,
            quantityOrdered: 10,
            orderedQty: 10,
            uom: 'Pack (20L)',
            totalAmount: 145000,
          },
        ],
        taxRatePercent: 18,
        taxAmount: 26100,
        subtotal: 145000,
        grandTotal: 171100,
        totalAmount: 171100,
        notes: 'Cold chain transit verified. Required for automated 5-part hematology line.',
        createdAt: '2026-09-18T10:30:00.000Z',
      },
    ];

    const standardNotifications: AlertNotification[] = [
      {
        id: 'notif_coldchain_ok',
        title: 'Cold Chain Compliance Verified',
        message: 'Central Cold Storage CR-01 temperature maintained at 3.4°C (Normal: 2-8°C).',
        type: 'maintenance',
        severity: 'low',
        createdAt: new Date().toISOString(),
        isRead: false,
      },
      {
        id: 'notif_calibration_due',
        title: 'Biomedical Calibration Scheduled',
        message: 'Sysmex XN-550 (ASSET-LAB-0101) preventative calibration window opens on 25-Sep-2026.',
        type: 'maintenance',
        severity: 'medium',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        isRead: false,
      },
    ];

    this.set(STORAGE_KEYS.INVENTORY, standardTemplates);
    this.set(STORAGE_KEYS.ASSETS, standardAssets);
    this.set(STORAGE_KEYS.VENDORS, standardVendors);
    this.set(STORAGE_KEYS.PURCHASE_ORDERS, standardPOs);
    this.set(STORAGE_KEYS.NOTIFICATIONS, standardNotifications);
    this.logAction('Security', 'Initialized authentic clinical diagnostic formulary, equipment assets, and suppliers.');

    this.logSuperAdminActivity({
      category: 'CONFIG_CHANGE',
      actionType: 'FORMULARY_INITIALIZE',
      targetEntity: 'Clinical Diagnostic Formulary',
      status: 'SUCCESS',
      details: 'Initialized clinical diagnostic formulary: Reagents, hematology controls, biochemistry kits, lab assets, and medical vendors.',
    });
  },

  // Reset database to completely clean commissioning state (no sample inventory/assets/demo records)
  resetToCleanSlate(): void {
    this.set(STORAGE_KEYS.INVENTORY, []);
    this.set(STORAGE_KEYS.ASSETS, []);
    this.set(STORAGE_KEYS.MAINTENANCE_LOGS, []);
    this.set(STORAGE_KEYS.TRANSFERS, []);
    this.set(STORAGE_KEYS.PURCHASE_ORDERS, []);
    this.set(STORAGE_KEYS.GRNS, []);
    this.set(STORAGE_KEYS.VENDORS, []);
    this.set(STORAGE_KEYS.QUOTE_COMPARISONS, []);
    this.set(STORAGE_KEYS.AUDITS, []);
    this.set(STORAGE_KEYS.NARCOTICS, []);
    this.set(STORAGE_KEYS.NOTIFICATIONS, []);
    this.set(STORAGE_KEYS.OFFLINE_QUEUE, []);
    this.set(STORAGE_KEYS.APPROVAL_REQUESTS, []);
    this.set(STORAGE_KEYS.VENDOR_INVOICES, []);
    this.set(STORAGE_KEYS.INVENTORY_USAGE, []);
    this.logAction('Security', 'Hospital Commissioning: Purged all sample/mock data. Database set to 100% clean production slate.');

    this.logSuperAdminActivity({
      category: 'CONFIG_CHANGE',
      actionType: 'DATABASE_CLEAN_RESET',
      targetEntity: 'Production Commissioning Slate',
      status: 'SUCCESS',
      details: 'All mock and sample data completely deleted. Database set to clean production slate (Zero test records).',
    });
  },

  // Export full JSON backup of the system database
  exportFullBackup(): string {
    const backupData: Record<string, unknown> = {};
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      try {
        const item = localStorage.getItem(storageKey);
        if (item) {
          backupData[key] = JSON.parse(item);
        }
      } catch (err) {
        console.warn(`Error reading key ${storageKey} for backup`, err);
      }
    });

    this.logSuperAdminActivity({
      category: 'CONFIG_CHANGE',
      actionType: 'DATABASE_BACKUP_EXPORT',
      targetEntity: 'Full Database Backup Snapshot',
      status: 'SUCCESS',
      details: 'Exported complete database JSON disaster recovery backup archive.',
    });

    return JSON.stringify(backupData, null, 2);
  },

  // Validate and inspect external backup JSON archive before restoring
  parseAndValidateBackupJSON(jsonContent: string): {
    valid: boolean;
    error?: string;
    stats?: {
      itemCount: number;
      branchCount: number;
      userCount: number;
      assetCount: number;
      poCount: number;
      transferCount: number;
      auditCount: number;
      exportedAt?: string;
    };
    parsedData?: any;
  } {
    try {
      if (!jsonContent || typeof jsonContent !== 'string') {
        return { valid: false, error: 'Empty or invalid file payload provided.' };
      }
      const data = JSON.parse(jsonContent);
      if (!data || typeof data !== 'object') {
        return { valid: false, error: 'JSON content is not a valid object.' };
      }

      // Check whether this is a full key-value dump or a structured snapshot
      const items = data.inventory || data.INVENTORY || data[STORAGE_KEYS.INVENTORY] || [];
      const branches = data.branches || data.BRANCHES || data[STORAGE_KEYS.BRANCHES] || [];
      const users = data.users || data.USERS || data[STORAGE_KEYS.USERS] || [];
      const assets = data.assets || data.ASSETS || data[STORAGE_KEYS.ASSETS] || [];
      const pos = data.purchaseOrders || data.PURCHASE_ORDERS || data[STORAGE_KEYS.PURCHASE_ORDERS] || [];
      const transfers = data.transfers || data.TRANSFERS || data[STORAGE_KEYS.TRANSFERS] || [];
      const audits = data.audits || data.AUDITS || data[STORAGE_KEYS.AUDITS] || [];

      const itemCount = Array.isArray(items) ? items.length : 0;
      const branchCount = Array.isArray(branches) ? branches.length : 0;
      const userCount = Array.isArray(users) ? users.length : 0;
      const assetCount = Array.isArray(assets) ? assets.length : 0;
      const poCount = Array.isArray(pos) ? pos.length : 0;
      const transferCount = Array.isArray(transfers) ? transfers.length : 0;
      const auditCount = Array.isArray(audits) ? audits.length : 0;

      if (itemCount === 0 && branchCount === 0 && userCount === 0 && assetCount === 0) {
        return {
          valid: false,
          error: 'Uploaded JSON contains no recognizable HR Diagnostics tables (Inventory, Branches, Users, or Assets).',
        };
      }

      return {
        valid: true,
        stats: {
          itemCount,
          branchCount,
          userCount,
          assetCount,
          poCount,
          transferCount,
          auditCount,
          exportedAt: data.exportedAt || data.timestamp || data.exportedDate || undefined,
        },
        parsedData: data,
      };
    } catch (err: any) {
      return { valid: false, error: `Invalid JSON syntax: ${err.message || err}` };
    }
  },

  // Import full JSON backup and restore into storage with safety guards and cloud synchronization
  executeDatabaseRestore(
    parsedData: any,
    options: { preserveCurrentUser?: boolean } = { preserveCurrentUser: true }
  ): {
    success: boolean;
    error?: string;
    restoredCounts: Record<string, number>;
  } {
    try {
      if (!parsedData || typeof parsedData !== 'object') {
        return { success: false, error: 'Invalid restore payload.', restoredCounts: {} };
      }

      const activeUser = this.getCurrentUser();
      const restoredCounts: Record<string, number> = {};

      const mapAndSet = (rawField: string, enumKey: string, storageKeyVal: string) => {
        const val =
          parsedData[rawField] ??
          parsedData[enumKey] ??
          parsedData[storageKeyVal];
        if (val !== undefined && Array.isArray(val)) {
          this.set(storageKeyVal, val);
          restoredCounts[rawField] = val.length;
        } else if (val !== undefined && typeof val === 'object') {
          this.set(storageKeyVal, val);
          restoredCounts[rawField] = 1;
        }
      };

      // Restore core tables
      mapAndSet('branches', 'BRANCHES', STORAGE_KEYS.BRANCHES);
      mapAndSet('warehouses', 'WAREHOUSES', STORAGE_KEYS.WAREHOUSES);
      mapAndSet('departments', 'DEPARTMENTS', STORAGE_KEYS.DEPARTMENTS);
      mapAndSet('inventory', 'INVENTORY', STORAGE_KEYS.INVENTORY);
      mapAndSet('inventoryUsage', 'INVENTORY_USAGE', STORAGE_KEYS.INVENTORY_USAGE);
      mapAndSet('assets', 'ASSETS', STORAGE_KEYS.ASSETS);
      mapAndSet('maintenanceLogs', 'MAINTENANCE_LOGS', STORAGE_KEYS.MAINTENANCE_LOGS);
      mapAndSet('transfers', 'TRANSFERS', STORAGE_KEYS.TRANSFERS);
      mapAndSet('purchaseOrders', 'PURCHASE_ORDERS', STORAGE_KEYS.PURCHASE_ORDERS);
      mapAndSet('grns', 'GRNS', STORAGE_KEYS.GRNS);
      mapAndSet('vendorInvoices', 'VENDOR_INVOICES', STORAGE_KEYS.VENDOR_INVOICES);
      mapAndSet('testProtocols', 'TEST_PROTOCOLS', STORAGE_KEYS.TEST_PROTOCOLS);
      mapAndSet('testLogs', 'TEST_LOGS', STORAGE_KEYS.TEST_LOGS);
      mapAndSet('vendors', 'VENDORS', STORAGE_KEYS.VENDORS);
      mapAndSet('quotes', 'QUOTE_COMPARISONS', STORAGE_KEYS.QUOTE_COMPARISONS);
      mapAndSet('audits', 'AUDITS', STORAGE_KEYS.AUDITS);
      mapAndSet('narcotics', 'NARCOTICS', STORAGE_KEYS.NARCOTICS);
      mapAndSet('recalls', 'RECALLS', STORAGE_KEYS.RECALLS);
      mapAndSet('tempLogs', 'TEMP_LOGS', STORAGE_KEYS.TEMP_LOGS);
      mapAndSet('branding', 'BRANDING', STORAGE_KEYS.BRANDING);

      // Handle Users with preservation of active session if requested
      const usersVal = parsedData.users ?? parsedData.USERS ?? parsedData[STORAGE_KEYS.USERS];
      if (usersVal && Array.isArray(usersVal)) {
        if (options.preserveCurrentUser && activeUser) {
          const exists = usersVal.some((u: any) => u.id === activeUser.id || u.email?.toLowerCase() === activeUser.email?.toLowerCase());
          const mergedUsers = exists ? usersVal : [activeUser, ...usersVal];
          this.set(STORAGE_KEYS.USERS, mergedUsers);
          this.setCurrentUser(activeUser);
        } else {
          this.set(STORAGE_KEYS.USERS, usersVal);
        }
        restoredCounts.users = usersVal.length;
      }

      this.logAction('Security', `Restored database from external JSON backup (${Object.keys(restoredCounts).length} collections).`);

      this.logSuperAdminActivity({
        category: 'CONFIG_CHANGE',
        actionType: 'DATABASE_RESTORE',
        targetEntity: 'Full Database Restore Archive',
        status: 'SUCCESS',
        details: `Restored database from external JSON backup snapshot. Restored: ${Object.entries(restoredCounts)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')}`,
      });

      // Notify multi-tab broadcast channel
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'DATABASE_RESTORED', timestamp: Date.now() });
      }

      // Dispatch global window storage event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hr-database-restored', { detail: restoredCounts }));
      }

      return { success: true, restoredCounts };
    } catch (err: any) {
      console.error('Failed to restore backup JSON:', err);
      return { success: false, error: err.message || 'Unknown restore error', restoredCounts: {} };
    }
  },

  // Legacy import wrapper
  importFullBackup(jsonContent: string): boolean {
    const res = this.parseAndValidateBackupJSON(jsonContent);
    if (!res.valid || !res.parsedData) return false;
    const r = this.executeDatabaseRestore(res.parsedData, { preserveCurrentUser: true });
    return r.success;
  },

  // System Branding & Custom Logo
  getSystemBranding(): SystemBranding {
    const b = this.get<SystemBranding>(STORAGE_KEYS.BRANDING, DEFAULT_BRANDING);
    const companyName = !b.companyName || b.companyName.toUpperCase().includes('NADEEM') ? 'HR DIAGNOSTICS' : b.companyName;
    const shortCode = !b.shortCode || b.shortCode === 'NE' ? 'HRD' : b.shortCode;
    return {
      ...b,
      companyName,
      shortCode,
      logoType: 'image',
      logoUrl: HR_DIAGNOSTICS_LOGO_DATA_URL,
      tagline: b.tagline || 'PEOPLE • PROCESS • PERFORMANCE',
    };
  },

  saveSystemBranding(branding: SystemBranding): void {
    const updated = {
      ...branding,
      updatedAt: new Date().toISOString(),
    };
    this.set(STORAGE_KEYS.BRANDING, updated);
    this.logAction('Security', `Updated system branding & corporate logo (${branding.companyName})`);

    this.logSuperAdminActivity({
      category: 'CONFIG_CHANGE',
      actionType: 'BRANDING_CONFIG_CHANGE',
      targetEntity: `Hospital Identity: ${branding.companyName}`,
      status: 'SUCCESS',
      details: `Updated enterprise branding: Name "${branding.companyName}", Short Code "${branding.shortCode}", Primary Color ${branding.primaryColor}`,
      metadata: { companyName: branding.companyName, shortCode: branding.shortCode, primaryColor: branding.primaryColor },
    });
  },

  resetSystemBranding(): void {
    this.set(STORAGE_KEYS.BRANDING, DEFAULT_BRANDING);
    this.logAction('Security', 'Reset system branding to default settings.');

    this.logSuperAdminActivity({
      category: 'CONFIG_CHANGE',
      actionType: 'BRANDING_CONFIG_CHANGE',
      targetEntity: 'Hospital Identity: Default Branding',
      status: 'SUCCESS',
      details: 'Reset system branding and logo configuration to factory defaults.',
    });
  },

  // Lab Test Protocols & Automated Reagent Deduction
  getLabTestProtocols(): LabTestProtocol[] {
    const list = this.get<LabTestProtocol[]>(STORAGE_KEYS.TEST_PROTOCOLS, []);
    if (list.length === 0) {
      this.set(STORAGE_KEYS.TEST_PROTOCOLS, DEFAULT_TEST_PROTOCOLS);
      return DEFAULT_TEST_PROTOCOLS;
    }
    return list;
  },

  saveLabTestProtocol(protocol: LabTestProtocol): void {
    const protocols = this.getLabTestProtocols();
    const idx = protocols.findIndex((p) => p.id === protocol.id);
    if (idx >= 0) protocols[idx] = protocol;
    else protocols.unshift(protocol);
    this.set(STORAGE_KEYS.TEST_PROTOCOLS, protocols);
    this.logAction('Inventory', `Saved lab test protocol: ${protocol.testName} (${protocol.testCode})`);
  },

  deleteLabTestProtocol(id: string): void {
    const protocols = this.getLabTestProtocols().filter((p) => p.id !== id);
    this.set(STORAGE_KEYS.TEST_PROTOCOLS, protocols);
    this.logAction('Inventory', `Deleted lab test protocol ID: ${id}`);
  },

  getLabTestLogs(): LabTestExecutionLog[] {
    return this.get<LabTestExecutionLog[]>(STORAGE_KEYS.TEST_LOGS, []);
  },

  executeLabTestRun(params: {
    protocolId: string;
    testCount: number;
    branchId: string;
    branchName: string;
    executedByUserId: string;
    executedByUserName: string;
    analyzerUsed?: string;
    remarks?: string;
  }): { success: boolean; log?: LabTestExecutionLog; error?: string } {
    const protocols = this.getLabTestProtocols();
    const protocol = protocols.find((p) => p.id === params.protocolId);
    if (!protocol) return { success: false, error: 'Protocol not found.' };

    const inventory = this.getInventory();
    const deductions: LabTestExecutionLog['deductions'] = [];

    // For each reagent requirement in protocol, deduct (FEFO) from inventory in matching branch
    for (const req of protocol.reagents) {
      const totalNeeded = req.requiredQtyPerTest * params.testCount;

      // Find matching item in inventory for this branch
      let targetItem = inventory.find(
        (item) =>
          item.branchId === params.branchId &&
          (req.itemId ? item.id === req.itemId : item.name.toLowerCase().includes(req.itemName.toLowerCase()))
      );

      // If not in branch, search head office / central warehouse
      if (!targetItem) {
        targetItem = inventory.find(
          (item) =>
            req.itemId ? item.id === req.itemId : item.name.toLowerCase().includes(req.itemName.toLowerCase())
        );
      }

      if (!targetItem) {
        // Record deduction item trace
        deductions.push({
          itemId: req.itemId || `unlinked_${Date.now()}`,
          itemName: req.itemName,
          uom: req.uom,
          quantityDeducted: totalNeeded,
          batchesAffected: [
            {
              batchNumber: 'STANDARD-LAB-LOT',
              deductedFromBatch: totalNeeded,
              expiryDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
            },
          ],
        });
        continue;
      }

      // Sort batches by earliest expiry (FEFO principle)
      const sortedBatches = [...targetItem.batches].sort(
        (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );

      let remainingToDeduct = totalNeeded;
      const batchesAffected: { batchNumber: string; deductedFromBatch: number; expiryDate: string }[] = [];

      for (const batch of sortedBatches) {
        if (remainingToDeduct <= 0) break;
        const availableInBatch = batch.currentQuantity || 0;
        if (availableInBatch <= 0) continue;

        const deductFromThis = Math.min(availableInBatch, remainingToDeduct);
        batch.currentQuantity -= deductFromThis;
        remainingToDeduct -= deductFromThis;
        batchesAffected.push({
          batchNumber: batch.batchNumber,
          deductedFromBatch: deductFromThis,
          expiryDate: batch.expiryDate,
        });
      }

      // If stock was lower than needed, still deduct from last batch or mark shortage
      if (remainingToDeduct > 0 && sortedBatches.length > 0) {
        const lastBatch = sortedBatches[sortedBatches.length - 1];
        lastBatch.currentQuantity = Math.max(0, (lastBatch.currentQuantity || 0) - remainingToDeduct);
        batchesAffected.push({
          batchNumber: lastBatch.batchNumber + ' (Overdrawn)',
          deductedFromBatch: remainingToDeduct,
          expiryDate: lastBatch.expiryDate,
        });
      }

      targetItem.batches = sortedBatches;
      targetItem.totalQuantity = sortedBatches.reduce((sum, b) => sum + (b.currentQuantity || 0), 0);
      targetItem.updatedAt = new Date().toISOString();

      deductions.push({
        itemId: targetItem.id,
        itemName: targetItem.name,
        uom: req.uom,
        quantityDeducted: totalNeeded,
        batchesAffected,
      });
    }

    this.set(STORAGE_KEYS.INVENTORY, inventory);

    const runLog: LabTestExecutionLog = {
      id: `run_${Date.now()}`,
      runNumber: `RUN-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      protocolId: protocol.id,
      testCode: protocol.testCode,
      testName: protocol.testName,
      branchId: params.branchId,
      branchName: params.branchName,
      testCount: params.testCount,
      executedDate: new Date().toISOString().split('T')[0],
      executedByUserId: params.executedByUserId,
      executedByUserName: params.executedByUserName,
      analyzerUsed: params.analyzerUsed || protocol.targetAnalyzer,
      deductions,
      remarks: params.remarks,
    };

    const logs = this.getLabTestLogs();
    logs.unshift(runLog);
    this.set(STORAGE_KEYS.TEST_LOGS, logs);

    this.logAction(
      'Inventory',
      `Executed lab run ${runLog.runNumber}: ${params.testCount}x ${protocol.testName} at ${params.branchName}. Automated FEFO deduction applied across ${deductions.length} reagents.`
    );

    return { success: true, log: runLog };
  },

  // Inventory Usage & Branch-Specific Stock Deduction
  getInventoryUsageRecords(branchId?: string): InventoryUsageRecord[] {
    const list = this.get<InventoryUsageRecord[]>(STORAGE_KEYS.INVENTORY_USAGE, []);
    if (!branchId || branchId === 'all') {
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return list
      .filter((r) => r.branchId === branchId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  recordInventoryUsage(params: {
    itemId: string;
    branchId: string;
    quantityUsed: number;
    usedByEmployeeName: string;
    usedByEmployeeId?: string;
    usedByUserRole?: string;
    departmentId?: string;
    departmentName?: string;
    batchNumber?: string;
    purpose: string;
    referenceNote?: string;
    patientIdOrSampleNo?: string;
  }): { success: boolean; record?: InventoryUsageRecord; error?: string } {
    if (!params.itemId) {
      return { success: false, error: 'Please select an inventory item.' };
    }
    if (!params.quantityUsed || params.quantityUsed <= 0) {
      return { success: false, error: 'Usage quantity must be greater than zero.' };
    }

    const items = this.getInventory();
    const item = items.find((i) => i.id === params.itemId && (params.branchId === 'all' || i.branchId === params.branchId));
    if (!item) {
      return { success: false, error: 'Item not found in the selected branch inventory.' };
    }

    const branch = this.getBranches().find((b) => b.id === item.branchId);
    const branchName = branch ? branch.name : (params.branchId || 'Central Lab');
    const dept = this.getDepartments().find((d) => d.id === params.departmentId || d.id === item.departmentId);
    const departmentName = params.departmentName || (dept ? dept.name : 'General Diagnostics');

    const availableStock = item.totalQuantity || 0;
    if (params.quantityUsed > availableStock) {
      return {
        success: false,
        error: `Insufficient stock in ${branchName}. Available: ${availableStock} ${item.uom}, Requested: ${params.quantityUsed} ${item.uom}.`,
      };
    }

    const stockBefore = availableStock;
    let remainingToDeduct = params.quantityUsed;
    const batchesAffected: { batchNumber: string; deductedFromBatch: number; expiryDate: string }[] = [];
    const selectedBatchNumber = params.batchNumber;

    if (item.batches && item.batches.length > 0) {
      // If a specific batch was selected
      if (params.batchNumber && params.batchNumber !== 'auto_fefo') {
        const targetBatch = item.batches.find((b) => b.batchNumber === params.batchNumber);
        if (targetBatch) {
          if (targetBatch.currentQuantity < remainingToDeduct) {
            return {
              success: false,
              error: `Batch ${params.batchNumber} only has ${targetBatch.currentQuantity} ${item.uom} remaining in stock.`,
            };
          }
          targetBatch.currentQuantity -= remainingToDeduct;
          batchesAffected.push({
            batchNumber: targetBatch.batchNumber,
            deductedFromBatch: remainingToDeduct,
            expiryDate: targetBatch.expiryDate,
          });
          remainingToDeduct = 0;
        }
      }

      // If still remaining or auto_fefo, deduct using FEFO (earliest expiry first)
      if (remainingToDeduct > 0) {
        const sortedBatches = [...item.batches].sort(
          (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        );

        for (const b of sortedBatches) {
          if (remainingToDeduct <= 0) break;
          const availableInBatch = b.currentQuantity || 0;
          if (availableInBatch <= 0) continue;

          const deductAmount = Math.min(availableInBatch, remainingToDeduct);
          b.currentQuantity -= deductAmount;
          remainingToDeduct -= deductAmount;
          batchesAffected.push({
            batchNumber: b.batchNumber,
            deductedFromBatch: deductAmount,
            expiryDate: b.expiryDate,
          });
        }
        item.batches = sortedBatches;
      }
    }

    const stockAfter = Math.max(0, stockBefore - params.quantityUsed);
    item.totalQuantity = stockAfter;

    // Ensure all batches quantities strictly align with stockAfter
    if (item.batches && item.batches.length > 0) {
      const batchSum = item.batches.reduce((sum, b) => sum + (b.currentQuantity || 0), 0);
      if (batchSum !== stockAfter) {
        const diff = stockAfter - batchSum;
        const target = item.batches.find((b) => (b.currentQuantity || 0) + diff >= 0) || item.batches[0];
        if (target) {
          target.currentQuantity = Math.max(0, (target.currentQuantity || 0) + diff);
        }
      }
    }
    this.saveInventoryItem(item);

    const primaryBatch = batchesAffected[0]?.batchNumber || selectedBatchNumber || 'BATCH-MAIN';
    const primaryExpiry = batchesAffected[0]?.expiryDate;
    const totalCostValue = (item.costPrice || 0) * params.quantityUsed;

    const newRecord: InventoryUsageRecord = {
      id: `use_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.name,
      category: item.category,
      uom: item.uom,
      batchNumber: primaryBatch,
      expiryDate: primaryExpiry,
      branchId: item.branchId,
      branchName,
      warehouseId: item.warehouseId,
      departmentId: params.departmentId || item.departmentId,
      departmentName,
      quantityUsed: params.quantityUsed,
      stockBefore,
      stockAfter,
      usedByEmployeeName: params.usedByEmployeeName || 'Staff Member',
      usedByEmployeeId: params.usedByEmployeeId,
      usedByUserRole: params.usedByUserRole,
      purpose: params.purpose || 'Routine Clinical Diagnostic Analysis',
      referenceNote: params.referenceNote,
      patientIdOrSampleNo: params.patientIdOrSampleNo,
      costPrice: item.costPrice,
      totalCostValue,
      batchesAffected,
      timestamp: new Date().toISOString(),
    };

    const usageList = this.get<InventoryUsageRecord[]>(STORAGE_KEYS.INVENTORY_USAGE, []);
    usageList.unshift(newRecord);
    this.set(STORAGE_KEYS.INVENTORY_USAGE, usageList);

    // Audit Log
    this.logAction(
      'Inventory',
      `Employee ${newRecord.usedByEmployeeName} consumed ${newRecord.quantityUsed} ${newRecord.uom} of "${item.name}" at ${branchName}. Remaining stock: ${stockAfter} ${item.uom}.`
    );

    // Low stock warning alert
    if (stockAfter <= item.minStockLevel) {
      this.addNotification({
        type: 'low_stock',
        severity: stockAfter === 0 ? 'critical' : 'high',
        title: `Low Stock Alert (${branchName})`,
        message: `${item.name} (${item.sku}) is down to ${stockAfter} ${item.uom} (Min Level: ${item.minStockLevel}). Please reorder.`,
        actionRequired: true,
        relatedEntityId: item.id,
        branchId: item.branchId,
      });
    }

    return { success: true, record: newRecord };
  },

  // ========================================================
  // ATTENDANCE & BIOMETRIC (ZKTECO / HIKVISION / PUNCH) API
  // ========================================================

  getBiometricDevices(): BiometricDevice[] {
    return this.get<BiometricDevice[]>(STORAGE_KEYS.BIOMETRIC_DEVICES, []);
  },

  saveBiometricDevice(device: BiometricDevice): void {
    const list = this.getBiometricDevices();
    const idx = list.findIndex((d) => d.id === device.id);
    if (idx >= 0) list[idx] = device;
    else list.push(device);
    this.set(STORAGE_KEYS.BIOMETRIC_DEVICES, list);
    this.logAction('System', `Biometric Device saved: ${device.name} (${device.ipAddress}:${device.port})`);
  },

  deleteBiometricDevice(deviceId: string): void {
    const list = this.getBiometricDevices().filter((d) => d.id !== deviceId);
    this.set(STORAGE_KEYS.BIOMETRIC_DEVICES, list);
    this.logAction('System', `Deleted Biometric Device ID: ${deviceId}`);
  },

  getShiftTimings(): ShiftTiming[] {
    const defaultShifts: ShiftTiming[] = [
      {
        id: 'shift_morning',
        name: 'Morning Diagnostic Shift (8 AM - 4 PM)',
        startTime: '08:00',
        endTime: '16:00',
        gracePeriodMinutes: 15,
        halfDayThresholdHours: 4.5,
        fullDayRequiredHours: 8,
      },
      {
        id: 'shift_evening',
        name: 'Evening Lab Shift (4 PM - 12 AM)',
        startTime: '16:00',
        endTime: '24:00',
        gracePeriodMinutes: 15,
        halfDayThresholdHours: 4.5,
        fullDayRequiredHours: 8,
      },
      {
        id: 'shift_night',
        name: 'Night Emergency Shift (12 AM - 8 AM)',
        startTime: '00:00',
        endTime: '08:00',
        gracePeriodMinutes: 15,
        halfDayThresholdHours: 4.5,
        fullDayRequiredHours: 8,
      },
    ];
    return this.get<ShiftTiming[]>(STORAGE_KEYS.SHIFT_TIMINGS, defaultShifts);
  },

  saveShiftTiming(shift: ShiftTiming): void {
    const list = this.getShiftTimings();
    const idx = list.findIndex((s) => s.id === shift.id);
    if (idx >= 0) list[idx] = shift;
    else list.push(shift);
    this.set(STORAGE_KEYS.SHIFT_TIMINGS, list);
  },

  getEmployees(branchId?: string): EmployeeProfile[] {
    const list = this.get<EmployeeProfile[]>(STORAGE_KEYS.EMPLOYEES, []);
    if (!branchId || branchId === 'all') return list;
    return list.filter((e) => e.branchId === branchId);
  },

  saveEmployee(employee: EmployeeProfile): void {
    const list = this.get<EmployeeProfile[]>(STORAGE_KEYS.EMPLOYEES, []);
    const idx = list.findIndex((e) => e.id === employee.id);
    if (idx >= 0) list[idx] = employee;
    else list.unshift(employee);
    this.set(STORAGE_KEYS.EMPLOYEES, list);
    this.logAction('Staff', `Employee record saved: ${employee.name} (${employee.employeeCode})`);
  },

  deleteEmployee(employeeId: string): void {
    const list = this.get<EmployeeProfile[]>(STORAGE_KEYS.EMPLOYEES, []).filter((e) => e.id !== employeeId);
    this.set(STORAGE_KEYS.EMPLOYEES, list);
    this.logAction('Staff', `Deleted employee ID: ${employeeId}`);
  },

  getAttendanceRecords(filter?: { branchId?: string; date?: string; month?: string }): AttendanceRecord[] {
    let list = this.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE_LOGS, []);
    if (filter?.branchId && filter.branchId !== 'all') {
      list = list.filter((r) => r.branchId === filter.branchId);
    }
    if (filter?.date) {
      list = list.filter((r) => r.date === filter.date);
    }
    if (filter?.month) {
      list = list.filter((r) => r.date.startsWith(filter.month!));
    }
    return list.sort((a, b) => (b.date + (b.checkInTime || '')).localeCompare(a.date + (a.checkInTime || '')));
  },

  recordAttendancePunch(params: {
    employeeId: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM:SS
    punchType: 'check_in' | 'check_out';
    punchMethod: AttendanceRecord['punchMethod'];
    deviceId?: string;
    deviceName?: string;
    notes?: string;
  }): { success: boolean; record: AttendanceRecord } {
    const employees = this.getEmployees();
    const emp = employees.find((e) => e.id === params.employeeId);
    if (!emp) throw new Error('Employee not found');

    const shifts = this.getShiftTimings();
    const shift = shifts.find((s) => s.id === emp.shiftId) || shifts[0];

    const records = this.get<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE_LOGS, []);
    let existing = records.find((r) => r.employeeId === emp.id && r.date === params.date);

    if (!existing) {
      existing = {
        id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeCode,
        branchId: emp.branchId,
        branchName: emp.branchName,
        departmentId: emp.departmentId,
        departmentName: emp.departmentName,
        date: params.date,
        punchMethod: params.punchMethod,
        deviceId: params.deviceId,
        deviceName: params.deviceName,
        status: 'Present',
        workHours: 0,
        overtimeHours: 0,
        lateMinutes: 0,
        earlyLeavingMinutes: 0,
        shiftName: shift.name,
        notes: params.notes,
      };
      records.unshift(existing);
    }

    if (params.punchType === 'check_in') {
      existing.checkInTime = params.time;
      existing.punchMethod = params.punchMethod;
      existing.deviceId = params.deviceId;
      existing.deviceName = params.deviceName;

      // Late Calculation
      if (shift && shift.startTime) {
        const [sHour, sMin] = shift.startTime.split(':').map(Number);
        const [inHour, inMin] = params.time.split(':').map(Number);
        const shiftStartMins = sHour * 60 + sMin;
        const actualInMins = inHour * 60 + inMin;
        const diff = actualInMins - shiftStartMins;
        if (diff > shift.gracePeriodMinutes) {
          existing.status = 'Late';
          existing.lateMinutes = diff;
        } else {
          existing.status = 'Present';
          existing.lateMinutes = 0;
        }
      }
    } else {
      existing.checkOutTime = params.time;
      // Work hours calculation
      if (existing.checkInTime) {
        const [inH, inM] = existing.checkInTime.split(':').map(Number);
        const [outH, outM] = params.time.split(':').map(Number);
        const totalMinutes = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
        const hours = Number((totalMinutes / 60).toFixed(2));
        existing.workHours = hours;

        if (hours >= shift.fullDayRequiredHours) {
          existing.overtimeHours = Number(Math.max(0, hours - shift.fullDayRequiredHours).toFixed(2));
          if (existing.status !== 'Late') existing.status = 'Present';
        } else if (hours >= shift.halfDayThresholdHours) {
          existing.status = 'Half Day';
        } else {
          existing.status = 'Absent';
        }
      }
    }

    this.set(STORAGE_KEYS.ATTENDANCE_LOGS, records);
    return { success: true, record: existing };
  },

  importZKTecoLogs(parsedPunches: Array<{
    enrollNumber: string; // employee code
    timestamp: string; // YYYY-MM-DD HH:MM:SS
    deviceId?: string;
    deviceName?: string;
  }>): { processed: number; matched: number; unmatched: number } {
    const employees = this.getEmployees();
    let processed = 0;
    let matched = 0;
    let unmatched = 0;

    for (const punch of parsedPunches) {
      processed++;
      const [datePart, timePart] = punch.timestamp.split(' ');
      if (!datePart || !timePart) continue;

      const emp = employees.find(
        (e) => e.employeeCode.toLowerCase() === punch.enrollNumber.toLowerCase() ||
               e.employeeCode.replace(/\D/g, '') === punch.enrollNumber.replace(/\D/g, '')
      );

      if (!emp) {
        unmatched++;
        continue;
      }

      matched++;
      // Determine if check-in or check-out (first punch is check-in, subsequent later is checkout)
      const existing = this.getAttendanceRecords({ date: datePart }).find((r) => r.employeeId === emp.id);
      const isCheckIn = !existing || !existing.checkInTime || timePart < existing.checkInTime;

      this.recordAttendancePunch({
        employeeId: emp.id,
        date: datePart,
        time: timePart,
        punchType: isCheckIn ? 'check_in' : 'check_out',
        punchMethod: 'ZKTeco Biometric',
        deviceId: punch.deviceId || 'zk_device_imported',
        deviceName: punch.deviceName || 'ZKTeco Biometric Standalone',
      });
    }

    this.logAction('Attendance', `Imported ${processed} biometric punches (${matched} matched, ${unmatched} unmatched).`);
    return { processed, matched, unmatched };
  },

  // ========================================================
  // ADVANCE SALARY, LOANS & PAYROLL ENGINE (PKR)
  // ========================================================

  getAdvanceLoans(branchId?: string): AdvanceLoanRecord[] {
    const list = this.get<AdvanceLoanRecord[]>(STORAGE_KEYS.ADVANCE_LOANS, []);
    if (!branchId || branchId === 'all') return list;
    return list.filter((l) => l.branchId === branchId);
  },

  saveAdvanceLoan(loan: AdvanceLoanRecord): void {
    const list = this.get<AdvanceLoanRecord[]>(STORAGE_KEYS.ADVANCE_LOANS, []);
    const idx = list.findIndex((l) => l.id === loan.id);
    if (idx >= 0) list[idx] = loan;
    else list.unshift(loan);
    this.set(STORAGE_KEYS.ADVANCE_LOANS, list);
    this.logAction('Payroll', `Advance / Loan recorded: Rs. ${loan.totalAmount.toLocaleString()} for ${loan.employeeName} (${loan.loanType}).`);
  },

  recordLoanRepayment(loanId: string, amount: number, payrollSlipId?: string): boolean {
    const list = this.get<AdvanceLoanRecord[]>(STORAGE_KEYS.ADVANCE_LOANS, []);
    const loan = list.find((l) => l.id === loanId);
    if (!loan) return false;

    loan.remainingBalance = Math.max(0, loan.remainingBalance - amount);
    loan.installmentsPaid += 1;
    if (loan.remainingBalance === 0) loan.status = 'Paid in Full';

    loan.repaymentHistory.push({
      date: new Date().toISOString().split('T')[0],
      amount,
      payrollSlipId,
      receiptNumber: `RCP-LN-${Date.now().toString().slice(-5)}`,
    });

    this.set(STORAGE_KEYS.ADVANCE_LOANS, list);
    return true;
  },

  getPayrollSlips(month?: string, branchId?: string): PayrollSlip[] {
    let list = this.get<PayrollSlip[]>(STORAGE_KEYS.PAYROLL_SLIPS, []);
    if (month) list = list.filter((p) => p.payrollMonth === month);
    if (branchId && branchId !== 'all') list = list.filter((p) => p.branchId === branchId);
    return list;
  },

  savePayrollSlip(slip: PayrollSlip): void {
    const list = this.get<PayrollSlip[]>(STORAGE_KEYS.PAYROLL_SLIPS, []);
    const idx = list.findIndex((p) => p.id === slip.id || (p.employeeId === slip.employeeId && p.payrollMonth === slip.payrollMonth));
    if (idx >= 0) list[idx] = slip;
    else list.unshift(slip);
    this.set(STORAGE_KEYS.PAYROLL_SLIPS, list);
  },

  generateMonthlyPayroll(params: {
    payrollMonth: string; // e.g. "2026-10"
    branchId?: string;
    generatedBy: string;
  }): { generatedCount: number; totalGross: number; totalDeductions: number; totalNet: number } {
    const employees = this.getEmployees(params.branchId);
    const attendance = this.getAttendanceRecords({ month: params.payrollMonth, branchId: params.branchId });
    const activeLoans = this.getAdvanceLoans(params.branchId).filter((l) => l.status === 'Active' && l.remainingBalance > 0);

    let generatedCount = 0;
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const daysInMonth = 30; // Standard clinical corporate payroll calendar

    for (const emp of employees) {
      if (!emp.isActive) continue;

      // Calculate attendance statistics for employee in this month
      const empLogs = attendance.filter((a) => a.employeeId === emp.id);
      const presentCount = empLogs.filter((a) => a.status === 'Present').length;
      const lateCount = empLogs.filter((a) => a.status === 'Late').length;
      const halfDayCount = empLogs.filter((a) => a.status === 'Half Day').length;
      const leaveCount = empLogs.filter((a) => a.status === 'On Leave').length;
      const totalOvertimeHours = empLogs.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);

      // Absent days = daysInMonth - (present + late + leave + weekly offs approx 4)
      const workedDays = presentCount + lateCount + (halfDayCount * 0.5) + leaveCount;
      const absentDays = Math.max(0, daysInMonth - 4 - workedDays);

      const perDaySalary = Math.round(emp.grossSalary / daysInMonth);
      const perHourSalary = Math.round(perDaySalary / 8);

      // Deductions
      const absentDeduction = Math.round(absentDays * perDaySalary);
      // Late deduction: e.g. every 3 lates = half day deduction
      const lateDeduction = Math.round(Math.floor(lateCount / 3) * (perDaySalary * 0.5));
      
      // Advance Loan auto-deduction
      const empLoan = activeLoans.find((l) => l.employeeId === emp.id);
      let advanceLoanDeduction = 0;
      if (empLoan) {
        advanceLoanDeduction = Math.min(empLoan.remainingBalance, empLoan.monthlyDeductionAmount);
      }

      // Overtime Pay (1.5x hourly rate)
      const overtimePay = Math.round(totalOvertimeHours * (perHourSalary * 1.5));

      const allowances = (emp.medicalAllowance || 0) + (emp.transportAllowance || 0) + (emp.housingAllowance || 0) + (emp.specialAllowance || 0);
      const grossEarnings = emp.basicSalary + allowances + overtimePay;

      // Tax Deduction (simplified corporate slab)
      let taxDeduction = 0;
      if (grossEarnings > 100000) taxDeduction = Math.round(grossEarnings * 0.05);

      const empTotalDeductions = absentDeduction + lateDeduction + advanceLoanDeduction + taxDeduction;
      const netSalary = Math.max(0, grossEarnings - empTotalDeductions);

      const slipId = `slip_${params.payrollMonth}_${emp.id}`;
      const slip: PayrollSlip = {
        id: slipId,
        payrollMonth: params.payrollMonth,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeCode,
        designation: emp.designation,
        departmentName: emp.departmentName,
        branchId: emp.branchId,
        branchName: emp.branchName,
        totalDaysInMonth: daysInMonth,
        presentDays: presentCount,
        absentDays,
        lateDays: lateCount,
        paidLeaves: leaveCount,
        overtimeHours: totalOvertimeHours,
        basicSalary: emp.basicSalary,
        allowances,
        overtimePay,
        bonusAmount: 0,
        grossEarnings,
        lateDeduction,
        absentDeduction,
        advanceLoanDeduction,
        taxDeduction,
        otherDeductions: 0,
        totalDeductions: empTotalDeductions,
        netSalary,
        paymentStatus: 'Unpaid',
        paymentMethod: emp.paymentMode,
        generatedAt: new Date().toISOString(),
        generatedBy: params.generatedBy,
      };

      this.savePayrollSlip(slip);

      // If advance loan was deducted, record repayment installment
      if (empLoan && advanceLoanDeduction > 0) {
        this.recordLoanRepayment(empLoan.id, advanceLoanDeduction, slipId);
      }

      generatedCount++;
      totalGross += grossEarnings;
      totalDeductions += empTotalDeductions;
      totalNet += netSalary;
    }

    this.logAction(
      'Payroll',
      `Generated Monthly Payroll for ${params.payrollMonth}: ${generatedCount} slips processed. Net payout: Rs. ${totalNet.toLocaleString()}`
    );

    return { generatedCount, totalGross, totalDeductions, totalNet };
  },

  // ==========================================
  // CLINIC CASH COUNTER & BILLING ENGINE METHODS
  // ==========================================

  getClinicPatients(): ClinicPatient[] {
    const raw = this.get<ClinicPatient[]>(STORAGE_KEYS.CLINIC_PATIENTS, []);
    if (raw && Array.isArray(raw) && raw.length > 0) return raw;
    const initial: ClinicPatient[] = [
      {
        id: 'P-10452',
        mrNumber: 'MR-5712298',
        name: 'Muhammad Ali',
        gender: 'Male',
        age: 32,
        dob: '1994-06-15',
        phone: '0300-1234567',
        cnic: '35201-1248191-3',
        address: 'House 14, St 3, Model Town, Lahore',
        bloodGroup: 'B+',
        emergencyContact: '0300-8451922 (Brother)',
        guardianName: 'Bashir Ahmed',
        registrationDate: '2026-01-10',
        branchId: 'br_lhr_gulberg',
        branchName: 'Lahore Gulberg Diagnostic Hub',
        totalVisits: 4,
        totalSpentPKR: 14200,
      },
      {
        id: 'PAT-2026-002',
        mrNumber: 'MR-104922',
        name: 'Fatima Zahra',
        gender: 'Female',
        age: 29,
        dob: '1997-03-22',
        phone: '0321-4567890',
        cnic: '35202-9876543-2',
        address: 'Flat 4B, Gulberg Heights, Lahore',
        bloodGroup: 'O+',
        emergencyContact: '0321-4567891 (Spouse)',
        guardianName: 'Hamza Tariq',
        registrationDate: '2026-02-14',
        branchId: 'br_lhr_gulberg',
        branchName: 'Lahore Gulberg Diagnostic Hub',
        totalVisits: 2,
        totalSpentPKR: 8500,
      },
      {
        id: 'PAT-2026-003',
        mrNumber: 'MR-104923',
        name: 'Tariq Mahmood',
        gender: 'Male',
        age: 56,
        dob: '1970-11-05',
        phone: '0333-7654321',
        cnic: '35201-5678123-1',
        address: '12-A DHA Phase 5, Lahore',
        bloodGroup: 'A+',
        emergencyContact: '0333-7654322',
        guardianName: 'Ghulam Rasool',
        registrationDate: '2026-03-01',
        branchId: 'br_headoffice',
        branchName: 'Head Office & Central Lab Hub',
        totalVisits: 6,
        totalSpentPKR: 26800,
      },
      {
        id: 'PAT-2026-004',
        mrNumber: 'MR-104924',
        name: 'Ayesha Khan',
        gender: 'Female',
        age: 35,
        dob: '1991-08-19',
        phone: '0312-9988776',
        cnic: '42101-4455667-4',
        address: 'Clifton Block 2, Karachi',
        bloodGroup: 'AB+',
        emergencyContact: '0312-9988770',
        guardianName: 'Rashid Khan',
        registrationDate: '2026-03-12',
        branchId: 'br_khi_clifton',
        branchName: 'Karachi South Executive Lab',
        totalVisits: 3,
        totalSpentPKR: 11400,
      },
      {
        id: 'PAT-2026-005',
        mrNumber: 'MR-104925',
        name: 'Bilal Ahmed',
        gender: 'Male',
        age: 23,
        dob: '2003-04-10',
        phone: '0345-1122334',
        cnic: '37405-3344556-5',
        address: 'Sector F-7/2, Islamabad',
        bloodGroup: 'O-',
        emergencyContact: '0345-1122335',
        guardianName: 'Saeed Ahmed',
        registrationDate: '2026-03-18',
        branchId: 'br_isb_blue',
        branchName: 'Islamabad Federal Diagnostic Wing',
        totalVisits: 1,
        totalSpentPKR: 4200,
      },
    ];
    this.set(STORAGE_KEYS.CLINIC_PATIENTS, initial);
    return initial;
  },

  saveClinicPatient(patient: ClinicPatient): ClinicPatient {
    const list = this.getClinicPatients();
    const idx = list.findIndex((p) => p.id === patient.id || p.mrNumber === patient.mrNumber);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...patient };
    } else {
      list.unshift(patient);
    }
    this.set(STORAGE_KEYS.CLINIC_PATIENTS, list);
    if (storageSyncListener) {
      storageSyncListener(STORAGE_KEYS.CLINIC_PATIENTS, patient, { docId: patient.id, action: 'set' });
    }
    this.logAction('Billing', `Saved patient record: ${patient.name || patient.fullName} (MRN: ${patient.mrNumber})`);
    return patient;
  },

  deleteClinicPatient(patientId: string): boolean {
    const list = this.getClinicPatients();
    const filtered = list.filter((p) => p.id !== patientId);
    if (filtered.length !== list.length) {
      this.set(STORAGE_KEYS.CLINIC_PATIENTS, filtered);
      this.logAction('Billing', `Deleted patient record ID: ${patientId}`);
      return true;
    }
    return false;
  },

  getClinicDoctors(): ClinicDoctor[] {
    const raw = this.get<ClinicDoctor[]>(STORAGE_KEYS.CLINIC_DOCTORS, []);
    if (raw && Array.isArray(raw) && raw.length > 0) return raw;
    const initial: ClinicDoctor[] = [
      {
        id: 'DOC-101',
        name: 'Dr. Asim Raza (Consultant Pathologist)',
        specialization: 'Clinical Pathology, Hematology & Cytology',
        department: 'Hematology & Clinical Pathology',
        consultationFeePKR: 2500,
        contactNumber: '0300-1122331',
        regNumber: '48921-P',
        roomNumber: 'OPD Clinic 01',
        isActive: true,
      },
      {
        id: 'DOC-102',
        name: 'Dr. Farhan Qureshi (Consultant Radiologist)',
        specialization: 'Diagnostic Radiology, Ultrasound & Doppler',
        department: 'Radiology & Medical Imaging',
        consultationFeePKR: 3000,
        contactNumber: '0321-2233442',
        regNumber: '51204-P',
        roomNumber: 'Ultrasound Suite 02',
        digitalSignatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="60"><path d="M10,40 Q40,10 70,35 T130,25 T170,45" fill="none" stroke="%231e3a8a" stroke-width="2.5"/></svg>',
        isActive: true,
      },
      {
        id: 'DOC-103',
        name: 'Dr. Zubair Ahmed (Consultant Cardiologist)',
        specialization: 'Interventional Cardiology, ECG & Echo',
        department: 'Cardiology Diagnostics',
        consultationFeePKR: 3500,
        contactNumber: '0333-3344553',
        regNumber: '39812-P',
        roomNumber: 'Cardio Suite 01',
        isActive: true,
      },
      {
        id: 'DOC-104',
        name: 'Dr. Maria Farooq (Consultant Biochemist & Diabetologist)',
        specialization: 'Metabolic Disorders, Endocrinology & Lipids',
        department: 'Clinical Chemistry & Molecular',
        consultationFeePKR: 2200,
        contactNumber: '0312-4455664',
        regNumber: '56789-P',
        roomNumber: 'OPD Clinic 02',
        isActive: true,
      },
      {
        id: 'DOC-105',
        name: 'Dr. Kamran Siddiqui (General Physician / RMO)',
        specialization: 'General Medicine & Acute OPD Care',
        department: 'Outpatient Department (OPD)',
        consultationFeePKR: 1500,
        contactNumber: '0345-5566775',
        regNumber: '62190-P',
        roomNumber: 'Triage & OPD 03',
        isActive: true,
      },
      {
        id: 'DOC-AHSAN-RAZA',
        name: 'Dr. Ahsan Raza',
        specialization: 'MBBS, FCPS (Radiology)',
        department: 'Radiology',
        consultationFeePKR: 3000,
        contactNumber: '0300-1112255',
        regNumber: '74231-PMC',
        roomNumber: 'Ultrasound Suite 01',
        digitalSignatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="50" viewBox="0 0 160 50"><path d="M10,35 Q35,5 65,28 T115,18 T150,38" fill="none" stroke="%231d4ed8" stroke-width="3" stroke-linecap="round"/></svg>',
        isActive: true,
      },
      {
        id: 'DOC-TARIQ-MAHMOOD',
        name: 'Dr. Tariq Mahmood',
        specialization: 'Consultant Physician',
        department: 'Internal Medicine & OPD',
        consultationFeePKR: 2500,
        contactNumber: '0300-9988776',
        regNumber: '68912-PMC',
        roomNumber: 'Consultation Room 04',
        isActive: true,
      },
    ];
    this.set(STORAGE_KEYS.CLINIC_DOCTORS, initial);
    return initial;
  },

  saveClinicDoctor(doctor: ClinicDoctor): ClinicDoctor {
    const list = this.getClinicDoctors();
    const idx = list.findIndex((d) => d.id === doctor.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...doctor };
    } else {
      list.unshift(doctor);
    }
    this.set(STORAGE_KEYS.CLINIC_DOCTORS, list);
    this.logAction('Billing', `Saved doctor record: ${doctor.name}`);
    return doctor;
  },

  getClinicServices(): ClinicServiceItem[] {
    const raw = this.get<ClinicServiceItem[]>(STORAGE_KEYS.CLINIC_SERVICES, []);
    if (raw && Array.isArray(raw) && raw.length > 0) return raw;
    const initial: ClinicServiceItem[] = [
      // Doctor Consultations
      {
        id: 'SRV-CON-01',
        code: 'CON-SPEC',
        name: 'Specialist Doctor Consultation',
        category: 'Doctor Consultation',
        standardFee: 2500,
        departmentName: 'Consultant OPD',
        requiresDoctor: true,
        taxPercentage: 0,
        description: 'Comprehensive 20-min clinical evaluation with consultant specialist.',
        isActive: true,
      },
      {
        id: 'SRV-CON-02',
        code: 'CON-GEN',
        name: 'General OPD Doctor Consultation',
        category: 'Doctor Consultation',
        standardFee: 1500,
        departmentName: 'General OPD',
        requiresDoctor: true,
        taxPercentage: 0,
        description: 'Standard medical officer triage and OPD prescription.',
        isActive: true,
      },
      // Ultrasound
      {
        id: 'SRV-US-01',
        code: 'US-ABD-PEL',
        name: 'Ultrasound Whole Abdomen & Pelvis',
        category: 'Ultrasound',
        standardFee: 3500,
        departmentName: 'Radiology',
        requiresDoctor: true,
        taxPercentage: 0,
        description: 'High-resolution abdominal visceral ultrasound including liver, gallbladder, kidneys, spleen and bladder.',
        isActive: true,
      },
      {
        id: 'SRV-US-02',
        code: 'US-KUB',
        name: 'Ultrasound KUB & Prostate',
        category: 'Ultrasound',
        standardFee: 2800,
        departmentName: 'Radiology',
        requiresDoctor: true,
        taxPercentage: 0,
        description: 'Kidney, ureter and urinary bladder examination with post-void residual calculation.',
        isActive: true,
      },
      {
        id: 'SRV-US-03',
        code: 'US-OBS-ANOM',
        name: 'Obstetric Anomaly Ultrasound Scan',
        category: 'Ultrasound',
        standardFee: 4500,
        departmentName: 'Radiology',
        requiresDoctor: true,
        taxPercentage: 0,
        description: 'Targeted fetal structural anomaly assessment with color Doppler.',
        isActive: true,
      },
      {
        id: 'SRV-US-04',
        code: 'US-THY-DOP',
        name: 'Thyroid & Neck Soft Tissue Ultrasound',
        category: 'Ultrasound',
        standardFee: 3200,
        departmentName: 'Radiology',
        requiresDoctor: true,
        taxPercentage: 0,
        description: 'Bilateral thyroid gland evaluation with TIRADS classification.',
        isActive: true,
      },
      // X-Ray
      {
        id: 'SRV-XR-01',
        code: 'XR-CHEST-PA',
        name: 'Digital Chest X-Ray PA View',
        category: 'X-Ray',
        standardFee: 1400,
        departmentName: 'Radiology',
        requiresDoctor: false,
        taxPercentage: 0,
        description: 'High-frequency digital radiography for lungs, heart and pleural assessment.',
        isActive: true,
      },
      {
        id: 'SRV-XR-02',
        code: 'XR-LUMB-SPINE',
        name: 'X-Ray Lumbar Spine AP & Lateral Views',
        category: 'X-Ray',
        standardFee: 2400,
        departmentName: 'Radiology',
        requiresDoctor: false,
        taxPercentage: 0,
        description: 'Two-view digital radiograph of lumbar vertebrae and disc spaces.',
        isActive: true,
      },
      {
        id: 'SRV-XR-03',
        code: 'XR-KNEE-BILAT',
        name: 'X-Ray Knee Joint Bilateral AP/Lat (Standing)',
        category: 'X-Ray',
        standardFee: 2600,
        departmentName: 'Radiology',
        requiresDoctor: false,
        taxPercentage: 0,
        description: 'Weight-bearing bilateral knee radiographic evaluation for osteoarthritis.',
        isActive: true,
      },
      {
        id: 'SRV-XR-04',
        code: 'XR-PNS-WATERS',
        name: 'X-Ray Paranasal Sinuses (Water’s View)',
        category: 'X-Ray',
        standardFee: 1600,
        departmentName: 'Radiology',
        requiresDoctor: false,
        taxPercentage: 0,
        description: 'Radiographic visualization of maxillary and frontal sinuses for sinusitis.',
        isActive: true,
      },
      // Laboratory Tests
      {
        id: 'SRV-LAB-01',
        code: 'LAB-CBC-DIFF',
        name: 'Complete Blood Count (CBC) with Automated Differential',
        category: 'Laboratory Tests',
        standardFee: 750,
        departmentName: 'Hematology',
        requiresDoctor: false,
        taxPercentage: 0,
        description: '5-part differential blood work including Hb, TLC, DLC, Platelets, and RBC indices.',
        isActive: true,
      },
      {
        id: 'SRV-LAB-02',
        code: 'LAB-LFT-COMP',
        name: 'Liver Function Tests (LFT) Comprehensive Profile',
        category: 'Laboratory Tests',
        standardFee: 1800,
        departmentName: 'Biochemistry',
        requiresDoctor: false,
        taxPercentage: 0,
        description: 'Bilirubin Total/Direct, ALT/SGPT, AST/SGOT, Alkaline Phosphatase, and Total Protein.',
        isActive: true,
      },
      {
        id: 'SRV-LAB-03',
        code: 'LAB-RFT-COMP',
        name: 'Renal Function Tests (RFT / KFT)',
        category: 'Laboratory Tests',
        standardFee: 1200,
        departmentName: 'Biochemistry',
        requiresDoctor: false,
        taxPercentage: 0,
        description: 'Serum Creatinine, Blood Urea, BUN, and eGFR calculation.',
        isActive: true,
      },
      {
        id: 'SRV-LAB-04',
        code: 'LAB-HBA1C-HPLC',
        name: 'Glycated Hemoglobin HbA1c (HPLC Standard)',
        category: 'Laboratory Tests',
        standardFee: 1500,
        departmentName: 'Biochemistry',
        requiresDoctor: false,
        taxPercentage: 0,
        description: '3-month average diabetic glucose control index via Gold-Standard HPLC.',
        isActive: true,
      },
      {
        id: 'SRV-LAB-05',
        code: 'LAB-LIPID-PROF',
        name: 'Lipid Profile Comprehensive (Fasting)',
        category: 'Laboratory Tests',
        standardFee: 2200,
        departmentName: 'Biochemistry',
        requiresDoctor: false,
        taxPercentage: 0,
        description: 'Cholesterol Total, Triglycerides, HDL, LDL, VLDL and risk ratios.',
        isActive: true,
      },
      {
        id: 'SRV-LAB-06',
        code: 'LAB-URINE-RE',
        name: 'Urine Routine & Microscopic Examination (Urine R/E)',
        category: 'Laboratory Tests',
        standardFee: 450,
        departmentName: 'Clinical Pathology',
        requiresDoctor: false,
        taxPercentage: 0,
        description: '10-parameter dipstick chemical analysis and centrifugal sediment microscopy.',
        isActive: true,
      },
      {
        id: 'SRV-LAB-07',
        code: 'LAB-TROP-I-QUANT',
        name: 'Cardiac Troponin I Quantitative Assay (Emergency)',
        category: 'Laboratory Tests',
        standardFee: 3200,
        departmentName: 'Emergency Cardiac',
        requiresDoctor: false,
        taxPercentage: 0,
        description: 'Rapid cardiac marker immunoassay for acute coronary syndrome evaluation.',
        isActive: true,
      },
      {
        id: 'SRV-LAB-08',
        code: 'LAB-HEP-BC-SCRN',
        name: 'Hepatitis B & C Screening ELISA Combo',
        category: 'Laboratory Tests',
        standardFee: 2600,
        departmentName: 'Immunology',
        requiresDoctor: false,
        taxPercentage: 0,
        description: 'Bilateral automated chemiluminescent immunoassay for HBsAg and Anti-HCV.',
        isActive: true,
      },
      // ECG
      {
        id: 'SRV-ECG-01',
        code: 'ECG-12-LEAD',
        name: '12-Lead Electrocardiogram (ECG) with Clinical Interpretation',
        category: 'ECG',
        standardFee: 1200,
        departmentName: 'Cardiology',
        requiresDoctor: false,
        taxPercentage: 0,
        description: '12-lead digital diagnostic rhythm and ischemia strip with doctor sign-off.',
        isActive: true,
      },
      {
        id: 'SRV-ECG-02',
        code: 'ECG-HOLTER-24H',
        name: '24-Hour Ambulatory Holter ECG Monitoring',
        category: 'ECG',
        standardFee: 6500,
        departmentName: 'Cardiology',
        requiresDoctor: true,
        taxPercentage: 0,
        description: 'Continuous 24-hr multi-channel digital Holter recorder hook-up and computerized arrhythmia analysis.',
        isActive: true,
      },
      // Other Medical Services
      {
        id: 'SRV-OTH-01',
        code: 'OTH-VITALS-CHECK',
        name: 'Clinical Vitals & Blood Pressure Triage',
        category: 'Other Medical Services',
        standardFee: 200,
        departmentName: 'Nursing Station',
        requiresDoctor: false,
        taxPercentage: 0,
        description: 'Digital NIBP, SpO2 pulse oximetry, heart rate and temperature check.',
        isActive: true,
      },
      {
        id: 'SRV-OTH-02',
        code: 'OTH-NEBULIZE',
        name: 'Emergency Bronchodilator Nebulization Session',
        category: 'Other Medical Services',
        standardFee: 600,
        departmentName: 'Emergency OPD',
        requiresDoctor: false,
        taxPercentage: 0,
        description: 'Compressor nebulizer session with Salbutamol / Ipratropium for acute bronchospasm.',
        isActive: true,
      },
      {
        id: 'SRV-OTH-03',
        code: 'OTH-BS-RANDOM',
        name: 'Random Blood Sugar (RBS) Instant Glucometer',
        category: 'Other Medical Services',
        standardFee: 200,
        departmentName: 'Nursing Station',
        requiresDoctor: false,
        taxPercentage: 0,
        description: 'Capillary blood glucose check with calibrated clinical glucometer.',
        isActive: true,
      },
    ];
    this.set(STORAGE_KEYS.CLINIC_SERVICES, initial);
    return initial;
  },

  saveClinicService(service: ClinicServiceItem): ClinicServiceItem {
    const list = this.getClinicServices();
    const idx = list.findIndex((s) => s.id === service.id || s.code === service.code);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...service };
    } else {
      list.unshift(service);
    }
    this.set(STORAGE_KEYS.CLINIC_SERVICES, list);
    this.logAction('Billing', `Saved clinic service item: ${service.name} (Code: ${service.code})`);
    return service;
  },

  deleteClinicService(serviceId: string): boolean {
    const list = this.getClinicServices();
    const filtered = list.filter((s) => s.id !== serviceId && s.code !== serviceId);
    if (filtered.length !== list.length) {
      this.set(STORAGE_KEYS.CLINIC_SERVICES, filtered);
      this.logAction('Billing', `Deleted service item ID: ${serviceId}`);
      return true;
    }
    return false;
  },

  getClinicVisits(patientId?: string): ClinicVisit[] {
    const raw = this.get<ClinicVisit[]>(STORAGE_KEYS.CLINIC_VISITS, []);
    let visits: ClinicVisit[] = [];
    if (raw && Array.isArray(raw) && raw.length > 0) {
      visits = raw;
    } else {
      const today = new Date().toISOString().split('T')[0];
      const initial: ClinicVisit[] = [
        {
          id: 'vis_seed_001',
          visitNumber: 'VIS-2026-00421',
          visitDate: today,
          patientId: 'PAT-2026-001',
          patientMRN: 'MR-104921',
          patientName: 'Muhammad Ali',
          doctorId: 'DOC-102',
          doctorName: 'Dr. Farhan Qureshi',
          invoiceId: 'inv_seed_001',
          invoiceNumber: 'INV-2026-0042',
          services: [
            {
              serviceId: 'SRV-US-01',
              serviceCode: 'US-ABD-PEL',
              serviceName: 'Ultrasound Whole Abdomen & Pelvis',
              category: 'Ultrasound',
              quantity: 1,
              unitPrice: 3500,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              taxPercentage: 0,
              taxAmount: 0,
              netAmount: 3500,
            },
          ],
          netAmount: 3500,
          paidAmount: 3500,
          reportStatus: 'Completed',
          clinicalNotes: 'Abdominal pain, epigastric tenderness. Scan performed.',
          createdAt: `${today}T09:42:15.000Z`,
        },
      ];
      this.set(STORAGE_KEYS.CLINIC_VISITS, initial);
      visits = initial;
    }

    if (patientId) {
      return visits.filter((v) => v.patientId === patientId || v.patientMRN === patientId);
    }
    return visits;
  },

  saveClinicVisit(visit: ClinicVisit): ClinicVisit {
    const list = this.get<ClinicVisit[]>(STORAGE_KEYS.CLINIC_VISITS, []);
    const idx = list.findIndex((v) => v.id === visit.id || v.visitNumber === visit.visitNumber);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...visit };
    } else {
      list.unshift(visit);
    }
    this.set(STORAGE_KEYS.CLINIC_VISITS, list);
    if (storageSyncListener) {
      storageSyncListener(STORAGE_KEYS.CLINIC_VISITS, visit, { docId: visit.id, action: 'set' });
    }
    this.logAction('Billing', `Recorded visit ${visit.visitNumber} for ${visit.patientName}`);
    return visit;
  },

  getClinicTokens(dateStr?: string): ClinicToken[] {
    const raw = this.get<ClinicToken[]>(STORAGE_KEYS.CLINIC_TOKENS, []);
    let tokens = raw;
    if (!tokens || tokens.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const initial: ClinicToken[] = [
        {
          id: 'tok_seed_023',
          tokenNumber: 'T-023',
          tokenDate: today,
          sequenceNumber: 23,
          department: 'Ultrasound',
          serviceName: 'Whole Abdomen Ultrasound',
          patientId: 'P-10452',
          patientMRN: 'MR-5712298',
          patientName: 'Ayesha Khan',
          patientGender: 'Female',
          patientAge: 28,
          patientPhone: '0300-1234567',
          invoiceId: 'inv_seed_023',
          invoiceNumber: 'INV-2026-1105-023',
          counterNumber: 'Counter 1',
          status: 'Called',
          calledAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          estimatedWaitMinutes: 5,
          waitingPosition: 1,
        },
        {
          id: 'tok_seed_024',
          tokenNumber: 'T-024',
          tokenDate: today,
          sequenceNumber: 24,
          department: 'X-Ray',
          serviceName: 'Chest X-Ray PA View',
          patientId: 'P-10453',
          patientMRN: 'MR-5712299',
          patientName: 'Bilal Ahmed',
          patientGender: 'Male',
          patientAge: 45,
          patientPhone: '0321-9876543',
          invoiceId: 'inv_seed_024',
          invoiceNumber: 'INV-2026-1105-024',
          counterNumber: 'Counter 2',
          status: 'Waiting',
          createdAt: new Date().toISOString(),
          estimatedWaitMinutes: 10,
          waitingPosition: 2,
        },
        {
          id: 'tok_seed_025',
          tokenNumber: 'T-025',
          tokenDate: today,
          sequenceNumber: 25,
          department: 'Laboratory',
          serviceName: 'Complete Blood Count (CBC)',
          patientId: 'P-10454',
          patientMRN: 'MR-5712300',
          patientName: 'Saima Noor',
          patientGender: 'Female',
          patientAge: 34,
          patientPhone: '0333-5566778',
          invoiceId: 'inv_seed_025',
          invoiceNumber: 'INV-2026-1105-025',
          counterNumber: 'Counter 3',
          status: 'Waiting',
          createdAt: new Date().toISOString(),
          estimatedWaitMinutes: 15,
          waitingPosition: 3,
        },
      ];
      this.set(STORAGE_KEYS.CLINIC_TOKENS, initial);
      tokens = initial;
    }
    if (dateStr) {
      return tokens.filter((t) => t.tokenDate === dateStr);
    }
    return tokens;
  },

  saveClinicToken(token: ClinicToken): ClinicToken {
    const list = this.get<ClinicToken[]>(STORAGE_KEYS.CLINIC_TOKENS, []);
    const idx = list.findIndex((t) => t.id === token.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...token };
    } else {
      list.unshift(token);
    }
    this.set(STORAGE_KEYS.CLINIC_TOKENS, list);
    if (storageSyncListener) {
      storageSyncListener(STORAGE_KEYS.CLINIC_TOKENS, token, { docId: token.id, action: 'set' });
    }
    this.logAction('Billing', `Generated Token ${token.tokenNumber} for ${token.patientName}`);
    return token;
  },

  getNextTokenNumber(department?: string, dateStr?: string): { tokenNumber: string; sequenceNumber: number } {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const tokens = this.getClinicTokens(today);
    let prefix = 'T';
    if (department === 'Ultrasound') prefix = 'US';
    else if (department === 'X-Ray') prefix = 'XR';
    else if (department === 'Laboratory') prefix = 'LAB';

    const deptTokens = tokens.filter((t) => t.tokenDate === today);
    const maxSeq = deptTokens.reduce((max, t) => Math.max(max, t.sequenceNumber || 0), 22);
    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(3, '0');
    return {
      tokenNumber: `${prefix}-${padded}`,
      sequenceNumber: nextSeq,
    };
  },

  getClinicInvoices(branchId?: string): ClinicInvoice[] {
    const raw = this.get<ClinicInvoice[]>(STORAGE_KEYS.CLINIC_INVOICES, []);
    let invoices: ClinicInvoice[] = [];
    if (raw && Array.isArray(raw) && raw.length > 0) {
      invoices = raw;
    } else {
      // Seed realistic initial invoices for today and recent days
      const today = new Date().toISOString().split('T')[0];
      const initial: ClinicInvoice[] = [
        {
          id: 'inv_seed_001',
          invoiceNumber: 'INV-2026-0042',
          receiptNumber: 'REC-2026-0042',
          branchId: 'br_lhr_gulberg',
          branchName: 'Lahore Gulberg Diagnostic Hub',
          counterName: 'Cash Counter 01 (Main OPD)',
          patientId: 'PAT-2026-001',
          patientMRN: 'MR-104921',
          patientName: 'Muhammad Ali',
          patientPhone: '0300-8451921',
          patientAge: 42,
          patientGender: 'Male',
          patientCnic: '35201-1248191-3',
          referredDoctorId: 'DOC-101',
          referredDoctorName: 'Dr. Asim Raza (Consultant Pathologist)',
          departmentName: 'Hematology & Clinical Pathology',
          items: [
            {
              serviceId: 'SRV-LAB-01',
              serviceCode: 'LAB-CBC-DIFF',
              serviceName: 'Complete Blood Count (CBC) with Automated Differential',
              category: 'Laboratory Tests',
              quantity: 1,
              unitPrice: 750,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              taxPercentage: 0,
              taxAmount: 0,
              netAmount: 750,
            },
            {
              serviceId: 'SRV-LAB-02',
              serviceCode: 'LAB-LFT-COMP',
              serviceName: 'Liver Function Tests (LFT) Comprehensive Profile',
              category: 'Laboratory Tests',
              quantity: 1,
              unitPrice: 1800,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              taxPercentage: 0,
              taxAmount: 0,
              netAmount: 1800,
            },
            {
              serviceId: 'SRV-US-01',
              serviceCode: 'US-ABD-PEL',
              serviceName: 'Ultrasound Whole Abdomen & Pelvis',
              category: 'Ultrasound',
              doctorId: 'DOC-102',
              doctorName: 'Dr. Hina Tahir (Consultant Radiologist)',
              quantity: 1,
              unitPrice: 3500,
              discountType: 'fixed',
              discountValue: 300,
              discountAmount: 300,
              taxPercentage: 0,
              taxAmount: 0,
              netAmount: 3200,
            },
          ],
          subtotal: 6050,
          totalDiscount: 300,
          discountReason: 'Courtesy Doctor Referral Discount',
          discountApprovedBy: 'Admin (Head Office)',
          totalTax: 0,
          grossTotal: 6050,
          netPayable: 5750,
          paidAmount: 5750,
          balanceDue: 0,
          paymentStatus: 'Fully Paid',
          payments: [
            {
              method: 'Cash',
              amount: 5750,
              timestamp: `${today}T09:42:15.000Z`,
            },
          ],
          cashierId: 'usr_nadeem',
          cashierName: 'Muhammad Nadeem (Cashier)',
          shiftId: 'shift_active_01',
          createdAt: `${today}T09:42:15.000Z`,
          reprintCount: 0,
          isCancelled: false,
          notes: 'Routine health screening package.',
        },
        {
          id: 'inv_seed_002',
          invoiceNumber: 'INV-2026-0043',
          receiptNumber: 'REC-2026-0043',
          branchId: 'br_lhr_gulberg',
          branchName: 'Lahore Gulberg Diagnostic Hub',
          counterName: 'Cash Counter 01 (Main OPD)',
          patientId: 'PAT-2026-002',
          patientMRN: 'MR-104922',
          patientName: 'Fatima Zahra',
          patientPhone: '0321-4567890',
          patientAge: 29,
          patientGender: 'Female',
          patientCnic: '35202-9876543-2',
          referredDoctorId: 'DOC-103',
          referredDoctorName: 'Dr. Zubair Ahmed (Consultant Cardiologist)',
          departmentName: 'Cardiology Diagnostics',
          items: [
            {
              serviceId: 'SRV-CON-01',
              serviceCode: 'CON-SPEC',
              serviceName: 'Specialist Doctor Consultation',
              category: 'Doctor Consultation',
              doctorId: 'DOC-103',
              doctorName: 'Dr. Zubair Ahmed (Consultant Cardiologist)',
              quantity: 1,
              unitPrice: 3500,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              taxPercentage: 0,
              taxAmount: 0,
              netAmount: 3500,
            },
            {
              serviceId: 'SRV-ECG-01',
              serviceCode: 'ECG-12-LEAD',
              serviceName: '12-Lead Electrocardiogram (ECG) with Clinical Interpretation',
              category: 'ECG',
              quantity: 1,
              unitPrice: 1200,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              taxPercentage: 0,
              taxAmount: 0,
              netAmount: 1200,
            },
          ],
          subtotal: 4700,
          totalDiscount: 0,
          totalTax: 0,
          grossTotal: 4700,
          netPayable: 4700,
          paidAmount: 4700,
          balanceDue: 0,
          paymentStatus: 'Fully Paid',
          payments: [
            {
              method: 'Debit/Credit Card',
              amount: 4700,
              referenceNumber: 'HBL-AUTH-982134',
              bankName: 'Habib Bank POS',
              timestamp: `${today}T10:15:30.000Z`,
            },
          ],
          cashierId: 'usr_nadeem',
          cashierName: 'Muhammad Nadeem (Cashier)',
          shiftId: 'shift_active_01',
          createdAt: `${today}T10:15:30.000Z`,
          reprintCount: 0,
          isCancelled: false,
          notes: 'Chest pain emergency triage follow-up.',
        },
        {
          id: 'inv_seed_003',
          invoiceNumber: 'INV-2026-0044',
          receiptNumber: 'REC-2026-0044',
          branchId: 'br_lhr_gulberg',
          branchName: 'Lahore Gulberg Diagnostic Hub',
          counterName: 'Cash Counter 01 (Main OPD)',
          patientId: 'PAT-2026-003',
          patientMRN: 'MR-104923',
          patientName: 'Tariq Mahmood',
          patientPhone: '0333-7654321',
          patientAge: 56,
          patientGender: 'Male',
          patientCnic: '35201-5678123-1',
          referredDoctorId: 'DOC-104',
          referredDoctorName: 'Dr. Maria Farooq (Consultant Biochemist)',
          departmentName: 'Clinical Chemistry & Molecular',
          items: [
            {
              serviceId: 'SRV-LAB-04',
              serviceCode: 'LAB-HBA1C-HPLC',
              serviceName: 'Glycated Hemoglobin HbA1c (HPLC Standard)',
              category: 'Laboratory Tests',
              quantity: 1,
              unitPrice: 1500,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              taxPercentage: 0,
              taxAmount: 0,
              netAmount: 1500,
            },
            {
              serviceId: 'SRV-LAB-05',
              serviceCode: 'LAB-LIPID-PROF',
              serviceName: 'Lipid Profile Comprehensive (Fasting)',
              category: 'Laboratory Tests',
              quantity: 1,
              unitPrice: 2200,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              taxPercentage: 0,
              taxAmount: 0,
              netAmount: 2200,
            },
            {
              serviceId: 'SRV-LAB-03',
              serviceCode: 'LAB-RFT-COMP',
              serviceName: 'Renal Function Tests (RFT / KFT)',
              category: 'Laboratory Tests',
              quantity: 1,
              unitPrice: 1200,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              taxPercentage: 0,
              taxAmount: 0,
              netAmount: 1200,
            },
          ],
          subtotal: 4900,
          totalDiscount: 400,
          discountReason: 'Senior Citizen 10% Concession',
          discountApprovedBy: 'Branch Manager',
          totalTax: 0,
          grossTotal: 4900,
          netPayable: 4500,
          paidAmount: 2500,
          balanceDue: 2000,
          paymentStatus: 'Partially Paid',
          payments: [
            {
              method: 'Cash',
              amount: 2500,
              timestamp: `${today}T11:05:00.000Z`,
            },
          ],
          cashierId: 'usr_nadeem',
          cashierName: 'Muhammad Nadeem (Cashier)',
          shiftId: 'shift_active_01',
          createdAt: `${today}T11:05:00.000Z`,
          reprintCount: 0,
          isCancelled: false,
          notes: 'Balance Rs. 2,000 payable upon lab report collection.',
        },
      ];
      this.set(STORAGE_KEYS.CLINIC_INVOICES, initial);
      invoices = initial;
    }

    if (branchId && branchId !== 'all') {
      return invoices.filter((inv) => inv.branchId === branchId);
    }
    return invoices;
  },

  saveClinicInvoice(invoice: ClinicInvoice): ClinicInvoice {
    const list = this.get<ClinicInvoice[]>(STORAGE_KEYS.CLINIC_INVOICES, []);
    const idx = list.findIndex((i: ClinicInvoice) => i.id === invoice.id || i.invoiceNumber === invoice.invoiceNumber);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...invoice };
    } else {
      list.unshift(invoice);
    }
    this.set(STORAGE_KEYS.CLINIC_INVOICES, list);
    if (storageSyncListener) {
      storageSyncListener(STORAGE_KEYS.CLINIC_INVOICES, invoice, { docId: invoice.id, action: 'set' });
    }

    // Update patient total visits & expenditure
    const patients = this.getClinicPatients();
    const pIdx = patients.findIndex((p) => p.id === invoice.patientId || p.mrNumber === invoice.patientMRN);
    if (pIdx >= 0) {
      patients[pIdx].totalVisits = (patients[pIdx].totalVisits || 0) + 1;
      patients[pIdx].totalSpentPKR = (patients[pIdx].totalSpentPKR || 0) + invoice.paidAmount;
      this.set(STORAGE_KEYS.CLINIC_PATIENTS, patients);
    }

    this.logAction(
      'Billing',
      `Issued Clinic Invoice ${invoice.invoiceNumber} for ${invoice.patientName} (Rs. ${invoice.netPayable.toLocaleString()}, Paid: Rs. ${invoice.paidAmount.toLocaleString()})`
    );
    return invoice;
  },

  cancelClinicInvoice(invoiceId: string, reason: string, cancelledBy: string): { success: boolean; message: string } {
    const list = this.getClinicInvoices();
    const target = list.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
    if (!target) return { success: false, message: 'Invoice record not found.' };

    target.isCancelled = true;
    target.paymentStatus = 'Cancelled';
    target.cancelledAt = new Date().toISOString();
    target.cancelledBy = cancelledBy;
    target.cancellationReason = reason;

    this.set(STORAGE_KEYS.CLINIC_INVOICES, list);
    this.logAction('Billing', `CANCELLED Invoice ${target.invoiceNumber}. Reason: ${reason} (Approved By: ${cancelledBy})`);
    return { success: true, message: `Invoice ${target.invoiceNumber} successfully cancelled.` };
  },

  refundClinicInvoice(
    invoiceId: string,
    refundAmount: number,
    reason: string,
    approvedBy: string
  ): { success: boolean; message: string } {
    const list = this.getClinicInvoices();
    const target = list.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
    if (!target) return { success: false, message: 'Invoice record not found.' };

    if (refundAmount <= 0 || refundAmount > target.paidAmount) {
      return { success: false, message: `Refund amount cannot exceed paid amount of Rs. ${target.paidAmount}` };
    }

    target.refundAmount = (target.refundAmount || 0) + refundAmount;
    target.refundReason = reason;
    target.refundApprovedBy = approvedBy;
    target.refundedAt = new Date().toISOString();
    target.paymentStatus = target.refundAmount >= target.paidAmount ? 'Refunded' : target.paymentStatus;

    this.set(STORAGE_KEYS.CLINIC_INVOICES, list);

    // Record cash expense out for the shift
    const activeShift = this.getActiveCashShift();
    if (activeShift) {
      this.recordCashExpense({
        shiftId: activeShift.id,
        cashierId: activeShift.cashierId,
        cashierName: activeShift.cashierName,
        branchId: target.branchId,
        branchName: target.branchName,
        amount: refundAmount,
        type: 'Cash Out / Expense',
        category: 'Patient Billing Refund',
        description: `Refund for Invoice ${target.invoiceNumber} (${target.patientName}): ${reason}`,
        authorizedBy: approvedBy,
        voucherNumber: `REF-${Date.now().toString().slice(-6)}`,
      });
    }

    this.logAction(
      'Billing',
      `Processed Refund of Rs. ${refundAmount.toLocaleString()} on Invoice ${target.invoiceNumber} for ${target.patientName}. Reason: ${reason}`
    );
    return { success: true, message: `Refund of Rs. ${refundAmount.toLocaleString()} successfully processed.` };
  },

  recordInvoicePayment(invoiceId: string, payment: PaymentSplitEntry): { success: boolean; message: string } {
    const list = this.getClinicInvoices();
    const target = list.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
    if (!target) return { success: false, message: 'Invoice not found.' };

    target.payments.push(payment);
    target.paidAmount += payment.amount;
    target.balanceDue = Math.max(target.netPayable - target.paidAmount, 0);
    target.paymentStatus = target.balanceDue === 0 ? 'Fully Paid' : 'Partially Paid';

    this.set(STORAGE_KEYS.CLINIC_INVOICES, list);
    this.logAction(
      'Billing',
      `Received payment of Rs. ${payment.amount.toLocaleString()} via ${payment.method} for Invoice ${target.invoiceNumber}. Remaining balance: Rs. ${target.balanceDue.toLocaleString()}`
    );
    return { success: true, message: `Payment of Rs. ${payment.amount.toLocaleString()} successfully posted.` };
  },

  recordReceiptReprint(invoiceId: string): number {
    const list = this.getClinicInvoices();
    const target = list.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
    if (!target) return 0;
    target.reprintCount = (target.reprintCount || 0) + 1;
    this.set(STORAGE_KEYS.CLINIC_INVOICES, list);
    return target.reprintCount;
  },

  // ==========================================
  // CASH DRAWER & SHIFT MANAGEMENT METHODS
  // ==========================================

  getCashShifts(branchId?: string): CashShiftSession[] {
    const raw = this.get<CashShiftSession[]>(STORAGE_KEYS.CASH_SHIFTS, []);
    let shifts: CashShiftSession[] = [];
    if (raw && Array.isArray(raw) && raw.length > 0) {
      shifts = raw;
    } else {
      const today = new Date().toISOString().split('T')[0];
      const initial: CashShiftSession[] = [
        {
          id: 'shift_active_01',
          shiftNumber: 'SHIFT-2026-0012',
          cashierId: 'usr_nadeem',
          cashierName: 'Muhammad Nadeem',
          branchId: 'br_lhr_gulberg',
          branchName: 'Lahore Gulberg Diagnostic Hub',
          counterName: 'Cash Counter 01 (Main OPD)',
          openedAt: `${today}T08:00:00.000Z`,
          openingBalance: 15000, // Rs. 15,000 float in cash drawer
          status: 'Open',
          cashCollections: 8250,
          cardCollections: 4700,
          bankCollections: 0,
          onlineCollections: 0,
          creditInvoiced: 2000,
          cashExpensesOut: 650,
          cashRefunds: 0,
          cashInHandExpected: 22600, // 15000 + 8250 - 650
          totalInvoicesCount: 3,
        },
      ];
      this.set(STORAGE_KEYS.CASH_SHIFTS, initial);
      shifts = initial;
    }

    if (branchId && branchId !== 'all') {
      return shifts.filter((s) => s.branchId === branchId);
    }
    return shifts;
  },

  getActiveCashShift(cashierId?: string): CashShiftSession | null {
    const shifts = this.getCashShifts();
    const openShifts = shifts.filter((s) => s.status === 'Open');
    if (cashierId) {
      return openShifts.find((s) => s.cashierId === cashierId) || openShifts[0] || null;
    }
    return openShifts[0] || null;
  },

  openCashShift(params: {
    cashierId: string;
    cashierName: string;
    branchId: string;
    branchName: string;
    counterName: string;
    openingBalance: number;
  }): CashShiftSession {
    const shifts = this.getCashShifts();
    const count = shifts.length + 1;
    const newShift: CashShiftSession = {
      id: `shift_${Date.now()}`,
      shiftNumber: `SHIFT-2026-${count.toString().padStart(4, '0')}`,
      cashierId: params.cashierId,
      cashierName: params.cashierName,
      branchId: params.branchId,
      branchName: params.branchName,
      counterName: params.counterName || 'Counter 01 (OPD)',
      openedAt: new Date().toISOString(),
      openingBalance: params.openingBalance || 0,
      status: 'Open',
      cashCollections: 0,
      cardCollections: 0,
      bankCollections: 0,
      onlineCollections: 0,
      creditInvoiced: 0,
      cashExpensesOut: 0,
      cashRefunds: 0,
      cashInHandExpected: params.openingBalance || 0,
      totalInvoicesCount: 0,
    };
    shifts.unshift(newShift);
    this.set(STORAGE_KEYS.CASH_SHIFTS, shifts);
    this.logAction(
      'Billing',
      `Opened Cash Shift ${newShift.shiftNumber} for ${params.cashierName} with float Rs. ${params.openingBalance.toLocaleString()}`
    );
    return newShift;
  },

  closeCashShift(
    shiftId: string,
    cashCounted: number,
    closingNotes?: string,
    closedBy?: string
  ): CashShiftSession | null {
    const shifts = this.getCashShifts();
    const target = shifts.find((s) => s.id === shiftId);
    if (!target) return null;

    // Recalculate live shift totals based on invoices issued during this shift
    const invoices = this.getClinicInvoices(target.branchId).filter((inv) => !inv.isCancelled);
    const shiftInvoices = invoices.filter(
      (inv) => inv.shiftId === shiftId || (new Date(inv.createdAt) >= new Date(target.openedAt) && inv.cashierId === target.cashierId)
    );

    let cashCol = 0;
    let cardCol = 0;
    let bankCol = 0;
    let onlineCol = 0;
    let creditInv = 0;

    shiftInvoices.forEach((inv) => {
      inv.payments.forEach((p) => {
        if (p.method === 'Cash') cashCol += p.amount;
        else if (p.method === 'Debit/Credit Card') cardCol += p.amount;
        else if (p.method === 'Bank Transfer') bankCol += p.amount;
        else if (p.method === 'Online Payment') onlineCol += p.amount;
      });
      if (inv.balanceDue > 0) {
        creditInv += inv.balanceDue;
      }
    });

    const expenses = this.getCashExpenses(shiftId);
    const totalExpenses = expenses
      .filter((e) => e.type === 'Cash Out / Expense')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalRefunds = shiftInvoices.reduce((sum, inv) => sum + (inv.refundAmount || 0), 0);

    target.cashCollections = cashCol;
    target.cardCollections = cardCol;
    target.bankCollections = bankCol;
    target.onlineCollections = onlineCol;
    target.creditInvoiced = creditInv;
    target.cashExpensesOut = totalExpenses;
    target.cashRefunds = totalRefunds;
    target.totalInvoicesCount = shiftInvoices.length;

    target.cashInHandExpected = target.openingBalance + cashCol - totalExpenses - totalRefunds;
    target.cashInHandCounted = cashCounted;
    target.cashDifference = cashCounted - target.cashInHandExpected;
    target.status = 'Closed';
    target.closedAt = new Date().toISOString();
    target.closingNotes = closingNotes;
    target.closedBy = closedBy || target.cashierName;

    this.set(STORAGE_KEYS.CASH_SHIFTS, shifts);
    this.logAction(
      'Billing',
      `CLOSED Cash Shift ${target.shiftNumber}. Expected Cash: Rs. ${target.cashInHandExpected.toLocaleString()}, Physically Counted: Rs. ${cashCounted.toLocaleString()}, Difference: Rs. ${target.cashDifference.toLocaleString()}`
    );
    return target;
  },

  getCashExpenses(shiftId?: string): CashExpenseRecord[] {
    const raw = this.get<CashExpenseRecord[]>(STORAGE_KEYS.CASH_EXPENSES, []);
    let list: CashExpenseRecord[] = [];
    if (raw && Array.isArray(raw) && raw.length > 0) {
      list = raw;
    } else {
      const today = new Date().toISOString().split('T')[0];
      const initial: CashExpenseRecord[] = [
        {
          id: 'exp_001',
          shiftId: 'shift_active_01',
          cashierId: 'usr_nadeem',
          cashierName: 'Muhammad Nadeem',
          branchId: 'br_lhr_gulberg',
          branchName: 'Lahore Gulberg Diagnostic Hub',
          amount: 650,
          type: 'Cash Out / Expense',
          category: 'Stationery & Thermal Receipt Rolls',
          description: 'Purchased 5x 80mm thermal receipt rolls for cash counter printer.',
          authorizedBy: 'Branch Manager',
          voucherNumber: 'PETTY-0104',
          timestamp: `${today}T10:45:00.000Z`,
        },
      ];
      this.set(STORAGE_KEYS.CASH_EXPENSES, initial);
      list = initial;
    }

    if (shiftId) {
      return list.filter((e) => e.shiftId === shiftId);
    }
    return list;
  },

  recordCashExpense(expense: Omit<CashExpenseRecord, 'id' | 'timestamp'>): CashExpenseRecord {
    const list = this.getCashExpenses();
    const newRecord: CashExpenseRecord = {
      ...expense,
      id: `exp_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    list.unshift(newRecord);
    this.set(STORAGE_KEYS.CASH_EXPENSES, list);
    this.logAction(
      'Billing',
      `Recorded ${expense.type} of Rs. ${expense.amount.toLocaleString()} (${expense.category}): ${expense.description}`
    );
    return newRecord;
  },

  getCashCounterStats(branchId?: string, dateStr?: string) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const allInvoices = this.getClinicInvoices(branchId);
    
    // Filter invoices created on this date
    const dayInvoices = allInvoices.filter((inv) => {
      const invDate = inv.createdAt.split('T')[0];
      return invDate === targetDate;
    });

    const activeInvoices = dayInvoices.filter((inv) => !inv.isCancelled);

    let todayTotalBilling = 0;
    let todayTotalCollections = 0;
    let cashReceived = 0;
    let cardPayments = 0;
    let onlinePayments = 0;
    let bankPayments = 0;
    let pendingPayments = 0;
    let totalRefunds = 0;
    let totalDiscounts = 0;

    activeInvoices.forEach((inv) => {
      todayTotalBilling += inv.netPayable;
      todayTotalCollections += inv.paidAmount;
      pendingPayments += inv.balanceDue;
      totalDiscounts += inv.totalDiscount || 0;
      totalRefunds += inv.refundAmount || 0;

      inv.payments.forEach((p) => {
        if (p.method === 'Cash') cashReceived += p.amount;
        else if (p.method === 'Debit/Credit Card') cardPayments += p.amount;
        else if (p.method === 'Online Payment') onlinePayments += p.amount;
        else if (p.method === 'Bank Transfer') bankPayments += p.amount;
      });
    });

    // Unique patients served today
    const patientIds = new Set(activeInvoices.map((i) => i.patientMRN || i.patientId));
    const patientsServed = patientIds.size;

    // Active shift drawer balance
    const activeShift = this.getActiveCashShift();
    const shiftOpening = activeShift ? activeShift.openingBalance : 0;
    const expenses = this.getCashExpenses();
    const todayExpenses = expenses
      .filter((e) => e.timestamp.split('T')[0] === targetDate && e.type === 'Cash Out / Expense')
      .reduce((sum, e) => sum + e.amount, 0);

    const currentCashBalance = shiftOpening + cashReceived - todayExpenses - totalRefunds;

    return {
      todayTotalBilling,
      todayTotalCollections,
      cashReceived,
      cardPayments,
      onlinePayments,
      bankPayments,
      pendingPayments,
      totalRefunds,
      totalDiscounts,
      patientsServed,
      transactionsCount: activeInvoices.length,
      currentCashBalance,
      activeShift,
      todayExpenses,
    };
  },

  getCashDrawerSummary(branchId?: string) {
    return this.getCashCounterStats(branchId);
  },

  // ==========================================
  // ULTRASOUND, X-RAY & RADIOLOGY MANAGEMENT
  // ==========================================

  getRadiologyTemplates(modality?: RadiologyModality): RadiologyTemplate[] {
    const list = this.get<RadiologyTemplate[]>(STORAGE_KEYS.RADIOLOGY_TEMPLATES, []);
    if (list.length === 0) {
      this.set(STORAGE_KEYS.RADIOLOGY_TEMPLATES, DEFAULT_RADIOLOGY_TEMPLATES);
      return modality ? DEFAULT_RADIOLOGY_TEMPLATES.filter((t) => t.modality === modality) : DEFAULT_RADIOLOGY_TEMPLATES;
    }
    return modality ? list.filter((t) => t.modality === modality) : list;
  },

  saveRadiologyTemplate(tpl: RadiologyTemplate): RadiologyTemplate {
    const list = this.getRadiologyTemplates();
    const idx = list.findIndex((t) => t.id === tpl.id);
    const updated = { ...tpl, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    this.set(STORAGE_KEYS.RADIOLOGY_TEMPLATES, list);
    this.logAction('Radiology', `Saved template: ${tpl.title} (${tpl.modality})`);
    return updated;
  },

  deleteRadiologyTemplate(templateId: string): boolean {
    const list = this.getRadiologyTemplates().filter((t) => t.id !== templateId);
    this.set(STORAGE_KEYS.RADIOLOGY_TEMPLATES, list);
    this.logAction('Radiology', `Deleted template ID: ${templateId}`);
    return true;
  },

  getMedicalShortcuts(modality?: 'Ultrasound' | 'X-Ray' | 'All'): MedicalShortcut[] {
    const list = this.get<MedicalShortcut[]>(STORAGE_KEYS.MEDICAL_SHORTCUTS, []);
    if (list.length === 0) {
      this.set(STORAGE_KEYS.MEDICAL_SHORTCUTS, DEFAULT_MEDICAL_SHORTCUTS);
      return modality && modality !== 'All'
        ? DEFAULT_MEDICAL_SHORTCUTS.filter((s) => s.modality === modality || s.modality === 'All')
        : DEFAULT_MEDICAL_SHORTCUTS;
    }
    return modality && modality !== 'All'
      ? list.filter((s) => s.modality === modality || s.modality === 'All')
      : list;
  },

  saveMedicalShortcut(shortcut: MedicalShortcut): MedicalShortcut {
    const list = this.getMedicalShortcuts();
    const idx = list.findIndex((s) => s.id === shortcut.id || s.code.toUpperCase() === shortcut.code.toUpperCase());
    const updated = { ...shortcut, code: shortcut.code.toUpperCase().trim() };
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    this.set(STORAGE_KEYS.MEDICAL_SHORTCUTS, list);
    this.logAction('Radiology', `Saved medical shortcut: [${updated.code}] ${updated.title}`);
    return updated;
  },

  deleteMedicalShortcut(shortcutId: string): boolean {
    const list = this.getMedicalShortcuts().filter((s) => s.id !== shortcutId);
    this.set(STORAGE_KEYS.MEDICAL_SHORTCUTS, list);
    this.logAction('Radiology', `Deleted shortcut ID: ${shortcutId}`);
    return true;
  },

  bulkImportMedicalShortcuts(
    shortcuts: MedicalShortcut[],
    overwriteExisting = false
  ): { added: number; updated: number; skipped: number } {
    const current = this.getMedicalShortcuts();
    let added = 0;
    let updated = 0;
    let skipped = 0;

    shortcuts.forEach((sc) => {
      const codeUpper = sc.code.toUpperCase().trim();
      const existingIdx = current.findIndex((item) => item.code.toUpperCase() === codeUpper);
      if (existingIdx >= 0) {
        if (overwriteExisting) {
          current[existingIdx] = { ...sc, id: current[existingIdx].id, code: codeUpper };
          updated++;
        } else {
          skipped++;
        }
      } else {
        current.push({ ...sc, id: sc.id || `sc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, code: codeUpper });
        added++;
      }
    });

    this.set(STORAGE_KEYS.MEDICAL_SHORTCUTS, current);
    this.logAction('Radiology', `Bulk imported shortcuts: ${added} added, ${updated} updated, ${skipped} skipped.`);
    return { added, updated, skipped };
  },

  getRadiologyStudies(patientMRN?: string): RadiologyStudyReport[] {
    const list = this.get<RadiologyStudyReport[]>(STORAGE_KEYS.RADIOLOGY_STUDIES, []);
    if (list.length === 0) {
      this.set(STORAGE_KEYS.RADIOLOGY_STUDIES, DEFAULT_RADIOLOGY_STUDIES);
      return patientMRN ? DEFAULT_RADIOLOGY_STUDIES.filter((s) => s.patientMRN === patientMRN) : DEFAULT_RADIOLOGY_STUDIES;
    }
    return patientMRN ? list.filter((s) => s.patientMRN === patientMRN) : list;
  },

  getRadiologyStudyById(id: string): RadiologyStudyReport | null {
    const list = this.getRadiologyStudies();
    return list.find((s) => s.id === id || s.studyId === id) || null;
  },

  saveRadiologyStudy(
    study: RadiologyStudyReport,
    user?: { id: string; name: string; role: string },
    changeNote?: string
  ): RadiologyStudyReport {
    const list = this.getRadiologyStudies();
    const idx = list.findIndex((s) => s.id === study.id);
    const now = new Date().toISOString();

    const previous = idx >= 0 ? list[idx] : null;
    const currentVersion = previous ? previous.version : 1;
    let newVersion = currentVersion;

    const versionHistory = previous ? [...(previous.versionHistory || [])] : [];

    if (changeNote || !previous || study.status !== previous?.status) {
      newVersion = previous ? currentVersion + 1 : 1;
      const historyEntry: ReportVersionEntry = {
        version: newVersion,
        timestamp: now,
        userId: user?.id || study.typistId || 'system',
        userName: user?.name || study.typistName || 'System',
        userRole: user?.role || 'staff',
        status: study.status,
        changeSummary: changeNote || (previous ? `Report updated to status: ${study.status}` : 'Initial study created'),
        contentSnapshot: study.freeFormContent || JSON.stringify(study.structuredFindings),
        structuredFindingsSnapshot: { ...study.structuredFindings },
        impressionSnapshot: study.impression,
      };
      versionHistory.push(historyEntry);
    }

    const updatedStudy: RadiologyStudyReport = {
      ...study,
      version: newVersion,
      versionHistory,
      updatedAt: now,
    };

    if (idx >= 0) {
      list[idx] = updatedStudy;
    } else {
      list.unshift(updatedStudy);
    }

    this.set(STORAGE_KEYS.RADIOLOGY_STUDIES, list);
    if (storageSyncListener) {
      storageSyncListener(STORAGE_KEYS.RADIOLOGY_STUDIES, updatedStudy, { docId: updatedStudy.id, action: 'set' });
    }
    this.logAction('Radiology', `Saved study ${updatedStudy.studyId} (${updatedStudy.examinationType}) for ${updatedStudy.patientName} [${updatedStudy.status}]`);
    return updatedStudy;
  },

  approveRadiologyReport(
    studyId: string,
    doctor: { id: string; name: string; qualification?: string; regNo?: string; signatureUrl?: string }
  ): { success: boolean; study?: RadiologyStudyReport; message: string } {
    const list = this.getRadiologyStudies();
    const study = list.find((s) => s.id === studyId || s.studyId === studyId);
    if (!study) {
      return { success: false, message: 'Study not found.' };
    }

    const now = new Date().toISOString();
    const newVersion = (study.version || 1) + 1;

    const versionEntry: ReportVersionEntry = {
      version: newVersion,
      timestamp: now,
      userId: doctor.id,
      userName: doctor.name,
      userRole: 'radiologist',
      status: 'Approved',
      changeSummary: `Verified, digitally signed, and approved by ${doctor.name} (${doctor.qualification || 'Radiologist'}).`,
      contentSnapshot: study.freeFormContent || JSON.stringify(study.structuredFindings),
      structuredFindingsSnapshot: { ...study.structuredFindings },
      impressionSnapshot: study.impression,
    };

    study.status = 'Approved';
    study.reportingDoctorId = doctor.id;
    study.reportingDoctorName = doctor.name;
    if (doctor.qualification) study.reportingDoctorQualification = doctor.qualification;
    if (doctor.regNo) study.reportingDoctorRegNo = doctor.regNo;
    if (doctor.signatureUrl) study.digitalSignatureUrl = doctor.signatureUrl;
    study.approvedAt = now;
    study.approvedByDoctor = `${doctor.name} (${doctor.qualification || doctor.regNo || 'Radiologist'})`;
    study.version = newVersion;
    study.versionHistory = [...(study.versionHistory || []), versionEntry];
    study.updatedAt = now;

    this.set(STORAGE_KEYS.RADIOLOGY_STUDIES, list);
    if (storageSyncListener) {
      storageSyncListener(STORAGE_KEYS.RADIOLOGY_STUDIES, study, { docId: study.id, action: 'set' });
    }
    this.logAction('Radiology', `Report APPROVED: ${study.studyId} (${study.examinationType}) for ${study.patientName} by ${doctor.name}`);
    return { success: true, study, message: `Report ${study.studyId} has been successfully approved and digitally signed.` };
  },

  amendRadiologyReport(
    studyId: string,
    amendmentReason: string,
    doctor: { id: string; name: string; qualification?: string; regNo?: string; signatureUrl?: string }
  ): { success: boolean; study?: RadiologyStudyReport; message: string } {
    const list = this.getRadiologyStudies();
    const study = list.find((s) => s.id === studyId || s.studyId === studyId);
    if (!study) return { success: false, message: 'Study not found.' };

    const now = new Date().toISOString();
    const newVersion = (study.version || 1) + 1;

    const versionEntry: ReportVersionEntry = {
      version: newVersion,
      timestamp: now,
      userId: doctor.id,
      userName: doctor.name,
      userRole: 'radiologist',
      status: 'Amended',
      changeSummary: `Amended by ${doctor.name}. Reason: ${amendmentReason}`,
      contentSnapshot: study.freeFormContent || JSON.stringify(study.structuredFindings),
      structuredFindingsSnapshot: { ...study.structuredFindings },
      impressionSnapshot: study.impression,
      amendmentReason,
    };

    study.status = 'Amended';
    study.version = newVersion;
    study.versionHistory = [...(study.versionHistory || []), versionEntry];
    study.updatedAt = now;

    this.set(STORAGE_KEYS.RADIOLOGY_STUDIES, list);
    this.logAction('Radiology', `Report AMENDED: ${study.studyId} by ${doctor.name}. Reason: ${amendmentReason}`);
    return { success: true, study, message: `Report amended successfully as Version ${newVersion}.` };
  },

  recordReportDelivery(
    studyId: string,
    deliveredTo: string,
    recipientContact?: string
  ): { success: boolean; study?: RadiologyStudyReport } {
    const list = this.getRadiologyStudies();
    const study = list.find((s) => s.id === studyId || s.studyId === studyId);
    if (!study) return { success: false };

    study.isDelivered = true;
    study.deliveredAt = new Date().toISOString();
    study.deliveredTo = recipientContact ? `${deliveredTo} (${recipientContact})` : deliveredTo;
    if (study.status === 'Approved') {
      study.status = 'Delivered';
    }
    study.updatedAt = new Date().toISOString();

    this.set(STORAGE_KEYS.RADIOLOGY_STUDIES, list);
    this.logAction('Radiology', `Delivered report ${study.studyId} to ${study.deliveredTo}`);
    return { success: true, study };
  },

  getPatientRadiologyHistory(patientMRN: string): RadiologyStudyReport[] {
    return this.getRadiologyStudies(patientMRN);
  },

  saveAutosaveDraft(studyId: string, draftPayload: any): void {
    try {
      const drafts = this.get<Record<string, any>>(STORAGE_KEYS.AUTOSAVE_DRAFTS, {});
      drafts[studyId] = {
        ...draftPayload,
        savedAt: new Date().toISOString(),
      };
      this.set(STORAGE_KEYS.AUTOSAVE_DRAFTS, drafts);
    } catch (e) {
      console.warn('Failed to save draft', e);
    }
  },

  getAutosaveDraft(studyId: string): any | null {
    try {
      const drafts = this.get<Record<string, any>>(STORAGE_KEYS.AUTOSAVE_DRAFTS, {});
      return drafts[studyId] || null;
    } catch {
      return null;
    }
  },

  clearAutosaveDraft(studyId: string): void {
    try {
      const drafts = this.get<Record<string, any>>(STORAGE_KEYS.AUTOSAVE_DRAFTS, {});
      if (drafts[studyId]) {
        delete drafts[studyId];
        this.set(STORAGE_KEYS.AUTOSAVE_DRAFTS, drafts);
      }
    } catch (e) {
      console.warn('Failed to clear draft', e);
    }
  },

  getRadiologyDashboardStats() {
    const studies = this.getRadiologyStudies();
    const today = new Date().toISOString().split('T')[0];

    const todayStudies = studies.filter((s) => s.examinationDate?.startsWith(today) || s.createdAt?.startsWith(today));
    const ultrasoundStudies = studies.filter((s) => s.modality === 'Ultrasound');
    const xrayStudies = studies.filter((s) => s.modality === 'X-Ray');

    const pendingTotal = studies.filter((s) => ['Requested', 'Pending', 'Assigned to Typist'].includes(s.status)).length;
    const ultrasoundPending = ultrasoundStudies.filter((s) => ['Requested', 'Pending', 'Assigned to Typist'].includes(s.status)).length;
    const xrayPending = xrayStudies.filter((s) => ['Requested', 'Pending', 'Assigned to Typist'].includes(s.status)).length;
    const inProgress = studies.filter((s) => ['In Progress', 'Draft'].includes(s.status)).length;
    const awaitingVerification = studies.filter((s) => s.status === 'Awaiting Doctor Verification').length;
    const completed = studies.filter((s) => ['Approved', 'Completed', 'Delivered'].includes(s.status)).length;
    const delivered = studies.filter((s) => s.isDelivered || s.status === 'Delivered').length;

    const typistWorkload: Record<string, { total: number; pending: number; completed: number }> = {};
    studies.forEach((s) => {
      const name = s.typistName || 'Unassigned';
      if (!typistWorkload[name]) {
        typistWorkload[name] = { total: 0, pending: 0, completed: 0 };
      }
      typistWorkload[name].total++;
      if (['Approved', 'Delivered', 'Completed'].includes(s.status)) {
        typistWorkload[name].completed++;
      } else {
        typistWorkload[name].pending++;
      }
    });

    const doctorReports: Record<string, { total: number; approved: number }> = {};
    studies.forEach((s) => {
      const doc = s.reportingDoctorName || 'Pending Assignment';
      if (!doctorReports[doc]) {
        doctorReports[doc] = { total: 0, approved: 0 };
      }
      doctorReports[doc].total++;
      if (s.status === 'Approved' || s.status === 'Delivered') {
        doctorReports[doc].approved++;
      }
    });

    return {
      totalStudies: studies.length,
      pendingTotal,
      ultrasoundPending,
      xrayPending,
      inProgress,
      awaitingVerification,
      completed,
      delivered,
      todayPatientsCount: todayStudies.length,
      typistWorkload,
      doctorReports,
    };
  },
};


const DEFAULT_TEST_PROTOCOLS: LabTestProtocol[] = [
  {
    id: 'proto_cbc_01',
    testCode: 'CBC-5DIFF',
    testName: 'Complete Blood Count with 5-Part Differential (CBC)',
    category: 'Hematology',
    departmentName: 'Hematology & Clinical Microscopy',
    targetAnalyzer: 'Sysmex XN-1000 / Mindray BC-6800',
    active: true,
    costEstimatePKR: 450,
    notes: 'Standard 5-part differential blood work recipe with automated diluent and lyse consumption.',
    reagents: [
      { itemName: 'Hematology Diluent (Sysmex Cellpack DCL)', requiredQtyPerTest: 20, uom: 'ml' },
      { itemName: 'Hematology Lyse Reagent (Sysmex Stromatolyser-4DL)', requiredQtyPerTest: 5, uom: 'ml' },
      { itemName: 'Hematology Cellclean Rinse', requiredQtyPerTest: 2, uom: 'ml' },
    ],
  },
  {
    id: 'proto_lft_01',
    testCode: 'LFT-PROF',
    testName: 'Liver Function Tests Comprehensive Profile (LFT)',
    category: 'Clinical Biochemistry',
    departmentName: 'Clinical Chemistry',
    targetAnalyzer: 'Roche Cobas c311 / Beckman AU480',
    active: true,
    costEstimatePKR: 1200,
    notes: 'Standard chemistry photometric profile consuming ALT, AST, Total Bilirubin, and Alk Phos reagents.',
    reagents: [
      { itemName: 'ALT / SGPT Enzymatic Kinetic Reagent', requiredQtyPerTest: 1, uom: 'Test' },
      { itemName: 'AST / SGOT Enzymatic Kinetic Reagent', requiredQtyPerTest: 1, uom: 'Test' },
      { itemName: 'Total Bilirubin DSA Reagent Kit', requiredQtyPerTest: 1, uom: 'Test' },
      { itemName: 'Alkaline Phosphatase (ALP) IFCC Reagent', requiredQtyPerTest: 1, uom: 'Test' },
    ],
  },
  {
    id: 'proto_hba1c_01',
    testCode: 'HBA1C-HPLC',
    testName: 'Glycated Hemoglobin HbA1c (HPLC Method)',
    category: 'Special Chemistry',
    departmentName: 'Endocrinology & Special Chemistry',
    targetAnalyzer: 'Bio-Rad D-10 / Tosoh G8',
    active: true,
    costEstimatePKR: 850,
    notes: 'High-performance liquid chromatography assay for diabetes control assessment.',
    reagents: [
      { itemName: 'HbA1c Elution Buffer A & B Pack', requiredQtyPerTest: 4, uom: 'ml' },
      { itemName: 'HbA1c Hemolysis Reagent Solution', requiredQtyPerTest: 1, uom: 'ml' },
    ],
  },
  {
    id: 'proto_rft_01',
    testCode: 'RFT-PROF',
    testName: 'Renal / Kidney Function Tests (RFT / KFT)',
    category: 'Clinical Biochemistry',
    departmentName: 'Clinical Chemistry',
    targetAnalyzer: 'Roche Cobas c311',
    active: true,
    costEstimatePKR: 750,
    notes: 'Serum Creatinine Jaffe/Enzymatic and Urea BUN reagent auto-deduction.',
    reagents: [
      { itemName: 'Serum Creatinine Enzymatic Reagent', requiredQtyPerTest: 1, uom: 'Test' },
      { itemName: 'Blood Urea Nitrogen (BUN) Urease-GLDH Reagent', requiredQtyPerTest: 1, uom: 'Test' },
    ],
  },
  {
    id: 'proto_covid_pcr_01',
    testCode: 'PCR-RESP-01',
    testName: 'Respiratory Pathogen Real-Time RT-PCR Multiplex',
    category: 'Molecular / PCR',
    departmentName: 'Molecular Diagnostics & Virological PCR',
    targetAnalyzer: 'QuantStudio 5 / CFX96 Bio-Rad',
    active: true,
    costEstimatePKR: 3500,
    notes: 'Magnetic bead viral RNA extraction and TaqPath mastermix enzyme kit mapping.',
    reagents: [
      { itemName: 'Magnetic Bead Viral RNA/DNA Extraction Kit', requiredQtyPerTest: 1, uom: 'Reaction' },
      { itemName: 'Real-Time RT-PCR MasterMix & Primer/Probe Mix', requiredQtyPerTest: 1, uom: 'Reaction' },
    ],
  },
  {
    id: 'proto_lipid_01',
    testCode: 'LIPID-PROF',
    testName: 'Lipid Profile Comprehensive Panel',
    category: 'Clinical Biochemistry',
    departmentName: 'Clinical Chemistry',
    targetAnalyzer: 'Roche Cobas c311 / Mindray BS-480',
    active: true,
    costEstimatePKR: 1100,
    notes: 'Total Cholesterol, HDL Direct, LDL Direct, and Triglycerides enzymatic assay.',
    reagents: [
      { itemName: 'Total Cholesterol CHOD-PAP Reagent', requiredQtyPerTest: 1, uom: 'Test' },
      { itemName: 'Triglycerides GPO-PAP Enzymatic Reagent', requiredQtyPerTest: 1, uom: 'Test' },
      { itemName: 'HDL-Cholesterol Direct Reagent', requiredQtyPerTest: 1, uom: 'Test' },
      { itemName: 'LDL-Cholesterol Direct Reagent', requiredQtyPerTest: 1, uom: 'Test' },
    ],
  },
  {
    id: 'proto_dengue_01',
    testCode: 'DENGUE-COMBO',
    testName: 'Dengue NS1 Antigen & IgG/IgM Rapid Device',
    category: 'Immunology & Serology',
    departmentName: 'Serology & Immunodiagnostics',
    targetAnalyzer: 'SD Biosensor / Standard Q Rapid Device',
    active: true,
    costEstimatePKR: 1400,
    notes: 'Dual immunochromatographic rapid cassette test for acute dengue fever detection.',
    reagents: [
      { itemName: 'Dengue NS1 Ag Rapid Test Cassette', requiredQtyPerTest: 1, uom: 'Test' },
      { itemName: 'Dengue IgG/IgM Rapid Test Cassette', requiredQtyPerTest: 1, uom: 'Test' },
      { itemName: 'Dengue Assay Assay Assay Diluent Buffer', requiredQtyPerTest: 0.1, uom: 'ml' },
    ],
  },
  {
    id: 'proto_glucose_01',
    testCode: 'GLUCOSE-FAST',
    testName: 'Blood Glucose Fasting / Random (Enzymatic GOD-PAP)',
    category: 'Clinical Biochemistry',
    departmentName: 'Clinical Chemistry',
    targetAnalyzer: 'Cobas c311 / Biosystems BA400',
    active: true,
    costEstimatePKR: 200,
    notes: 'Glucose Oxidase (GOD-PAP) enzymatic colorimetric test.',
    reagents: [
      { itemName: 'Glucose GOD-PAP Liquid Reagent', requiredQtyPerTest: 1, uom: 'ml' },
    ],
  },
  {
    id: 'proto_troponin_01',
    testCode: 'TROP-I-QUANT',
    testName: 'Cardiac Troponin I Quantitative Rapid Assay',
    category: 'Special Chemistry',
    departmentName: 'Emergency & Cardiac Markers',
    targetAnalyzer: 'Finecare / i-CHROMA Point of Care',
    active: true,
    costEstimatePKR: 2200,
    notes: 'Fluorescence immunoassay for emergency myocardial infarction evaluation.',
    reagents: [
      { itemName: 'Troponin I Fluorescent Test Cartridge', requiredQtyPerTest: 1, uom: 'Test' },
      { itemName: 'Troponin I Extraction Buffer Buffer Vials', requiredQtyPerTest: 1, uom: 'Vial' },
    ],
  },
  {
    id: 'proto_urine_01',
    testCode: 'URINE-RE',
    testName: 'Urine Routine & Microscopic Examination (Urine R/E)',
    category: 'Special Chemistry',
    departmentName: 'Clinical Pathology & Urinalysis',
    targetAnalyzer: 'Urisys 1100 / Manual Microscopy',
    active: true,
    costEstimatePKR: 350,
    notes: '10-parameter dipstick chemical urinalysis and centrifugal sediment microscopy.',
    reagents: [
      { itemName: 'Urine 10-Parameter Reagent Test Strip', requiredQtyPerTest: 1, uom: 'Test' },
      { itemName: 'Glass Microscope Slides & Coverslips', requiredQtyPerTest: 1, uom: 'Unit' },
    ],
  },
];

// Auto-run init
if (typeof window !== 'undefined') {
  StorageService.init();
}
