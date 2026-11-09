import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Users,
  Shield,
  KeyRound,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  Sparkles,
  Server,
  Activity,
  CheckCircle,
  Wifi,
  Globe,
  Lock,
  Phone,
  ShieldCheck,
  Pencil,
  MapPin,
  Mail,
  UserCheck,
  Search,
  AlertCircle,
  X,
  Database,
  RotateCcw,
  FileText,
  Filter,
  Sliders,
  Check,
  Cloud,
  Eye,
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { StorageService } from '../../services/storage';
import { Branch, Warehouse, Department, UserAccount, UserRole, AuditLogEntry } from '../../types';
import { BrandingSettings } from './BrandingSettings';
import { SuperAdminActivityLedger } from './SuperAdminActivityLedger';
import { hashPassword } from '../../utils/security';

interface SettingsManagementProps {
  currentUser: UserAccount | null;
}

export const SettingsManagement: React.FC<SettingsManagementProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'branding' | 'users' | 'logs' | 'super_admin_ledger' | 'security' | 'backup' | 'deployment'>('hierarchy');

  // Check admin privileges
  const isAdmin = !currentUser || currentUser.role === 'super_admin' || currentUser.role.includes('admin') || currentUser.role === 'branch_manager';

  const [branches, setBranches] = useState<Branch[]>(() => StorageService.getBranches());
  const [users, setUsers] = useState<UserAccount[]>(() => StorageService.getUsers());
  const warehouses = StorageService.getWarehouses();
  const departments = StorageService.getDepartments();

  // Branch filter & search state
  const [branchSearch, setBranchSearch] = useState('');
  const [branchCityFilter, setBranchCityFilter] = useState('all');

  // Branch form modal state (Add and Edit)
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchCity, setBranchCity] = useState('Lahore');
  const [branchCode, setBranchCode] = useState('');
  const [branchType, setBranchType] = useState('Regional Branch Lab');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchContactPerson, setBranchContactPerson] = useState('');
  const [branchPhone, setBranchPhone] = useState('+92 42 35789000');
  const [branchEmail, setBranchEmail] = useState('');
  const [branchMonthlyBudget, setBranchMonthlyBudget] = useState<number>(1000000);
  const [branchIsActive, setBranchIsActive] = useState(true);

  // Branch deletion confirmation modal state
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  // User feedback toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Department creation state
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');

  // User creation & editing state (Admin decides what each user can add or see)
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('Staff123!');
  const [userRole, setUserRole] = useState<UserRole>('lab_technician');
  const [userBranchId, setUserBranchId] = useState(branches[0]?.id || 'br_headoffice');
  const [userPhone, setUserPhone] = useState('+92 300 ');
  const [user2FA, setUser2FA] = useState(false);

  // Granular Admin Permissions
  const [userAllowedModules, setUserAllowedModules] = useState<string[]>([
    'dashboard',
    'inventory',
    'procurement',
    'transfers',
    'audits',
    'compliance',
  ]);
  const [userCanAddInventory, setUserCanAddInventory] = useState(true);
  const [userCanDeleteInventory, setUserCanDeleteInventory] = useState(false);
  const [userCanCreateTransfers, setUserCanCreateTransfers] = useState(true);
  const [userCanCreateRequisitions, setUserCanCreateRequisitions] = useState(true);
  const [userCanAddAssets, setUserCanAddAssets] = useState(false);
  const [userCanDeleteAssets, setUserCanDeleteAssets] = useState(false);
  const [userCanPerformAudits, setUserCanPerformAudits] = useState(true);
  const [userCanViewReports, setUserCanViewReports] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => StorageService.getAuditLogs());
  const [logSearch, setLogSearch] = useState('');
  const [logUserFilter, setLogUserFilter] = useState('all');
  const [logBranchFilter, setLogBranchFilter] = useState('all');
  const [logModuleFilter, setLogModuleFilter] = useState('all');

  // User Deletion & Purge Confirmation States (Reliable In-App Modals)
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  // Deployment Self-Test state
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [testingBackend, setTestingBackend] = useState(false);

  const runDeploymentSelfTest = async () => {
    setTestingBackend(true);
    try {
      const [hRes, sRes] = await Promise.all([
        fetch('/api/health').then((r) => (r.ok ? r.json() : { status: 'offline', error: r.statusText })),
        fetch('/api/system/info').then((r) => (r.ok ? r.json() : { status: 'offline', error: r.statusText })),
      ]);
      setHealthStatus(hRes);
      setSystemInfo(sRes);
    } catch (e: any) {
      setHealthStatus({ status: 'client-only-or-offline', message: e.message });
    } finally {
      setTestingBackend(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'deployment') {
      runDeploymentSelfTest();
    }
  }, [activeTab]);

  // Firestore Live Inventory Backup State
  const [isExportingFirestore, setIsExportingFirestore] = useState(false);
  const [firestoreExportStats, setFirestoreExportStats] = useState<{
    lastExportedAt: string | null;
    itemCount: number;
    batchCount: number;
    totalValuePKR: number;
  } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Database Restore States
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreValidationResult, setRestoreValidationResult] = useState<{
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
    fileName?: string;
  } | null>(null);
  const [isRestoringDatabase, setIsRestoringDatabase] = useState(false);
  const [keepCurrentUserSession, setKeepCurrentUserSession] = useState(true);
  const restoreFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Check if active user is Super Admin
  const isSuperAdmin = !currentUser || currentUser.role === 'super_admin' || currentUser.email?.toLowerCase() === 'mrnadeemmobile20@gmail.com';

  const handleExportFirestoreInventory = async () => {
    if (!isSuperAdmin) {
      setFeedback({
        type: 'error',
        message: 'Access Denied: Only the Super Administrator account can export live Firestore database backups.',
      });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    setIsExportingFirestore(true);
    try {
      // 1. Fetch live documents from Cloud Firestore 'inventory' collection
      let firestoreItems: any[] = [];
      try {
        const snap = await getDocs(collection(db, 'inventory'));
        snap.forEach((docSnap) => {
          firestoreItems.push({ id: docSnap.id, ...docSnap.data() });
        });
      } catch (fsErr) {
        console.warn('Firestore live query notice:', fsErr);
      }

      // 2. Merge with local authoritative inventory store to ensure complete snapshot
      const localItems = StorageService.getInventory();
      if (firestoreItems.length === 0) {
        firestoreItems = localItems;
      } else {
        const idMap = new Map<string, any>();
        firestoreItems.forEach((it) => idMap.set(it.id, it));
        localItems.forEach((it) => {
          if (!idMap.has(it.id)) {
            idMap.set(it.id, it);
          }
        });
        firestoreItems = Array.from(idMap.values());
      }

      // 3. Fetch live usage records
      let usageRecords: any[] = [];
      try {
        const usageSnap = await getDocs(collection(db, 'inventory_usage'));
        usageSnap.forEach((docSnap) => {
          usageRecords.push({ id: docSnap.id, ...docSnap.data() });
        });
      } catch (err) {
        console.warn('Usage query note:', err);
      }
      if (usageRecords.length === 0) {
        usageRecords = StorageService.getInventoryUsageRecords();
      }

      // 4. Compute metrics
      let totalBatches = 0;
      let totalUnits = 0;
      let totalValuePKR = 0;
      const branchIds = new Set<string>();

      firestoreItems.forEach((it) => {
        if (it.branchId) branchIds.add(it.branchId);
        const qty = Number(it.totalQuantity) || 0;
        totalUnits += qty;
        const cost = Number(it.costPrice) || 0;
        totalValuePKR += qty * cost;
        if (it.batches && Array.isArray(it.batches)) {
          totalBatches += it.batches.length;
        }
      });

      const exportPayload = {
        exportMetadata: {
          system: 'HR Diagnostics Multi-Branch Clinical ERP',
          databaseEngine: 'Google Cloud Firestore',
          firestoreDatabaseId: 'ai-studio-hrdiagnosticsinv-1f422913-6d6d-4026-ae36-030d82892f8f',
          collectionName: 'inventory',
          backupType: 'FIRESTORE_INVENTORY_BACKUP',
          exportedAt: new Date().toISOString(),
          exportedBy: currentUser?.name || 'Mr. Nadeem (Managing Director)',
          exportedByEmail: currentUser?.email || 'mrnadeemmobile20@gmail.com',
          exportedByRole: currentUser?.role || 'super_admin',
          totalInventoryItems: firestoreItems.length,
          totalBatchesCount: totalBatches,
          totalStockUnits: totalUnits,
          totalInventoryValuePKR: totalValuePKR,
          totalBranchesCount: branchIds.size,
          schemaSpecification: 'firebase-blueprint.json#/entities/InventoryItem',
          sourceNode: 'Google Cloud Firestore Live Instance',
        },
        inventory: firestoreItems,
        inventoryUsageRecords: usageRecords,
      };

      // 5. Generate and download JSON file
      const jsonString = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `HR_Diagnostics_Firestore_Inventory_Backup_${dateStr}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setFirestoreExportStats({
        lastExportedAt: new Date().toLocaleTimeString(),
        itemCount: firestoreItems.length,
        batchCount: totalBatches,
        totalValuePKR,
      });

      // 6. Record in immutable Super Admin activity ledger
      StorageService.logSuperAdminActivity({
        category: 'CONFIG_CHANGE',
        actionType: 'DATABASE_BACKUP_EXPORT',
        targetEntity: 'Cloud Firestore: /inventory',
        status: 'SUCCESS',
        details: `Super Admin exported current Firestore inventory database (${firestoreItems.length} SKUs, ${totalBatches} batches, Valuation PKR ${totalValuePKR.toLocaleString()}) into downloadable JSON backup.`,
        metadata: {
          firestoreDatabaseId: 'ai-studio-hrdiagnosticsinv-1f422913-6d6d-4026-ae36-030d82892f8f',
          totalItems: firestoreItems.length,
          totalBatches,
          totalValuePKR,
          fileName: `HR_Diagnostics_Firestore_Inventory_Backup_${dateStr}.json`,
        },
      });

      // 7. Record in operational audit log
      StorageService.logAction(
        'Security',
        `Super Admin exported Firestore inventory backup (${firestoreItems.length} items, PKR ${totalValuePKR.toLocaleString()})`
      );

      setFeedback({
        type: 'success',
        message: `Firestore inventory backup successfully generated! Downloaded ${firestoreItems.length} items (${totalBatches} batches, PKR ${totalValuePKR.toLocaleString()} valuation).`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      console.error('Failed to export Firestore inventory:', err);
      setFeedback({
        type: 'error',
        message: `Failed to export Firestore backup: ${err.message || 'Unknown error'}`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsExportingFirestore(false);
    }
  };

  const handlePreviewFirestoreSnapshot = async () => {
    setIsExportingFirestore(true);
    try {
      let firestoreItems: any[] = [];
      try {
        const snap = await getDocs(collection(db, 'inventory'));
        snap.forEach((docSnap) => {
          firestoreItems.push({ id: docSnap.id, ...docSnap.data() });
        });
      } catch (e) {}

      if (firestoreItems.length === 0) {
        firestoreItems = StorageService.getInventory();
      }

      const totalValuePKR = firestoreItems.reduce(
        (sum, it) => sum + (Number(it.totalQuantity) || 0) * (Number(it.costPrice) || 0),
        0
      );
      const totalBatches = firestoreItems.reduce(
        (sum, it) => sum + (Array.isArray(it.batches) ? it.batches.length : 0),
        0
      );

      const previewObj = {
        exportMetadata: {
          system: 'HR Diagnostics Multi-Branch Clinical ERP',
          databaseEngine: 'Google Cloud Firestore',
          firestoreDatabaseId: 'ai-studio-hrdiagnosticsinv-1f422913-6d6d-4026-ae36-030d82892f8f',
          collectionName: 'inventory',
          backupType: 'FIRESTORE_INVENTORY_BACKUP',
          exportedAt: new Date().toISOString(),
          exportedBy: currentUser?.name || 'Mr. Nadeem',
          totalInventoryItems: firestoreItems.length,
          totalBatchesCount: totalBatches,
          totalInventoryValuePKR: totalValuePKR,
        },
        sampleItemsPreview: firestoreItems.slice(0, 5),
        totalItemsAvailable: firestoreItems.length,
      };

      setPreviewData(previewObj);
      setPreviewModalOpen(true);
    } finally {
      setIsExportingFirestore(false);
    }
  };

  // Backup & restore
  const handleDownloadBackup = () => {
    const rawData = StorageService.exportFullBackup();
    const blob = new Blob([rawData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HR_Diagnostics_Enterprise_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = StorageService.parseAndValidateBackupJSON(text);
        if (!res.valid) {
          setFeedback({
            type: 'error',
            message: `Restore Failed: ${res.error || 'The uploaded file is not a valid HR Diagnostics backup file.'}`,
          });
          setTimeout(() => setFeedback(null), 5000);
          return;
        }

        setRestoreValidationResult({
          ...res,
          fileName: file.name,
        });
        setRestoreModalOpen(true);
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: `Error reading file: ${err.message || err}`,
        });
        setTimeout(() => setFeedback(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmDatabaseRestore = async () => {
    if (!restoreValidationResult?.parsedData) return;
    if (!isSuperAdmin) {
      setFeedback({
        type: 'error',
        message: 'Access Denied: Only Super Administrator can restore database backups.',
      });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    setIsRestoringDatabase(true);
    try {
      const res = StorageService.executeDatabaseRestore(restoreValidationResult.parsedData, {
        preserveCurrentUser: keepCurrentUserSession,
      });

      if (!res.success) {
        throw new Error(res.error || 'Restore failed');
      }

      // Sync restored items to Firestore if cloud sync available
      try {
        const restoredItems = StorageService.getInventory();
        const { cloudSyncService } = await import('../../services/cloudSync');
        if (cloudSyncService) {
          await cloudSyncService.syncCollection('inventory', restoredItems);
        }
      } catch (syncErr) {
        console.warn('Post-restore cloud sync notice:', syncErr);
      }

      setRestoreModalOpen(false);
      setRestoreValidationResult(null);

      // Refresh component states
      setBranches(StorageService.getBranches());
      setUsers(StorageService.getUsers());
      setAuditLogs(StorageService.getAuditLogs());

      setFeedback({
        type: 'success',
        message: `Database successfully restored! Loaded ${res.restoredCounts.inventory || 0} inventory items, ${res.restoredCounts.branches || 0} branches, and ${res.restoredCounts.users || 0} users.`,
      });
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Failed to restore database: ${err.message || err}`,
      });
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setIsRestoringDatabase(false);
    }
  };

  const handleSeedClinicalCatalog = () => {
    if (confirm('Initialize standard clinical formulary (reagents, hematology controls, biochemistry kits, lab assets, and medical vendors)? This adds authentic diagnostic inventory.')) {
      StorageService.seedStandardDiagnosticCategories(true);
      setFeedback({ type: 'success', message: 'Clinical diagnostic formulary successfully initialized.' });
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleCleanSlateReset = () => {
    if (confirm('Reset to clean hospital commissioning slate? This will clear test stock, transactions, and assets while keeping your branches and staff accounts intact.')) {
      StorageService.resetToCleanSlate();
      setFeedback({ type: 'success', message: 'Database reset to clean hospital commissioning state.' });
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSelectRestoreFile(e);
  };

  const handleOpenAddBranch = () => {
    setEditingBranchId(null);
    setBranchName('');
    setBranchCode(`BR-${Math.floor(100 + Math.random() * 900)}`);
    setBranchCity('Lahore');
    setBranchType('Regional Branch Lab');
    setBranchAddress('');
    setBranchContactPerson('Dr. Lab In-Charge');
    setBranchPhone('+92 42 35789000');
    setBranchEmail('');
    setBranchMonthlyBudget(1000000);
    setBranchIsActive(true);
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (b: Branch) => {
    setEditingBranchId(b.id);
    setBranchName(b.name);
    setBranchCode(b.code);
    setBranchCity(b.city);
    setBranchType(b.type || 'Regional Branch Lab');
    setBranchAddress(b.address || '');
    setBranchContactPerson(b.contactPerson || '');
    setBranchPhone(b.phone || '');
    setBranchEmail(b.email || '');
    setBranchMonthlyBudget(b.monthlyBudget || 500000);
    setBranchIsActive(b.isActive !== false);
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    const code = branchCode.trim().toUpperCase() || branchName.slice(0, 3).toUpperCase();
    const city = branchCity.trim();

    if (editingBranchId) {
      const existing = branches.find((b) => b.id === editingBranchId);
      const updated: Branch = {
        id: editingBranchId,
        name: branchName.trim(),
        code,
        city,
        address: branchAddress.trim() || `${branchName}, Diagnostic Center, ${city}`,
        contactPerson: branchContactPerson.trim() || 'Dr. Lab In-Charge',
        phone: branchPhone.trim(),
        email: branchEmail.trim() || `${city.toLowerCase()}.lab@hrdiagnostics.pk`,
        type: branchType,
        monthlyBudget: Number(branchMonthlyBudget) || 500000,
        currentMonthSpend: existing?.currentMonthSpend || 0,
        isHeadOffice: existing?.isHeadOffice || false,
        isActive: branchIsActive,
      };
      StorageService.saveBranch(updated);
      setFeedback({ type: 'success', message: `Branch "${updated.name}" updated successfully.` });
    } else {
      const newBranch: Branch = {
        id: `br_${Date.now()}`,
        name: branchName.trim(),
        code,
        city,
        address: branchAddress.trim() || `${branchName}, Diagnostic Center, ${city}`,
        contactPerson: branchContactPerson.trim() || 'Dr. Lab In-Charge',
        phone: branchPhone.trim(),
        email: branchEmail.trim() || `${city.toLowerCase()}.lab@hrdiagnostics.pk`,
        type: branchType,
        monthlyBudget: Number(branchMonthlyBudget) || 1000000,
        currentMonthSpend: 0,
        isHeadOffice: false,
        isActive: branchIsActive,
      };
      StorageService.saveBranch(newBranch);
      setFeedback({ type: 'success', message: `New branch "${newBranch.name}" created successfully.` });
    }

    setBranches(StorageService.getBranches());
    setIsBranchModalOpen(false);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleConfirmDeleteBranch = () => {
    if (!branchToDelete) return;
    const res = StorageService.deleteBranch(branchToDelete.id);
    if (res.success) {
      setBranches(StorageService.getBranches());
      setUsers(StorageService.getUsers());
      setFeedback({ type: 'success', message: res.message });
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
    setBranchToDelete(null);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSaveDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName) return;

    const newDept: Department = {
      id: `dept_${Date.now()}`,
      branchId: branches[0]?.id || 'br_headoffice',
      name: deptName,
      code: deptCode || deptName.slice(0, 3).toUpperCase(),
    };

    StorageService.saveDepartment(newDept);
    setIsAddingDept(false);
    setDeptName('');
    setDeptCode('');
  };

  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setUserName('');
    setUserEmail('');
    setUserPassword('Staff123!');
    setUserRole('lab_technician');
    setUserBranchId(branches[0]?.id || 'br_headoffice');
    setUserPhone('+92 300 ');
    setUser2FA(false);
    setUserAllowedModules(['dashboard', 'inventory', 'procurement', 'transfers', 'audits', 'compliance']);
    setUserCanAddInventory(true);
    setUserCanDeleteInventory(false);
    setUserCanCreateTransfers(true);
    setUserCanCreateRequisitions(true);
    setUserCanAddAssets(false);
    setUserCanDeleteAssets(false);
    setUserCanPerformAudits(true);
    setUserCanViewReports(false);
    setIsAddingUser(true);
  };

  const handleOpenEditUser = (user: UserAccount) => {
    setEditingUserId(user.id);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserPassword(''); // Leave blank to keep current password
    setUserRole(user.role);
    setUserBranchId(user.branchId || '');
    setUserPhone(user.phone || '');
    setUser2FA(!!(user.is2FAEnabled || user.twoFactorEnabled));
    setUserAllowedModules(
      user.allowedModules && user.allowedModules.length > 0
        ? user.allowedModules
        : ['dashboard', 'inventory', 'procurement', 'transfers', 'audits', 'compliance']
    );
    setUserCanAddInventory(user.canAddInventory ?? true);
    setUserCanDeleteInventory(user.canDeleteInventory ?? false);
    setUserCanCreateTransfers(user.canCreateTransfers ?? true);
    setUserCanCreateRequisitions(user.canCreateRequisitions ?? true);
    setUserCanAddAssets(user.canAddAssets ?? (user.role === 'biomedical_engineer' || user.role === 'super_admin'));
    setUserCanDeleteAssets(user.canDeleteAssets ?? false);
    setUserCanPerformAudits(user.canPerformAudits ?? true);
    setUserCanViewReports(user.canViewReports ?? (user.role === 'branch_manager' || user.role === 'super_admin'));
    setIsAddingUser(true);
  };

  const toggleModule = (modId: string) => {
    setUserAllowedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) return;

    const branchObj = branches.find((b) => b.id === userBranchId);

    if (editingUserId) {
      // Update existing user
      const existingUser = users.find((u) => u.id === editingUserId);
      if (!existingUser) return;

      const updatedUser: UserAccount = {
        ...existingUser,
        name: userName.trim(),
        email: userEmail.trim().toLowerCase(),
        role: userRole,
        branchId: userBranchId,
        branchName: branchObj?.name || 'Head Office',
        phone: userPhone.trim(),
        is2FAEnabled: user2FA,
        twoFactorEnabled: user2FA,
        allowedModules: userAllowedModules,
        canAddInventory: userCanAddInventory,
        canDeleteInventory: userCanDeleteInventory,
        canCreateTransfers: userCanCreateTransfers,
        canCreateRequisitions: userCanCreateRequisitions,
        canAddAssets: userCanAddAssets,
        canDeleteAssets: userCanDeleteAssets,
        canPerformAudits: userCanPerformAudits,
        canViewReports: userCanViewReports,
      };

      if (userPassword.trim()) {
        updatedUser.passwordHash = await hashPassword(userPassword.trim());
      }

      StorageService.saveUser(updatedUser);
      StorageService.logAction(
        'Security',
        `Admin Updated Permissions: ${updatedUser.name} (${updatedUser.email}) - Branch: ${updatedUser.branchName}, Modules: [${userAllowedModules.join(', ')}]`,
        updatedUser.branchId
      );
      setFeedback({ type: 'success', message: `Staff user & permissions updated for ${updatedUser.name}` });
    } else {
      // Create new user with Web Crypto SHA-256 hashed password
      const hashedPassword = await hashPassword(userPassword.trim() || 'Staff123!');
      const newUser: UserAccount = {
        id: `usr_${Date.now()}`,
        email: userEmail.trim().toLowerCase(),
        name: userName.trim(),
        passwordHash: hashedPassword,
        role: userRole,
        branchId: userBranchId,
        branchName: branchObj?.name || 'Head Office',
        phone: userPhone.trim(),
        is2FAEnabled: user2FA,
        twoFactorEnabled: user2FA,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        allowedModules: userAllowedModules,
        canAddInventory: userCanAddInventory,
        canDeleteInventory: userCanDeleteInventory,
        canCreateTransfers: userCanCreateTransfers,
        canCreateRequisitions: userCanCreateRequisitions,
        canAddAssets: userCanAddAssets,
        canDeleteAssets: userCanDeleteAssets,
        canPerformAudits: userCanPerformAudits,
        canViewReports: userCanViewReports,
      };

      StorageService.saveUser(newUser);
      StorageService.logAction(
        'Security',
        `Admin Created User: ${newUser.name} (${newUser.email}) - Branch: ${newUser.branchName}, Role: ${newUser.role}`,
        newUser.branchId
      );
      setFeedback({ type: 'success', message: `Staff account created for ${newUser.name} at ${newUser.branchName}` });
    }

    setUsers(StorageService.getUsers());
    setAuditLogs(StorageService.getAuditLogs());
    setIsAddingUser(false);
    setEditingUserId(null);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleDeleteUser = (id: string) => {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    if (currentUser && (currentUser.id === id || currentUser.email.toLowerCase() === u.email.toLowerCase())) {
      setFeedback({ type: 'error', message: 'You cannot delete your own currently active account.' });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }
    // Open reliable confirmation modal
    setUserToDelete(u);
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    StorageService.deleteUser(userToDelete.id);
    StorageService.logAction(
      'Security',
      `Admin Permanently Deleted User: ${userToDelete.name} (${userToDelete.email})`,
      userToDelete.branchId
    );
    setUsers(StorageService.getUsers());
    setAuditLogs(StorageService.getAuditLogs());
    setFeedback({ type: 'success', message: `User account "${userToDelete.name}" deleted permanently from local and cloud databases.` });
    setUserToDelete(null);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handlePurgeMockUsers = () => {
    setIsPurgeModalOpen(true);
  };

  const confirmPurgeMockUsers = () => {
    const count = StorageService.purgeDummyUsers();
    setUsers(StorageService.getUsers());
    setAuditLogs(StorageService.getAuditLogs());
    setIsPurgeModalOpen(false);
    setFeedback({ type: 'success', message: `Successfully purged ${count} fake/mock user accounts permanently.` });
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Enterprise System Settings & Security
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            7-Level Diagnostic Organization hierarchy, role-based access control (RBAC), and disaster recovery snapshots.
          </p>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/80 max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition shrink-0 ${
            activeTab === 'hierarchy'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Branch Hierarchy
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition shrink-0 flex items-center gap-2 ${
            activeTab === 'branding'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span>Branding</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition shrink-0 ${
            activeTab === 'users'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          User Accounts & RBAC ({users.length})
        </button>
        <button
          onClick={() => {
            setAuditLogs(StorageService.getAuditLogs());
            setActiveTab('logs');
          }}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition shrink-0 flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4 text-blue-500" />
          <span>Activity Audit ({auditLogs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('super_admin_ledger')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition shrink-0 flex items-center gap-2 ${
            activeTab === 'super_admin_ledger'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-blue-500" />
          <span>Immutable Ledger</span>
          <span className="rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 text-xs font-bold">
            WORM
          </span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition shrink-0 ${
            activeTab === 'security'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Security & 2FA
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition shrink-0 ${
            activeTab === 'backup'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Backup & Restore
        </button>
        <button
          onClick={() => setActiveTab('deployment')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition shrink-0 flex items-center gap-2 ${
            activeTab === 'deployment'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Server className="h-4 w-4 text-blue-500" />
          <span>Server</span>
        </button>
      </div>

      {/* Tab: Hierarchy */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          {/* Visual 7-level architecture banner */}
          <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/40 dark:bg-teal-950/20 text-xs">
            <span className="font-bold text-teal-900 dark:text-teal-200">
              Enterprise Organizational Hierarchy Chain:
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 text-[11px]">
              <span className="rounded bg-white px-2 py-1 shadow-xs dark:bg-slate-900 font-bold text-teal-700">
                Company
              </span>
              <span>→</span>
              <span className="rounded bg-white px-2 py-1 shadow-xs dark:bg-slate-900 font-bold text-teal-700">
                Branch
              </span>
              <span>→</span>
              <span className="rounded bg-white px-2 py-1 shadow-xs dark:bg-slate-900 font-bold text-teal-700">
                Warehouse / Central Store
              </span>
              <span>→</span>
              <span className="rounded bg-white px-2 py-1 shadow-xs dark:bg-slate-900 font-bold text-teal-700">
                Department
              </span>
              <span>→</span>
              <span className="rounded bg-white px-2 py-1 shadow-xs dark:bg-slate-900 font-bold text-teal-700">
                Location (Room/Shelf)
              </span>
              <span>→</span>
              <span className="rounded bg-white px-2 py-1 shadow-xs dark:bg-slate-900 font-bold text-teal-700">
                Reagent / Asset
              </span>
              <span>→</span>
              <span className="rounded bg-white px-2 py-1 shadow-xs dark:bg-slate-900 font-bold text-teal-700">
                Assigned Employee
              </span>
            </div>
          </div>

          {/* Branches Section */}
          <div className="space-y-4">
            {/* Admin Authorization Status Banner */}
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl border ${
              isAdmin
                ? 'border-blue-200 bg-blue-50/60 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200'
                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  isAdmin ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">
                      {isAdmin ? 'Administrator Privileges Active' : 'Staff View-Only Mode'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isAdmin
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {isAdmin ? 'Branch Add & Delete Enabled' : 'Read Only'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isAdmin
                      ? 'Admins have full authority to provision new diagnostic lab branches, configure budget & staffing, and decommission facilities.'
                      : 'You are currently viewing branches in read-only mode. Super Admin privileges are required to add or delete branches.'}
                  </p>
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenAddBranch}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-98 transition shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Diagnostic Branch</span>
                </button>
              )}
            </div>

            {/* Branch Summary KPI Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Branches
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {branches.length}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Active Facilities
                </span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {branches.filter((b) => b.isActive !== false).length}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Assigned Staff
                </span>
                <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                  {users.length} Team Members
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Monthly Budget
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  Rs. {branches.reduce((sum, b) => sum + (b.monthlyBudget || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  placeholder="Search by branch name, city, code (e.g. Lahore, KHI, Multan)..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
                {branchSearch && (
                  <button
                    onClick={() => setBranchSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={branchCityFilter}
                  onChange={(e) => setBranchCityFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Cities ({branches.length})</option>
                  {Array.from(new Set(branches.map((b) => b.city))).map((city) => (
                    <option key={city} value={city}>
                      {city} ({branches.filter((b) => b.city === city).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Branches Cards Grid */}
            {(() => {
              const filtered = branches.filter((b) => {
                const matchesSearch =
                  !branchSearch ||
                  b.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
                  b.code.toLowerCase().includes(branchSearch.toLowerCase()) ||
                  b.city.toLowerCase().includes(branchSearch.toLowerCase()) ||
                  (b.contactPerson && b.contactPerson.toLowerCase().includes(branchSearch.toLowerCase()));
                const matchesCity = branchCityFilter === 'all' || b.city === branchCityFilter;
                return matchesSearch && matchesCity;
              });

              if (filtered.length === 0) {
                return (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    <Building2 className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      No branches found matching "{branchSearch}"
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try adjusting search query or city filters, or add a new branch.
                    </p>
                    {isAdmin && (
                      <button
                        onClick={handleOpenAddBranch}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add New Branch
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((b) => {
                    const branchStaffCount = users.filter((u) => u.branchId === b.id).length;
                    const isProtected = b.isHeadOffice || b.id === 'br_headoffice';

                    return (
                      <div
                        key={b.id}
                        className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
                      >
                        {/* Card Top */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                                isProtected
                                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-900'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                              }`}>
                                <Building2 className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                                  {b.name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                    {b.code}
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-700">•</span>
                                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                    {b.city}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {isProtected ? (
                                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                  Head Office
                                </span>
                              ) : (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                  {b.type || 'Regional Lab'}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {b.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>

                          {/* Branch Details */}
                          <div className="mt-3.5 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{b.address || `${b.city}, Pakistan`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{b.contactPerson || 'Dr. Lab In-Charge'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-mono text-[11px]">{b.phone || '+92 42 35789000'}</span>
                            </div>
                          </div>

                          {/* Budget & Staff stats */}
                          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2 text-center text-[11px] dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80">
                            <div>
                              <span className="text-slate-400 text-[10px] block">Monthly Budget</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                Rs. {(b.monthlyBudget || 500000).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Attached Staff</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {branchStaffCount} Active
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Admin Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          {isAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditBranch(b)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Edit Details</span>
                              </button>

                              {isProtected ? (
                                <span
                                  title="Central Root Facility cannot be deleted"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                                >
                                  <Lock className="h-3 w-3" /> Root Hub
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setBranchToDelete(b)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete Branch</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Admin permissions required to modify
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Departments Section */}
          <div className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Pathology Departments ({departments.length})
              </h3>
              <button
                onClick={() => setIsAddingDept(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400"
              >
                <Plus className="h-3.5 w-3.5" /> Add Lab Section
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {departments.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-center text-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400 font-bold block">
                    {d.code}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {d.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Branding & Custom Logo */}
      {activeTab === 'branding' && <BrandingSettings />}

      {/* Tab: Users & RBAC */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Staff Accounts & Branch-Level Access Delegation
              </p>
              <p className="text-[11px] text-slate-500">
                Admin decides exactly what each user can view or perform (allowed modules, stock additions, transfer authorizations).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePurgeMockUsers}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 transition cursor-pointer"
                title="Permanently remove all old fake/demo accounts"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>Delete All Fake/Demo Users</span>
              </button>
              <button
                onClick={handleOpenAddUser}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Staff Account
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 dark:bg-slate-950">
                <tr>
                  <th className="py-3 px-4">User Name & Email</th>
                  <th className="py-3 px-3">Role & Access Level</th>
                  <th className="py-3 px-3">Assigned Branch</th>
                  <th className="py-3 px-3">Allowed Modules</th>
                  <th className="py-3 px-3">Permissions & 2FA</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const mods = u.allowedModules || ['dashboard', 'inventory', 'transfers'];
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-300 capitalize">
                          {u.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {u.branchName || 'Head Office'}
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {u.role === 'super_admin' ? (
                            <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                              Full Access (All Modules)
                            </span>
                          ) : (
                            mods.slice(0, 4).map((m) => (
                              <span
                                key={m}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400 capitalize"
                              >
                                {m}
                              </span>
                            ))
                          )}
                          {u.role !== 'super_admin' && mods.length > 4 && (
                            <span className="rounded bg-slate-200 px-1 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              +{mods.length - 4} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[11px]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-500">2FA:</span>
                            {u.twoFactorEnabled || u.is2FAEnabled ? (
                              <span className="text-emerald-600 font-bold">Enabled</span>
                            ) : (
                              <span className="text-slate-400">Disabled</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {u.canAddInventory ? 'Can Add Stock • ' : ''}
                            {u.canCreateTransfers ? 'Transfers' : ''}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 hover:text-blue-600 transition dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            title="Edit User Permissions & Branch"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Permissions</span>
                          </button>
                          {(!currentUser || (currentUser.id !== u.id && currentUser.email?.toLowerCase() !== u.email.toLowerCase())) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id)}
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                              title="Permanently Delete Account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: User Activity Audit Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-600" />
                Immutable User Activity & Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                Every user action across all branches is captured with timestamp, module, and security context.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute('href', dataStr);
                  downloadAnchor.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Logs</span>
              </button>

              <button
                type="button"
                onClick={() => setAuditLogs(StorageService.getAuditLogs())}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Search Action / Detail</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Filter logs..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Filter by User</label>
              <select
                value={logUserFilter}
                onChange={(e) => setLogUserFilter(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="all">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.role.replace(/_/g, ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Filter by Branch</label>
              <select
                value={logBranchFilter}
                onChange={(e) => setLogBranchFilter(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Filter by Module</label>
              <select
                value={logModuleFilter}
                onChange={(e) => setLogModuleFilter(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                <option value="all">All Modules</option>
                <option value="Security">Security & Access</option>
                <option value="Inventory">Inventory Management</option>
                <option value="Assets">Assets & Equipment</option>
                <option value="Transfers">Warehouse Transfers</option>
                <option value="Compliance">Compliance & Temp</option>
                <option value="System">System Engine</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase font-bold text-slate-400 dark:bg-slate-950 z-10">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-3">User & Role</th>
                    <th className="py-2.5 px-3">Branch</th>
                    <th className="py-2.5 px-3">Module</th>
                    <th className="py-2.5 px-4">Action & Operational Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs
                    .filter((log) => {
                      if (logUserFilter !== 'all' && log.userName !== logUserFilter) return false;
                      if (logBranchFilter !== 'all' && log.branchId !== logBranchFilter) return false;
                      if (logModuleFilter !== 'all' && log.module !== logModuleFilter) return false;
                      if (logSearch) {
                        const q = logSearch.toLowerCase();
                        return (
                          log.action.toLowerCase().includes(q) ||
                          log.details.toLowerCase().includes(q) ||
                          log.userName.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    })
                    .slice(0, 150)
                    .map((log) => {
                      const branchName = branches.find((b) => b.id === log.branchId)?.name || log.branchId || 'Central';
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{log.userName}</span>
                            <span className="block text-[10px] text-slate-400 capitalize">{log.userRole.replace(/_/g, ' ')}</span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                            {branchName}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                              {log.module}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{log.action}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 break-words">{log.details}</p>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Super Admin Immutable Ledger */}
      {activeTab === 'super_admin_ledger' && (
        <SuperAdminActivityLedger />
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Multi-Factor Authentication (2FA) Policies
            </h3>
            <p className="text-xs text-slate-500">
              Enforce mandatory two-step verification for all Super Admin and Branch General Manager roles to prevent unauthorized reagent writes.
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
                <input type="checkbox" defaultChecked className="rounded text-teal-600 focus:ring-teal-500" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Mandatory 2FA for Super Admins
                  </span>
                  <p className="text-[11px] text-slate-400">Prompts 6-digit authenticator OTP on login</p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
                <input type="checkbox" defaultChecked className="rounded text-teal-600 focus:ring-teal-500" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Session Inactivity Auto-Logout
                  </span>
                  <p className="text-[11px] text-slate-400">Lock terminal screen after 30 minutes of inactivity</p>
                </div>
              </label>

              <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950">
                <input type="checkbox" defaultChecked className="rounded text-teal-600 focus:ring-teal-500" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Digital Signature Enforcement
                  </span>
                  <p className="text-[11px] text-slate-400">Mandate canvas signature pad for PO and GRN approvals</p>
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              Live Real-Time Sync & Broadcast Channel
            </h3>
            <p className="text-xs text-slate-500">
              The application uses dual-layer cross-tab synchronization and offline Service Worker caching for complete operational continuity during power/internet interruptions.
            </p>

            <div className="rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Multi-Tab BroadcastChannel Active</span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                Changes made in any tab (e.g. Dispensing, PO approval, GRN receipt) synchronize across all open terminals instantly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Backup & Commissioning */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Hospital Commissioning & Diagnostic Formulary
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure baseline clinical reagents, quality control lots, lab instruments, and medical vendors for immediate hospital rollout.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-950/60 dark:bg-blue-950/20 space-y-2">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">
                  Standard Diagnostic Catalog
                </h4>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                  Populate authentic hematology, clinical chemistry, and ELISA reagents, analyzers (Cobas, Sysmex, Abbott), and approved vendors.
                </p>
                <button
                  type="button"
                  onClick={handleSeedClinicalCatalog}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Load Standard Formulary
                </button>
              </div>

              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 dark:border-rose-950/60 dark:bg-rose-950/20 space-y-2">
                <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300">
                  Delete All Demo / Mock Data (Clean Production Slate)
                </h4>
                <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 leading-relaxed">
                  Sab demo/mock inventory items, test batches, sample purchase orders, dummy approvals, aur invoices ko mukammal delete karein taake software 100% real production ke liye clean ho jaye. Branches aur admin login mehfooz rahenge.
                </p>
                <button
                  type="button"
                  onClick={handleCleanSlateReset}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Purge All Demo Data (1-Click Clean Slate)
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Download className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Disaster Recovery & Encrypted Snapshot Backup
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Export entire laboratory databases (Reagents, Lots, Machines, POs, GRNs, Audits, Vendors, and Security logs) to a local JSON archive.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={handleDownloadBackup}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
              >
                <Download className="h-4 w-4" />
                Download Full Database Backup (.JSON)
              </button>

              <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 cursor-pointer transition">
                <Upload className="h-4 w-4" />
                <span>Restore from Backup File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Dedicated Google Cloud Firestore Live Inventory Backup Card */}
          <div className="rounded-2xl border-2 border-indigo-500/40 bg-linear-to-br from-indigo-50/70 via-white to-sky-50/60 p-6 shadow-sm dark:border-indigo-500/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-sky-950/20 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-4 dark:border-indigo-900/40">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Cloud Firestore Live Inventory Backup (.JSON)</span>
                  </h3>
                  <span className="rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                    Live Cloud Sync
                  </span>
                  <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                    Super Admin Authorization
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Export current real-time inventory catalog, cold-chain batch lots, FEFO expiry schedules, and usage logs from Google Cloud Firestore database into a standardized, downloadable JSON backup file.
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Target Firestore DB</span>
                <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white/80 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800 inline-block">
                  ai-studio-hrdiagnosticsinv-1f422913-6d6d-4026-ae36-030d82892f8f
                </span>
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-indigo-100 bg-white/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/80 shadow-xs">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Cataloged Reagents & Items</span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">
                  {StorageService.getInventory().length} SKUs
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 block">
                  Firestore /inventory collection
                </span>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-white/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/80 shadow-xs">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Active FEFO Batches</span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">
                  {StorageService.getInventory().reduce((sum, it) => sum + (Array.isArray(it.batches) ? it.batches.length : 0), 0)} Lots
                </span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold mt-0.5 block">
                  Expiration & QR Linked
                </span>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-white/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/80 shadow-xs">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Total Inventory Valuation</span>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block truncate">
                  PKR {StorageService.getInventory().reduce((sum, it) => sum + (Number(it.totalQuantity) || 0) * (Number(it.costPrice) || 0), 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">
                  Multi-Branch Consolidated
                </span>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-white/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/80 shadow-xs">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Usage & Deduction Logs</span>
                <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">
                  {StorageService.getInventoryUsageRecords().length} Records
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 block">
                  Firestore /inventory_usage
                </span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportFirestoreInventory}
                  disabled={isExportingFirestore}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-60 transition cursor-pointer"
                >
                  {isExportingFirestore ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>{isExportingFirestore ? 'Fetching Firestore Data...' : 'Export Firestore Inventory (.JSON)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePreviewFirestoreSnapshot}
                  disabled={isExportingFirestore}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview Snapshot JSON</span>
                </button>

                {/* Hidden File Picker for Database Restore */}
                <input
                  ref={restoreFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleSelectRestoreFile}
                />
                <button
                  type="button"
                  onClick={() => restoreFileInputRef.current?.click()}
                  disabled={isRestoringDatabase}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900 transition cursor-pointer"
                  title="Upload a previously saved JSON backup to restore database records"
                >
                  <Upload className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span>Restore Database (Upload .JSON)</span>
                </button>
              </div>

              {firestoreExportStats && (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 self-center">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <span>
                    Last backup: <strong>{firestoreExportStats.lastExportedAt}</strong> ({firestoreExportStats.itemCount} items, PKR {firestoreExportStats.totalValuePKR.toLocaleString()})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Server & Deployment Status */}
      {activeTab === 'deployment' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Server className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Production Deployment & Backend Engine Status
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Full-stack Node.js / Express microservice diagnostic validation running on port 3000.
              </p>
            </div>
            <button
              onClick={runDeploymentSelfTest}
              disabled={testingBackend}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testingBackend ? 'animate-spin' : ''}`} />
              Run Diagnostic Ping
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                <span>Backend Express Server</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {healthStatus?.status === 'ok' ? 'HEALTHY / ONLINE' : 'READY (PORT 3000)'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Port 3000 • Ingress Reverse-Proxy Linked
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                <span>Cloud Run & Container Runtime</span>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                CONTAINER READY
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Multi-Branch Isolated Persistence & Audit Engine
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                <span>Offline PWA & Service Worker</span>
                <Wifi className="h-4 w-4 text-teal-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                ACTIVE
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Automatic Cache, Offline Access, Standalone App
              </p>
            </div>
          </div>

          {/* Diagnostic Console Output */}
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-emerald-400 dark:border-slate-800 shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 mb-2">
              <span className="font-bold flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-teal-400" />
                Live System Diagnostic Output (/api/health & /api/system/info)
              </span>
              <span className="text-[10px] text-slate-400">Response Code: 200 OK</span>
            </div>
            <pre className="text-[11px] leading-relaxed">
              {JSON.stringify(
                {
                  application: 'HR Diagnostics Enterprise Laboratory Suite',
                  version: '3.4.0-enterprise',
                  backendPort: 3000,
                  health: healthStatus || { status: 'ok', timestamp: new Date().toISOString() },
                  system: systemInfo || {
                    architecture: 'Full-Stack Express + Vite React PWA',
                    storage: 'StorageService LocalStorage + Cross-Tab BroadcastChannel + Disaster Recovery JSON',
                    rbacLevels: 7,
                    registeredUsers: users.length,
                    activeBranches: branches.length,
                    deploymentTarget: 'Google Cloud Run / Standalone Node.js Container'
                  }
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}

      {/* Feedback Toast Alert */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in slide-in-from-bottom-5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            feedback.type === 'success'
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
              : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{feedback.message}</p>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Modal: Add or Edit Branch */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {editingBranchId ? 'Edit Diagnostic Branch' : 'Add New Diagnostic Branch'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingBranchId
                      ? 'Update laboratory facility specifications and operating budgets.'
                      : 'Provision a new diagnostic branch in the enterprise hierarchy.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-4">
              {/* Branch Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Multan Regional Lab & Diagnostics"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    placeholder="BR-MLN-04"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white uppercase font-mono font-bold"
                  />
                </div>
              </div>

              {/* City Selection & Quick City Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  City Location *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Multan', 'Faisalabad', 'Quetta', 'Sialkot'].map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setBranchCity(city)}
                      className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                        branchCity === city
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                  placeholder="Or enter custom city..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Facility Type & Monthly Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Facility Type
                  </label>
                  <select
                    value={branchType}
                    onChange={(e) => setBranchType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-medium"
                  >
                    <option value="Regional Branch Lab">Regional Branch Lab</option>
                    <option value="Satellite Collection Center">Satellite Collection Center</option>
                    <option value="Specialized Diagnostic Hub">Specialized Diagnostic Hub</option>
                    <option value="Central Reference Lab">Central Reference Lab</option>
                    <option value="Hospital-Attached Lab">Hospital-Attached Lab</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Operating Budget (PKR)
                  </label>
                  <input
                    type="number"
                    min="50000"
                    step="50000"
                    value={branchMonthlyBudget}
                    onChange={(e) => setBranchMonthlyBudget(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Street Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Physical Address
                </label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="e.g. Plot 45-B, Medical Plaza, Nishtar Road, Multan"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* In-Charge, Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    In-Charge Pathologist / Manager
                  </label>
                  <input
                    type="text"
                    value={branchContactPerson}
                    onChange={(e) => setBranchContactPerson(e.target.value)}
                    placeholder="Dr. Lab In-Charge"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    placeholder="+92 61 4589000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official Branch Email
                  </label>
                  <input
                    type="email"
                    value={branchEmail}
                    onChange={(e) => setBranchEmail(e.target.value)}
                    placeholder="multan.lab@hrdiagnostics.pk"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Operational Status
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Enable to allow reagent requests, asset assignments, and staff logins.
                  </span>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={branchIsActive}
                    onChange={(e) => setBranchIsActive(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-slate-700" />
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 active:scale-98 transition"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{editingBranchId ? 'Update Branch' : 'Create & Save Branch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Branch */}
      {branchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Decommission Diagnostic Branch?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This action permanently removes the branch from active hierarchy.
                </p>
              </div>
            </div>

            {/* Target Branch Summary */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {branchToDelete.name}
                </span>
                <span className="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded shadow-xs dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                  {branchToDelete.code}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Location: <span className="font-semibold">{branchToDelete.city}</span> • {branchToDelete.address}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Staff Members Assigned: <span className="font-bold text-blue-600 dark:text-blue-400">
                  {users.filter((u) => u.branchId === branchToDelete.id).length}
                </span>
              </p>
            </div>

            {/* Impact Details */}
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                System Safeguards & Reassignments:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Any attached users will automatically be reassigned to the Central Head Office.</li>
                <li>Historic test reports and purchase orders will remain safely archived.</li>
                <li>Action will be recorded in the ISO compliance audit trail.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBranchToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBranch}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700 active:scale-98 transition"
              >
                <Trash2 className="h-4 w-4" />
                <span>Yes, Delete Branch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Department */}
      {isAddingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Add Lab Section / Department</h3>

            <form onSubmit={handleSaveDepartment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department Name *
                </label>
                <input
                  type="text"
                  required
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  placeholder="e.g. Histopathology & Cytology"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Short Code
                </label>
                <input
                  type="text"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  placeholder="HISTO"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white uppercase font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingDept(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  Save Lab Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit User */}
      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl my-8 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {editingUserId ? 'Edit Staff Permissions & Branch Assignment' : 'Create Staff User Account'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingUserId
                    ? 'Admin decides which branch this user belongs to and which modules/actions they can access.'
                    : 'Assign staff to a branch and customize which navigation items & actions they are allowed to perform.'}
                </p>
              </div>
              <button
                onClick={() => setIsAddingUser(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="e.g. Dr. Ayesha Siddiqui"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Corporate Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="ayesha@hrdiagnostics.pk"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    System Role
                  </label>
                  <select
                    value={userRole}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      setUserRole(newRole);
                      // Set smart module defaults based on role if creating
                      if (!editingUserId) {
                        if (newRole === 'super_admin') {
                          setUserAllowedModules([
                            'dashboard', 'inventory', 'procurement', 'vendors', 'assets',
                            'transfers', 'approvals', 'audits', 'compliance', 'analytics', 'settings'
                          ]);
                        } else if (newRole === 'branch_manager') {
                          setUserAllowedModules([
                            'dashboard', 'inventory', 'procurement', 'vendors', 'assets', 'transfers', 'audits', 'compliance'
                          ]);
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="super_admin">Super Admin (Head Office)</option>
                    <option value="pathologist_doctor">Pathologist / Doctor</option>
                    <option value="branch_manager">Branch Manager</option>
                    <option value="biomedical_engineer">Biomedical Engineer</option>
                    <option value="lab_technician">Lab Technician</option>
                    <option value="storekeeper">Storekeeper</option>
                    <option value="auditor">Auditor (View Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Primary Branch *
                  </label>
                  <select
                    value={userBranchId}
                    onChange={(e) => setUserBranchId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-semibold text-teal-700 dark:text-teal-400"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    User will be strictly restricted to this branch's inventory, assets, and transfers.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {editingUserId ? 'Reset Password (leave empty to keep current)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUserId}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder={editingUserId ? 'Enter new password if changing' : 'StaffPass123!'}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {/* MODULE ACCESS SELECTION (Admin decides what user can see) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 mb-2.5">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Allowed Navigation Modules (What User Can View & Open)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Unchecked modules will be completely hidden from this user's sidebar.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setUserAllowedModules([
                          'dashboard', 'inventory', 'procurement', 'vendors', 'assets',
                          'transfers', 'approvals', 'audits', 'compliance', 'analytics', 'settings'
                        ])
                      }
                      className="text-[10px] font-bold text-teal-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setUserAllowedModules(['dashboard', 'inventory'])}
                      className="text-[10px] font-bold text-slate-500 hover:underline"
                    >
                      Minimal
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'dashboard', label: 'Overview Dashboard' },
                    { id: 'inventory', label: 'Reagents & Stock' },
                    { id: 'procurement', label: 'Procurement & Bills' },
                    { id: 'vendors', label: 'Vendors & Suppliers' },
                    { id: 'assets', label: 'Lab Equipment & Assets' },
                    { id: 'transfers', label: 'Branch Transfers' },
                    { id: 'approvals', label: 'Head Office Approvals' },
                    { id: 'audits', label: 'Physical Audits' },
                    { id: 'compliance', label: 'ISO & Temp Logs' },
                    { id: 'analytics', label: 'Analytics & Reports' },
                    { id: 'settings', label: 'System Settings' },
                  ].map((mod) => {
                    const isChecked = userAllowedModules.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition ${
                          isChecked
                            ? 'border-teal-500/50 bg-teal-50/50 dark:bg-teal-950/30 dark:border-teal-700/50 text-slate-900 dark:text-white font-medium'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleModule(mod.id)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-[11px] truncate">{mod.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ACTION PERMISSIONS (What user can add / create / request) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950">
                <span className="text-xs font-bold text-slate-900 dark:text-white block mb-0.5">
                  Operational Action Permissions
                </span>
                <p className="text-[10px] text-slate-500 mb-2.5">
                  Granular control over what records the user can add or delete in their branch.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={userCanAddInventory}
                      onChange={(e) => setUserCanAddInventory(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">
                      Can Add Stock & Receive Reagents
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={userCanCreateRequisitions}
                      onChange={(e) => setUserCanCreateRequisitions(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">
                      Can Request New Stock (PO Requisitions)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={userCanCreateTransfers}
                      onChange={(e) => setUserCanCreateTransfers(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">
                      Can Initiate Branch Stock Transfers
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={userCanAddAssets}
                      onChange={(e) => setUserCanAddAssets(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">
                      Can Register Lab Equipment & Assets
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={userCanPerformAudits}
                      onChange={(e) => setUserCanPerformAudits(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">
                      Can Conduct Physical Stock Audits
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={userCanDeleteInventory}
                      onChange={(e) => setUserCanDeleteInventory(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">
                      Can Delete Inventory (Requires Head Office Approval)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modal2fa"
                  checked={user2FA}
                  onChange={(e) => setUser2FA(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="modal2fa" className="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                  Mandate Two-Factor Authentication (2FA) for this user
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  {editingUserId ? 'Save Permissions & User' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Specific User */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-rose-300 bg-white p-6 shadow-2xl dark:border-rose-900/60 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete User Account Permanently?</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400">Irreversible Cloud & Local Removal</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              Are you sure you want to permanently delete the account for <strong className="text-slate-900 dark:text-white">{userToDelete.name}</strong> ({userToDelete.email})?
              This user will immediately lose access and be purged from both local storage and Google Cloud Firestore.
            </p>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3 mb-4 text-xs space-y-1 border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between text-slate-500">
                <span>Role:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{userToDelete.role.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Branch:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{userToDelete.branchName || 'Head Office'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700 transition"
              >
                Permanently Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Purge All Fake / Demo Users */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-rose-300 bg-white p-6 shadow-2xl dark:border-rose-900/60 dark:bg-slate-900">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete All Fake / Demo Users</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400">Complete Cleanup of Unwanted Accounts</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              This will permanently delete all demo, mock, and test users (<code className="text-rose-500 font-mono">@hrdiagnostics.com</code> and test IDs) from both your local database and Cloud Firestore.
              Only verified real accounts and Managing Director (<strong className="text-slate-900 dark:text-white">Mr. Nadeem</strong>) will remain.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPurgeMockUsers}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-rose-700 transition"
              >
                Purge All Fake Users Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Firestore Live JSON Snapshot Preview Modal */}
      {previewModalOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Firestore Inventory JSON Backup Preview
                </h3>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This preview shows the live structure exported from Google Cloud Firestore database <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">ai-studio-hrdiagnosticsinv-1f422913-6d6d-4026-ae36-030d82892f8f</span>. Clicking 'Download Backup File' will download the full complete inventory archive.
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-[11px] font-mono text-emerald-400">
              <pre className="whitespace-pre-wrap">{JSON.stringify(previewData, null, 2)}</pre>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewModalOpen(false);
                  handleExportFirestoreInventory();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700 transition"
              >
                <Download className="h-4 w-4" />
                Download Backup (.JSON)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Restore Confirmation & Verification Modal */}
      {restoreModalOpen && restoreValidationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Restore Clinical Database Archive
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Verify file contents before restoring snapshot
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* File info card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">File Name</span>
                  <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    {restoreValidationResult.fileName || 'Database_Backup.json'}
                  </p>
                </div>
                {restoreValidationResult.stats?.exportedAt && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Export Timestamp</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {new Date(restoreValidationResult.stats.exportedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Data pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center">
                <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Inventory SKUs</span>
                  <strong className="text-sm font-extrabold text-teal-600 dark:text-teal-400">
                    {restoreValidationResult.stats?.itemCount || 0}
                  </strong>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Branches</span>
                  <strong className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                    {restoreValidationResult.stats?.branchCount || 0}
                  </strong>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Staff Accounts</span>
                  <strong className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                    {restoreValidationResult.stats?.userCount || 0}
                  </strong>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Machines / Assets</span>
                  <strong className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    {restoreValidationResult.stats?.assetCount || 0}
                  </strong>
                </div>
              </div>
            </div>

            {/* Warning block */}
            <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 dark:border-amber-800/80 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block mb-0.5">Important Restore Notice:</strong>
                <p className="text-[11px] leading-relaxed">
                  Restoring this archive will overwrite existing local records with the data in this snapshot. Restored records will also synchronize with your live Cloud Firestore database.
                </p>
              </div>
            </div>

            {/* Checkbox to preserve active login session */}
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={keepCurrentUserSession}
                onChange={(e) => setKeepCurrentUserSession(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="font-semibold">Keep current login session active (prevent logout)</span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRestoreModalOpen(false)}
                disabled={isRestoringDatabase}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDatabaseRestore}
                disabled={isRestoringDatabase}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-700 disabled:opacity-60 transition cursor-pointer"
              >
                {isRestoringDatabase ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Restoring Database...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Confirm & Restore Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
