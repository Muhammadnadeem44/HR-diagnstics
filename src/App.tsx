import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert } from 'lucide-react';
import { StorageService } from './services/storage';
import { useRealTimeSync } from './hooks/useRealTimeSync';
import { usePWAInstall } from './hooks/usePWAInstall';
import { UserAccount } from './types';

// Layout & Common Components
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { QRScannerModal } from './components/common/QRScannerModal';
import { LoginModal } from './components/auth/LoginModal';
import { LoginPage } from './components/auth/LoginPage';
import { ModulesDirectoryModal } from './components/common/ModulesDirectoryModal';
import { QRLabelPrintModal } from './components/common/QRLabelPrintModal';
import { InventoryUsageModal } from './components/inventory/InventoryUsageModal';
import { InventoryItem, ItemBatch, AssetRecord } from './types';

// Operational View Components
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { AssetManagement } from './components/assets/AssetManagement';
import { WarehouseTransfers } from './components/transfers/WarehouseTransfers';
import { ProcurementManagement } from './components/procurement/ProcurementManagement';
import { PhysicalAuditManagement } from './components/audit/PhysicalAuditManagement';
import { VendorManagement } from './components/vendors/VendorManagement';
import { ComplianceManagement } from './components/compliance/ComplianceManagement';
import { AnalyticsReports } from './components/analytics/AnalyticsReports';
import { SettingsManagement } from './components/settings/SettingsManagement';
import { HeadOfficeApprovals } from './components/approvals/HeadOfficeApprovals';
import { AttendancePayrollManagement } from './components/payroll/AttendancePayrollManagement';
import { RadiologyReporting } from './components/radiology/RadiologyReporting';
import { CashCounterBillingManagement } from './components/billing/CashCounterBillingManagement';

export default function App() {
  // Navigation View State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeBranchId, setActiveBranchId] = useState<string>('all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isModulesModalOpen, setIsModulesModalOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('hr_theme') === 'dark';
  });

  // User Authentication State (Default landing on secure Login Page)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Automatically lock branch & active module for branch staff / non-super_admin users
  useEffect(() => {
    if (currentUser && currentUser.role !== 'super_admin') {
      if (currentUser.branchId && activeBranchId !== currentUser.branchId) {
        setActiveBranchId(currentUser.branchId);
      }
      if (
        currentUser.allowedModules &&
        currentUser.allowedModules.length > 0 &&
        activeTab !== 'dashboard' &&
        !currentUser.allowedModules.includes(activeTab)
      ) {
        const fallback = currentUser.allowedModules[0] || 'dashboard';
        if (activeTab !== fallback) {
          setActiveTab(fallback);
        }
      }
    }
  }, [currentUser, activeBranchId, activeTab]);

  // Scanner & Modal State
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const [systemToast, setSystemToast] = useState<{ message: string } | null>(null);
  const [printLabelModal, setPrintLabelModal] = useState<{
    isOpen: boolean;
    item?: InventoryItem | null;
    batch?: ItemBatch | null;
    asset?: AssetRecord | null;
  }>({ isOpen: false });

  // Global Inventory Usage & Stock Deduction Modal State (Accessible across all views)
  const [isUsageModalOpen, setIsUsageModalOpen] = useState<boolean>(false);
  const [usageItem, setUsageItem] = useState<InventoryItem | null>(null);
  const [usageBatch, setUsageBatch] = useState<ItemBatch | null>(null);

  useEffect(() => {
    const handleSystemAlert = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setSystemToast({ message: customEvent.detail });
      }
    };
    window.addEventListener('hr-system-alert', handleSystemAlert);
    return () => window.removeEventListener('hr-system-alert', handleSystemAlert);
  }, []);

  useEffect(() => {
    if (systemToast) {
      const timer = setTimeout(() => setSystemToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [systemToast]);

  // Real-time synchronization hook across browser tabs & PWA offline cache
  const [renderTrigger, setRenderTrigger] = useState<number>(0);
  const handleSyncUpdate = useCallback(() => {
    setRenderTrigger((prev) => prev + 1);
  }, []);

  const {
    isOnline,
    isConnectedToFirestore,
    isSyncing,
    lastSyncTimestamp,
    offlineQueueCount,
    forceCloudSync,
  } = useRealTimeSync(handleSyncUpdate);

  // PWA Install Prompt Hook
  const { isInstallable, installApp } = usePWAInstall();

  // Dark Mode side effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('hr_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('hr_theme', 'light');
    }
  }, [isDarkMode]);

  // Session Inactivity Auto-Logout (30 mins)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (currentUser) {
          StorageService.logoutUser();
          setCurrentUser(null);
          setSystemToast({ message: 'Session timed out due to 30 minutes of inactivity. Please log in again.' });
        }
      }, 30 * 60 * 1000); // 30 minutes
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, [currentUser]);

  // Handle scanned barcode/QR
  const handleScanCode = useCallback(
    (code: string) => {
      const inventory = StorageService.getInventory();
      const assets = StorageService.getAssets();

      // Check if matches SKU, barcode, or lot
      const matchedItem = inventory.find(
        (i) =>
          i.sku.toLowerCase() === code.toLowerCase() ||
          i.barcode === code ||
          i.batches.some((b) => b.batchNumber.toLowerCase() === code.toLowerCase())
      );

      // Check if matches machine serial number or asset tag
      const matchedAsset = assets.find(
        (a) =>
          a.assetTag.toLowerCase() === code.toLowerCase() ||
          a.serialNumber.toLowerCase() === code.toLowerCase()
      );

      if (matchedItem) {
        setActiveTab('inventory');
        setScannedFeedback(`Identified Stock: ${matchedItem.name} (${matchedItem.totalQuantity} ${matchedItem.uom})`);
      } else if (matchedAsset) {
        setActiveTab('assets');
        setScannedFeedback(`Identified Asset: ${matchedAsset.name} [SN: ${matchedAsset.serialNumber}]`);
      } else {
        setScannedFeedback(`Scanned Code: "${code}" (No immediate SKU match found)`);
      }

      setTimeout(() => setScannedFeedback(null), 6000);
    },
    []
  );

  // If user is not authenticated, show the primary HR Diagnostics cyber login portal
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop & Mobile Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
        onOpenDirectory={() => setIsModulesModalOpen(true)}
        activeBranchId={activeBranchId}
        onBranchChange={setActiveBranchId}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />

      {/* Main Content Area (Offset by sidebar width on large screens) */}
      <div
        className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        {/* Top Sticky Navbar */}
        <Navbar
          activeBranchId={activeBranchId}
          setActiveBranchId={setActiveBranchId}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenUsageModal={() => {
            setUsageItem(null);
            setUsageBatch(null);
            setIsUsageModalOpen(true);
          }}
          currentUser={currentUser}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onLogout={() => {
            StorageService.logoutUser();
            setCurrentUser(null);
          }}
          isOnline={isOnline}
          isConnectedToFirestore={isConnectedToFirestore}
          isSyncing={isSyncing}
          lastSyncTimestamp={lastSyncTimestamp}
          offlineQueueCount={offlineQueueCount}
          onForceSync={forceCloudSync}
          isDarkMode={isDarkMode}
          toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          isInstallable={isInstallable}
          onInstallApp={installApp}
          onNavigate={(tab) => setActiveTab(tab)}
          onToggleDrawer={() => setIsMobileDrawerOpen((prev) => !prev)}
          onOpenDirectory={() => setIsModulesModalOpen(true)}
        />

        {/* Global Floating QR Scan Notification */}
        {scannedFeedback && (
          <div className="mx-4 sm:mx-8 mt-3 flex items-center justify-between rounded-xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-xs font-semibold text-teal-900 shadow-sm dark:border-teal-800 dark:bg-teal-950/80 dark:text-teal-200">
            <span>📷 {scannedFeedback}</span>
            <button
              onClick={() => setScannedFeedback(null)}
              className="text-teal-700 hover:text-teal-900 dark:text-teal-300 ml-4 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* View Routing Body */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-7xl">
            {/* Permission Guard */}
            {currentUser &&
            currentUser.role !== 'super_admin' &&
            currentUser.allowedModules &&
            currentUser.allowedModules.length > 0 &&
            activeTab !== 'dashboard' &&
            !currentUser.allowedModules.includes(activeTab) ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center dark:border-amber-900/50 dark:bg-amber-950/20 max-w-lg mx-auto my-12">
                <ShieldAlert className="mx-auto h-12 w-12 text-amber-600 dark:text-amber-400 mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Access Restricted by Administrator
                </h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Head Office Admin has configured your account to only access assigned modules.
                  You do not have permission to view the <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">"{activeTab}"</span> section.
                </p>
                <button
                  onClick={() => setActiveTab(currentUser.allowedModules?.[0] || 'dashboard')}
                  className="mt-5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 transition"
                >
                  Return to Allowed Modules
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <OverviewDashboard
                    onNavigate={(tab) => setActiveTab(tab)}
                    onOpenUsageModal={() => {
                      setUsageItem(null);
                      setUsageBatch(null);
                      setIsUsageModalOpen(true);
                    }}
                  />
                )}

                {activeTab === 'inventory' && (
                  <InventoryManagement
                    activeBranchId={activeBranchId}
                    currentUser={currentUser}
                    onNavigate={(tab) => setActiveTab(tab)}
                    onPrintLabel={(item, batch) => {
                      setPrintLabelModal({
                        isOpen: true,
                        item,
                        batch: batch || null,
                        asset: null,
                      });
                    }}
                  />
                )}

                {activeTab === 'radiology' && (
                  <RadiologyReporting
                    activeBranchId={activeBranchId}
                    onNavigate={(tab) => setActiveTab(tab)}
                  />
                )}

                {activeTab === 'billing' && (
                  <CashCounterBillingManagement />
                )}

                {activeTab === 'attendance' && (
                  <AttendancePayrollManagement
                    currentUser={currentUser}
                    activeBranchId={activeBranchId}
                  />
                )}

                {activeTab === 'assets' && (
                  <AssetManagement
                    activeBranchId={activeBranchId}
                    currentUser={currentUser}
                    onPrintLabel={(item, batch, asset) => {
                      setPrintLabelModal({
                        isOpen: true,
                        item: item || null,
                        batch: batch || null,
                        asset: asset || null,
                      });
                    }}
                  />
                )}

                {activeTab === 'transfers' && (
                  <WarehouseTransfers
                    activeBranchId={activeBranchId}
                    currentUser={currentUser}
                  />
                )}

                {activeTab === 'approvals' && (
                  <HeadOfficeApprovals
                    currentUser={currentUser}
                    onNavigate={(tab) => setActiveTab(tab)}
                  />
                )}

                {activeTab === 'procurement' && (
                  <ProcurementManagement
                    activeBranchId={activeBranchId}
                    currentUser={currentUser}
                  />
                )}

                {activeTab === 'audits' && (
                  <PhysicalAuditManagement
                    activeBranchId={activeBranchId}
                    currentUser={currentUser}
                  />
                )}

                {activeTab === 'vendors' && <VendorManagement />}

                {activeTab === 'compliance' && (
                  <ComplianceManagement
                    currentUser={currentUser}
                    activeBranchId={activeBranchId}
                  />
                )}

                {activeTab === 'analytics' && (
                  <AnalyticsReports activeBranchId={activeBranchId} />
                )}

                {activeTab === 'settings' && (
                  <SettingsManagement currentUser={currentUser} />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        onToggleDrawer={() => setIsMobileDrawerOpen((prev) => !prev)}
      />

      {/* Comprehensive Modules & Capabilities Directory Modal (Kya Kya is software mea) */}
      <ModulesDirectoryModal
        isOpen={isModulesModalOpen}
        onClose={() => setIsModulesModalOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsModulesModalOpen(false);
        }}
      />

      {/* Universal Barcode & QR Code Optical Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanCode}
      />

      {/* User Login, 2FA, & Session Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsLoginModalOpen(false);
        }}
      />

      {/* Warehouse & Inventory QR / Barcode Printable PDF Label Modal */}
      {printLabelModal.isOpen && (
        <QRLabelPrintModal
          isOpen={printLabelModal.isOpen}
          onClose={() => setPrintLabelModal({ isOpen: false })}
          item={printLabelModal.item}
          batch={printLabelModal.batch}
          asset={printLabelModal.asset}
          warehouseName="Central Medical Warehouse"
          branchName="HR Central Diagnostic Lab"
        />
      )}

      {/* Universal Employee Inventory Usage & Stock Deduction Modal */}
      {isUsageModalOpen && (
        <InventoryUsageModal
          isOpen={isUsageModalOpen}
          onClose={() => {
            setIsUsageModalOpen(false);
            setUsageItem(null);
            setUsageBatch(null);
          }}
          preSelectedItem={usageItem}
          preSelectedBatch={usageBatch}
          activeBranchId={activeBranchId}
          currentUser={currentUser}
          onUsageRecorded={(rec) => {
            setSystemToast({
              message: `Recorded usage of ${rec.quantityUsed} ${rec.uom} of ${rec.itemName} (${rec.itemSku}) at ${rec.branchName}. Stock deducted.`,
            });
            handleSyncUpdate();
          }}
        />
      )}

      {/* In-App Floating Notification Banner (Replaces disruptive modal alerts) */}
      {systemToast && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-md animate-fade-in-up">
          <div className="flex items-start gap-3 rounded-2xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 p-4 shadow-2xl backdrop-blur-md ring-1 ring-white/10 dark:ring-slate-900/10 border-l-4 border-teal-500">
            <div className="p-1 rounded-lg bg-teal-500/20 text-teal-400 dark:text-teal-600 shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1 text-xs font-medium leading-relaxed pt-0.5">
              {systemToast.message}
            </div>
            <button
              type="button"
              onClick={() => setSystemToast(null)}
              className="text-slate-400 hover:text-white dark:hover:text-slate-900 text-sm font-bold ml-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
