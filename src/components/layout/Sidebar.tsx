import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Cpu,
  ArrowLeftRight,
  ShoppingCart,
  ClipboardCheck,
  Users2,
  FileCheck2,
  BarChart3,
  Settings,
  Building2,
  User,
  X,
  ShieldCheck,
  Grid,
  Fingerprint,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Receipt,
  FileText,
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';
import { StorageService } from '../../services/storage';
import { BrandLogo } from '../common/BrandLogo';

interface SidebarProps {
  activeTab: string;
  onSelectTab?: (tab: string) => void;
  setActiveTab?: (tab: string) => void;
  userRole?: UserRole;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  isMobileDrawerOpen?: boolean;
  onCloseMobileDrawer?: () => void;
  onOpenDirectory?: () => void;
  activeBranchId?: string;
  onBranchChange?: (branchId: string) => void;
  currentUser?: UserAccount | null;
  onOpenLogin?: () => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

interface NavSection {
  title: string;
  items: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
  }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  setActiveTab,
  isCollapsed = false,
  setIsCollapsed,
  isMobileDrawerOpen,
  onCloseMobileDrawer,
  onOpenDirectory,
  activeBranchId = 'all',
  onBranchChange,
  currentUser,
  onOpenLogin,
  isDarkMode,
  toggleDarkMode,
}) => {
  const handleSelect = (tab: string) => {
    if (onSelectTab) onSelectTab(tab);
    if (setActiveTab) setActiveTab(tab);
  };

  const isSuperAdmin = !currentUser || currentUser.role === 'super_admin';
  const branches = StorageService.getBranches();
  const activeBranch = branches.find(
    (b) => b.id === (isSuperAdmin ? activeBranchId : currentUser?.branchId || activeBranchId)
  );

  const pendingApprovalsCount = StorageService.getApprovalRequests().filter(
    (r) => r.status === 'Pending' && (isSuperAdmin || r.branchId === currentUser?.branchId)
  ).length;

  // Logically grouped navigation sections for enterprise clarity
  const rawSections: NavSection[] = [
    {
      title: 'Overview',
      items: [{ id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Clinical & Diagnostics',
      items: [
        { id: 'billing', label: 'Cash Counter & Clinic POS', icon: Receipt },
        { id: 'radiology', label: 'Ultrasound & X-Ray Reporting', icon: FileText },
      ],
    },
    {
      title: 'Lab Operations',
      items: [
        { id: 'inventory', label: 'Reagents & Inventory', icon: Boxes },
        { id: 'attendance', label: 'Attendance & Payroll', icon: Fingerprint },
        { id: 'transfers', label: 'Inter-Branch Transfers', icon: ArrowLeftRight },
      ],
    },
    {
      title: 'Supply & Procurement',
      items: [
        { id: 'procurement', label: 'Purchasing & POs', icon: ShoppingCart },
        { id: 'vendors', label: 'Vendor Directory', icon: Users2 },
        { id: 'approvals', label: 'HO Approvals', icon: ShieldCheck, badgeCount: pendingApprovalsCount },
      ],
    },
    {
      title: 'Equipment & Maintenance',
      items: [
        { id: 'assets', label: 'Asset Management', icon: Cpu },
        { id: 'audits', label: 'Physical Stock Audits', icon: ClipboardCheck },
        { id: 'compliance', label: 'Cold Chain & QC', icon: FileCheck2 },
      ],
    },
    {
      title: 'Management',
      items: [
        { id: 'analytics', label: 'Finance & Analytics', icon: BarChart3 },
        { id: 'settings', label: 'System Settings', icon: Settings },
      ],
    },
  ];

  // Filter items by user role / permissions
  const filteredSections = rawSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (isSuperAdmin) return true;
        if (currentUser?.allowedModules && currentUser.allowedModules.length > 0) {
          return currentUser.allowedModules.includes(item.id);
        }
        if (item.id === 'settings' || item.id === 'approvals') {
          return currentUser?.role === 'branch_manager';
        }
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  const handleItemClick = (id: string) => {
    handleSelect(id);
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  const toggleCollapse = () => {
    if (setIsCollapsed) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isMobileDrawerOpen && (
        <div
          onClick={onCloseMobileDrawer}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 lg:z-30 border-r border-slate-800 bg-[#0c1527] text-slate-200 transition-all duration-300 ${
          isMobileDrawerOpen
            ? 'translate-x-0 shadow-2xl w-72'
            : `-translate-x-full lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}`
        } flex flex-col justify-between overflow-hidden select-none`}
      >
        {/* Top Header & Brand */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between h-18 px-4 border-b border-slate-800/80 bg-[#080f1d]/60">
            <div
              className={`flex items-center gap-3 cursor-pointer ${
                isCollapsed ? 'justify-center w-full' : ''
              }`}
              onClick={() => handleItemClick('dashboard')}
            >
              <BrandLogo size="sm" showText={false} />
              {!isCollapsed && (
                <div className="flex flex-col leading-tight">
                  <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                    HR DIAGNOSTICS
                  </span>
                  <span className="text-xs font-semibold text-blue-400 tracking-wide uppercase">
                    Enterprise Lab ERP
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Collapse / Expand Toggle */}
            {!isCollapsed && setIsCollapsed && (
              <button
                type="button"
                onClick={toggleCollapse}
                title="Collapse sidebar"
                className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            {/* Mobile Close Button */}
            {onCloseMobileDrawer && (
              <button
                type="button"
                onClick={onCloseMobileDrawer}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Collapsed Expand Button */}
          {isCollapsed && setIsCollapsed && (
            <div className="hidden lg:flex justify-center py-2 border-b border-slate-800/80">
              <button
                type="button"
                onClick={toggleCollapse}
                title="Expand sidebar"
                className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Quick Modules Directory Button */}
          {!isCollapsed && onOpenDirectory && (
            <div className="px-3.5 pt-3.5">
              <button
                type="button"
                onClick={onOpenDirectory}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:border-blue-500/40 hover:bg-slate-800/80 hover:text-white transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Grid className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">All 11 ERP Modules</span>
                </span>
                <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-300 font-mono">
                  Browse
                </span>
              </button>
            </div>
          )}

          {/* Scrollable Navigation Tree */}
          <nav className="flex-1 overflow-y-auto px-3 py-3.5 space-y-5">
            {filteredSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                {!isCollapsed && (
                  <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {section.title}
                  </h4>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const count = item.badgeCount;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemClick(item.id)}
                        title={isCollapsed ? item.label : undefined}
                        className={`group relative flex w-full items-center ${
                          isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                        } rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className={`flex items-center gap-3.5 ${isCollapsed ? 'justify-center' : 'truncate'}`}>
                          <Icon
                            className={`h-5 w-5 shrink-0 transition-colors ${
                              isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate text-sm">{item.label}</span>}
                        </div>

                        {!isCollapsed && count !== undefined && count > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-500 text-slate-950 px-2 py-0.5 text-xs font-mono font-black">
                            {count}
                          </span>
                        )}

                        {isCollapsed && count !== undefined && count > 0 && (
                          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-[#0c1527]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom Section: Branch Selector & User Profile */}
        <div className="p-3.5 border-t border-slate-800/90 bg-[#080f1d]/70 space-y-3">
          {/* Branch Selector */}
          {!isCollapsed && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1 block">
                {isSuperAdmin ? 'Operational Facility' : 'Assigned Facility'}
              </span>
              <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200">
                <Building2 className="h-4 w-4 text-blue-400 shrink-0" />
                {isSuperAdmin ? (
                  <select
                    value={activeBranchId}
                    onChange={(e) => onBranchChange && onBranchChange(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer truncate"
                  >
                    <option value="all" className="bg-slate-900 text-white">
                      All Facilities (Consolidated)
                    </option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="w-full text-xs font-semibold text-slate-200 truncate">
                    {activeBranch?.name || currentUser?.branchName || 'Central Lab'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Day / Night Theme Appearance Switch */}
          {toggleDarkMode && (
            <div
              className={`mb-2.5 flex items-center ${
                isCollapsed ? 'justify-center p-1' : 'justify-between px-3 py-2'
              } rounded-xl bg-slate-900/80 border border-slate-800 transition`}
            >
              {!isCollapsed && (
                <span className="text-xs font-semibold text-slate-300">
                  Day / Night Mode
                </span>
              )}
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30 hover:bg-amber-400/25'
                    : 'bg-blue-600/25 text-blue-300 border border-blue-500/40 hover:bg-blue-600/35'
                }`}
                title={isDarkMode ? 'Switch to Day Mode (Light)' : 'Switch to Night Mode (Dark)'}
              >
                {isDarkMode ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    {!isCollapsed && <span>Day Mode</span>}
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-blue-300" />
                    {!isCollapsed && <span>Night Mode</span>}
                  </>
                )}
              </button>
            </div>
          )}

          {/* User Profile Card */}
          <div
            onClick={onOpenLogin}
            className={`flex items-center ${
              isCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'
            } rounded-xl bg-slate-900/90 border border-slate-800 cursor-pointer hover:border-slate-700 hover:bg-slate-800/50 transition`}
            title="User Profile & Security"
          >
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'overflow-hidden'}`}>
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300 font-bold text-sm border border-blue-500/30">
                {currentUser ? (
                  currentUser.name.charAt(0).toUpperCase()
                ) : (
                  <User className="h-4 w-4 text-blue-400" />
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0c1527]" />
              </div>

              {!isCollapsed && (
                <div className="overflow-hidden text-left">
                  <p className="text-sm font-bold text-white truncate leading-tight">
                    {currentUser ? currentUser.name : 'Super Admin'}
                  </p>
                  <p className="text-xs text-slate-400 truncate leading-tight mt-0.5 capitalize">
                    {currentUser ? currentUser.role.replace(/_/g, ' ') : 'Master Controller'}
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <span className="text-xs font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                {currentUser ? 'Active' : 'Sign in'}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
