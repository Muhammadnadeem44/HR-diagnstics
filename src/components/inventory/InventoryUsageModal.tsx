import React, { useState, useMemo } from 'react';
import {
  PackageMinus,
  X,
  Building2,
  Calendar,
  User,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  FileText,
  Search,
  Layers,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Tag,
  Check,
  Sparkles,
  Camera,
} from 'lucide-react';
import { InventoryItem, ItemBatch, Branch, Department, UserAccount, InventoryUsageRecord } from '../../types';
import { StorageService } from '../../services/storage';
import { HR_DIAGNOSTICS_LOGO_DATA_URL } from '../../assets/hrLogo';
import { QRScannerModal } from '../common/QRScannerModal';

interface InventoryUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedItem?: InventoryItem | null;
  preSelectedBatch?: ItemBatch | null;
  activeBranchId: string;
  currentUser: UserAccount | null;
  onUsageRecorded?: (record: InventoryUsageRecord) => void;
}

export const InventoryUsageModal: React.FC<InventoryUsageModalProps> = ({
  isOpen,
  onClose,
  preSelectedItem,
  preSelectedBatch,
  activeBranchId,
  currentUser,
  onUsageRecorded,
}) => {
  const [activeTab, setActiveTab] = useState<'record' | 'history'>('record');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const branches = useMemo(() => StorageService.getBranches(), []);
  const departments = useMemo(() => StorageService.getDepartments(), []);
  const allInventory = useMemo(() => StorageService.getInventory(), [refreshKey, isOpen]);

  // Determine initial branch
  const initialBranchId = useMemo(() => {
    if (preSelectedItem?.branchId) return preSelectedItem.branchId;
    if (currentUser?.branchId && currentUser.branchId !== 'all') return currentUser.branchId;
    if (activeBranchId && activeBranchId !== 'all') return activeBranchId;
    return branches[0]?.id || 'br_headoffice';
  }, [preSelectedItem, currentUser, activeBranchId, branches]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>(initialBranchId);
  const [selectedItemId, setSelectedItemId] = useState<string>(preSelectedItem?.id || '');
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<string>(
    preSelectedBatch?.batchNumber || 'auto_fefo'
  );

  // Sync state whenever modal opens or preSelectedItem changes
  React.useEffect(() => {
    if (isOpen) {
      if (preSelectedItem) {
        setSelectedBranchId(preSelectedItem.branchId);
        setSelectedItemId(preSelectedItem.id);
        setSelectedBatchNumber(preSelectedBatch?.batchNumber || 'auto_fefo');
      } else {
        setSelectedBranchId(initialBranchId);
      }
      setErrorMsg(null);
      setSuccessRecord(null);
      setRefreshKey((k) => k + 1);
    }
  }, [isOpen, preSelectedItem, preSelectedBatch, initialBranchId]);
  const [quantityUsed, setQuantityUsed] = useState<number>(1);
  const [employeeName, setEmployeeName] = useState<string>(currentUser?.name || '');
  const [departmentId, setDepartmentId] = useState<string>(
    preSelectedItem?.departmentId || departments[0]?.id || ''
  );
  const [purpose, setPurpose] = useState<string>('Patient Diagnostic Testing / Clinical Analysis');
  const [referenceNote, setReferenceNote] = useState<string>('');
  const [patientSampleNo, setPatientSampleNo] = useState<string>('');

  // Search filter for items in the selected branch
  const [itemSearchQuery, setItemSearchQuery] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successRecord, setSuccessRecord] = useState<InventoryUsageRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // History filtering
  const [historyBranchFilter, setHistoryBranchFilter] = useState<string>(selectedBranchId);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<InventoryUsageRecord | null>(null);

  // Available items in the currently selected branch
  const branchItems = useMemo(() => {
    return allInventory.filter((item) => item.branchId === selectedBranchId);
  }, [allInventory, selectedBranchId]);

  const filteredBranchItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return branchItems;
    const q = itemSearchQuery.toLowerCase();
    return branchItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [branchItems, itemSearchQuery]);

  // Selected item object
  const activeItem = useMemo(() => {
    return branchItems.find((i) => i.id === selectedItemId) || (preSelectedItem?.branchId === selectedBranchId ? preSelectedItem : null);
  }, [branchItems, selectedItemId, preSelectedItem, selectedBranchId]);

  // Available batches of active item
  const itemBatches = useMemo(() => {
    return activeItem?.batches || [];
  }, [activeItem]);

  // Selected batch object
  const activeBatch = useMemo(() => {
    if (selectedBatchNumber === 'auto_fefo') return null;
    return itemBatches.find((b) => b.batchNumber === selectedBatchNumber) || null;
  }, [itemBatches, selectedBatchNumber]);

  // Calculate maximum allowed quantity
  const maxAvailable = useMemo(() => {
    if (!activeItem) return 0;
    if (activeBatch) {
      return activeBatch.currentQuantity || 0;
    }
    return activeItem.totalQuantity || 0;
  }, [activeItem, activeBatch]);

  // Current stock after deduction preview
  const newStockBalance = useMemo(() => {
    if (!activeItem) return 0;
    return Math.max(0, (activeItem.totalQuantity || 0) - (quantityUsed || 0));
  }, [activeItem, quantityUsed]);

  // Selected branch object
  const currentBranch = useMemo(() => {
    return branches.find((b) => b.id === selectedBranchId);
  }, [branches, selectedBranchId]);

  // Usage records history
  const usageHistory = useMemo(() => {
    return StorageService.getInventoryUsageRecords(historyBranchFilter);
  }, [historyBranchFilter, successRecord]);

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return usageHistory;
    const q = historySearch.toLowerCase();
    return usageHistory.filter(
      (r) =>
        r.itemName.toLowerCase().includes(q) ||
        r.itemSku.toLowerCase().includes(q) ||
        r.usedByEmployeeName.toLowerCase().includes(q) ||
        r.batchNumber.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q)
    );
  }, [usageHistory, historySearch]);

  const handleScanCode = (code: string) => {
    const cleanCode = code.trim().toLowerCase();
    const matched = allInventory.find(
      (i) =>
        i.sku.toLowerCase() === cleanCode ||
        (i.barcode && i.barcode.toLowerCase() === cleanCode) ||
        i.id.toLowerCase() === cleanCode ||
        i.batches.some((b) => b.batchNumber.toLowerCase() === cleanCode)
    );
    if (matched) {
      setSelectedBranchId(matched.branchId);
      setSelectedItemId(matched.id);
      const matchedBatch = matched.batches.find(
        (b) => b.batchNumber.toLowerCase() === cleanCode
      );
      if (matchedBatch) {
        setSelectedBatchNumber(matchedBatch.batchNumber);
      } else {
        setSelectedBatchNumber('auto_fefo');
      }
      setIsScannerOpen(false);
      setErrorMsg(null);
    } else {
      setErrorMsg(`Scanned code "${code}" does not match any diagnostic reagent SKU or batch.`);
      setIsScannerOpen(false);
    }
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    setSelectedItemId('');
    setSelectedBatchNumber('auto_fefo');
    setErrorMsg(null);
    setSuccessRecord(null);
  };

  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    setSelectedBatchNumber('auto_fefo');
    setQuantityUsed(1);
    setErrorMsg(null);
    setSuccessRecord(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessRecord(null);

    if (!selectedItemId) {
      setErrorMsg('Please select an inventory item to deduct from stock.');
      return;
    }
    if (!quantityUsed || quantityUsed <= 0) {
      setErrorMsg('Quantity used must be 1 or higher.');
      return;
    }
    if (quantityUsed > maxAvailable) {
      setErrorMsg(
        `Quantity requested (${quantityUsed}) exceeds available branch stock (${maxAvailable} ${activeItem?.uom}).`
      );
      return;
    }
    if (!employeeName.trim()) {
      setErrorMsg('Please specify the employee / staff member recording this usage.');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedDept = departments.find((d) => d.id === departmentId);
      const res = StorageService.recordInventoryUsage({
        itemId: selectedItemId,
        branchId: selectedBranchId,
        quantityUsed,
        usedByEmployeeName: employeeName.trim(),
        usedByEmployeeId: currentUser?.id,
        usedByUserRole: currentUser?.role,
        departmentId,
        departmentName: selectedDept ? selectedDept.name : 'Clinical Diagnostics',
        batchNumber: selectedBatchNumber,
        purpose,
        referenceNote: referenceNote.trim(),
        patientIdOrSampleNo: patientSampleNo.trim(),
      });

      if (!res.success || !res.record) {
        setErrorMsg(res.error || 'Failed to record usage and deduct stock.');
        setIsSubmitting(false);
        return;
      }

      setSuccessRecord(res.record);
      setRefreshKey((k) => k + 1);
      if (onUsageRecorded) {
        onUsageRecorded(res.record);
      }

      // Reset form quantity
      setQuantityUsed(1);
      setReferenceNote('');
      setPatientSampleNo('');
    } catch (err: any) {
      console.error('Inventory usage deduction failed:', err);
      setErrorMsg(err.message || 'Unexpected error while deducting stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
              <PackageMinus className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Inventory Usage & Stock Deduction
                </h3>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                  REAL-TIME DEDUCTION
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Record material usage by employees and immediately deduct batch quantities branch-by-branch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-200/80 p-1 dark:bg-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('record');
                  setErrorMsg(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'record'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <PackageMinus className="h-3.5 w-3.5 text-amber-500" />
                <span>Record Usage</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('history');
                  setErrorMsg(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'history'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-teal-500" />
                <span>Branch Usage Log</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: RECORD USAGE FORM */}
          {activeTab === 'record' && (
            <div className="space-y-6">
              {/* Success Notification Banner */}
              {successRecord && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/60 animate-in fade-in duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                          Stock Successfully Deducted!
                        </h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                          Deducted <strong>{successRecord.quantityUsed} {successRecord.uom}</strong> of{' '}
                          <strong>{successRecord.itemName}</strong> ({successRecord.itemSku}) from{' '}
                          <strong>{successRecord.branchName}</strong>.
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300 font-mono">
                          <span>Stock Before: <strong>{successRecord.stockBefore}</strong></span>
                          <span>➜</span>
                          <span>Stock After: <strong className="text-emerald-600 dark:text-emerald-400">{successRecord.stockAfter} {successRecord.uom}</strong></span>
                          <span>•</span>
                          <span>Recorded by: {successRecord.usedByEmployeeName}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedVoucherForPrint(successRecord)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 dark:bg-emerald-900 dark:text-emerald-100 transition shadow-xs"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Issue Slip
                    </button>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-300 p-3.5 text-xs text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-6">
                {/* 1. Branch Selector (har branch ka alag alag) */}
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      Select Laboratory Branch (Har Branch Ka Alag Stock)
                    </label>
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                      Stock is strictly isolated & deducted for this branch
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {branches.map((b) => {
                      const isSelected = selectedBranchId === b.id;
                      const branchItemCount = allInventory.filter((i) => i.branchId === b.id).length;
                      return (
                        <div
                          key={b.id}
                          onClick={() => handleBranchChange(b.id)}
                          className={`cursor-pointer rounded-xl border p-3 transition flex flex-col justify-between ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50/70 text-slate-900 dark:border-teal-400 dark:bg-teal-950/40 dark:text-white ring-2 ring-teal-500/20 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-bold leading-tight">{b.name}</span>
                            {isSelected && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                            <span>{b.city}</span>
                            <span className="font-mono font-semibold text-teal-700 dark:text-teal-300">
                              {branchItemCount} Items In Stock
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Item Selector for Current Branch */}
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <FlaskConical className="h-4 w-4 text-amber-500" />
                      Select Item / Diagnostic Reagent to Use
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {branchItems.length} items available at {currentBranch?.name}
                    </span>
                  </div>

                  {/* Search filter for items + Scan QR Button */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        placeholder="Filter items by SKU, reagent name, or category..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900 transition shrink-0 cursor-pointer shadow-xs"
                      title="Scan Box Barcode or 2D QR Code to auto-select item"
                    >
                      <Camera className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                      <span className="hidden sm:inline">Scan Reagent</span>
                    </button>
                  </div>

                  {/* Items Grid / Selector */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200/80 p-2 dark:border-slate-800">
                    {filteredBranchItems.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        No inventory items found matching your filter in {currentBranch?.name}.
                      </div>
                    ) : (
                      filteredBranchItems.map((item) => {
                        const isSelected = selectedItemId === item.id;
                        const isLowStock = item.totalQuantity <= item.minStockLevel;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleItemSelect(item)}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition text-xs ${
                              isSelected
                                ? 'bg-amber-50 border border-amber-300 dark:bg-amber-950/40 dark:border-amber-700'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] dark:bg-slate-800 dark:text-slate-300">
                                {item.sku}
                              </span>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {item.category} • {item.batches?.length || 0} active batch(es)
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-right">
                              <div>
                                <span
                                  className={`font-mono font-bold ${
                                    isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'
                                  }`}
                                >
                                  {item.totalQuantity} {item.uom}
                                </span>
                                <span className="text-[10px] text-slate-400 block">Current Stock</span>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. Selected Item Details & Deduction Setup */}
                {activeItem && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/60 dark:bg-amber-950/20 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3 dark:border-amber-900/60">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                          Selected Item for Deduction:
                        </span>
                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                          {activeItem.name}{' '}
                          <span className="text-xs font-mono font-normal text-slate-500">({activeItem.sku})</span>
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Branch Stock:
                        </span>
                        <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs dark:bg-slate-800 dark:border-slate-700">
                          {activeItem.totalQuantity} {activeItem.uom}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Batch Allocation */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Batch / Lot Allocation
                        </label>
                        <select
                          value={selectedBatchNumber}
                          onChange={(e) => setSelectedBatchNumber(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="auto_fefo">
                            ⚡ Automatic FEFO (Recommended - Earliest Expiry Batch First)
                          </option>
                          {itemBatches.map((b) => (
                            <option key={b.id || b.batchNumber} value={b.batchNumber}>
                              Lot #{b.batchNumber} (Stock: {b.currentQuantity} {activeItem.uom}, Exp: {b.expiryDate})
                            </option>
                          ))}
                        </select>
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          {selectedBatchNumber === 'auto_fefo'
                            ? 'Deducts from oldest active lot to prevent reagent expiry loss.'
                            : `Specifically deducted from Lot #${selectedBatchNumber}.`}
                        </span>
                      </div>

                      {/* Quantity to Deduct with Live Balance Preview */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Quantity to Use ({activeItem.uom})
                          </label>
                          <span className="text-[11px] font-mono text-slate-500">
                            Max: {maxAvailable} {activeItem.uom}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max={maxAvailable}
                            value={quantityUsed}
                            onChange={(e) => setQuantityUsed(Math.max(1, parseInt(e.target.value) || 1))}
                            className="flex-1 rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-mono font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />

                          {/* Quick quantity buttons */}
                          <div className="flex items-center gap-1">
                            {[1, 5, 10].map((step) => (
                              <button
                                key={step}
                                type="button"
                                onClick={() => setQuantityUsed(step)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              >
                                +{step}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Live calculation balance */}
                        <div className="mt-2 flex items-center justify-between rounded-lg bg-white/80 p-2 text-xs border border-slate-200/80 dark:bg-slate-850 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400">Stock Balance After Usage:</span>
                          <span className="font-mono font-black text-amber-700 dark:text-amber-400">
                            {newStockBalance} {activeItem.uom}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Staff Member & Operational Purpose */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Employee / Technician Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={employeeName}
                        onChange={(e) => setEmployeeName(e.target.value)}
                        placeholder="e.g. Asim Raza (Lab Tech)"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Department / Section
                    </label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Usage Purpose / Justification
                    </label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="Patient Diagnostic Testing / Clinical Analysis">
                        Patient Diagnostic Testing (Sample Analysis)
                      </option>
                      <option value="Analyzer Quality Control & Calibration Runs">
                        Analyzer Quality Control (QC & Calibrators)
                      </option>
                      <option value="Sample Collection & Phlebotomy Consumables">
                        Sample Collection & Phlebotomy Consumables
                      </option>
                      <option value="Emergency / STAT Ward Requisition">
                        Emergency / STAT Ward Requisition
                      </option>
                      <option value="Routine Disinfection & PPE Usage">
                        Routine Sanitization, Clean-room & PPE
                      </option>
                      <option value="Damaged / Expired / Quarantine Removal">
                        Quarantine, Spillage or Damaged Removal
                      </option>
                      <option value="Other Clinical Requisition">Other Clinical Requisition</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Clinical Reference / Patient Batch Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={referenceNote}
                      onChange={(e) => setReferenceNote(e.target.value)}
                      placeholder="e.g. Processed 30 blood samples on Sysmex analyzer during morning shift"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sample ID / Test Token (Optional)
                    </label>
                    <input
                      type="text"
                      value={patientSampleNo}
                      onChange={(e) => setPatientSampleNo(e.target.value)}
                      placeholder="e.g. SMP-2026-0914"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-mono text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-500">
                    <span>Stock will immediately deduct from <strong>{currentBranch?.name}</strong> inventory.</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedItemId || quantityUsed <= 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 transition cursor-pointer"
                    >
                      <PackageMinus className="h-4 w-4" />
                      <span>{isSubmitting ? 'Deducting Stock...' : 'Confirm Usage & Deduct Stock'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: BRANCH USAGE HISTORY & AUDIT LOG */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Branch Filter & Search Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Branch:</span>
                  <select
                    value={historyBranchFilter}
                    onChange={(e) => setHistoryBranchFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="all">🏢 Consolidated (All Branches)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search employee, SKU, item..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* History Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Branch & Dept</th>
                      <th className="py-2.5 px-3">Item / SKU</th>
                      <th className="py-2.5 px-3">Batch / Lot</th>
                      <th className="py-2.5 px-3 text-right">Deducted Qty</th>
                      <th className="py-2.5 px-3 text-right">Remaining Stock</th>
                      <th className="py-2.5 px-3">Used By</th>
                      <th className="py-2.5 px-3">Purpose</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                          No inventory usage records logged for this branch yet.
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850 transition">
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {new Date(rec.timestamp).toLocaleDateString()} {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold block">{rec.branchName}</span>
                            <span className="text-[10px] text-teal-600 dark:text-teal-400">{rec.departmentName}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 dark:text-white block">{rec.itemName}</span>
                            <span className="font-mono text-[10px] text-slate-500">{rec.itemSku}</span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] dark:bg-slate-800">
                              {rec.batchNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                              -{rec.quantityUsed} {rec.uom}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                            {rec.stockAfter} {rec.uom}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold block">{rec.usedByEmployeeName}</span>
                            <span className="text-[10px] text-slate-400">{rec.usedByUserRole || 'Staff'}</span>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate" title={rec.purpose + (rec.referenceNote ? ` - ${rec.referenceNote}` : '')}>
                            <span className="block truncate">{rec.purpose}</span>
                            {rec.referenceNote && (
                              <span className="text-[10px] text-slate-400 truncate block">
                                {rec.referenceNote}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedVoucherForPrint(rec)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                              title="Print Material Consumption Slip"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Printable Material Consumption Voucher Overlay */}
        {selectedVoucherForPrint && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 text-slate-900 border border-slate-300 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="flex items-center gap-3 bg-transparent">
                  <div className="bg-transparent flex items-center justify-center" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
                    <img
                      src={HR_DIAGNOSTICS_LOGO_DATA_URL}
                      alt="HR Logo"
                      className="h-10 w-10 shrink-0"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        borderRadius: 0,
                        objectFit: 'contain',
                      }}
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.onerror = null;
                        img.src = '/hr-diagnostics-logo-transparent.png';
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase">HR DIAGNOSTICS</h3>
                    <p className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">
                      Material Requisition & Issue Voucher
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedVoucherForPrint(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Voucher Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl mb-4 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">Voucher ID:</span>
                  <span className="font-mono font-bold">{selectedVoucherForPrint.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Date & Time:</span>
                  <span className="font-semibold">{new Date(selectedVoucherForPrint.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Issuing Branch:</span>
                  <span className="font-bold">{selectedVoucherForPrint.branchName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Section / Dept:</span>
                  <span className="font-semibold">{selectedVoucherForPrint.departmentName}</span>
                </div>
              </div>

              {/* Item Deduction Details */}
              <div className="border border-slate-200 rounded-xl p-3 mb-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Item Name:</span>
                  <span className="font-bold text-right">{selectedVoucherForPrint.itemName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SKU Code:</span>
                  <span className="font-mono font-bold">{selectedVoucherForPrint.itemSku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lot / Batch Number:</span>
                  <span className="font-mono font-bold">{selectedVoucherForPrint.batchNumber}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-700 font-bold">Quantity Consumed:</span>
                  <span className="font-mono font-black text-rose-600 text-sm">
                    {selectedVoucherForPrint.quantityUsed} {selectedVoucherForPrint.uom}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Branch Balance Remaining:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {selectedVoucherForPrint.stockAfter} {selectedVoucherForPrint.uom}
                  </span>
                </div>
              </div>

              {/* Purpose & Signatures */}
              <div className="text-xs space-y-2 mb-6">
                <div>
                  <span className="text-slate-500 block">Usage Purpose:</span>
                  <span className="font-semibold">{selectedVoucherForPrint.purpose}</span>
                </div>
                {selectedVoucherForPrint.referenceNote && (
                  <div>
                    <span className="text-slate-500 block">Notes:</span>
                    <span className="italic text-slate-700">{selectedVoucherForPrint.referenceNote}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-center text-xs">
                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1 font-bold">
                    {selectedVoucherForPrint.usedByEmployeeName}
                  </div>
                  <span className="text-[10px] text-slate-500">Dispensed / Used By</span>
                </div>
                <div>
                  <div className="border-b border-slate-400 pb-1 mb-1 text-slate-400">
                    Authorized Signatory
                  </div>
                  <span className="text-[10px] text-slate-500">Branch Lab In-Charge</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  Print Voucher
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Optical Scanner Modal */}
        {isScannerOpen && (
          <QRScannerModal
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            onScanSuccess={handleScanCode}
          />
        )}
      </div>
    </div>
  );
};
