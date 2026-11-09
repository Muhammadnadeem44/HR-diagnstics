import React, { useState } from 'react';
import {
  Boxes,
  Cpu,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ShoppingCart,
  Building2,
  CheckCircle2,
  TrendingUp,
  Activity,
  FileText,
  Calendar,
  Bell,
  ChevronRight,
  Users2,
  Check,
  MapPin,
  Phone,
  Layers,
  ArrowDownRight,
  Plus,
  Trash2,
  PackageMinus,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { DailyHuddleReport } from './DailyHuddleReport';

interface OverviewDashboardProps {
  activeBranchId?: string;
  onNavigate: (module: string) => void;
  onOpenScanner?: () => void;
  onOpenUsageModal?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  activeBranchId = 'all',
  onNavigate,
  onOpenScanner = () => {},
  onOpenUsageModal,
}) => {
  const [dashboardView, setDashboardView] = useState<'head_office' | 'branch_view'>('head_office');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const currentUser = StorageService.getCurrentUser();
  const isAdmin =
    !currentUser ||
    currentUser.role === 'super_admin' ||
    currentUser.role.includes('admin') ||
    currentUser.role === 'branch_manager';

  const [branches, setBranches] = useState(() => StorageService.getBranches());
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    const list = StorageService.getBranches();
    return list[1]?.id || list[0]?.id || 'br_headoffice';
  });

  const allInventory = StorageService.getInventory();
  const allAssets = StorageService.getAssets();
  const allPOs = StorageService.getPurchaseOrders();

  const handleDeleteBranchQuick = (branchId: string, branchName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    if (
      confirm(
        `Are you sure you want to decommission and delete branch "${branchName}"? All assigned staff will be transferred to Head Office.`
      )
    ) {
      const res = StorageService.deleteBranch(branchId);
      if (res.success) {
        const updated = StorageService.getBranches();
        setBranches(updated);
        if (selectedBranchId === branchId) {
          setSelectedBranchId(updated[0]?.id || 'br_headoffice');
        }
      } else {
        alert(res.message);
      }
    }
  };

  const dateFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Calculate real values dynamically from live database state
  const calculatedStockValuation = allInventory.reduce((sum, item) => {
    return sum + (item.totalQuantity || 0) * (item.costPrice || 0);
  }, 0);
  const displayStockValuation = calculatedStockValuation;

  const lowStockCount = allInventory.filter((i) => i.totalQuantity <= i.reorderPoint).length;

  const today = new Date();
  const expiringCount = allInventory.reduce((count, item) => {
    return (
      count +
      item.batches.filter((b) => {
        const exp = new Date(b.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
        return diffDays <= 30 && b.currentQuantity > 0;
      }).length
    );
  }, 0);

  const pendingPOCount = allPOs.filter(
    (p) => p.status.toLowerCase().includes('pending') || p.status.toLowerCase().includes('draft')
  ).length;

  const totalAssetsCount = allAssets.length;
  const operationalAssetsCount = allAssets.filter(
    (a) => a.status === 'Active / Operational' || !a.status?.toLowerCase().includes('maintenance')
  ).length;

  const totalBranchesCount = branches.length;
  const currentSelectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const selectedBranchName = currentSelectedBranch?.name || 'Central Diagnostic Facility';

  // Branch bar chart data dynamically aggregated from live inventory
  const branchBarDataRaw = branches.map((branch) => {
    const branchItems = allInventory.filter((item) => item.branchId === branch.id);
    const val = branchItems.reduce((acc, it) => acc + (it.totalQuantity || 0) * (it.costPrice || 0), 0);
    return {
      name: branch.name.replace('HR Diagnostics — ', '').replace('Branch', '').trim() || branch.code,
      value: val,
      label: val >= 1000000 ? `Rs. ${(val / 1000000).toFixed(1)}M` : `Rs. ${(val / 1000).toFixed(0)}K`,
    };
  });
  const maxBranchVal = Math.max(...branchBarDataRaw.map((b) => b.value), 1);
  const branchBarData = branchBarDataRaw.map((b) => ({
    ...b,
    heightPercent: Math.max(Math.round((b.value / maxBranchVal) * 100), 18),
  }));

  // Inventory category donut data computed dynamically
  const categoryTotals: Record<string, number> = {};
  allInventory.forEach((item) => {
    const cat = item.category || 'General';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (item.totalQuantity || 0) * (item.costPrice || 0);
  });
  const totalCatVal = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;
  const categoryPalette = ['#2563eb', '#0d9488', '#f59e0b', '#64748b', '#8b5cf6', '#ec4899'];
  const categoryData =
    Object.keys(categoryTotals).length > 0
      ? Object.entries(categoryTotals).map(([label, val], idx) => ({
          label,
          percent: Math.round((val / totalCatVal) * 100),
          color: categoryPalette[idx % categoryPalette.length],
        }))
      : [
          { label: 'Reagents', percent: 60, color: '#2563eb' },
          { label: 'Consumables', percent: 25, color: '#0d9488' },
          { label: 'Controlled', percent: 15, color: '#f59e0b' },
        ];

  // Top consumed items aggregated dynamically from live employee usage records
  const allUsageRecords = StorageService.getInventoryUsageRecords(
    dashboardView === 'branch_view' ? selectedBranchId : 'all'
  );
  const aggregatedConsumption: Record<string, { name: string; qty: number; uom: string }> = {};
  allUsageRecords.forEach((r) => {
    if (!aggregatedConsumption[r.itemId]) {
      aggregatedConsumption[r.itemId] = { name: r.itemName, qty: 0, uom: r.uom };
    }
    aggregatedConsumption[r.itemId].qty += r.quantityUsed;
  });
  const dynamicTopConsumed = Object.values(aggregatedConsumption)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const topConsumedItems =
    dynamicTopConsumed.length > 0
      ? dynamicTopConsumed.map((item) => ({ name: item.name, qty: `${item.qty} ${item.uom}` }))
      : [
          { name: 'CBC Diluent Reagent Pack', qty: '50 tests' },
          { name: 'EDTA Vacutainer Tubes (4ml)', qty: '32 pcs' },
          { name: 'Biochemistry Quality Control Saline', qty: '28 vials' },
          { name: 'Nitrile Examination Gloves (Box)', qty: '24 bxs' },
          { name: 'Immersion Oil for Microscopy', qty: '20 ml' },
        ];

  // Greeting time calculation
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';
  const userName = currentUser?.name || 'Managing Director';

  return (
    <div className="space-y-7 pb-16">
      {/* Executive Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0c1527] via-[#0f1d38] to-[#14264b] p-6 sm:p-8 text-white shadow-lg border border-slate-800">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-blue-300">
              <span className="uppercase tracking-wider">Enterprise Executive Console</span>
              <span aria-hidden="true">·</span>
              <span className="text-white font-bold">
                {dashboardView === 'head_office'
                  ? 'Head Office & Central Laboratory Hub'
                  : selectedBranchName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {greeting}, {userName}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Consolidated real-time operational overview across {totalBranchesCount} diagnostic facilities.
              All biometric attendance, reagent levels, and procurement pipelines are active.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Direct Asset Management Quick Launch */}
            <button
              type="button"
              onClick={() => onNavigate('assets')}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-cyan-600/20 transition cursor-pointer"
              title="Open Biomedical Equipment & CMMS Asset Management"
            >
              <Cpu className="h-4 w-4" />
              <span>Asset Management</span>
            </button>

            {onOpenUsageModal && (
              <button
                type="button"
                onClick={onOpenUsageModal}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-500/20 transition cursor-pointer"
                title="Deduct and record stock usage by technicians"
              >
                <PackageMinus className="h-4 w-4" />
                <span>Record Stock Usage</span>
              </button>
            )}

            {/* View Switcher: Head Office vs Branch Deep Dive */}
            <div className="flex rounded-xl bg-slate-900/80 p-1 border border-slate-700/80">
              <button
                type="button"
                onClick={() => setDashboardView('head_office')}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  dashboardView === 'head_office'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Head Office
              </button>
              <button
                type="button"
                onClick={() => setDashboardView('branch_view')}
                className={`rounded-lg px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                  dashboardView === 'branch_view'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Branch Deep-Dive
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-900/60 border border-slate-700/80 px-4 py-2 text-xs font-semibold text-slate-200">
              <Calendar className="h-4 w-4 text-blue-400" />
              <span>{dateFormatted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Huddle Action Report Module */}
      <DailyHuddleReport
        onNavigate={onNavigate}
        activeBranchId={dashboardView === 'branch_view' ? selectedBranchId : 'all'}
      />

      {/* 5 High-Impact Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Card 1: Asset Management & Biomedical Machinery */}
        <div
          onClick={() => onNavigate('assets')}
          className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-cyan-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Biomedical Assets
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {totalAssetsCount} <span className="text-xs font-semibold text-slate-400">Units</span>
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {operationalAssetsCount} Operational
              </span>
              <span className="text-slate-400 group-hover:text-cyan-600 font-semibold flex items-center gap-0.5">
                Manage <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => onNavigate('inventory')}
          className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-rose-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Low Stock Items
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {lowStockCount}
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                {lowStockCount > 0 ? 'Requires Purchase Order' : 'All levels healthy'}
              </span>
              <span className="text-slate-400 group-hover:text-blue-600 font-semibold">View</span>
            </div>
          </div>
        </div>

        {/* Card 3: Expiring Soon */}
        <div
          onClick={() => onNavigate('compliance')}
          className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-amber-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Expiring Soon (30d)
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {expiringCount}
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-bold text-amber-600 dark:text-amber-400">
                FEFO Compliance Audit
              </span>
              <span className="text-slate-400 group-hover:text-blue-600 font-semibold flex items-center gap-0.5">
                Details <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Pending Purchase Orders */}
        <div
          onClick={() => onNavigate('procurement')}
          className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Pending POs
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {pendingPOCount}
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Awaiting HO Sign-Off
              </span>
              <span className="text-slate-400 group-hover:text-blue-600 font-semibold flex items-center gap-0.5">
                Review <ArrowUpRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: Operational Facilities */}
        <div
          onClick={() => onNavigate('settings')}
          className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-emerald-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Diagnostic Branches
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {totalBranchesCount}
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                100% Synchronized
              </span>
              <span className="text-slate-400 group-hover:text-blue-600 font-semibold">Settings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Visual Dashboard Grid */}
      {dashboardView === 'head_office' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart 1: Stock Value by Branch Bar Chart (5 cols) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Stock Value by Facility
                </h3>
                <span className="text-xs font-semibold text-slate-400">Real-Time Valuation</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Central Warehouse & Head Office holds strategic bulk reserves.
              </p>
            </div>

            {/* Custom High-Precision Bar Chart */}
            <div className="mt-8 flex h-56 items-end justify-between gap-4 px-2 pt-6 border-b border-slate-100 dark:border-slate-800 pb-2">
              {branchBarData.map((bar, idx) => (
                <div
                  key={bar.name}
                  className="flex flex-1 flex-col items-center h-full justify-end group relative cursor-pointer"
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 transition-transform group-hover:scale-110">
                    {bar.label}
                  </span>

                  <div className="w-full max-w-[48px] bg-slate-100 rounded-t-xl overflow-hidden dark:bg-slate-800 flex items-end h-40">
                    <div
                      className={`w-full rounded-t-xl transition-all duration-500 ${
                        idx === 0
                          ? 'bg-blue-600 group-hover:bg-blue-500'
                          : idx === 1
                          ? 'bg-blue-500 group-hover:bg-blue-400'
                          : idx === 2
                          ? 'bg-indigo-500 group-hover:bg-indigo-400'
                          : 'bg-slate-400 group-hover:bg-slate-300'
                      }`}
                      style={{ height: `${bar.heightPercent}%` }}
                    />
                  </div>

                  <span className="mt-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[80px]">
                    {bar.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Inventory Categories Distribution (4 cols) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Reagent Taxonomy
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                View Catalog
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Classified by clinical laboratory specialties.
            </p>

            {/* Donut Chart with Centered Value */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="h-40 w-40 -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#2563eb"
                    strokeWidth="13"
                    strokeDasharray="100.3 238.7"
                    strokeDashoffset="0"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#0d9488"
                    strokeWidth="13"
                    strokeDasharray="52.5 238.7"
                    strokeDashoffset="-100.3"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="13"
                    strokeDasharray="43 238.7"
                    strokeDashoffset="-152.8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#64748b"
                    strokeWidth="13"
                    strokeDasharray="43 238.7"
                    strokeDashoffset="-195.8"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-base font-black text-slate-900 dark:text-white leading-none">
                    Rs. {(displayStockValuation / 1000000).toFixed(2)}M
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 mt-1 leading-none">
                    Total Value
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-3 w-full sm:w-auto">
                {categoryData.map((cat) => (
                  <div key={cat.label} className="flex items-center justify-between sm:justify-start gap-3 text-sm">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {cat.label}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white pl-2">
                      {cat.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>ISO 15189 / WHO Compliant</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">FEFO Active</span>
            </div>
          </div>

          {/* Chart 3: Recent Activity & Priority Feed (3 cols) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-3 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Priority Feed</h3>
              <button
                type="button"
                onClick={() => onNavigate('compliance')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-4 my-3">
              <div
                onClick={() => onNavigate('inventory')}
                className="flex items-start gap-3.5 cursor-pointer group"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 transition">
                    CBC Diluent Reagent is low
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Lahore Branch · 2 hrs ago
                  </p>
                </div>
              </div>

              <div
                onClick={() => onNavigate('compliance')}
                className="flex items-start gap-3.5 cursor-pointer group"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 transition">
                    HbA1c Cartridges expire in 6 days
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Karachi Branch · 4 hrs ago
                  </p>
                </div>
              </div>

              <div
                onClick={() => onNavigate('procurement')}
                className="flex items-start gap-3.5 cursor-pointer group"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 transition">
                    PO #1245 awaiting approval
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Head Office · 5 hrs ago
                  </p>
                </div>
              </div>

              <div
                onClick={() => onNavigate('assets')}
                className="flex items-start gap-3.5 cursor-pointer group"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                  <Cpu className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 transition">
                    Centrifuge calibration due
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Islamabad Branch · 1 day ago
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Automatic ISO Triage</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Synced Live</span>
            </div>
          </div>
        </div>
      ) : (
        /* Branch Deep Dive View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Facility Stock Value
              </span>
              <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                Rs. 620,450
              </h4>
              <p className="text-xs text-slate-400 mt-1">{selectedBranchName}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Low Stock Thresholds
              </span>
              <h4 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1.5">8 items</h4>
              <p className="text-xs text-rose-500 mt-1">Reorder required</p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Near Expiry
              </span>
              <h4 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1.5">6 items</h4>
              <p className="text-xs text-amber-500 mt-1">Within 14 days</p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Daily Test Output
              </span>
              <h4 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5">
                Rs. 148,200
              </h4>
              <p className="text-xs text-emerald-500 mt-1">Reagents consumed & billed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Daily Stock Movement Line Chart */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Daily Stock Movement
                  </h3>
                  <p className="text-sm text-slate-500">Inward receiving vs Outward test consumption</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span>Inward</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span>Outward</span>
                  </div>
                </div>
              </div>

              <div className="h-56 w-full pt-4">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160">
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeDasharray="4 4" />
                  <line x1="0" y1="70" x2="500" y2="70" stroke="#f1f5f9" strokeDasharray="4 4" />
                  <line x1="0" y1="110" x2="500" y2="110" stroke="#f1f5f9" strokeDasharray="4 4" />
                  <line x1="0" y1="150" x2="500" y2="150" stroke="#e2e8f0" />

                  <path
                    d="M 20 120 C 80 90, 140 130, 200 80 C 260 40, 320 110, 380 70 C 420 50, 460 60, 480 50"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 20 140 C 80 130, 140 100, 200 110 C 260 90, 320 80, 380 100 C 420 110, 460 95, 480 90"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  <circle cx="200" cy="80" r="4.5" fill="#2563eb" />
                  <circle cx="380" cy="70" r="4.5" fill="#2563eb" />
                  <circle cx="200" cy="110" r="4.5" fill="#10b981" />
                  <circle cx="380" cy="100" r="4.5" fill="#10b981" />

                  <text x="20" y="165" fontSize="11" fill="#94a3b8" textAnchor="middle">4 Nov</text>
                  <text x="95" y="165" fontSize="11" fill="#94a3b8" textAnchor="middle">5 Nov</text>
                  <text x="175" y="165" fontSize="11" fill="#94a3b8" textAnchor="middle">6 Nov</text>
                  <text x="250" y="165" fontSize="11" fill="#94a3b8" textAnchor="middle">7 Nov</text>
                  <text x="330" y="165" fontSize="11" fill="#94a3b8" textAnchor="middle">8 Nov</text>
                  <text x="410" y="165" fontSize="11" fill="#94a3b8" textAnchor="middle">9 Nov</text>
                  <text x="480" y="165" fontSize="11" fill="#94a3b8" textAnchor="middle">10 Nov</text>
                </svg>
              </div>
            </div>

            {/* Top Consumed Items Table */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                Top Consumed Items
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="flex items-center justify-between pb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>Reagent / Consumable</span>
                  <span>Quantity</span>
                </div>
                {topConsumedItems.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between py-3 text-sm font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-xs">
                      {item.qty}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Facility Specification Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Diagnostic Branches ({branches.length})
                  </h3>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onNavigate('settings')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Add Branch
                  </button>
                )}
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {branches.map((b) => {
                  const isSelected = selectedBranchId === b.id;
                  const isRoot = b.isHeadOffice || b.id === 'br_headoffice';

                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBranchId(b.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/70 text-blue-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-100 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                            isRoot
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{b.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {b.city} · <span className="font-mono">{b.code}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {isRoot && (
                          <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            HQ
                          </span>
                        )}
                        {isSelected && <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                        {isAdmin && !isRoot && (
                          <button
                            type="button"
                            title="Delete this branch"
                            onClick={(e) => handleDeleteBranchQuick(b.id, b.name, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Facility Details Box */}
            {(() => {
              const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
              if (!currentBranch) return null;

              return (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 lg:col-span-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Facility Specification
                      </h3>
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900">
                        {currentBranch.code}
                      </span>
                    </div>

                    <div className="relative h-32 w-full rounded-2xl overflow-hidden bg-gradient-to-r from-blue-900 to-slate-900 flex items-center justify-center text-white">
                      <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
                      <div className="text-center z-10 p-4">
                        <Building2 className="h-8 w-8 mx-auto text-blue-400 mb-1.5" />
                        <p className="font-extrabold text-base">{currentBranch.name}</p>
                        <p className="text-xs text-blue-200 mt-0.5">
                          {currentBranch.type || 'ISO 15189 Certified Diagnostic Facility'} · {currentBranch.city}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{currentBranch.address}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-mono">{currentBranch.phone || '+92 42 35789000'}</span>
                        <span className="text-slate-400">·</span>
                        <span>{currentBranch.contactPerson || 'Dr. Lab In-Charge'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        StorageService.setActiveBranchId(currentBranch.id);
                        alert(`Switched active operational context to: ${currentBranch.name}`);
                      }}
                      className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-xs hover:bg-blue-700 active:scale-98 transition cursor-pointer"
                    >
                      Switch to this Branch Context
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onNavigate('settings')}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition cursor-pointer"
                      >
                        Settings
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
