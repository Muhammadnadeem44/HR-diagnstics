import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  QrCode,
  AlertTriangle,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  ThermometerSnowflake,
  ShieldAlert,
  ShoppingCart,
  BookmarkCheck,
  Paperclip,
  FileText,
  Eye,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Check,
  Upload,
  FileUp,
  FlaskConical,
  PackageMinus,
  X,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { InventoryItem, ItemBatch, Branch, Warehouse, Department, DocumentAttachment } from '../../types';
import { DocumentAttachmentPicker } from '../common/DocumentAttachmentPicker';
import { QRLabelPrintModal } from '../common/QRLabelPrintModal';
import { LabTestConsumptionModal } from './LabTestConsumptionModal';
import { InventoryUsageModal } from './InventoryUsageModal';
import { StockCountSheetModal } from '../audit/StockCountSheetModal';

interface InventoryManagementProps {
  activeBranchId: string;
  currentUser?: any;
  onPrintLabel?: (item: InventoryItem, batch?: ItemBatch) => void;
  onNavigate?: (module: string) => void;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  activeBranchId,
  currentUser,
  onPrintLabel,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemAttachments, setItemAttachments] = useState<DocumentAttachment[]>([]);
  const [viewingItemDocs, setViewingItemDocs] = useState<InventoryItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'summary' | 'batches'>('summary');
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLabConsumptionModalOpen, setIsLabConsumptionModalOpen] = useState(false);
  const [isStockSheetModalOpen, setIsStockSheetModalOpen] = useState(false);
  const [importCSVText, setImportCSVText] = useState('');
  const [parsedImportItems, setParsedImportItems] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedItemForDispense, setSelectedItemForDispense] = useState<InventoryItem | null>(null);
  const [dispenseQty, setDispenseQty] = useState<number>(1);
  const [dispenseReason, setDispenseReason] = useState<string>('Routine Diagnostic Test Run');
  const [dispenseDeptId, setDispenseDeptId] = useState<string>('');

  // Warehouse Printable Label Modal States
  const [labelModalState, setLabelModalState] = useState<{
    isOpen: boolean;
    item?: InventoryItem | null;
    batch?: ItemBatch | null;
    bulkItems?: { item: InventoryItem; batch?: ItemBatch }[] | null;
  }>({ isOpen: false });
  const [viewingBatchesItem, setViewingBatchesItem] = useState<InventoryItem | null>(null);

  // Employee Inventory Usage & Branch-Specific Stock Deduction Modal State
  const [isUsageModalOpen, setIsUsageModalOpen] = useState<boolean>(false);
  const [usageItem, setUsageItem] = useState<InventoryItem | null>(null);
  const [usageBatch, setUsageBatch] = useState<ItemBatch | null>(null);

  const isSuperAdmin = !currentUser || currentUser.role === 'super_admin';
  const effectiveBranchId = isSuperAdmin ? activeBranchId : (currentUser?.branchId || activeBranchId);

  // Granular Action Permissions
  const canAdd = isSuperAdmin || currentUser?.canAddInventory !== false;
  const canEdit = isSuperAdmin || currentUser?.canEditInventory !== false;
  const canDelete = isSuperAdmin || currentUser?.canDeleteInventory !== false;
  const canExport = isSuperAdmin || currentUser?.canViewReports !== false || currentUser?.role === 'branch_manager' || currentUser?.role === 'inventory_manager';

  const allItems = StorageService.getInventory();
  const branches = StorageService.getBranches();
  const warehouses = StorageService.getWarehouses();
  const departments = StorageService.getDepartments();

  // Filter items with branch isolation for branch users
  const items = allItems.filter((item) => {
    const matchesBranch = effectiveBranchId === 'all' || item.branchId === effectiveBranchId;
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batches.some((b) => b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesBranch && matchesCat && matchesSearch;
  });

  // Form State for New / Edit Item
  const [formData, setFormData] = useState<{
    sku: string;
    name: string;
    category: string;
    subCategory: string;
    uom: string;
    costPrice: number;
    minStockLevel: number;
    maxStockLevel: number;
    reorderPoint: number;
    leadTimeDays: number;
    branchId: string;
    warehouseId: string;
    departmentId: string;
    locationBin: string;
    isNarcoticOrControlled: boolean;
    initialBatchNumber: string;
    initialBatchQty: number;
    initialBatchExpiry: string;
    storageCondition: 'Room Temp' | '2-8°C Refrigerated' | '-20°C Frozen' | 'Dark / Light Sensitive';
  }>({
    sku: '',
    name: '',
    category: 'Reagents',
    subCategory: 'Pathology',
    uom: 'Kit',
    costPrice: 5000,
    minStockLevel: 5,
    maxStockLevel: 50,
    reorderPoint: 10,
    leadTimeDays: 7,
    branchId: activeBranchId === 'all' ? branches[0]?.id || 'br_headoffice' : activeBranchId,
    warehouseId: warehouses[0]?.id || 'wh_central',
    departmentId: departments[0]?.id || 'dept_hematology',
    locationBin: 'Rack A-1',
    isNarcoticOrControlled: false,
    initialBatchNumber: '',
    initialBatchQty: 10,
    initialBatchExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    storageCondition: '2-8°C Refrigerated',
  });

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemAttachments([]);
    setFormData({
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      name: '',
      category: 'Reagents',
      subCategory: 'Clinical Pathology',
      uom: 'Kit',
      costPrice: 2500,
      minStockLevel: 5,
      maxStockLevel: 50,
      reorderPoint: 10,
      leadTimeDays: 7,
      branchId: activeBranchId === 'all' ? branches[0]?.id || 'br_headoffice' : activeBranchId,
      warehouseId: warehouses[0]?.id || 'wh_central',
      departmentId: departments[0]?.id || 'dept_hematology',
      locationBin: 'Cold Storage Room',
      isNarcoticOrControlled: false,
      initialBatchNumber: `BAT-${Date.now().toString().slice(-5)}`,
      initialBatchQty: 10,
      initialBatchExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      storageCondition: '2-8°C Refrigerated',
    });
    setIsAddingItem(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemAttachments(item.attachments || []);
    setFormData({
      sku: item.sku,
      name: item.name,
      category: item.category,
      subCategory: item.subCategory || 'Clinical Pathology',
      uom: item.uom,
      costPrice: item.costPrice,
      minStockLevel: item.minStockLevel,
      maxStockLevel: item.maxStockLevel,
      reorderPoint: item.reorderPoint,
      leadTimeDays: item.leadTimeDays,
      branchId: item.branchId,
      warehouseId: item.warehouseId,
      departmentId: item.departmentId || departments[0]?.id || '',
      locationBin: item.locationBin || '',
      isNarcoticOrControlled: !!item.isNarcoticOrControlled,
      initialBatchNumber: item.batches?.[0]?.batchNumber || '',
      initialBatchQty: item.totalQuantity || 0,
      initialBatchExpiry: item.batches?.[0]?.expiryDate || '',
      storageCondition: item.batches?.[0]?.storageCondition || '2-8°C Refrigerated',
    });
    setIsAddingItem(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) {
      alert('Please fill in Item Name and SKU.');
      return;
    }

    if (editingItem) {
      const updated: InventoryItem = {
        ...editingItem,
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        subCategory: formData.subCategory,
        uom: formData.uom,
        costPrice: formData.costPrice,
        minStockLevel: formData.minStockLevel,
        maxStockLevel: formData.maxStockLevel,
        reorderPoint: formData.reorderPoint,
        leadTimeDays: formData.leadTimeDays,
        branchId: formData.branchId,
        warehouseId: formData.warehouseId,
        departmentId: formData.departmentId,
        locationBin: formData.locationBin,
        isNarcoticOrControlled: formData.isNarcoticOrControlled,
        attachments: itemAttachments,
      };
      StorageService.saveInventoryItem(updated);
    } else {
      const initialBatch: ItemBatch = {
        id: `batch_${Date.now()}`,
        batchNumber: formData.initialBatchNumber || `B-${Date.now().toString().slice(-4)}`,
        expiryDate: formData.initialBatchExpiry,
        receivedDate: new Date().toISOString().split('T')[0],
        initialQuantity: formData.initialBatchQty,
        currentQuantity: formData.initialBatchQty,
        unitCost: formData.costPrice,
        storageCondition: formData.storageCondition,
        qrCode: `HR-INV|${formData.sku}|${formData.initialBatchNumber || 'B1'}|${formData.initialBatchExpiry}`,
      };

      const newItem: InventoryItem = {
        id: `item_${Date.now()}`,
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        subCategory: formData.subCategory,
        uom: formData.uom,
        costPrice: formData.costPrice,
        minStockLevel: formData.minStockLevel,
        maxStockLevel: formData.maxStockLevel,
        reorderPoint: formData.reorderPoint,
        leadTimeDays: formData.leadTimeDays,
        batches: formData.initialBatchQty > 0 ? [initialBatch] : [],
        totalQuantity: formData.initialBatchQty,
        reservedQuantity: 0,
        branchId: formData.branchId,
        warehouseId: formData.warehouseId,
        departmentId: formData.departmentId,
        locationBin: formData.locationBin,
        isNarcoticOrControlled: formData.isNarcoticOrControlled,
        attachments: itemAttachments,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      StorageService.saveInventoryItem(newItem);
    }

    setIsAddingItem(false);
    setEditingItem(null);
    setItemAttachments([]);
  };

  const handleDelete = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    if (!canDelete) {
      alert('Action Denied: You do not have permission to delete or write off inventory items. Please contact your Head Office Administrator.');
      return;
    }

    if (isSuperAdmin) {
      if (confirm(`Super Admin: Confirm immediate permanent deletion of SKU "${item.name}" (${item.sku})?`)) {
        StorageService.deleteInventoryItem(id);
      }
    } else {
      const reason = prompt(
        `Head Office Authorization Required:\nBranch Managers cannot delete stock items directly.\n\nPlease enter the justification/reason for requesting write-off/deletion of "${item.name}" (${item.sku}):`,
        'Expired reagent lot or packaging compromised during storage. Verified by branch supervisor.'
      );
      if (!reason) return;

      const branchObj = branches.find((b) => b.id === (item.branchId || currentUser?.branchId));
      StorageService.saveApprovalRequest({
        id: `req_inv_${Date.now()}`,
        type: 'inventory_deletion',
        title: `Stock Write-off / Deletion: ${item.name} (${item.sku})`,
        description: `Branch requested permanent stock write-off. Justification: ${reason}`,
        branchId: item.branchId || currentUser?.branchId || 'br_headoffice',
        branchName: branchObj?.name || 'Local Branch',
        requestedByUserId: currentUser?.id || 'usr_unknown',
        requestedByUserName: currentUser?.name || 'Branch Manager',
        requestedByUserRole: currentUser?.role || 'branch_manager',
        targetEntityId: item.id,
        targetEntityCode: item.sku,
        details: {
          itemName: item.name,
          sku: item.sku,
          category: item.category,
          currentQuantity: `${item.totalQuantity} ${item.uom}`,
          costPricePKR: item.costPrice,
          totalValueLossPKR: (item.totalQuantity || 0) * (item.costPrice || 0),
          reason,
        },
        status: 'Pending',
        requestedAt: new Date().toISOString(),
      });

      alert(
        `✅ Head Office Approval Request Submitted!\n\nYour request to write off / delete "${item.name}" has been logged and sent to Head Office Admin for clearance.`
      );
    }
  };

  // FIFO / FEFO Stock Out Dispense Engine
  const handleDispenseStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForDispense) return;

    if (dispenseQty <= 0) {
      alert('Dispense quantity must be greater than zero.');
      return;
    }

    const available = (selectedItemForDispense.totalQuantity || 0) - (selectedItemForDispense.reservedQuantity || 0);
    if (dispenseQty > available) {
      alert(`Cannot dispense ${dispenseQty} ${selectedItemForDispense.uom}. Only ${available} available (Reserved: ${selectedItemForDispense.reservedQuantity}).`);
      return;
    }

    const sortedBatches = [...selectedItemForDispense.batches].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );

    let remainingToDeduct = dispenseQty;
    for (const b of sortedBatches) {
      if (b.currentQuantity >= remainingToDeduct) {
        b.currentQuantity -= remainingToDeduct;
        remainingToDeduct = 0;
        break;
      } else {
        remainingToDeduct -= b.currentQuantity;
        b.currentQuantity = 0;
      }
    }

    selectedItemForDispense.batches = sortedBatches;
    selectedItemForDispense.totalQuantity = sortedBatches.reduce((s, b) => s + b.currentQuantity, 0);
    StorageService.saveInventoryItem(selectedItemForDispense);
    StorageService.logAction(
      'Inventory',
      `Dispensed (FEFO) ${dispenseQty} ${selectedItemForDispense.uom} of ${selectedItemForDispense.name} for "${dispenseReason}".`
    );

    setSelectedItemForDispense(null);
  };

  // Reserve Stock for Department
  const handleReserveStock = (item: InventoryItem) => {
    const qtyStr = prompt(`Enter quantity to reserve for department booking (Available: ${item.totalQuantity - item.reservedQuantity} ${item.uom}):`, '1');
    if (!qtyStr) return;
    const qty = parseInt(qtyStr, 10);
    if (isNaN(qty) || qty <= 0) return;

    const available = item.totalQuantity - item.reservedQuantity;
    if (qty > available) {
      alert(`Cannot reserve ${qty}. Only ${available} ${item.uom} available.`);
      return;
    }

    item.reservedQuantity += qty;
    StorageService.saveInventoryItem(item);
    StorageService.logAction('Inventory', `Reserved ${qty} ${item.uom} of ${item.name} for department.`);
  };

  const handlePrintItemLabel = (item: InventoryItem, batch?: ItemBatch) => {
    setLabelModalState({
      isOpen: true,
      item,
      batch: batch || item.batches?.[0] || null,
      bulkItems: null,
    });
  };

  // CSV Export Utility for Reporting & Audits
  const exportToCSV = (format: 'summary' | 'batches' = exportFormat, scope: 'current' | 'all' = exportScope) => {
    const targetItems = scope === 'all'
      ? (isSuperAdmin ? allItems : allItems.filter(i => i.branchId === effectiveBranchId))
      : items;

    if (targetItems.length === 0) {
      alert('No inventory items to export.');
      return;
    }

    const branchMap = new Map(branches.map(b => [b.id, b.name]));
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));
    const departmentMap = new Map(departments.map(d => [d.id, d.name]));

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    let csvContent = '';
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'summary') {
      const headers = [
        'SKU', 'Item Name', 'Category', 'Sub-Category', 'UoM', 'Current Stock',
        'Reserved Stock', 'Available Stock', 'Unit Cost Price (PKR)', 'Total Valuation (PKR)',
        'Min Stock Level', 'Reorder Point', 'Max Stock Level', 'Stock Status',
        'Cold Chain / Storage Condition', 'Controlled / Narcotic', 'Branch', 'Warehouse',
        'Department', 'Location Bin', 'Active Batches Count', 'Earliest Expiring Batch',
        'Earliest Expiry Date', 'Days to Expiry', 'Attached Invoices / Bills', 'Barcode', 'Last Updated'
      ];

      const rows = targetItems.map(item => {
        const available = Math.max(0, (item.totalQuantity || 0) - (item.reservedQuantity || 0));
        const totalValuation = (item.totalQuantity || 0) * (item.costPrice || 0);

        let stockStatus = 'Normal';
        if (item.totalQuantity === 0) stockStatus = 'Out of Stock';
        else if (item.totalQuantity <= item.minStockLevel) stockStatus = 'Critical Low';
        else if (item.totalQuantity <= item.reorderPoint) stockStatus = 'Reorder Point';

        const activeBatches = (item.batches || []).filter(b => b.currentQuantity > 0);
        const earliestBatch = [...activeBatches].sort(
          (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        )[0];

        let daysToExpiry = '';
        if (earliestBatch?.expiryDate) {
          const diffDays = Math.ceil((new Date(earliestBatch.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          daysToExpiry = String(diffDays);
        }

        return [
          escapeCSV(item.sku),
          escapeCSV(item.name),
          escapeCSV(item.category),
          escapeCSV(item.subCategory || ''),
          escapeCSV(item.uom),
          escapeCSV(item.totalQuantity || 0),
          escapeCSV(item.reservedQuantity || 0),
          escapeCSV(available),
          escapeCSV(item.costPrice || 0),
          escapeCSV(totalValuation),
          escapeCSV(item.minStockLevel || 0),
          escapeCSV(item.reorderPoint || 0),
          escapeCSV(item.maxStockLevel || 0),
          escapeCSV(stockStatus),
          escapeCSV(item.batches?.[0]?.storageCondition || 'Room Temp'),
          escapeCSV(item.isNarcoticOrControlled ? 'Yes' : 'No'),
          escapeCSV(branchMap.get(item.branchId) || item.branchId),
          escapeCSV(warehouseMap.get(item.warehouseId) || item.warehouseId || ''),
          escapeCSV(departmentMap.get(item.departmentId || '') || ''),
          escapeCSV(item.locationBin || ''),
          escapeCSV(activeBatches.length),
          escapeCSV(earliestBatch ? earliestBatch.batchNumber : ''),
          escapeCSV(earliestBatch ? earliestBatch.expiryDate : ''),
          escapeCSV(daysToExpiry),
          escapeCSV((item.attachments || []).length),
          escapeCSV(item.barcode || ''),
          escapeCSV(item.updatedAt ? item.updatedAt.split('T')[0] : '')
        ].join(',');
      });

      csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    } else {
      const headers = [
        'SKU', 'Item Name', 'Category', 'Batch Number', 'Batch Current Qty',
        'Batch Initial Qty', 'UoM', 'Unit Cost (PKR)', 'Batch Valuation (PKR)',
        'Manufacturing Date', 'Expiry Date', 'Days Remaining', 'Batch Status',
        'Storage Condition', 'Controlled / Narcotic', 'Branch', 'Warehouse', 'Department', 'Location Bin'
      ];

      const rows: string[] = [];
      targetItems.forEach(item => {
        const itemBatches = item.batches && item.batches.length > 0
          ? item.batches
          : [{
              id: 'nobatch',
              batchNumber: 'Default Stock',
              initialQuantity: item.totalQuantity || 0,
              currentQuantity: item.totalQuantity || 0,
              manufacturingDate: '',
              expiryDate: '',
              status: 'Normal'
            }];

        itemBatches.forEach(b => {
          const valuation = (b.currentQuantity || 0) * (item.costPrice || 0);
          let daysRemaining = '';
          let batchStatus = (b.currentQuantity || 0) <= 0 ? 'Depleted' : 'Active';
          if (b.expiryDate) {
            const diffDays = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            daysRemaining = String(diffDays);
            if (diffDays < 0) batchStatus = 'EXPIRED';
            else if (diffDays <= 30) batchStatus = 'CRITICAL EXPIRY (<30d)';
            else if (diffDays <= 90) batchStatus = 'NEAR EXPIRY (<90d)';
          }

          const batchStorage = 'storageCondition' in b ? (b as any).storageCondition : (item.batches?.[0]?.storageCondition || 'Room Temp');

          rows.push([
            escapeCSV(item.sku),
            escapeCSV(item.name),
            escapeCSV(item.category),
            escapeCSV(b.batchNumber),
            escapeCSV(b.currentQuantity || 0),
            escapeCSV(b.initialQuantity || b.currentQuantity || 0),
            escapeCSV(item.uom),
            escapeCSV(item.costPrice || 0),
            escapeCSV(valuation),
            escapeCSV(b.manufacturingDate || ''),
            escapeCSV(b.expiryDate || ''),
            escapeCSV(daysRemaining),
            escapeCSV(batchStatus),
            escapeCSV(batchStorage || 'Room Temp'),
            escapeCSV(item.isNarcoticOrControlled ? 'Yes' : 'No'),
            escapeCSV(branchMap.get(item.branchId) || item.branchId),
            escapeCSV(warehouseMap.get(item.warehouseId) || item.warehouseId || ''),
            escapeCSV(departmentMap.get(item.departmentId || '') || ''),
            escapeCSV(item.locationBin || '')
          ].join(','));
        });
      });

      csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = format === 'summary'
      ? `Inventory_Master_Summary_${dateStr}.csv`
      : `Inventory_Batches_Detailed_${dateStr}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExportModalOpen(false);
    setExportNotice(`Exported ${targetItems.length} items to "${fileName}"`);
    setTimeout(() => setExportNotice(null), 5000);

    StorageService.logAction(
      'Inventory',
      `Exported ${format === 'summary' ? 'inventory master summary' : 'detailed batches'} CSV (${targetItems.length} items, scope: ${scope}).`
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Export Toast Notice */}
      {exportNotice && (
        <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-bold text-teal-900 shadow-xs dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-200">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span>{exportNotice}</span>
          </div>
          <button onClick={() => setExportNotice(null)} className="text-teal-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header & Enterprise Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Inventory & Cold-Chain Management
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Multi-branch FEFO reagent batches, cold chain tracking, department reservations, and real-time consumption.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Employee Usage Deduction Button */}
          <button
            onClick={() => {
              setUsageItem(null);
              setUsageBatch(null);
              setIsUsageModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition active:scale-[0.99] cursor-pointer"
          >
            <PackageMinus className="h-4 w-4" />
            <span>Deduct Stock</span>
          </button>

          {/* Lab Test Consumption Button */}
          <button
            onClick={() => setIsLabConsumptionModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 transition active:scale-[0.99] cursor-pointer"
          >
            <FlaskConical className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Lab Test Auto-Deduct</span>
          </button>

          {/* Bulk QR Print */}
          <button
            onClick={() =>
              setLabelModalState({
                isOpen: true,
                bulkItems: items.map((i) => ({ item: i, batch: i.batches?.[0] })),
              })
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition active:scale-[0.99] cursor-pointer"
          >
            <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Print Labels</span>
          </button>

          {/* Printable Stock Count Audit Sheet */}
          <button
            onClick={() => setIsStockSheetModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition active:scale-[0.99] cursor-pointer"
            title="Print or download physical stock count audit taker sheet"
          >
            <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Stock Audit Sheet</span>
          </button>

          {/* CSV Export Modal Trigger */}
          {canExport && (
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition active:scale-[0.99] cursor-pointer"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}

          {/* Add New Reagent / SKU */}
          {canAdd && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Reagent / SKU</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by SKU, reagent name, batch #, manufacturer..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All Reagent Categories</option>
            <option value="Reagents">Diagnostic Reagents</option>
            <option value="Rapid Test Kits">Rapid Test Kits</option>
            <option value="Radiology Consumables">Radiology & Contrast</option>
            <option value="Narcotics & Controlled">Narcotics & Controlled</option>
            <option value="Pathology Glassware">Pathology Glassware</option>
            <option value="PPE & Safety">PPE & Disinfectants</option>
          </select>

          {canExport && (
            <button
              onClick={() => exportToCSV('summary', 'current')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 transition shrink-0"
              title={`Quick Download: Export current ${items.length} filtered items as CSV`}
            >
              <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="hidden md:inline">Quick CSV ({items.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Inventory Master Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-200">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Item & SKU</th>
                <th className="py-3.5 px-3">Location & Cold Chain</th>
                <th className="py-3.5 px-3">Stock & Reserve</th>
                <th className="py-3.5 px-3">Active Batches (FEFO)</th>
                <th className="py-3.5 px-3">Status / Reorder</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <Boxes className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="text-base font-bold text-slate-700 dark:text-slate-300">No inventory items found</p>
                    <p className="text-sm mt-1">Click "Add Reagent / SKU" above to register clinical inventory.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isLow = item.totalQuantity <= item.reorderPoint;
                  const available = item.totalQuantity - item.reservedQuantity;
                  const branchObj = branches.find((b) => b.id === item.branchId);

                  // Earliest expiring batch
                  const earliestBatch = item.batches
                    .filter((b) => b.currentQuantity > 0)
                    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      {/* Name & SKU */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shrink-0">
                            <Boxes className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{item.name}</span>
                              {item.isNarcoticOrControlled && (
                                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                  Controlled
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              SKU: {item.sku} · {item.category} ({item.uom})
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Unit Cost: PKR {item.costPrice?.toLocaleString()}</p>
                          </div>
                        </div>
                      </td>

                      {/* Location & Cold Chain */}
                      <td className="py-4 px-3">
                        <p className="font-semibold text-slate-900 dark:text-slate-200">
                          {branchObj?.name || 'Central Lab'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Layers className="h-3.5 w-3.5 text-slate-400" />
                          Bin: {item.locationBin || 'General Shelf'}
                        </p>
                        {earliestBatch && (
                          <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                            <ThermometerSnowflake className="h-3.5 w-3.5 text-sky-500" />
                            <span>{earliestBatch.storageCondition}</span>
                          </div>
                        )}
                      </td>

                      {/* Stock & Reserve */}
                      <td className="py-4 px-3">
                        <div>
                          <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                            {item.totalQuantity} {item.uom}
                          </span>
                          {item.reservedQuantity > 0 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                              Reserved: {item.reservedQuantity} ({available} free)
                            </p>
                          )}
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            Min: {item.minStockLevel} · Reorder: {item.reorderPoint}
                          </p>
                        </div>
                      </td>

                      {/* Batches (FEFO) */}
                      <td className="py-4 px-3">
                        {earliestBatch ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200">
                                {earliestBatch.batchNumber}
                              </span>
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                (FEFO #1)
                              </span>
                              <button
                                type="button"
                                onClick={() => handlePrintItemLabel(item, earliestBatch)}
                                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 transition"
                                title="Print PDF label for this batch"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Exp: {earliestBatch.expiryDate} ({earliestBatch.currentQuantity} {item.uom})
                            </p>
                            {item.batches.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setViewingBatchesItem(item)}
                                className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400 block text-left"
                                title="View all batches and print individual labels"
                              >
                                +{item.batches.length - 1} more batch(es) (View / Print)
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No batches</span>
                        )}
                      </td>

                      {/* Status / Reorder Alert */}
                      <td className="py-4 px-3">
                        {isLow ? (
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                              <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
                            </span>
                            <button
                              onClick={() => onNavigate && onNavigate('procurement')}
                              className="block text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                            >
                              + Create PO
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                            Adequate Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Use / Deduct Stock */}
                          <button
                            onClick={() => {
                              setUsageItem(item);
                              setUsageBatch(null);
                              setIsUsageModalOpen(true);
                            }}
                            className="rounded-lg bg-amber-50 p-2 text-amber-700 hover:bg-amber-100 hover:scale-105 dark:bg-amber-950/50 dark:text-amber-300 transition"
                            title="Use / Deduct Stock for this Item"
                          >
                            <PackageMinus className="h-4 w-4" />
                          </button>

                          {/* Dispense Stock (FEFO) */}
                          <button
                            onClick={() => {
                              setSelectedItemForDispense(item);
                              setDispenseQty(1);
                            }}
                            className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 transition"
                            title="Quick Dispense (FEFO Stock-Out)"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </button>

                          {/* Reserve for Department */}
                          <button
                            onClick={() => handleReserveStock(item)}
                            className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                            title="Reserve Stock for Department"
                          >
                            <BookmarkCheck className="h-4 w-4" />
                          </button>

                          {/* Attached Bills / Invoices */}
                          <button
                            onClick={() => setViewingItemDocs(item)}
                            className="relative rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                            title="View / Attach Purchase Invoices & Certificates"
                          >
                            <Paperclip className="h-4 w-4" />
                            {(item.attachments || []).length > 0 && (
                              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                                {item.attachments?.length}
                              </span>
                            )}
                          </button>

                          {/* Print QR Label */}
                          <button
                            onClick={() => handlePrintItemLabel(item, earliestBatch)}
                            className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                            title="Print Barcode / QR Label"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>

                          {/* Edit Item */}
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition"
                              title="Edit Item"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Delete Item */}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition"
                              title={isSuperAdmin ? 'Delete Item' : 'Request Write-off Approval'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingItem ? 'Edit Inventory SKU' : 'Register New Diagnostic Reagent / SKU'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure cold chain storage, reorder thresholds, and initial FEFO batch lot.
                </p>
              </div>
              <button
                onClick={() => setIsAddingItem(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    SKU / Material Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reagent / Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. CBC Lyse Reagent 500ml"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15"
                  >
                    <option value="Reagents">Diagnostic Reagents</option>
                    <option value="Rapid Test Kits">Rapid Test Kits</option>
                    <option value="Radiology Consumables">Radiology & Contrast</option>
                    <option value="Narcotics & Controlled">Narcotics & Controlled</option>
                    <option value="Pathology Glassware">Pathology Glassware</option>
                    <option value="PPE & Safety">PPE & Disinfectants</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Unit of Measure (UoM)
                  </label>
                  <input
                    type="text"
                    value={formData.uom}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    placeholder="Kit, Vial, Box, Pcs"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Unit Cost Price (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Branch Assignment
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Min Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reorder Point
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorderPoint}
                    onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Location / Bin
                  </label>
                  <input
                    type="text"
                    value={formData.locationBin}
                    onChange={(e) => setFormData({ ...formData, locationBin: e.target.value })}
                    placeholder="Rack A-12, Shelf 3"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cold Chain / Storage Condition
                  </label>
                  <select
                    value={formData.storageCondition}
                    onChange={(e) => setFormData({ ...formData, storageCondition: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-3 focus:ring-blue-500/15"
                  >
                    <option value="2-8°C Refrigerated">2-8°C Refrigerated</option>
                    <option value="Room Temp">Room Temp</option>
                    <option value="-20°C Frozen">-20°C Frozen</option>
                    <option value="Dark / Light Sensitive">Dark / Light Sensitive</option>
                  </select>
                </div>
              </div>

              {!editingItem && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Initial Batch #
                    </label>
                    <input
                      type="text"
                      value={formData.initialBatchNumber}
                      onChange={(e) => setFormData({ ...formData, initialBatchNumber: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Initial Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.initialBatchQty}
                      onChange={(e) => setFormData({ ...formData, initialBatchQty: parseInt(e.target.value, 10) || 0 })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Batch Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.initialBatchExpiry}
                      onChange={(e) => setFormData({ ...formData, initialBatchExpiry: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <DocumentAttachmentPicker
                attachments={itemAttachments}
                onChange={setItemAttachments}
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingItem(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition"
                >
                  {editingItem ? 'Save Changes' : 'Register SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick FEFO Dispense Modal */}
      {selectedItemForDispense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              FEFO Stock-Out Dispense: {selectedItemForDispense.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Automatically deducts from earliest expiring batch first. Available: {selectedItemForDispense.totalQuantity - selectedItemForDispense.reservedQuantity} {selectedItemForDispense.uom}.
            </p>
            <form onSubmit={handleDispenseStock} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity to Dispense ({selectedItemForDispense.uom})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={dispenseQty}
                  onChange={(e) => setDispenseQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Bench Protocol
                </label>
                <input
                  type="text"
                  required
                  value={dispenseReason}
                  onChange={(e) => setDispenseReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedItemForDispense(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700"
                >
                  Confirm FEFO Dispense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View All Batches Modal */}
      {viewingBatchesItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                FEFO Batches — {viewingBatchesItem.name}
              </h3>
              <button onClick={() => setViewingBatchesItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
              {viewingBatchesItem.batches.map((b, i) => (
                <div key={b.id || i} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
                  <div>
                    <p className="font-mono font-bold text-slate-900 dark:text-white">{b.batchNumber}</p>
                    <p className="text-[11px] text-slate-500">Exp: {b.expiryDate} • {b.storageCondition}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold">{b.currentQuantity} {viewingBatchesItem.uom}</span>
                    <button
                      onClick={() => handlePrintItemLabel(viewingBatchesItem, b)}
                      className="rounded-lg bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-100"
                    >
                      Print Label
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document Attachments Modal */}
      {viewingItemDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Attached Documents — {viewingItemDocs.name}
              </h3>
              <button onClick={() => setViewingItemDocs(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <DocumentAttachmentPicker
              attachments={viewingItemDocs.attachments || []}
              onChange={(updated) => {
                viewingItemDocs.attachments = updated;
                StorageService.saveInventoryItem(viewingItemDocs);
              }}
            />
          </div>
        </div>
      )}

      {/* Export CSV Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Export Inventory CSV</h3>
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Report Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="summary">Master Inventory Summary</option>
                  <option value="batches">Detailed Batch & FEFO Report</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Scope</label>
                <select
                  value={exportScope}
                  onChange={(e) => setExportScope(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="current">Current Filtered View ({items.length} items)</option>
                  <option value="all">All Branch Inventory ({allItems.length} items)</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => exportToCSV(exportFormat, exportScope)}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700"
              >
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Label Print Modal */}
      <QRLabelPrintModal
        isOpen={labelModalState.isOpen}
        onClose={() => setLabelModalState({ isOpen: false })}
        item={labelModalState.item}
        batch={labelModalState.batch}
        bulkItems={labelModalState.bulkItems}
      />

      {/* Lab Test Consumption Modal */}
      <LabTestConsumptionModal
        isOpen={isLabConsumptionModalOpen}
        onClose={() => setIsLabConsumptionModalOpen(false)}
        activeBranchId={activeBranchId}
        currentUser={currentUser}
      />

      {/* Employee Inventory Usage Modal */}
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
        currentUser={currentUser || StorageService.getCurrentUser()}
      />

      {/* Printable / Downloadable Stock Audit Sheet Modal */}
      <StockCountSheetModal
        isOpen={isStockSheetModalOpen}
        onClose={() => setIsStockSheetModalOpen(false)}
        activeBranchId={activeBranchId}
        currentUser={currentUser}
      />
    </div>
  );
};
