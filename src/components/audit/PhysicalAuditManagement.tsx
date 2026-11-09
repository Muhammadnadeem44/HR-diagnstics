import React, { useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  ShieldCheck,
  Clock,
  RotateCcw,
  Printer,
  Eye,
  Check,
  FileCheck,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { PhysicalAudit, UserAccount, InventoryItem, Branch } from '../../types';
import { DigitalSignaturePad } from '../common/DigitalSignaturePad';
import { SuperAdminActivityLedger } from '../settings/SuperAdminActivityLedger';
import { StockCountSheetModal } from './StockCountSheetModal';

interface PhysicalAuditManagementProps {
  activeBranchId: string;
  currentUser: UserAccount | null;
}

export const PhysicalAuditManagement: React.FC<PhysicalAuditManagementProps> = ({
  activeBranchId,
  currentUser,
}) => {
  const [currentTab, setCurrentTab] = useState<'physical' | 'super_admin_ledger'>('physical');
  const [isStartingAudit, setIsStartingAudit] = useState(false);
  const [activeAudit, setActiveAudit] = useState<PhysicalAudit | null>(null);
  const [viewingReconcileAudit, setViewingReconcileAudit] = useState<PhysicalAudit | null>(null);
  const [selectedAuditForPrint, setSelectedAuditForPrint] = useState<PhysicalAudit | null>(null);
  const [reconcileSuccessMsg, setReconcileSuccessMsg] = useState<string | null>(null);
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
  const [varianceNotes, setVarianceNotes] = useState<Record<string, string>>({});
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [isStockSheetModalOpen, setIsStockSheetModalOpen] = useState(false);

  const allAudits = StorageService.getAudits();
  const inventory = StorageService.getInventory();
  const branches = StorageService.getBranches();

  // Filter audits
  const audits = allAudits.filter((a) => activeBranchId === 'all' || a.branchId === activeBranchId);

  const handleStartNewAudit = (type: PhysicalAudit['type']) => {
    const branchId = activeBranchId === 'all' ? branches[0]?.id || 'br_headoffice' : activeBranchId;
    const branchObj = branches.find((b) => b.id === branchId);

    // Items belonging to this branch
    const branchItems = inventory.filter((i) => i.branchId === branchId);
    if (branchItems.length === 0) {
      alert('No inventory items found in this branch to audit.');
      return;
    }

    const auditItems = branchItems.map((item) => {
      // Current system count
      const sysQty = item.totalQuantity || 0;
      return {
        itemId: item.id,
        itemName: item.name,
        systemQuantity: sysQty,
        physicalQuantity: sysQty, // Default match initially
        variance: 0,
        varianceValuePKR: 0,
        notes: '',
      };
    });

    const newAudit: PhysicalAudit = {
      id: `audit_${Date.now()}`,
      auditNumber: `AUD-${Date.now().toString().slice(-5)}`,
      branchId,
      branchName: branchObj?.name || 'Central Lab',
      conductedByUserId: currentUser?.id || 'admin',
      conductedByUserName: currentUser?.name || 'Super Admin',
      auditDate: new Date().toISOString().split('T')[0],
      type,
      status: 'In Progress',
      items: auditItems,
      totalVarianceValuePKR: 0,
    };

    StorageService.saveAudit(newAudit);
    setActiveAudit(newAudit);
    setIsStartingAudit(false);

    // Initial state map
    const initialCounts: Record<string, number> = {};
    const initialNotes: Record<string, string> = {};
    auditItems.forEach((it) => {
      initialCounts[it.itemId] = it.physicalQuantity;
      initialNotes[it.itemId] = '';
    });
    setPhysicalCounts(initialCounts);
    setVarianceNotes(initialNotes);
  };

  const handleSaveAuditCounts = (submitForApproval: boolean) => {
    if (!activeAudit) return;

    let totalVarianceVal = 0;
    const updatedItems = activeAudit.items.map((item: any) => {
      const invItem = inventory.find((i) => i.id === item.itemId);
      const phys = physicalCounts[item.itemId] ?? item.systemQuantity;
      const diff = phys - item.systemQuantity;
      const unitCost = invItem?.costPrice || 0;
      const valPKR = Math.abs(diff) * unitCost;

      if (diff !== 0) {
        totalVarianceVal += valPKR;
      }

      return {
        ...item,
        physicalQuantity: phys,
        variance: diff,
        varianceValuePKR: diff * unitCost,
        notes: varianceNotes[item.itemId] || '',
      };
    });

    activeAudit.items = updatedItems;
    activeAudit.totalVarianceValuePKR = totalVarianceVal;
    activeAudit.status = submitForApproval ? 'Pending Approval' : 'In Progress';

    StorageService.saveAudit(activeAudit);

    if (submitForApproval) {
      setActiveAudit(null);
    } else {
      alert('Draft audit physical counts saved successfully.');
    }
  };

  // Super Admin Approval & Inventory Adjustment Execution
  const handleOpenSuperAdminApproval = (audit: PhysicalAudit) => {
    setActiveAudit(audit);
    setIsSignatureOpen(true);
  };

  const handleApplySignatureAndAutoAdjust = (signatureDataUrl: string) => {
    if (!activeAudit) return;

    activeAudit.status = 'Approved & Adjusted';
    activeAudit.approvedByUserId = currentUser?.id || 'admin';
    activeAudit.approvedByUserName = currentUser?.name || 'Super Admin';
    activeAudit.approvalSignatureUrl = signatureDataUrl;

    // Apply auto-adjustment to inventory
    activeAudit.items.forEach((auditItem: any) => {
      const invItem = inventory.find((i) => i.id === auditItem.itemId);
      if (invItem && (auditItem.variance || 0) !== 0) {
        invItem.totalQuantity = auditItem.physicalQuantity;
        // Adjust batch proportionally
        if (invItem.batches.length > 0) {
          invItem.batches[0].currentQuantity = Math.max(0, invItem.batches[0].currentQuantity + (auditItem.variance || 0));
        }
        StorageService.saveInventoryItem(invItem);
      }
    });

    StorageService.saveAudit(activeAudit);
    StorageService.logAction(
      'Audits',
      `Super Admin approved & executed stock adjustments for Audit #${activeAudit.auditNumber} (Net Variance: PKR ${(activeAudit.totalVarianceValuePKR || activeAudit.totalVarianceValue || 0).toLocaleString()}).`
    );

    setReconcileSuccessMsg(
      `Stock Reconciliation & Ledger Adjustment Executed! All inventory batch quantities updated to match physical counts for Audit #${activeAudit.auditNumber}.`
    );
    setTimeout(() => setReconcileSuccessMsg(null), 7000);

    setActiveAudit(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Reconcile Success Banner */}
      {reconcileSuccessMsg && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{reconcileSuccessMsg}</span>
          </div>
          <button
            onClick={() => setReconcileSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-Module Navigation Tabs */}
      <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/80 max-w-full overflow-x-auto">
        <button
          onClick={() => setCurrentTab('physical')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition flex items-center gap-2 shrink-0 ${
            currentTab === 'physical'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          <span>Physical Audits & Stock Verification</span>
        </button>
        <button
          onClick={() => setCurrentTab('super_admin_ledger')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition flex items-center gap-2 shrink-0 ${
            currentTab === 'super_admin_ledger'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-blue-500" />
          <span>Super Admin Immutable Activity Log</span>
          <span className="rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 text-xs font-bold">
            WORM
          </span>
        </button>
      </div>

      {currentTab === 'super_admin_ledger' ? (
        <SuperAdminActivityLedger embeddedInAudits />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Physical Audit & Stock Verification
              </h1>
              <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
                Verify actual shelf stock vs system inventory, flag shrinkage, and execute auto-adjustments with Super Admin digital signature.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsStockSheetModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition active:scale-[0.99] cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Stock Count Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setIsStartingAudit(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Start New Audit</span>
              </button>
            </div>
          </div>

      {/* Active In-Progress Audit Sheet */}
      {activeAudit && activeAudit.status === 'In Progress' && (
        <div className="rounded-2xl border-2 border-teal-500 bg-white p-5 shadow-lg dark:border-teal-600 dark:bg-slate-900 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-teal-600 dark:text-teal-400">
                  {activeAudit.auditNumber}
                </span>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  ACTIVE COUNT SESSION ({activeAudit.type})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Branch: <strong>{activeAudit.branchName}</strong> • Auditor:{' '}
                <strong>{activeAudit.conductedByUserName}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveAuditCounts(false)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Save Draft Counts
              </button>
              <button
                onClick={() => handleSaveAuditCounts(true)}
                className="rounded-xl bg-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
              >
                Submit for Super Admin Approval
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 dark:bg-slate-950">
                <tr>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">System Stock</th>
                  <th className="py-2.5 px-3">Actual Count (Physical)</th>
                  <th className="py-2.5 px-3">Variance</th>
                  <th className="py-2.5 px-3">Discrepancy Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeAudit.items.map((item: any) => {
                  const phys = physicalCounts[item.itemId] ?? item.systemQuantity;
                  const diff = phys - item.systemQuantity;

                  return (
                    <tr key={item.itemId}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {item.itemName}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">{item.systemQuantity}</td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          min="0"
                          value={phys}
                          onChange={(e) =>
                            setPhysicalCounts({
                              ...physicalCounts,
                              [item.itemId]: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-20 rounded border border-slate-200 bg-slate-50 py-1 px-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-mono font-bold ${
                            diff < 0
                              ? 'text-red-600 dark:text-red-400'
                              : diff > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          placeholder="e.g. Expired vial discarded without log"
                          value={varianceNotes[item.itemId] || ''}
                          onChange={(e) =>
                            setVarianceNotes({
                              ...varianceNotes,
                              [item.itemId]: e.target.value,
                            })
                          }
                          className="w-full rounded border border-slate-200 bg-slate-50 py-1 px-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historical Audit Sessions List */}
      <div className="space-y-4">
        {audits.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold text-slate-600 dark:text-slate-300">No physical audits performed yet</p>
            <p className="text-xs mt-1">Start a cycle count or full annual audit to verify inventory accuracy.</p>
          </div>
        ) : (
          audits.map((aud) => {
            const isApproved = aud.status === 'Approved & Adjusted';
            const isPending = aud.status === 'Pending Approval';

            return (
              <div
                key={aud.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                        {aud.auditNumber}
                      </span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
                        {aud.type}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">({aud.branchName})</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Date: {aud.auditDate} • Conducted By: <strong>{aud.conductedByUserName}</strong>
                      {aud.approvedByUserName && ` • Approved By: ${aud.approvedByUserName}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : isPending
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {aud.status}
                    </span>

                    {/* View Reconciliation Ledger */}
                    <button
                      onClick={() => setViewingReconcileAudit(aud)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition"
                      title="View Discrepancy & Reconciliation Details"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-400" />
                      <span>Reconcile Details</span>
                    </button>

                    {/* Print Audit Certificate */}
                    <button
                      onClick={() => setSelectedAuditForPrint(aud)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition"
                      title="Print Official Audit Certificate & Discrepancy Sheet"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-400" />
                      <span>Print Report</span>
                    </button>

                    {/* Super Admin Approval Trigger with Signature */}
                    {isPending && (
                      <button
                        onClick={() => handleOpenSuperAdminApproval(aud)}
                        className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Sign & Auto-Adjust Stock
                      </button>
                    )}
                  </div>
                </div>

                {/* Variance Summary */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">SKUs Audited</span>
                    <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {aud.items.length} items
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Variances Detected</span>
                    <p className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                      {aud.items.filter((i: any) => (i.variance || i.varianceQuantity || 0) !== 0).length} items
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950 col-span-2">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Net Financial Variance</span>
                    <p className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400">
                      PKR {(aud.totalVarianceValuePKR ?? aud.totalVarianceValue ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Signature preview if approved */}
                {aud.approvalSignatureUrl && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-50/50 p-2.5 text-xs text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200 border border-emerald-100 dark:border-emerald-900/40">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Authorized by {aud.approvedByUserName} via Digital Cryptographic Signature</span>
                    <img
                      src={aud.approvalSignatureUrl}
                      alt="Signature"
                      className="h-6 w-auto ml-auto filter dark:invert"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Start New Audit */}
      {isStartingAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Select Audit Type</h3>
            <p className="text-xs text-slate-500">
              Choose the methodology for physical shelf inventory verification:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleStartNewAudit('Cycle Count (Monthly)')}
                className="w-full text-left rounded-xl border border-slate-200 p-3 hover:border-teal-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Monthly Cycle Count</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  High-value reagents & narcotics verified without interrupting operations.
                </p>
              </button>

              <button
                onClick={() => handleStartNewAudit('Annual Full Audit')}
                className="w-full text-left rounded-xl border border-slate-200 p-3 hover:border-teal-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Annual Full Stock Count</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Complete physical verification of all cold chain reagents, glassware, and PPE.
                </p>
              </button>

              <button
                onClick={() => handleStartNewAudit('Random Spot Check')}
                className="w-full text-left rounded-xl border border-slate-200 p-3 hover:border-teal-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Surprise Spot Check</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Internal audit inspection of random shelves and narcotics register.
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsStartingAudit(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Reconciliation Details & Variance Ledger */}
      {viewingReconcileAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Stock Reconciliation Ledger • {viewingReconcileAudit.auditNumber}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Branch: {viewingReconcileAudit.branchName} • Type: {viewingReconcileAudit.type} • Status: {viewingReconcileAudit.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingReconcileAudit(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Reconciliation KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Items Audited</span>
                <p className="font-bold font-mono text-sm text-slate-900 dark:text-white mt-0.5">
                  {viewingReconcileAudit.items.length} SKUs
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
                <span className="text-[10px] uppercase font-bold text-slate-400">Surplus (Excess)</span>
                <p className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {viewingReconcileAudit.items.filter((i: any) => (i.variance || 0) > 0).length} items
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
                <span className="text-[10px] uppercase font-bold text-slate-400">Shortage (Shrinkage)</span>
                <p className="font-bold font-mono text-sm text-rose-600 dark:text-rose-400 mt-0.5">
                  {viewingReconcileAudit.items.filter((i: any) => (i.variance || 0) < 0).length} items
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
                <span className="text-[10px] uppercase font-bold text-slate-400">Net Variance Value</span>
                <p className="font-bold font-mono text-sm text-teal-600 dark:text-teal-400 mt-0.5">
                  PKR {(viewingReconcileAudit.totalVarianceValuePKR ?? viewingReconcileAudit.totalVarianceValue ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Items Discrepancy Table */}
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold uppercase text-[9px] text-slate-500 dark:bg-slate-950 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3 text-center">System Qty</th>
                    <th className="py-2.5 px-3 text-center">Physical Count</th>
                    <th className="py-2.5 px-3 text-center">Variance</th>
                    <th className="py-2.5 px-3 text-right">Impact (PKR)</th>
                    <th className="py-2.5 px-3">Audit / Reason Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingReconcileAudit.items.map((item: any, idx: number) => {
                    const diff = item.variance ?? (item.physicalQuantity - item.systemQuantity);
                    const isShort = diff < 0;
                    const isSurplus = diff > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          {item.itemName}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-500">
                          {item.systemQuantity}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {item.physicalQuantity}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          {diff === 0 ? (
                            <span className="text-slate-400">0 (Matched)</span>
                          ) : isShort ? (
                            <span className="text-rose-600 dark:text-rose-400">{diff}</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">+{diff}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold">
                          PKR {Math.abs(item.varianceValuePKR || item.varianceValue || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-400">
                          {item.notes || (diff === 0 ? 'Verified on shelf' : 'Discrepancy logged')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Reconciliation Execution Status */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-600" />
                <span className="text-slate-600 dark:text-slate-400">
                  Ledger State:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {viewingReconcileAudit.status === 'Approved & Adjusted'
                      ? 'Stock Auto-Adjusted & Reconciled with Ledger'
                      : 'Pending Approval & Ledger Adjustment'}
                  </strong>
                </span>
              </div>
              {viewingReconcileAudit.status === 'Pending Approval' && (
                <button
                  type="button"
                  onClick={() => {
                    const aud = viewingReconcileAudit;
                    setViewingReconcileAudit(null);
                    handleOpenSuperAdminApproval(aud);
                  }}
                  className="rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700"
                >
                  Sign & Auto-Adjust Stock
                </button>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingReconcileAudit(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Printable Official Audit Certificate & Report */}
      {selectedAuditForPrint && (() => {
        const audBranch = branches.find(b => b.id === selectedAuditForPrint.branchId) || branches[0];
        const totalItemsCount = selectedAuditForPrint.items.length;
        const totalVariances = selectedAuditForPrint.items.filter((i: any) => (i.variance || 0) !== 0).length;
        const totalNetVariance = selectedAuditForPrint.totalVarianceValuePKR ?? selectedAuditForPrint.totalVarianceValue ?? 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
            <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-4 print:my-0 print:ring-0 print:shadow-none print:max-w-none print:rounded-none">
              {/* Modal Toolbar (hidden during print) */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-950 print:hidden">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Physical Stock Audit Certificate • {selectedAuditForPrint.auditNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Certificate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAuditForPrint(null)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Printable Document Sheet */}
              <div className="p-8 sm:p-10 space-y-6 text-slate-800 dark:text-slate-200 print:text-black print:p-8 print:space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-slate-900 pb-5 print:pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-lg">
                        HR
                      </div>
                      <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                          HR Diagnostics (Pvt) Ltd
                        </h1>
                        <p className="text-[11px] font-semibold text-slate-500 print:text-slate-700">
                          Internal Quality Audit & Physical Inventory Verification Report
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 print:text-slate-700">
                      Standard Operating Procedure: SOP-INV-AUD-04 • ISO 15189 / CAP Accreditation
                    </p>
                  </div>

                  <div className="text-right sm:text-right w-full sm:w-auto">
                    <span className="inline-block rounded-lg bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-800 border border-teal-200 print:border-black print:text-black">
                      AUDIT CERTIFICATE
                    </span>
                    <p className="font-mono text-base font-black text-slate-900 dark:text-white mt-1.5 print:text-black">
                      {selectedAuditForPrint.auditNumber}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 print:text-slate-700">
                      Audit Date: <strong className="text-slate-800 print:text-black">{selectedAuditForPrint.auditDate}</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      Status: <strong className="text-teal-700 print:text-black">{selectedAuditForPrint.status}</strong>
                    </p>
                  </div>
                </div>

                {/* Audit Scope & Branch Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60 print:bg-white print:border-slate-400 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Location / Branch</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5 print:text-black">
                      {selectedAuditForPrint.branchName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Audit Methodology</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5 print:text-black">
                      {selectedAuditForPrint.type}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Lead Auditor</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5 print:text-black">
                      {selectedAuditForPrint.conductedByUserName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Net Variance</span>
                    <p className="font-bold text-teal-700 dark:text-teal-300 mt-0.5 print:text-black">
                      PKR {totalNetVariance.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Items & Variances Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 print:border-black">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600 dark:bg-slate-950 dark:text-slate-400 print:bg-slate-200 print:text-black border-b border-slate-200 print:border-black">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Reagent / Consumable</th>
                        <th className="py-2.5 px-3 text-center">System Qty</th>
                        <th className="py-2.5 px-3 text-center">Physical Qty</th>
                        <th className="py-2.5 px-3 text-center">Variance</th>
                        <th className="py-2.5 px-3 text-right">Variance (PKR)</th>
                        <th className="py-2.5 px-3">Finding / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                      {selectedAuditForPrint.items.map((it: any, idx: number) => {
                        const diff = it.variance ?? (it.physicalQuantity - it.systemQuantity);
                        return (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white print:text-black">
                              {it.itemName}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono">{it.systemQuantity}</td>
                            <td className="py-2.5 px-3 text-center font-bold font-mono">{it.physicalQuantity}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {diff === 0 ? '0' : diff > 0 ? `+${diff}` : `${diff}`}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold">
                              PKR {Math.abs(it.varianceValuePKR || it.varianceValue || 0).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-500 print:text-black">
                              {it.notes || (diff === 0 ? 'Stock verified on shelf' : 'Discrepancy noted')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Sign-Off Blocks */}
                <div className="border-t-2 border-slate-200 pt-4 print:border-black">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 print:text-black">
                    Audit Verification & Reconciled Ledger Sign-Offs:
                  </p>
                  <div className="grid grid-cols-2 gap-6 text-center text-xs">
                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-28">
                      <p className="text-[10px] font-bold uppercase text-slate-500 print:text-black">
                        Physical Stock Count Verified By:
                      </p>
                      <div className="my-auto font-serif italic text-xs text-teal-700 font-bold print:text-black">
                        [ Physically Counted & Barcode Verified ]
                      </div>
                      <div>
                        <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200 print:text-black">
                          {selectedAuditForPrint.conductedByUserName}
                        </p>
                        <p className="text-[9px] text-slate-400 print:text-slate-600">Internal Audit Inspector</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-28">
                      <p className="text-[10px] font-bold uppercase text-slate-500 print:text-black">
                        Approved & Ledger Adjusted By:
                      </p>
                      <div className="my-auto">
                        {selectedAuditForPrint.approvalSignatureUrl ? (
                          <img
                            src={selectedAuditForPrint.approvalSignatureUrl}
                            alt="Signature"
                            className="h-9 mx-auto object-contain filter dark:invert print:invert-0"
                          />
                        ) : (
                          <span className="font-serif italic text-xs text-teal-700 font-bold print:text-black">
                            {selectedAuditForPrint.status === 'Approved & Adjusted'
                              ? '[ Digitally Approved & Reconciled ]'
                              : '[ Pending Super Admin Sign ]'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200 print:text-black">
                          {selectedAuditForPrint.approvedByUserName || 'Super Admin'}
                        </p>
                        <p className="text-[9px] text-slate-400 print:text-slate-600">Super Admin / Laboratory Director</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-[9px] text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800 print:text-slate-600">
                  <p>HR Diagnostics Official Audit Record • Generated by Laboratory ERP • Ref #{selectedAuditForPrint.auditNumber}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Digital Signature Pad Modal */}
      <DigitalSignaturePad
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        onSave={handleApplySignatureAndAutoAdjust}
        signerName={currentUser?.name || 'Super Admin'}
        signerRole={currentUser?.role || 'super_admin'}
        purpose="Super Admin Approval & Inventory Reconciliation"
      />

      {/* Printable / Downloadable Physical Stock Count Sheet Modal */}
      <StockCountSheetModal
        isOpen={isStockSheetModalOpen}
        onClose={() => setIsStockSheetModalOpen(false)}
        activeBranchId={activeBranchId}
        currentUser={currentUser}
      />
        </>
      )}
    </div>
  );
};
