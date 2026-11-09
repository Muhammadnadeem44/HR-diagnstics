import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Sparkles,
  Plus,
  PackageMinus,
  Camera,
  ClipboardCheck,
  Users,
  Fingerprint,
  DollarSign,
  AlertTriangle,
  Clock,
  ArrowRight,
  Search,
  FileText,
  CheckCircle2,
  Building2,
  Sun,
  Moon,
  RefreshCw,
  Layers,
  Check,
  TrendingUp,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { InventoryItem } from '../../types';
import { DailyHuddleReport } from './DailyHuddleReport';

interface EasyDashboardViewProps {
  onNavigate: (module: string) => void;
  onOpenScanner?: () => void;
  onOpenUsageModal?: () => void;
  onSwitchToProMode?: () => void;
  activeBranchId?: string;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

export const EasyDashboardView: React.FC<EasyDashboardViewProps> = ({
  onNavigate,
  onOpenScanner = () => {},
  onOpenUsageModal,
  onSwitchToProMode,
  activeBranchId = 'all',
  isDarkMode = false,
  toggleDarkMode,
}) => {
  const currentUser = StorageService.getCurrentUser();
  const branches = StorageService.getBranches();
  const allInventory = StorageService.getInventory();
  const allEmployees = StorageService.getEmployees();

  // Filter inventory by branch if branch is specific
  const branchInventory = useMemo(() => {
    if (activeBranchId === 'all') return allInventory;
    return allInventory.filter((i) => i.branchId === activeBranchId);
  }, [allInventory, activeBranchId]);

  const activeBranchObj = branches.find((b) => b.id === activeBranchId);
  const branchName =
    activeBranchId === 'all'
      ? 'All Branches (Consolidated Head Office)'
      : activeBranchObj?.name || 'Main Lab';

  // Metrics
  const lowStockItems = useMemo(
    () => branchInventory.filter((i) => i.totalQuantity <= i.reorderPoint),
    [branchInventory]
  );

  const today = new Date();
  const expiringItems = useMemo(() => {
    return branchInventory.filter((item) =>
      item.batches.some((b) => {
        const exp = new Date(b.expiryDate);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
        return diffDays <= 30 && b.currentQuantity > 0;
      })
    );
  }, [branchInventory]);

  // Live Quick Search in Easy Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterPill, setActiveFilterPill] = useState<'all' | 'low' | 'expiring'>('all');

  const filteredEasyItems = useMemo(() => {
    return branchInventory.filter((item) => {
      if (activeFilterPill === 'low' && item.totalQuantity > item.reorderPoint) return false;
      if (activeFilterPill === 'expiring') {
        const isExpiring = item.batches.some((b) => {
          const exp = new Date(b.expiryDate);
          const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
          return diffDays <= 30 && b.currentQuantity > 0;
        });
        if (!isExpiring) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesCat = item.category?.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }
      return true;
    });
  }, [branchInventory, activeFilterPill, searchQuery]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Welcoming Bilingual Header with Day/Night Mode & Mode Switcher */}
      <div className="rounded-3xl border border-teal-200/80 bg-gradient-to-br from-teal-500/10 via-white to-blue-500/10 p-6 shadow-sm dark:border-teal-900/50 dark:from-teal-950/40 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>آسان موڈ • Easy Laboratory View</span>
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                • {branchName}
              </span>
            </div>

            <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              خوش آمدید، {currentUser?.name || 'لیب ایڈمن'}!
            </h1>
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              لیب کا روزمرہ کام آسان اور تیز ترین طریقے سے کریں۔ نیا اسٹاک درج کریں، ری ایجنٹ استعمال کریں، حاضری لگائیں یا پے رول سلپ نکالیں۔ جو کام کرنا ہے نیچے دیے گئے بڑے بٹن پر کلک کریں۔
            </p>
          </div>

          {/* Quick Header Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Day / Night Mode Switch Button */}
            {toggleDarkMode && (
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-extrabold shadow-sm transition cursor-pointer ${
                  isDarkMode
                    ? 'border-indigo-700 bg-indigo-950/60 text-amber-300 hover:bg-indigo-900/80'
                    : 'border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100'
                }`}
                title="Day / Night Mode Toggle"
              >
                {isDarkMode ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-400" />
                    <span>روشنی موڈ (Day)</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-indigo-600" />
                    <span>ڈارک موڈ (Night)</span>
                  </>
                )}
              </button>
            )}

            {/* Switch to Full Pro Mode Button */}
            {onSwitchToProMode && (
              <button
                type="button"
                onClick={onSwitchToProMode}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-extrabold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Switch to Advanced Detailed Pro Dashboard"
              >
                <Layers className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span>مکمل پرو موڈ (Pro View)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Four Big Simplified Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Stock */}
        <div
          onClick={() => {
            setActiveFilterPill('all');
            onNavigate('inventory');
          }}
          className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-teal-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase dark:text-slate-400">
              کل اسٹاک آئٹمز (Total Items)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <Boxes className="h-5 w-5" />
            </div>
          </div>
          <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {branchInventory.length}
          </h3>
          <p className="text-[11px] font-medium text-teal-600 dark:text-teal-400 mt-0.5">
            ری ایجنٹس اور سامان لیب میں موجود ہے
          </p>
        </div>

        {/* Metric 2: Low Stock */}
        <div
          onClick={() => {
            setActiveFilterPill('low');
            onNavigate('inventory');
          }}
          className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-rose-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase dark:text-slate-400">
              ختم ہونے والا (Low Stock)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <h3 className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {lowStockItems.length}
          </h3>
          <p className="text-[11px] font-medium text-rose-500 mt-0.5">
            فوری دوبارہ آرڈر کرنے کی ضرورت ہے
          </p>
        </div>

        {/* Metric 3: Expiring Soon */}
        <div
          onClick={() => {
            setActiveFilterPill('expiring');
            onNavigate('inventory');
          }}
          className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-amber-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase dark:text-slate-400">
              ایکسپائری الرٹ (30 دن)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <h3 className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {expiringItems.length}
          </h3>
          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-500 mt-0.5">
            30 دنوں میں ایکسپائر ہو جائیں گے
          </p>
        </div>

        {/* Metric 4: Total Staff */}
        <div
          onClick={() => onNavigate('attendance')}
          className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase dark:text-slate-400">
              کل لیب اسٹاف (Staff)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <h3 className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {allEmployees.length}
          </h3>
          <p className="text-[11px] font-medium text-blue-500 mt-0.5">
            ملازمین رجسٹرڈ اور فعال ہیں
          </p>
        </div>
      </div>

      {/* 3. Nine Big 1-Click Operations Cards (بڑے اور آسان بٹن) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>آسان اور فوری کام (Quick Lab Actions)</span>
            <span className="text-xs font-normal text-slate-400">
              — مطلوبہ کام پر براہ راست کلک کریں
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Action 1: Add Stock */}
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="group flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left shadow-2xs transition hover:scale-[1.01] hover:bg-emerald-100/80 hover:shadow-md dark:border-emerald-800/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
              <Plus className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                  نیا اسٹاک شامل کریں
                </h4>
                <span className="rounded-md bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                  Stock In
                </span>
              </div>
              <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 mt-1 font-medium">
                نئی میڈیسن، ری ایجنٹ یا لیب کٹ سسٹم میں شامل کریں اور بارکوڈ بنائیں
              </p>
            </div>
          </button>

          {/* Action 2: Deduct / Use Stock */}
          <button
            type="button"
            onClick={() => {
              if (onOpenUsageModal) onOpenUsageModal();
            }}
            className="group flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left shadow-2xs transition hover:scale-[1.01] hover:bg-amber-100/80 hover:shadow-md dark:border-amber-800/80 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
              <PackageMinus className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-amber-950 dark:text-amber-200">
                  ری ایجنٹ استعمال / کٹوتی
                </h4>
                <span className="rounded-md bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                  Use Reagent
                </span>
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1 font-medium">
                ٹیسٹ کے دوران استعمال ہونے والا ری ایجنٹ کٹوتی درج کریں (1 کلک)
              </p>
            </div>
          </button>

          {/* Action 3: QR / Barcode Scan */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="group flex items-start gap-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-left shadow-2xs transition hover:scale-[1.01] hover:bg-teal-100/80 hover:shadow-md dark:border-teal-800/80 dark:bg-teal-950/30 dark:hover:bg-teal-950/50 cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
              <Camera className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-teal-950 dark:text-teal-200">
                  بارکوڈ اسکین کریں
                </h4>
                <span className="rounded-md bg-teal-200/80 px-2 py-0.5 text-[10px] font-bold text-teal-900 dark:bg-teal-900 dark:text-teal-200">
                  Scanner
                </span>
              </div>
              <p className="text-xs text-teal-800/90 dark:text-teal-300/90 mt-1 font-medium">
                ڈبے یا وائل کا کیو آر کوڈ یا بارکوڈ اسکین کر کے فوراً تفصیل نکالیں
              </p>
            </div>
          </button>

          {/* Action 4: Check Inventory */}
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="group flex items-start gap-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-left shadow-2xs transition hover:scale-[1.01] hover:bg-blue-100/80 hover:shadow-md dark:border-blue-800/80 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-blue-950 dark:text-blue-200">
                  اسٹاک اور بیلنس چیک کریں
                </h4>
                <span className="rounded-md bg-blue-200/80 px-2 py-0.5 text-[10px] font-bold text-blue-900 dark:bg-blue-900 dark:text-blue-200">
                  Check Stock
                </span>
              </div>
              <p className="text-xs text-blue-800/90 dark:text-blue-300/90 mt-1 font-medium">
                لیب میں کس ری ایجنٹ کی کتنی بوتلیں یا ٹیسٹ باقی ہیں، لسٹ دیکھیں
              </p>
            </div>
          </button>

          {/* Action 5: Staff Attendance */}
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="group flex items-start gap-4 rounded-2xl border border-purple-200 bg-purple-50/70 p-4 text-left shadow-2xs transition hover:scale-[1.01] hover:bg-purple-100/80 hover:shadow-md dark:border-purple-800/80 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md">
              <Fingerprint className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-purple-950 dark:text-purple-200">
                  اسٹاف کی حاضری لگائیں
                </h4>
                <span className="rounded-md bg-purple-200/80 px-2 py-0.5 text-[10px] font-bold text-purple-900 dark:bg-purple-900 dark:text-purple-200">
                  Attendance
                </span>
              </div>
              <p className="text-xs text-purple-800/90 dark:text-purple-300/90 mt-1 font-medium">
                بایومیٹرک مشین یا کمپیوٹر سے عملے کی آمد، چھٹی اور اوور ٹائم درج کریں
              </p>
            </div>
          </button>

          {/* Action 6: Payroll & Salary Slips */}
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="group flex items-start gap-4 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-left shadow-2xs transition hover:scale-[1.01] hover:bg-sky-100/80 hover:shadow-md dark:border-sky-800/80 dark:bg-sky-950/30 dark:hover:bg-sky-950/50 cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-sky-950 dark:text-sky-200">
                  تنخواہ اور پے رول سلپ
                </h4>
                <span className="rounded-md bg-sky-200/80 px-2 py-0.5 text-[10px] font-bold text-sky-900 dark:bg-sky-900 dark:text-sky-200">
                  Payroll PDF
                </span>
              </div>
              <p className="text-xs text-sky-800/90 dark:text-sky-300/90 mt-1 font-medium">
                ماہانہ تنخواہ کا حساب، ایڈوانس لون کٹوتی اور PDF/CSV اکاؤنٹنگ سمری نکالیں
              </p>
            </div>
          </button>

          {/* Action 7: Low Stock Alerts */}
          <button
            type="button"
            onClick={() => {
              setActiveFilterPill('low');
              onNavigate('inventory');
            }}
            className="group flex items-start gap-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-left shadow-2xs transition hover:scale-[1.01] hover:bg-rose-100/80 hover:shadow-md dark:border-rose-800/80 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-rose-950 dark:text-rose-200">
                  ختم ہونے والا اسٹاک دیکھیں
                </h4>
                <span className="rounded-md bg-rose-200/80 px-2 py-0.5 text-[10px] font-bold text-rose-900 dark:bg-rose-900 dark:text-rose-200">
                  {lowStockItems.length} Items Low
                </span>
              </div>
              <p className="text-xs text-rose-800/90 dark:text-rose-300/90 mt-1 font-medium">
                وہ تمام ری ایجنٹس جو لیب میں خطرناک حد تک کم ہو چکے ہیں اور فوری خریدنے ہیں
              </p>
            </div>
          </button>

          {/* Action 8: Expiring Reagents */}
          <button
            type="button"
            onClick={() => {
              setActiveFilterPill('expiring');
              onNavigate('inventory');
            }}
            className="group flex items-start gap-4 rounded-2xl border border-orange-200 bg-orange-50/70 p-4 text-left shadow-2xs transition hover:scale-[1.01] hover:bg-orange-100/80 hover:shadow-md dark:border-orange-800/80 dark:bg-orange-950/30 dark:hover:bg-orange-950/50 cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md">
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-orange-950 dark:text-orange-200">
                  ایکسپائر ہونے والی اشیاء
                </h4>
                <span className="rounded-md bg-orange-200/80 px-2 py-0.5 text-[10px] font-bold text-orange-900 dark:bg-orange-900 dark:text-orange-200">
                  {expiringItems.length} Near Expiry
                </span>
              </div>
              <p className="text-xs text-orange-800/90 dark:text-orange-300/90 mt-1 font-medium">
                وہ ری ایجنٹس اور کٹس جو اگلے 30 دنوں میں ضائع ہونے کے قریب ہیں
              </p>
            </div>
          </button>

          {/* Action 9: Daily Huddle Report */}
          <button
            type="button"
            onClick={() => {
              // Trigger daily huddle anchor or navigate
              const el = document.getElementById('easy-daily-huddle');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group flex items-start gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-left shadow-2xs transition hover:scale-[1.01] hover:bg-indigo-100/80 hover:shadow-md dark:border-indigo-800/80 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <FileText className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-200">
                  روزانہ کی ہڈل سمری رپورٹ
                </h4>
                <span className="rounded-md bg-indigo-200/80 px-2 py-0.5 text-[10px] font-bold text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200">
                  Daily Huddle
                </span>
              </div>
              <p className="text-xs text-indigo-800/90 dark:text-indigo-300/90 mt-1 font-medium">
                صبح کی میٹنگ اور فوری حل طلب ضروری کاموں کی فوری رپورٹ دیکھیں
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Instant Easy Stock Search & 1-Click Consumption Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Search className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span>فوری اسٹاک چیک اور ری ایجنٹ استعمال (Instant Reagent Lookup)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              کسی بھی میڈیسن یا ری ایجنٹ کا نام لکھیں اور فوراً موجودہ تعداد معلوم کریں۔
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setActiveFilterPill('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                activeFilterPill === 'all'
                  ? 'bg-white text-teal-700 shadow-2xs dark:bg-slate-900 dark:text-teal-300'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              تمام اسٹاک ({branchInventory.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterPill('low')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                activeFilterPill === 'low'
                  ? 'bg-rose-50 text-rose-700 shadow-2xs dark:bg-rose-950/60 dark:text-rose-300'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              کم اسٹاک ({lowStockItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterPill('expiring')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                activeFilterPill === 'expiring'
                  ? 'bg-amber-50 text-amber-700 shadow-2xs dark:bg-amber-950/60 dark:text-amber-300'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              ایکسپائری ({expiringItems.length})
            </button>
          </div>
        </div>

        {/* Live Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="یہاں ری ایجنٹ کا نام لکھیں جیسے CBC, Glucose, EDTA Tubes, Gloves..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white transition"
          />
        </div>

        {/* Simplified Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider dark:bg-slate-800/80 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">ری ایجنٹ / آئٹم کا نام (Item Name)</th>
                <th className="py-3 px-4">کیٹیگری (Category)</th>
                <th className="py-3 px-4 text-center">موجودہ تعداد (Current Balance)</th>
                <th className="py-3 px-4 text-center">بیچ اور ایکسپائری (Batch & Expiry)</th>
                <th className="py-3 px-4 text-right">فوری کٹوتی (Quick Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
              {filteredEasyItems.slice(0, 8).map((item) => {
                const batch = item.batches?.[0];
                const isLow = item.totalQuantity <= item.reorderPoint;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {item.sku} • {item.locationBin || 'Central Shelf'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span
                        className={`font-black text-sm ${
                          isLow
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.totalQuantity} {item.uom}
                      </span>
                      {isLow && (
                        <span className="block text-[10px] font-bold text-rose-500">
                          (کم اسٹاک!)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px]">
                      <div>{batch?.batchNumber || 'MAIN'}</div>
                      <div
                        className={
                          batch?.expiryDate &&
                          new Date(batch.expiryDate).getTime() - today.getTime() <= 30 * 86400000
                            ? 'text-rose-500 font-bold'
                            : 'text-slate-400'
                        }
                      >
                        {batch?.expiryDate || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {onOpenUsageModal && (
                        <button
                          type="button"
                          onClick={onOpenUsageModal}
                          className="inline-flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-2xs transition cursor-pointer"
                        >
                          <PackageMinus className="h-3.5 w-3.5" />
                          <span>استعمال کریں (Deduct)</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredEasyItems.length > 8 && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 cursor-pointer"
            >
              <span>مکمل انوینٹری لسٹ دیکھیں ({filteredEasyItems.length} آئٹمز)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 5. Daily Huddle Report Component */}
      <div id="easy-daily-huddle">
        <DailyHuddleReport
          onNavigate={onNavigate}
          activeBranchId={activeBranchId}
        />
      </div>

      {/* 6. Switch to Full Pro Mode Banner */}
      {onSwitchToProMode && (
        <div className="rounded-2xl border border-slate-200 bg-slate-100/60 p-4 text-center dark:border-slate-800 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              کیا آپ تمام گراف، برانچ کے تقابلی چارٹس اور فنانشل والیو ایشن دیکھنا چاہتے ہیں؟
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ایگزیکٹو تجزیے اور ہیڈ آفس اکاؤنٹنگ کے لیے فل پرو موڈ میں سوئچ کریں۔
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchToProMode}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer shrink-0"
          >
            <Layers className="h-4 w-4 text-teal-400" />
            <span>Switch to Pro Dashboard</span>
          </button>
        </div>
      )}
    </div>
  );
};
