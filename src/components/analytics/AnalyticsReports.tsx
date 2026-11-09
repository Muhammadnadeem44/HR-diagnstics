import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  AlertTriangle,
  PieChart,
  DollarSign,
  Layers,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { InventoryItem, AssetRecord } from '../../types';

interface AnalyticsReportsProps {
  activeBranchId: string;
}

export const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({ activeBranchId }) => {
  const allInventory = StorageService.getInventory();
  const allAssets = StorageService.getAssets();

  const inventory = allInventory.filter(
    (i) => activeBranchId === 'all' || i.branchId === activeBranchId
  );
  const assets = allAssets.filter(
    (a) => activeBranchId === 'all' || a.branchId === activeBranchId
  );

  // Total valuation
  const totalStockValuation = inventory.reduce(
    (sum, item) => sum + (item.totalQuantity || 0) * (item.costPrice || 0),
    0
  );

  // ABC Analysis Calculation
  // Sort items descending by total value (Qty * Cost)
  const sortedByVal = [...inventory].sort(
    (a, b) => b.totalQuantity * b.costPrice - a.totalQuantity * a.costPrice
  );

  let cumulativeVal = 0;
  const abcItems = sortedByVal.map((item) => {
    const itemVal = item.totalQuantity * item.costPrice;
    cumulativeVal += itemVal;
    const cumulativePercent = totalStockValuation > 0 ? (cumulativeVal / totalStockValuation) * 100 : 0;

    let tier: 'A' | 'B' | 'C' = 'C';
    if (cumulativePercent <= 70) {
      tier = 'A'; // High value (top 70% value)
    } else if (cumulativePercent <= 90) {
      tier = 'B'; // Moderate value (next 20% value)
    } else {
      tier = 'C'; // Low value (bottom 10% value)
    }

    return {
      ...item,
      valuation: itemVal,
      cumulativePercent: cumulativePercent.toFixed(1),
      abcTier: tier,
    };
  });

  const aItems = abcItems.filter((i) => i.abcTier === 'A');
  const bItems = abcItems.filter((i) => i.abcTier === 'B');
  const cItems = abcItems.filter((i) => i.abcTier === 'C');

  // Expiry risk analysis (Next 30, 60, 90 days)
  const today = new Date();
  let expiryVal30 = 0;
  let expiryVal60 = 0;
  let expiryVal90 = 0;

  inventory.forEach((item) => {
    item.batches.forEach((b) => {
      const diffDays = Math.ceil(
        (new Date(b.expiryDate).getTime() - today.getTime()) / (1000 * 3600 * 24)
      );
      const batchVal = b.currentQuantity * (item.costPrice || 0);

      if (diffDays <= 30 && b.currentQuantity > 0) {
        expiryVal30 += batchVal;
      } else if (diffDays <= 60 && b.currentQuantity > 0) {
        expiryVal60 += batchVal;
      } else if (diffDays <= 90 && b.currentQuantity > 0) {
        expiryVal90 += batchVal;
      }
    });
  });

  // Cost per test model (Interactive Calculator)
  const [testReagentCost, setTestReagentCost] = useState(120);
  const [testConsumableCost, setTestConsumableCost] = useState(35);
  const [testMachineDepr, setTestMachineDepr] = useState(25);
  const [monthlyTestVolume, setMonthlyTestVolume] = useState(500);

  const unitCostPerTest = testReagentCost + testConsumableCost + testMachineDepr;
  const totalMonthlyRunCost = unitCostPerTest * monthlyTestVolume;

  // CSV Export Engine
  const handleExportCSV = () => {
    const rows = [
      ['SKU', 'Item Name', 'Category', 'Quantity', 'Unit Cost PKR', 'Valuation PKR', 'ABC Tier'],
      ...abcItems.map((it) => [
        it.sku,
        `"${it.name.replace(/"/g, '""')}"`,
        it.category,
        it.totalQuantity,
        it.costPrice,
        it.valuation,
        it.abcTier,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HR_Diagnostics_ABC_Valuation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Analytics, ABC Classification & Valuation
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Automated Pareto ABC categorization, expiry financial risk forecasts, and cost-per-test unit economics.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Export ABC Report (CSV)</span>
        </button>
      </div>

      {/* ABC Pareto Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tier A */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 dark:border-rose-900/40 dark:bg-rose-950/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-black text-white">
              TIER A (HIGH VALUE)
            </span>
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300">~70% Capital</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {aItems.length} SKUs
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Valuation:{' '}
            <strong className="text-slate-900 dark:text-white">
              PKR {aItems.reduce((s, i) => s + i.valuation, 0).toLocaleString()}
            </strong>
          </p>
          <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
            Strict inventory control: daily/weekly cycle counts and mandatory FEFO.
          </p>
        </div>

        {/* Tier B */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 dark:border-amber-900/40 dark:bg-amber-950/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-black text-white">
              TIER B (MODERATE)
            </span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">~20% Capital</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {bItems.length} SKUs
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Valuation:{' '}
            <strong className="text-slate-900 dark:text-white">
              PKR {bItems.reduce((s, i) => s + i.valuation, 0).toLocaleString()}
            </strong>
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            Standard monitoring: bi-weekly reorder review with automated buffer levels.
          </p>
        </div>

        {/* Tier C */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-black text-white">
              TIER C (BULK/LOW VALUE)
            </span>
            <span className="text-xs font-bold text-blue-700 dark:text-blue-300">~10% Capital</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {cItems.length} SKUs
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Valuation:{' '}
            <strong className="text-slate-900 dark:text-white">
              PKR {cItems.reduce((s, i) => s + i.valuation, 0).toLocaleString()}
            </strong>
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
            Consumables & glassware: bulk periodic ordering with relaxed audits.
          </p>
        </div>
      </div>

      {/* Two Column Layout: Expiry Risk & Interactive Cost Per Test Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiry Risk Horizon */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Reagent Expiry Capital Risk Horizon
              </h3>
            </div>
            <span className="text-xs text-slate-400">Auto FEFO Alerting</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-red-50 p-3 text-xs dark:bg-red-950/30 border border-red-100 dark:border-red-900/40">
              <div>
                <span className="font-bold text-red-900 dark:text-red-200">Expiring in ≤ 30 Days</span>
                <p className="text-[11px] text-slate-500">Urgent FEFO transfer or priority use needed</p>
              </div>
              <span className="font-mono text-base font-black text-red-700 dark:text-red-300">
                PKR {expiryVal30.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3 text-xs dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
              <div>
                <span className="font-bold text-amber-900 dark:text-amber-200">Expiring in 31–60 Days</span>
                <p className="text-[11px] text-slate-500">Scheduled re-distribution between diagnostic hubs</p>
              </div>
              <span className="font-mono text-base font-black text-amber-700 dark:text-amber-300">
                PKR {expiryVal60.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">Expiring in 61–90 Days</span>
                <p className="text-[11px] text-slate-500">Healthy buffer for routine pathology test runs</p>
              </div>
              <span className="font-mono text-base font-black text-slate-800 dark:text-slate-200">
                PKR {expiryVal90.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Cost Per Test Analyzer */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cost-Per-Test Unit Economics Engine
              </h3>
            </div>
            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              Dynamic Model
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Reagent Cost per Test (PKR)
              </label>
              <input
                type="number"
                min="0"
                value={testReagentCost}
                onChange={(e) => setTestReagentCost(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Consumable (Cuvette/Tips) (PKR)
              </label>
              <input
                type="number"
                min="0"
                value={testConsumableCost}
                onChange={(e) => setTestConsumableCost(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Machine Depreciation / Test (PKR)
              </label>
              <input
                type="number"
                min="0"
                value={testMachineDepr}
                onChange={(e) => setTestMachineDepr(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Estimated Monthly Volume (Tests)
              </label>
              <input
                type="number"
                min="1"
                value={monthlyTestVolume}
                onChange={(e) => setMonthlyTestVolume(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-xl bg-teal-50/80 p-3.5 text-xs dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/50">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-900 dark:text-teal-200">Calculated Direct Unit Cost:</span>
              <span className="font-mono text-base font-black text-teal-800 dark:text-teal-200">
                PKR {unitCostPerTest} / test
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-teal-700 dark:text-teal-300">
              <span>Total Monthly Reagent & Depr Budget:</span>
              <span className="font-mono font-bold">PKR {totalMonthlyRunCost.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
