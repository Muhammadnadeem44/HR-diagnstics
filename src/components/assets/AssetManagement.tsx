import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Search,
  Filter,
  Wrench,
  Calendar,
  Clock,
  Printer,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  FileCheck,
  ShieldCheck,
  Activity,
  Layers,
  FileText,
  Paperclip,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { AssetRecord, MaintenanceLog, InventoryItem, Branch, Department, DocumentAttachment } from '../../types';
import { DocumentAttachmentPicker } from '../common/DocumentAttachmentPicker';

interface AssetManagementProps {
  activeBranchId: string;
  currentUser?: any;
  onPrintLabel?: (item: any, batch?: any, asset?: AssetRecord) => void;
}

export const AssetManagement: React.FC<AssetManagementProps> = ({
  activeBranchId,
  currentUser,
  onPrintLabel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [amcFilter, setAmcFilter] = useState<'all' | 'expiring_soon' | 'expired'>('all');
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetRecord | null>(null);
  const [selectedAssetForMaintenance, setSelectedAssetForMaintenance] = useState<AssetRecord | null>(null);
  const [assetAttachments, setAssetAttachments] = useState<DocumentAttachment[]>([]);
  const [viewingAssetDocs, setViewingAssetDocs] = useState<AssetRecord | null>(null);

  const isSuperAdmin = !currentUser || currentUser.role === 'super_admin';
  const effectiveBranchId = isSuperAdmin ? activeBranchId : (currentUser?.branchId || activeBranchId);

  // Granular Action Permissions
  const canAddAsset = isSuperAdmin || currentUser?.canAddAssets !== false;
  const canEditAsset = isSuperAdmin || currentUser?.canEditAssets !== false;
  const canDeleteAsset = isSuperAdmin || currentUser?.canDeleteAssets !== false;

  const allAssets = StorageService.getAssets();
  const branches = StorageService.getBranches();
  const departments = StorageService.getDepartments();
  const inventory = StorageService.getInventory();
  const maintenanceLogs = StorageService.getMaintenanceLogs();

  // AMC / CMC Contract Metrics
  const amcExpiredCount = allAssets.filter(
    (a) =>
      (effectiveBranchId === 'all' || a.branchId === effectiveBranchId) &&
      a.warrantyExpiryDate &&
      new Date(a.warrantyExpiryDate).getTime() < Date.now()
  ).length;

  const amcExpiringSoonCount = allAssets.filter((a) => {
    if (effectiveBranchId !== 'all' && a.branchId !== effectiveBranchId) return false;
    if (!a.warrantyExpiryDate) return false;
    const d = Math.ceil((new Date(a.warrantyExpiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
    return d >= 0 && d <= 60;
  }).length;

  // Filter assets with strict branch isolation for non-super_admins
  const assets = allAssets.filter((a) => {
    const matchesBranch = effectiveBranchId === 'all' || a.branchId === effectiveBranchId;
    const matchesCat = categoryFilter === 'all' || a.category === categoryFilter;
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.brandModel.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAmc =
      amcFilter === 'all' ||
      (amcFilter === 'expired' && a.warrantyExpiryDate && new Date(a.warrantyExpiryDate).getTime() < Date.now()) ||
      (amcFilter === 'expiring_soon' &&
        a.warrantyExpiryDate &&
        (() => {
          const d = Math.ceil((new Date(a.warrantyExpiryDate).getTime() - Date.now()) / (1000 * 3600 * 24));
          return d >= 0 && d <= 60;
        })());

    return matchesBranch && matchesCat && matchesSearch && matchesAmc;
  });

  // Form State for Asset
  const [assetForm, setAssetForm] = useState<{
    assetTag: string;
    name: string;
    category: AssetRecord['category'];
    brandModel: string;
    serialNumber: string;
    branchId: string;
    departmentId: string;
    assignedEmployeeName: string;
    purchaseDate: string;
    purchaseCost: number;
    salvageValue: number;
    usefulLifeYears: number;
    status: AssetRecord['status'];
    warrantyExpiryDate: string;
    warrantyProvider: string;
    maintenanceFrequencyDays: number;
    calibrationDueDate: string;
    calibrationAgency: string;
    calibrationCertificateNumber: string;
  }>({
    assetTag: '',
    name: '',
    category: 'Diagnostic Analyzer',
    brandModel: '',
    serialNumber: '',
    branchId: activeBranchId === 'all' ? branches[0]?.id || 'br_headoffice' : activeBranchId,
    departmentId: departments[0]?.id || 'dept_hematology',
    assignedEmployeeName: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: 1500000,
    salvageValue: 200000,
    usefulLifeYears: 7,
    status: 'Active / Operational',
    warrantyExpiryDate: new Date(Date.now() + 365 * 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    warrantyProvider: 'Original Manufacturer Service',
    maintenanceFrequencyDays: 90,
    calibrationDueDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
    calibrationAgency: 'PNAC / PNRA Medical Metrology',
    calibrationCertificateNumber: '',
  });

  // Maintenance Log Form State
  const [maintForm, setMaintForm] = useState<{
    serviceType: MaintenanceLog['serviceType'];
    serviceProvider: string;
    technicianName: string;
    cost: number;
    downtimeHours: number;
    notes: string;
    checklistPassed: boolean;
    selectedSparePartId: string;
    sparePartQty: number;
  }>({
    serviceType: 'Preventive',
    serviceProvider: 'Vendor Authorized Engineer',
    technicianName: '',
    cost: 15000,
    downtimeHours: 2,
    notes: 'Routine optical sensor check & fluidic line flushing completed successfully.',
    checklistPassed: true,
    selectedSparePartId: '',
    sparePartQty: 1,
  });

  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setAssetAttachments([]);
    setAssetForm({
      assetTag: `ASSET-${Date.now().toString().slice(-4)}`,
      name: '',
      category: 'Diagnostic Analyzer',
      brandModel: '',
      serialNumber: `SN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      branchId: effectiveBranchId === 'all' ? branches[0]?.id || 'br_headoffice' : effectiveBranchId,
      departmentId: departments[0]?.id || 'dept_hematology',
      assignedEmployeeName: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: 2500000,
      salvageValue: 300000,
      usefulLifeYears: 7,
      status: 'Active / Operational',
      warrantyExpiryDate: new Date(Date.now() + 730 * 24 * 3600 * 1000).toISOString().split('T')[0],
      warrantyProvider: 'OEM Service Direct',
      maintenanceFrequencyDays: 90,
      calibrationDueDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
      calibrationAgency: 'PNAC Accredited Lab',
      calibrationCertificateNumber: `CAL-${Date.now().toString().slice(-5)}`,
    });
    setIsAddingAsset(true);
  };

  const handleEditAsset = (asset: AssetRecord) => {
    setEditingAsset(asset);
    setAssetAttachments(asset.attachments || []);
    setAssetForm({
      assetTag: asset.assetTag,
      name: asset.name,
      category: asset.category,
      brandModel: asset.brandModel,
      serialNumber: asset.serialNumber,
      branchId: asset.branchId,
      departmentId: asset.departmentId,
      assignedEmployeeName: asset.assignedEmployeeName || '',
      purchaseDate: asset.purchaseDate,
      purchaseCost: asset.purchaseCost,
      salvageValue: asset.salvageValue,
      usefulLifeYears: asset.usefulLifeYears,
      status: asset.status,
      warrantyExpiryDate: asset.warrantyExpiryDate || '',
      warrantyProvider: asset.warrantyProvider || '',
      maintenanceFrequencyDays: asset.maintenanceFrequencyDays,
      calibrationDueDate: asset.calibrationDueDate || '',
      calibrationAgency: asset.calibrationAgency || '',
      calibrationCertificateNumber: asset.calibrationCertificateNumber || '',
    });
    setIsAddingAsset(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetForm.name || !assetForm.assetTag) {
      alert('Please fill in Asset Name and Asset Tag.');
      return;
    }

    const nextMaint = new Date();
    nextMaint.setDate(nextMaint.getDate() + (assetForm.maintenanceFrequencyDays || 90));

    const newRecord: AssetRecord = {
      id: editingAsset?.id || `asset_${Date.now()}`,
      assetTag: assetForm.assetTag,
      name: assetForm.name,
      category: assetForm.category,
      brandModel: assetForm.brandModel,
      serialNumber: assetForm.serialNumber,
      branchId: assetForm.branchId,
      departmentId: assetForm.departmentId,
      assignedEmployeeName: assetForm.assignedEmployeeName,
      purchaseDate: assetForm.purchaseDate,
      purchaseCost: assetForm.purchaseCost,
      salvageValue: assetForm.salvageValue,
      usefulLifeYears: assetForm.usefulLifeYears,
      currentBookValue: editingAsset?.currentBookValue || assetForm.purchaseCost,
      accumulatedDepreciation: editingAsset?.accumulatedDepreciation || 0,
      status: assetForm.status,
      warrantyExpiryDate: assetForm.warrantyExpiryDate,
      warrantyProvider: assetForm.warrantyProvider,
      lastMaintenanceDate: editingAsset?.lastMaintenanceDate,
      nextMaintenanceDue: editingAsset?.nextMaintenanceDue || nextMaint.toISOString().split('T')[0],
      maintenanceFrequencyDays: assetForm.maintenanceFrequencyDays,
      calibrationDueDate: assetForm.calibrationDueDate,
      calibrationAgency: assetForm.calibrationAgency,
      calibrationCertificateNumber: assetForm.calibrationCertificateNumber,
      totalDowntimeHours: editingAsset?.totalDowntimeHours || 0,
      qrCode: `HR-ASSET|${assetForm.assetTag}|${assetForm.serialNumber}`,
      attachments: assetAttachments,
      documents: editingAsset?.documents || [
        { title: 'Commissioning & Warranty Certificate', date: assetForm.purchaseDate },
      ],
    };

    StorageService.saveAsset(newRecord);
    setIsAddingAsset(false);
    setEditingAsset(null);
    setAssetAttachments([]);
  };

  const handleDeleteAsset = (id: string) => {
    const asset = assets.find((a) => a.id === id);
    if (!asset) return;

    if (isSuperAdmin) {
      if (confirm(`Super Admin: Confirm immediate decommission & deletion of "${asset.name}" (${asset.assetTag})?`)) {
        StorageService.deleteAsset(id);
      }
    } else {
      // Branch Manager / Staff action: Submit Head Office Approval Request
      const reason = prompt(
        `Head Office Authorization Required:\nBranch Managers cannot delete equipment directly.\n\nPlease enter the clinical/operational reason to decommission "${asset.name}" (${asset.assetTag}):`,
        'Irreparable core sensor breakdown verified by biomedical technician. Recommended for write-off disposal.'
      );
      if (!reason) return;

      const branchObj = branches.find((b) => b.id === (asset.branchId || currentUser?.branchId));
      StorageService.saveApprovalRequest({
        id: `req_asset_${Date.now()}`,
        type: 'asset_deletion',
        title: `Asset Decommission: ${asset.name} (${asset.assetTag})`,
        description: `Branch requested equipment decommission & disposal. Justification: ${reason}`,
        branchId: asset.branchId || currentUser?.branchId || 'br_headoffice',
        branchName: branchObj?.name || 'Local Branch',
        requestedByUserId: currentUser?.id || 'usr_unknown',
        requestedByUserName: currentUser?.name || 'Branch Manager',
        requestedByUserRole: currentUser?.role || 'branch_manager',
        targetEntityId: asset.id,
        targetEntityCode: asset.assetTag,
        details: {
          assetName: asset.name,
          category: asset.category,
          brandModel: asset.brandModel,
          purchaseCostPKR: asset.purchaseCost,
          currentBookValuePKR: asset.currentBookValue,
          reason,
        },
        status: 'Pending',
        requestedAt: new Date().toISOString(),
      });

      alert(
        `✅ Head Office Approval Request Submitted!\n\nYour decommission request for "${asset.name}" has been forwarded to Head Office Admin for authorization.`
      );
    }
  };

  const handleSaveMaintenanceLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForMaintenance) return;

    let partsConsumed: { itemId: string; itemName: string; quantity: number }[] = [];
    if (maintForm.selectedSparePartId) {
      const partItem = inventory.find((i) => i.id === maintForm.selectedSparePartId);
      if (partItem) {
        partsConsumed.push({
          itemId: partItem.id,
          itemName: partItem.name,
          quantity: maintForm.sparePartQty,
        });
      }
    }

    const log: MaintenanceLog = {
      id: `maint_${Date.now()}`,
      assetId: selectedAssetForMaintenance.id,
      assetTag: selectedAssetForMaintenance.assetTag,
      assetName: selectedAssetForMaintenance.name,
      serviceDate: new Date().toISOString().split('T')[0],
      serviceType: maintForm.serviceType,
      serviceProvider: maintForm.serviceProvider,
      technicianName: maintForm.technicianName || 'Certified Engineer',
      cost: maintForm.cost,
      downtimeHours: maintForm.downtimeHours,
      notes: maintForm.notes,
      checklistPassed: maintForm.checklistPassed,
      sparePartsConsumed: partsConsumed,
    };

    StorageService.saveMaintenanceLog(log);
    setSelectedAssetForMaintenance(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Asset Management & Biomedical Equipment (CMMS)
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Complete lifecycle asset tracking: Diagnostic analyzers, preventive maintenance, calibration compliance, AMC/CMC warranties, straight-line depreciation, downtime logs, and thermal QR tagging.
          </p>
        </div>
        {canAddAsset && (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Register New Equipment</span>
          </button>
        )}
      </div>

      {/* AMC / CMC Service Contract Intelligence & Expiry Alert Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setAmcFilter('all')}
          className={`cursor-pointer rounded-2xl border p-5 transition shadow-xs ${
            amcFilter === 'all'
              ? 'border-blue-500 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/40 ring-1 ring-blue-500'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Equipment Assets
            </span>
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="font-mono text-3xl font-black text-slate-900 dark:text-white mt-2">
            {allAssets.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Biomedical diagnostic & imaging assets</p>
        </div>

        <div
          onClick={() => setAmcFilter(amcFilter === 'expiring_soon' ? 'all' : 'expiring_soon')}
          className={`cursor-pointer rounded-2xl border p-5 transition shadow-xs ${
            amcFilter === 'expiring_soon'
              ? 'border-amber-500 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/40 ring-1 ring-amber-500'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              AMC / CMC Expiring Soon (&lt;60d)
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <p className="font-mono text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {amcExpiringSoonCount}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            {amcExpiringSoonCount > 0 ? 'Click to filter expiring vendor warranties' : 'All maintenance contracts valid'}
          </p>
        </div>

        <div
          onClick={() => setAmcFilter(amcFilter === 'expired' ? 'all' : 'expired')}
          className={`cursor-pointer rounded-2xl border p-5 transition shadow-xs ${
            amcFilter === 'expired'
              ? 'border-rose-500 bg-rose-50/60 dark:border-rose-700 dark:bg-rose-950/40 ring-1 ring-rose-500'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Expired AMC / Overdue SLA
            </span>
            <Activity className="h-5 w-5 text-rose-500" />
          </div>
          <p className="font-mono text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {amcExpiredCount}
          </p>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
            {amcExpiredCount > 0 ? 'Requires immediate vendor SLA renewal' : 'Zero expired contracts'}
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Asset Tag, Model, Serial Number, or Equipment Name..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="Diagnostic Analyzer">Diagnostic Analyzers</option>
            <option value="Radiology Machine">Radiology Machines (CT/MRI/X-Ray)</option>
            <option value="Cold Storage">Cold Storage & Deep Freezers</option>
            <option value="IT / Computer">IT & PACS Workstations</option>
            <option value="Laboratory Furniture">Lab Cleanroom & Benches</option>
            <option value="Emergency Equipment">Emergency Equipment</option>
          </select>
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            <Cpu className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold text-slate-600 dark:text-slate-300">No equipment assets registered</p>
            <p className="text-xs mt-1">Click "Register New Equipment Asset" to record medical diagnostic machines.</p>
          </div>
        ) : (
          assets.map((asset) => {
            const branchObj = branches.find((b) => b.id === asset.branchId);
            const deptObj = departments.find((d) => d.id === asset.departmentId);

            // Days until next PM
            const today = new Date();
            const pmDue = new Date(asset.nextMaintenanceDue);
            const daysToPM = Math.ceil((pmDue.getTime() - today.getTime()) / (1000 * 3600 * 24));

            return (
              <div
                key={asset.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 hover:border-teal-500 transition"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400">
                        <Cpu className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-mono text-[10px] font-bold text-teal-600 dark:text-teal-400">
                          {asset.assetTag}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
                          {asset.name}
                        </h4>
                      </div>
                    </div>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        asset.status === 'Active / Operational'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : asset.status === 'Calibration Due'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}
                    >
                      {asset.status}
                    </span>
                  </div>

                  {/* Machine Specifications */}
                  <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <p>
                      <strong>Model:</strong> {asset.brandModel}
                    </p>
                    <p className="font-mono text-[11px]">
                      <strong>S/N:</strong> {asset.serialNumber}
                    </p>
                    <p>
                      <strong>Location:</strong> {branchObj?.name || 'Central'} • {deptObj?.name || 'Pathology'}
                    </p>
                  </div>

                  {/* Financial Straight-Line Depreciation */}
                  <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Current Book Value:</span>
                      <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                        PKR {asset.currentBookValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>Orig Cost: PKR {asset.purchaseCost.toLocaleString()}</span>
                      <span>Depr: PKR {asset.accumulatedDepreciation.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* CMMS Maintenance & Calibration Status */}
                  <div className="mt-3 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="h-3 w-3" /> Next PM Due:
                      </span>
                      <span
                        className={`font-semibold ${
                          daysToPM <= 7 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {asset.nextMaintenanceDue} ({daysToPM > 0 ? `in ${daysToPM}d` : 'Overdue'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-500">
                        <FileCheck className="h-3 w-3" /> Calibration Due:
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {asset.calibrationDueDate || 'Compliant'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="h-3 w-3" /> Total Downtime:
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 font-mono">
                        {asset.totalDowntimeHours} hours
                      </span>
                    </div>
                    {asset.warrantyExpiryDate && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1 text-slate-500">
                          <ShieldCheck className="h-3 w-3" /> AMC/SLA Contract:
                        </span>
                        {(() => {
                          const daysLeft = Math.ceil(
                            (new Date(asset.warrantyExpiryDate).getTime() - Date.now()) / (1000 * 3600 * 24)
                          );
                          const isExp = daysLeft < 0;
                          const isWarn = daysLeft >= 0 && daysLeft <= 60;
                          return (
                            <span
                              className={`font-semibold ${
                                isExp
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : isWarn
                                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {asset.warrantyExpiryDate} {isExp ? '(Expired)' : isWarn ? `(${daysLeft}d left)` : '(Active)'}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onPrintLabel && onPrintLabel(null, null, asset)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                      title="Print QR Asset Tag"
                    >
                      <Printer className="h-3.5 w-3.5" /> Tag
                    </button>

                    {asset.attachments && asset.attachments.length > 0 ? (
                      <button
                        onClick={() => setViewingAssetDocs(asset)}
                        className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 transition"
                        title="View Invoices & Attached Documents"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>{asset.attachments.length} Doc{asset.attachments.length !== 1 ? 's' : ''}</span>
                      </button>
                    ) : (
                      canEditAsset && (
                        <button
                          onClick={() => setViewingAssetDocs(asset)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400"
                          title="Attach Equipment Bill or Invoice"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          <span>+ Bill</span>
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {canEditAsset && (
                      <button
                        onClick={() => handleEditAsset(asset)}
                        className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
                        title="Edit Asset Details & Attachments"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedAssetForMaintenance(asset);
                        setMaintForm({
                          serviceType: 'Preventive',
                          serviceProvider: 'Vendor Bio-Medical Engineer',
                          technicianName: '',
                          cost: 12000,
                          downtimeHours: 1,
                          notes: `Periodic PM inspection for ${asset.name}.`,
                          checklistPassed: true,
                          selectedSparePartId: '',
                          sparePartQty: 1,
                        });
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                    >
                      <Wrench className="h-3.5 w-3.5" /> Service
                    </button>

                    {canDeleteAsset && (
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        title={isSuperAdmin ? 'Delete Asset' : 'Request Head Office Decommission'}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Register or Edit Equipment Asset */}
      {isAddingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-8">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {editingAsset ? 'Edit Equipment Asset' : 'Register Clinical Diagnostic Equipment / Machine'}
              </h3>
              <button
                onClick={() => setIsAddingAsset(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Equipment / Machine Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    placeholder="e.g. Roche Cobas c311 Chemistry Analyzer"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Asset Tag ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={assetForm.assetTag}
                    onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
                    placeholder="e.g. ASSET-BIO-009"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Diagnostic Analyzer">Diagnostic Analyzer (Blood / Chemistry)</option>
                    <option value="Radiology Machine">Radiology Machine (CT / MRI / X-Ray / USG)</option>
                    <option value="Cold Storage">Cold Storage (-20°C / 2-8°C Chamber)</option>
                    <option value="IT / Computer">IT & Server Hardware</option>
                    <option value="Laboratory Furniture">Laboratory Cleanroom & Centrifuges</option>
                    <option value="Emergency Equipment">Emergency Equipment & Defibrillators</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Brand & Model
                  </label>
                  <input
                    type="text"
                    value={assetForm.brandModel}
                    onChange={(e) => setAssetForm({ ...assetForm, brandModel: e.target.value })}
                    placeholder="e.g. Roche Diagnostics Cobas c311"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unique Serial Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={assetForm.serialNumber}
                    onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                    placeholder="e.g. SN-RCH-981249"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Assignment
                  </label>
                  <select
                    value={assetForm.branchId}
                    onChange={(e) => setAssetForm({ ...assetForm, branchId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Cost (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={assetForm.purchaseCost}
                    onChange={(e) => setAssetForm({ ...assetForm, purchaseCost: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Useful Life (Years - Straight Line)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={assetForm.usefulLifeYears}
                    onChange={(e) => setAssetForm({ ...assetForm, usefulLifeYears: parseInt(e.target.value) || 7 })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Warranty Expiry Date
                  </label>
                  <input
                    type="date"
                    value={assetForm.warrantyExpiryDate}
                    onChange={(e) => setAssetForm({ ...assetForm, warrantyExpiryDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Next Calibration Due
                  </label>
                  <input
                    type="date"
                    value={assetForm.calibrationDueDate}
                    onChange={(e) => setAssetForm({ ...assetForm, calibrationDueDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              {/* Document & Invoice Attachment Upload Section */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <DocumentAttachmentPicker
                  attachments={assetAttachments}
                  onChange={setAssetAttachments}
                  title="Equipment Purchase Bills, Invoices & Warranties"
                  description="Upload equipment purchase bills, tax invoices, vendor warranty cards, or machine photos (PDF, PNG, JPG)."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingAsset(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  Save Equipment Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Asset Documents & Bills */}
      {viewingAssetDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Bills & Invoices: {viewingAssetDocs.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {viewingAssetDocs.assetTag} • {viewingAssetDocs.brandModel}
                </p>
              </div>
              <button
                onClick={() => setViewingAssetDocs(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <DocumentAttachmentPicker
              attachments={viewingAssetDocs.attachments || []}
              onChange={(newAttachments) => {
                const updated = { ...viewingAssetDocs, attachments: newAttachments };
                StorageService.saveAsset(updated);
                setViewingAssetDocs(updated);
              }}
              title="Verified Records"
              description="Review attached diagnostic machine purchase bills, warranty documents, and metrology calibration certificates."
              readOnly={!isSuperAdmin}
            />

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingAssetDocs(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: CMMS Service & Maintenance Log with Spare Parts Consumption */}
      {selectedAssetForMaintenance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Log Preventive / Breakdown Service</h3>
                <p className="text-xs text-teal-600 font-semibold">{selectedAssetForMaintenance.name} ({selectedAssetForMaintenance.assetTag})</p>
              </div>
              <button
                onClick={() => setSelectedAssetForMaintenance(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMaintenanceLog} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Service Type
                  </label>
                  <select
                    value={maintForm.serviceType}
                    onChange={(e) => setMaintForm({ ...maintForm, serviceType: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Preventive">Preventive Maintenance (PM)</option>
                    <option value="Corrective / Breakdown">Corrective / Breakdown Repair</option>
                    <option value="Calibration">Metrology Calibration</option>
                    <option value="Routine Inspection">Routine Inspection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Downtime (Hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={maintForm.downtimeHours}
                    onChange={(e) => setMaintForm({ ...maintForm, downtimeHours: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service Provider / Engineer Name
                </label>
                <input
                  type="text"
                  required
                  value={maintForm.serviceProvider}
                  onChange={(e) => setMaintForm({ ...maintForm, serviceProvider: e.target.value })}
                  placeholder="e.g. Sysmex Certified Biomedical Engineer"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Spare Parts Linkage - Deducts from inventory! */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 text-xs dark:border-teal-900/40 dark:bg-teal-950/20">
                <label className="block font-bold text-teal-900 dark:text-teal-300 mb-1">
                  Spare Parts Consumed (Auto-deducted from Inventory)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <select
                      value={maintForm.selectedSparePartId}
                      onChange={(e) => setMaintForm({ ...maintForm, selectedSparePartId: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">-- No spare parts consumed --</option>
                      {inventory.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} ({inv.totalQuantity} {inv.uom} available)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={maintForm.sparePartQty}
                      onChange={(e) => setMaintForm({ ...maintForm, sparePartQty: parseInt(e.target.value) || 1 })}
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service Notes / Checklist Summary
                </label>
                <textarea
                  rows={3}
                  value={maintForm.notes}
                  onChange={(e) => setMaintForm({ ...maintForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="checklistPass"
                  checked={maintForm.checklistPassed}
                  onChange={(e) => setMaintForm({ ...maintForm, checklistPassed: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="checklistPass" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Manufacturer Safety & Calibration Checklist Passed
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedAssetForMaintenance(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  Confirm & Complete Service Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
