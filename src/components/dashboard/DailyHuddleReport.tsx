import React, { useState, useMemo } from 'react';
import {
  Flame,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Printer,
  ChevronDown,
  ChevronUp,
  FileText,
  Calendar,
  Building2,
  Sparkles,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { InventoryItem, HeadOfficeApprovalRequest, PurchaseOrder } from '../../types';

interface DailyHuddleReportProps {
  onNavigate: (module: string) => void;
  activeBranchId?: string;
}

export const DailyHuddleReport: React.FC<DailyHuddleReportProps> = ({
  onNavigate,
  activeBranchId = 'all',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [filterBranchId, setFilterBranchId] = useState<string>(activeBranchId);
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'expiring' | 'low_stock' | 'approvals'>('all');

  const branches = useMemo(() => StorageService.getBranches(), []);
  const allInventory = StorageService.getInventory();
  const allApprovals = StorageService.getApprovalRequests();
  const allPOs = StorageService.getPurchaseOrders();

  // Filter items by branch if specified
  const filteredInventory = useMemo(() => {
    if (filterBranchId === 'all') return allInventory;
    return allInventory.filter((i) => i.branchId === filterBranchId);
  }, [allInventory, filterBranchId]);

  // Filter approval requests
  const filteredApprovals = useMemo(() => {
    const pending = allApprovals.filter((r) => r.status === 'Pending');
    if (filterBranchId === 'all') return pending;
    return pending.filter((r) => r.branchId === filterBranchId);
  }, [allApprovals, filterBranchId]);

  // Pending PO requisitions
  const filteredPOs = useMemo(() => {
    const pending = allPOs.filter(
      (p) => p.status.toLowerCase().includes('pending') || p.status.toLowerCase().includes('draft')
    );
    if (filterBranchId === 'all') return pending;
    return pending.filter((p) => p.branchId === filterBranchId);
  }, [allPOs, filterBranchId]);

  // Calculate Expiring Items (within next 30 days) with days left
  const expiringItems = useMemo(() => {
    const today = new Date();
    const results: Array<{
      item: InventoryItem;
      batchNumber: string;
      expiryDate: string;
      daysRemaining: number;
      qty: number;
      uom: string;
      branchName: string;
    }> = [];

    filteredInventory.forEach((item) => {
      const branchName = branches.find((b) => b.id === item.branchId)?.name || 'Central Lab';
      item.batches.forEach((b) => {
        if (b.currentQuantity > 0) {
          const expDate = new Date(b.expiryDate);
          const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          if (diffDays <= 30) {
            results.push({
              item,
              batchNumber: b.batchNumber,
              expiryDate: b.expiryDate,
              daysRemaining: diffDays,
              qty: b.currentQuantity,
              uom: item.uom,
              branchName,
            });
          }
        }
      });
    });

    return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [filteredInventory, branches]);

  // Calculate Low Stock Items (at or below reorderPoint)
  const lowStockItems = useMemo(() => {
    const results: Array<{
      item: InventoryItem;
      branchName: string;
    }> = [];

    filteredInventory.forEach((item) => {
      if (item.totalQuantity <= item.reorderPoint) {
        const branchName = branches.find((b) => b.id === item.branchId)?.name || 'Central Lab';
        results.push({ item, branchName });
      }
    });

    return results;
  }, [filteredInventory, branches]);

  const totalActionItems = expiringItems.length + lowStockItems.length + filteredApprovals.length + filteredPOs.length;

  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePrintHuddle = () => {
    window.print();
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Daily Operational Huddle Briefing
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Sparkles className="h-3 w-3" />
                Live Standup
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{todayFormatted}</span>
              <span>·</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {totalActionItems === 0
                  ? 'All clear — Zero critical bottlenecks across facilities'
                  : `${totalActionItems} action item${totalActionItems > 1 ? 's' : ''} require management attention`}
              </span>
            </p>
          </div>
        </div>

        {/* Right side controls: Branch filter, Print, Expand Toggle */}
        <div className="flex items-center gap-2.5">
          {branches.length > 1 && (
            <div className="relative">
              <select
                value={filterBranchId}
                onChange={(e) => setFilterBranchId(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 pr-8 text-xs font-bold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">Consolidated (All Branches)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Building2 className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          )}

          <button
            type="button"
            onClick={handlePrintHuddle}
            title="Print or save PDF of Daily Huddle Report"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition cursor-pointer"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
            title={isExpanded ? 'Collapse Huddle Panel' : 'Expand Huddle Panel'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
        {/* Metric 1: Expiring within 30 days */}
        <div
          onClick={() => {
            setIsExpanded(true);
            setActiveSubTab('expiring');
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
            activeSubTab === 'expiring'
              ? 'border-rose-400 bg-rose-50/70 dark:border-rose-700 dark:bg-rose-950/40'
              : 'border-slate-200 bg-white hover:border-rose-300 dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span>Expiring Soon</span>
            <Clock className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                expiringItems.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {expiringItems.length}
            </span>
            <span className="text-xs text-slate-400">Lots &lt;30d</span>
          </div>
        </div>

        {/* Metric 2: Low Stock Alert */}
        <div
          onClick={() => {
            setIsExpanded(true);
            setActiveSubTab('low_stock');
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
            activeSubTab === 'low_stock'
              ? 'border-amber-400 bg-amber-50/70 dark:border-amber-700 dark:bg-amber-950/40'
              : 'border-slate-200 bg-white hover:border-amber-300 dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span>Critical Low Stock</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                lowStockItems.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {lowStockItems.length}
            </span>
            <span className="text-xs text-slate-400">Below Reorder</span>
          </div>
        </div>

        {/* Metric 3: Pending HO Approvals */}
        <div
          onClick={() => {
            setIsExpanded(true);
            setActiveSubTab('approvals');
          }}
          className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
            activeSubTab === 'approvals'
              ? 'border-blue-400 bg-blue-50/70 dark:border-blue-700 dark:bg-blue-950/40'
              : 'border-slate-200 bg-white hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span>HQ Approvals</span>
            <ShieldAlert className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                filteredApprovals.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {filteredApprovals.length}
            </span>
            <span className="text-xs text-slate-400">Pending Sign-off</span>
          </div>
        </div>

        {/* Metric 4: Pending Requisitions */}
        <div
          onClick={() => onNavigate('procurement')}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 transition shadow-xs"
        >
          <div className="flex items-center justify-between text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span>PO Requisitions</span>
            <FileText className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black ${
                filteredPOs.length > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {filteredPOs.length}
            </span>
            <span className="text-xs text-slate-400">Awaiting PO</span>
          </div>
        </div>
      </div>

      {/* Expanded Detail Sections */}
      {isExpanded && (
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-5">
          {/* Sub-tab selection */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('all')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              All Items ({totalActionItems})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('expiring')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'expiring'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-rose-50 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Expiring Lots ({expiringItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('low_stock')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'low_stock'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-amber-50 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Low Stock Alerts ({lowStockItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('approvals')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'approvals'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-blue-50 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Pending Approvals ({filteredApprovals.length + filteredPOs.length})
            </button>
          </div>

          {/* Section 1: Expiring Items */}
          {(activeSubTab === 'all' || activeSubTab === 'expiring') && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Reagents & Lots Expiring Within 30 Days ({expiringItems.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('compliance')}
                  className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  FEFO Compliance <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {expiringItems.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  ✅ No batches expiring in the next 30 days. All inventory is compliant.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2 max-h-56 overflow-y-auto pr-1">
                  {expiringItems.map((e, idx) => {
                    const isUrgent = e.daysRemaining <= 7;
                    return (
                      <div
                        key={`${e.item.id}_${e.batchNumber}_${idx}`}
                        className="py-3 flex items-center justify-between gap-4 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {e.item.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Batch: <span className="font-mono font-semibold">{e.batchNumber}</span> · {e.branchName} · Expiry: {e.expiryDate}
                          </p>
                        </div>
                        <div className="flex items-center gap-3.5 shrink-0">
                          <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                            {e.qty} {e.uom}
                          </span>
                          <span
                            className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                              isUrgent
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {e.daysRemaining <= 0 ? 'EXPIRED' : `${e.daysRemaining} days left`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Critical Low Stock Alerts */}
          {(activeSubTab === 'all' || activeSubTab === 'low_stock') && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Critical Low Stock / Below Reorder Point ({lowStockItems.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('inventory')}
                  className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Manage Stock <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {lowStockItems.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  ✅ All inventory items are above their minimum reorder thresholds.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2 max-h-56 overflow-y-auto pr-1">
                  {lowStockItems.map((l) => (
                    <div
                      key={l.item.id}
                      className="py-3 flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {l.item.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          SKU: <span className="font-mono">{l.item.sku}</span> · {l.branchName} · Category: {l.item.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                            Current: {l.item.totalQuantity} {l.item.uom}
                          </p>
                          <p className="text-xs text-slate-400">
                            Reorder at: {l.item.reorderPoint} {l.item.uom}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate('procurement')}
                          className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                        >
                          Reorder
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Pending Approvals & Requisitions */}
          {(activeSubTab === 'all' || activeSubTab === 'approvals') && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/90">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Pending Head Office Approvals & POs ({filteredApprovals.length + filteredPOs.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('approvals')}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Review Approvals <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {filteredApprovals.length === 0 && filteredPOs.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  ✅ No pending branch requests or purchase requisitions awaiting approval.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2 max-h-56 overflow-y-auto pr-1">
                  {filteredApprovals.map((req) => (
                    <div
                      key={req.id}
                      className="py-3 flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300 uppercase">
                            {req.type.replace(/_/g, ' ')}
                          </span>
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {req.title}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {req.branchName} · Requested by: {req.requestedByUserName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('approvals')}
                        className="rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3.5 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-300 transition shrink-0 cursor-pointer"
                      >
                        Sign Off
                      </button>
                    </div>
                  ))}

                  {filteredPOs.map((po) => (
                    <div
                      key={po.id}
                      className="py-3 flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                            PO Requisition
                          </span>
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {po.poNumber} — {po.vendorName}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {po.branchName} · Total: Rs. {(po.totalAmount || po.grandTotal || 0).toLocaleString()} · {po.items?.length || 0} items
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('procurement')}
                        className="rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-3.5 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-900 dark:text-indigo-300 transition shrink-0 cursor-pointer"
                      >
                        Review PO
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
