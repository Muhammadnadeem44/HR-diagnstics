import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Bell,
  Search,
  Camera,
  Cloud,
  User,
  LogOut,
  RefreshCw,
  Menu,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
  PackageMinus,
  Grid,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { UserAccount } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface NavbarProps {
  currentUser: UserAccount | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenScanner: () => void;
  isOnline?: boolean;
  isConnectedToFirestore?: boolean;
  isSyncing?: boolean;
  lastSyncTimestamp?: number | null;
  onForceSync?: () => Promise<void> | void;
  offlineQueueCount?: number;
  sessionSecondsLeft?: number;
  activeBranchId: string;
  onBranchChange?: (branchId: string) => void;
  setActiveBranchId?: (branchId: string) => void;
  onNavigate?: (module: string) => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  isInstallable?: boolean;
  onInstallApp?: () => Promise<boolean> | void;
  onToggleDrawer?: () => void;
  onOpenDirectory?: () => void;
  onOpenUsageModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenScanner,
  onOpenUsageModal,
  isOnline = true,
  isConnectedToFirestore = false,
  isSyncing = false,
  onForceSync,
  offlineQueueCount = 0,
  activeBranchId,
  onBranchChange,
  setActiveBranchId,
  onNavigate = () => {},
  isDarkMode = false,
  toggleDarkMode,
  isInstallable = false,
  onInstallApp,
  onToggleDrawer,
  onOpenDirectory,
}) => {
  const handleBranchSelect = (branchId: string) => {
    if (onBranchChange) onBranchChange(branchId);
    if (setActiveBranchId) setActiveBranchId(branchId);
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = !currentUser || currentUser.role === 'super_admin';
  const branches = StorageService.getBranches();
  const notifications = StorageService.getNotifications();
  const unreadNotifs = notifications.filter((n) => !n.isRead);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim() && onNavigate) {
      onNavigate('inventory');
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-18 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-5 backdrop-blur-md dark:border-slate-800 dark:bg-[#0c1527]/95 sm:px-8">
      {/* Left: Mobile Drawer Button & Facility Selector */}
      <div className="flex items-center gap-3.5">
        {onToggleDrawer && (
          <button
            type="button"
            onClick={onToggleDrawer}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Enterprise Facility Selector */}
        <div className="hidden sm:flex items-center gap-2.5 rounded-xl bg-slate-100/80 border border-slate-200 px-3.5 py-2 dark:bg-slate-800/60 dark:border-slate-700/80">
          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          {isSuperAdmin ? (
            <div className="flex items-center gap-1.5">
              <select
                value={activeBranchId}
                onChange={(e) => handleBranchSelect(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer dark:text-slate-200 pr-1"
              >
                <option value="all" className="dark:bg-slate-900">
                  All Facilities (Consolidated)
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="dark:bg-slate-900">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
              {branches.find((b) => b.id === activeBranchId)?.name || 'Central Lab'}
            </span>
          )}
        </div>
      </div>

      {/* Center: Spacious Universal Search Field */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-lg mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search reagents, clinical SKU, equipment, or staff..."
            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15 focus:outline-none dark:border-slate-800 dark:bg-slate-900/80 dark:text-white transition"
          />
        </div>
      </form>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-2.5">
        {/* Cloud Sync Status */}
        <button
          type="button"
          onClick={() => onForceSync && onForceSync()}
          title="Click to force real-time cloud synchronization"
          className={`hidden xl:inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
            isConnectedToFirestore && isOnline
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
          }`}
        >
          {isSyncing ? (
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          ) : (
            <Cloud className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          )}
          <span>{isConnectedToFirestore && isOnline ? 'Cloud Live' : 'Local Sync'}</span>
          {offlineQueueCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.2 text-xs font-black text-amber-900">
              {offlineQueueCount}
            </span>
          )}
        </button>

        {/* Quick Stock Usage Button */}
        {onOpenUsageModal && (
          <button
            type="button"
            onClick={onOpenUsageModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-sm font-bold text-white shadow-xs transition cursor-pointer"
            title="Use / Deduct Stock Reagents"
          >
            <PackageMinus className="h-4 w-4" />
            <span className="hidden sm:inline">Use Stock</span>
          </button>
        )}

        {/* QR Scanner Quick Button */}
        <button
          type="button"
          onClick={onOpenScanner}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-sm font-bold text-white shadow-xs transition cursor-pointer"
          title="Scan Barcode / QR Code"
        >
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">Scan QR</span>
        </button>

        {/* Modules Directory Button */}
        {onOpenDirectory && (
          <button
            type="button"
            onClick={onOpenDirectory}
            className="hidden sm:inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Open Modules Directory"
          >
            <Grid className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </button>
        )}

        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Dark / Light Theme Toggle */}
        {toggleDarkMode && (
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`flex h-10 items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-xl border transition cursor-pointer ${
              isDarkMode
                ? 'border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title={isDarkMode ? 'Switch to Day Mode (Light)' : 'Switch to Night Mode (Dark)'}
            aria-label={isDarkMode ? 'Switch to Day Mode' : 'Switch to Night Mode'}
          >
            {isDarkMode ? (
              <>
                <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="hidden sm:inline text-xs font-bold">Day</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-slate-700 shrink-0" />
                <span className="hidden sm:inline text-xs font-bold">Night</span>
              </>
            )}
          </button>
        )}

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
            title="System Alerts"
          >
            <Bell className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            {unreadNotifs.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                {unreadNotifs.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-88 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  System Alerts ({unreadNotifs.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    unreadNotifs.forEach((n) => StorageService.markNotificationRead(n.id));
                    setShowNotifications(false);
                  }}
                  className="text-xs font-bold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-2.5">
                {notifications.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No active alerts</p>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 pl-2 pr-3 py-1.5 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 transition cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-xs">
              {currentUser ? currentUser.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </div>
            <span className="hidden lg:inline text-sm font-bold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
              {currentUser ? currentUser.name : 'Super Admin'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:inline" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1.5">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {currentUser?.name || 'Managing Director'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {currentUser?.email || 'mrnadeemmobile20@gmail.com'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  onOpenLogin();
                }}
                className="w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Account & Security</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
