import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  Building2,
  DollarSign,
  UserCheck,
  ShieldCheck,
  RotateCcw,
  Receipt,
  CreditCard,
  Scale,
  Check,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { PurchaseOrder, GoodsReceiptNote, UserAccount, Vendor, InventoryItem, DocumentAttachment, VendorInvoiceRecord } from '../../types';
import { DigitalSignaturePad } from '../common/DigitalSignaturePad';
import { DocumentAttachmentPicker } from '../common/DocumentAttachmentPicker';
import { PurchaseOrderPrintModal } from './PurchaseOrderPrintModal';

interface ProcurementManagementProps {
  activeBranchId: string;
  currentUser: UserAccount | null;
}

export const ProcurementManagement: React.FC<ProcurementManagementProps> = ({
  activeBranchId,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'grns' | 'invoices_3way'>('pos');
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [selectedPOForApproval, setSelectedPOForApproval] = useState<PurchaseOrder | null>(null);
  const [signaturePurpose, setSignaturePurpose] = useState('');
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [selectedPOForGRN, setSelectedPOForGRN] = useState<PurchaseOrder | null>(null);
  const [selectedPOForPrint, setSelectedPOForPrint] = useState<PurchaseOrder | null>(null);
  const [grnAttachments, setGrnAttachments] = useState<DocumentAttachment[]>([]);
  const [viewingGRNDocs, setViewingGRNDocs] = useState<GoodsReceiptNote | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<VendorInvoiceRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Wire Transfer');
  const [paymentRefNumber, setPaymentRefNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<VendorInvoiceRecord | null>(null);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState<string | null>(null);

  const isSuperAdmin = !currentUser || currentUser.role === 'super_admin';
  const effectiveBranchId = isSuperAdmin ? activeBranchId : (currentUser?.branchId || activeBranchId);

  // Granular Procurement Permissions
  const canAddPO = isSuperAdmin || currentUser?.canAddPO !== false;
  const canApprovePO = isSuperAdmin || currentUser?.canApprovePO !== false;

  const allPOs = StorageService.getPurchaseOrders();
  const allGRNs = StorageService.getGRNs();
  const allInvoices = StorageService.getVendorInvoices();
  const vendors = StorageService.getVendors();
  const branches = StorageService.getBranches();
  const inventory = StorageService.getInventory();

  // Filter POs with strict branch isolation for non-super_admins
  const pos = allPOs.filter((p) => effectiveBranchId === 'all' || p.branchId === effectiveBranchId);
  const grns = allGRNs.filter((g) => effectiveBranchId === 'all' || g.branchId === effectiveBranchId);
  const invoices = allInvoices.filter((inv) => effectiveBranchId === 'all' || inv.branchId === effectiveBranchId);

  // PO Creation Form State
  const [poVendorId, setPoVendorId] = useState(vendors[0]?.id || 'v_roche');
  const [poBranchId, setPoBranchId] = useState(effectiveBranchId === 'all' ? branches[0]?.id || 'br_headoffice' : effectiveBranchId);
  const [poNotes, setPoNotes] = useState('Standard monthly diagnostic reagents supply.');
  const [poItems, setPoItems] = useState<{
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    uom: string;
  }[]>([]);

  // GRN Form State
  const [grnInvoiceNumber, setGrnInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-5)}`);
  const [grnDeliveryChallan, setGrnDeliveryChallan] = useState(`DC-${Date.now().toString().slice(-4)}`);
  const [grnReceivedQty, setGrnReceivedQty] = useState<Record<string, number>>({});
  const [grnRejectedQty, setGrnRejectedQty] = useState<Record<string, number>>({});
  const [grnBatchNumbers, setGrnBatchNumbers] = useState<Record<string, string>>({});
  const [grnExpiryDates, setGrnExpiryDates] = useState<Record<string, string>>({});
  const [grnNotes, setGrnNotes] = useState('Packaging intact. Cold chain temperature 3.5°C verified upon opening.');

  // Prepopulate low stock items for instant auto-PO
  const handleAutoGeneratePO = () => {
    const lowItems = inventory.filter((i) => i.totalQuantity <= i.reorderPoint);
    if (lowItems.length === 0) {
      alert('All inventory items are currently above their reorder points!');
      return;
    }

    const autoItems = lowItems.map((item) => ({
      itemId: item.id,
      itemName: item.name,
      quantity: Math.max(1, (item.maxStockLevel || 20) - item.totalQuantity),
      unitPrice: item.costPrice || 2500,
      uom: item.uom,
    }));

    setPoItems(autoItems);
    setIsCreatingPO(true);
  };

  const handleAddItemToPO = (itemId: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    setPoItems([
      ...poItems,
      {
        itemId: item.id,
        itemName: item.name,
        quantity: 10,
        unitPrice: item.costPrice || 2500,
        uom: item.uom,
      },
    ]);
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      alert('Please add at least one line item to the PO.');
      return;
    }

    const vendor = vendors.find((v) => v.id === poVendorId);
    const branch = branches.find((b) => b.id === poBranchId);
    const total = poItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const newPO: PurchaseOrder = {
      id: `po_${Date.now()}`,
      poNumber: `PO-${Date.now().toString().slice(-5)}`,
      branchId: poBranchId,
      branchName: branch?.name || 'Head Office Central Lab',
      vendorId: poVendorId,
      vendorName: vendor?.name || 'Roche Diagnostics Pakistan',
      status: 'Doctor Pending', // Multi-level starts at Doctor
      items: poItems.map((pi) => ({
        itemId: pi.itemId,
        sku: `SKU-${pi.itemId.slice(-4)}`,
        itemName: pi.itemName,
        quantityOrdered: pi.quantity,
        orderedQty: pi.quantity,
        quantityReceived: 0,
        receivedQty: 0,
        unitPrice: pi.unitPrice,
        totalPrice: pi.quantity * pi.unitPrice,
        totalAmount: pi.quantity * pi.unitPrice,
        uom: pi.uom,
      })),
      totalAmount: total,
      grandTotal: total,
      subtotal: total,
      taxRatePercent: 0,
      taxAmount: 0,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      notes: poNotes,
      approvals: [
        {
          role: 'pathologist_doctor',
          userName: 'Consultant Pathologist',
          status: 'Pending',
        },
        {
          role: 'branch_manager',
          userName: 'Branch General Manager',
          status: 'Pending',
        },
        {
          role: 'super_admin',
          userName: 'Chief Executive / Super Admin',
          status: 'Pending',
        },
      ],
    };

    StorageService.savePurchaseOrder(newPO);
    StorageService.logAction(
      'Procurement',
      `Created Purchase Order ${newPO.poNumber} (${newPO.items.length} items, total PKR ${total.toLocaleString()}) for ${newPO.branchName}.`
    );

    if (!isSuperAdmin) {
      const vendorObj = vendors.find((v) => v.id === poVendorId);
      StorageService.saveApprovalRequest({
        id: `req_po_${Date.now()}`,
        type: 'po_approval',
        title: `Store Indent / PO Approval (${newPO.poNumber})`,
        description: `Branch stock replenishment requisition for ${newPO.items.length} items from ${vendorObj?.name || 'Authorized Vendor'}. Total: PKR ${total.toLocaleString()}`,
        branchId: newPO.branchId,
        branchName: newPO.branchName,
        requestedByUserId: currentUser?.id || 'usr_unknown',
        requestedByUserName: currentUser?.name || 'Branch Staff',
        requestedByUserRole: currentUser?.role || 'branch_manager',
        targetEntityId: newPO.id,
        targetEntityCode: newPO.poNumber,
        details: {
          poNumber: newPO.poNumber,
          vendor: vendorObj?.name,
          itemsCount: newPO.items.length,
          totalAmountPKR: total,
          itemSummary: newPO.items.map((i) => `${i.itemName} (Qty: ${i.quantityOrdered || i.orderedQty})`),
          notes: poNotes,
        },
        status: 'Pending',
        requestedAt: new Date().toISOString(),
      });

      alert(
        `✅ Stock Requisition Submitted!\n\nPurchase Order ${newPO.poNumber} has been submitted for Head Office verification & authorization.`
      );
    }

    setIsCreatingPO(false);
    setPoItems([]);
  };

  // Multi-Level Approval with Digital Signature
  const handleOpenApproval = (po: PurchaseOrder) => {
    setSelectedPOForApproval(po);
    const role = currentUser?.role || 'super_admin';
    let purpose = '';

    if (po.status === 'Doctor Pending') {
      purpose = `Clinical Justification Sign-off for PO #${po.poNumber}`;
    } else if (po.status === 'Branch Manager Pending') {
      purpose = `Branch Budget Allocation Sign-off for PO #${po.poNumber}`;
    } else {
      purpose = `Super Admin Final Financial Authorization for PO #${po.poNumber}`;
    }

    setSignaturePurpose(purpose);
    setIsSignatureOpen(true);
  };

  const handleApplySignature = (sigUrl: string) => {
    if (!selectedPOForApproval) return;

    const po = { ...selectedPOForApproval };
    const now = new Date().toISOString();
    const userRole = currentUser?.role || 'super_admin';
    const userName = currentUser?.name || 'Super Admin';

    if (po.approvals) {
      if (po.status === 'Doctor Pending') {
        po.status = 'Branch Manager Pending';
        if (po.approvals[0]) {
          po.approvals[0].status = 'Approved';
          po.approvals[0].approvedAt = now;
          po.approvals[0].timestamp = now;
          po.approvals[0].signatureUrl = sigUrl;
          po.approvals[0].userName = userName;
        }
      } else if (po.status === 'Branch Manager Pending') {
        po.status = 'Super Admin Pending';
        if (po.approvals[1]) {
          po.approvals[1].status = 'Approved';
          po.approvals[1].approvedAt = now;
          po.approvals[1].timestamp = now;
          po.approvals[1].signatureUrl = sigUrl;
          po.approvals[1].userName = userName;
        }
      } else if (po.status === 'Super Admin Pending') {
        po.status = 'Approved';
        if (po.approvals[2]) {
          po.approvals[2].status = 'Approved';
          po.approvals[2].approvedAt = now;
          po.approvals[2].timestamp = now;
          po.approvals[2].signatureUrl = sigUrl;
          po.approvals[2].userName = userName;
        }
      }
    }

    StorageService.savePurchaseOrder(po);
    setSelectedPOForApproval(null);
  };

  // GRN Receiving Form Modal Trigger
  const handleOpenGRNModal = (po: PurchaseOrder) => {
    setSelectedPOForGRN(po);
    setGrnAttachments([]);
    const initialRecv: Record<string, number> = {};
    const initialRej: Record<string, number> = {};
    const initialBatches: Record<string, string> = {};
    const initialExpiry: Record<string, string> = {};

    po.items.forEach((item) => {
      initialRecv[item.itemId] = item.quantityOrdered ?? item.orderedQty ?? 0;
      initialRej[item.itemId] = 0;
      initialBatches[item.itemId] = `BAT-${Date.now().toString().slice(-4)}`;
      initialExpiry[item.itemId] = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0];
    });

    setGrnReceivedQty(initialRecv);
    setGrnRejectedQty(initialRej);
    setGrnBatchNumbers(initialBatches);
    setGrnExpiryDates(initialExpiry);
  };

  const handleSaveGRN = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOForGRN) return;

    let allReceived = true;
    const grnItems = selectedPOForGRN.items.map((it) => {
      const recv = grnReceivedQty[it.itemId] || 0;
      const rej = grnRejectedQty[it.itemId] || 0;
      const batchNo = grnBatchNumbers[it.itemId] || 'B1';
      const expDate = grnExpiryDates[it.itemId] || new Date().toISOString().split('T')[0];
      const orderedCount = it.quantityOrdered ?? it.orderedQty ?? 0;

      if (recv + rej < orderedCount) {
        allReceived = false;
      }

      return {
        itemId: it.itemId,
        itemName: it.itemName,
        quantityOrdered: orderedCount,
        orderedQty: orderedCount,
        receivedQty: recv,
        acceptedQty: recv,
        quantityReceived: recv,
        rejectedQty: rej,
        quantityRejected: rej,
        rejectionReason: rej > 0 ? 'Temperature excursion or packaging damaged' : undefined,
        batchNumber: batchNo,
        expiryDate: expDate,
        unitPrice: it.unitPrice,
        uom: it.uom,
      };
    });

    const newGRN: GoodsReceiptNote = {
      id: `grn_${Date.now()}`,
      grnNumber: `GRN-${Date.now().toString().slice(-5)}`,
      poId: selectedPOForGRN.id,
      poNumber: selectedPOForGRN.poNumber,
      vendorId: selectedPOForGRN.vendorId,
      vendorName: selectedPOForGRN.vendorName,
      branchId: selectedPOForGRN.branchId,
      branchName: selectedPOForGRN.branchName,
      invoiceNumber: grnInvoiceNumber,
      deliveryChallanNumber: grnDeliveryChallan,
      receivedDate: new Date().toISOString().split('T')[0],
      receivedByUserId: currentUser?.id || 'admin',
      receivedByUserName: currentUser?.name || 'Super Admin',
      status: allReceived ? 'Verified & Completed' : 'Partial Delivery',
      notes: grnNotes,
      attachments: grnAttachments,
      items: grnItems,
    };

    StorageService.saveGRN(newGRN);
    StorageService.logAction(
      'Procurement',
      `Posted GRN ${newGRN.grnNumber} against PO ${newGRN.poNumber} (${newGRN.items.length} items, status: ${newGRN.status}) at ${newGRN.branchName}. Attached docs: ${grnAttachments.length}.`
    );
    setSelectedPOForGRN(null);
    setGrnAttachments([]);
    setActiveTab('grns');
  };

  const handleExecutePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;

    const updated = { ...selectedInvoiceForPayment };
    const newPaidAmount = (updated.paidAmount || 0) + Number(paymentAmount || 0);
    updated.paidAmount = newPaidAmount;
    updated.paymentStatus = newPaidAmount >= updated.invoiceBilledAmount ? 'Paid & Released' : 'Partially Paid';
    updated.paymentMethod = paymentMethod;
    updated.paymentReference = paymentRefNumber || `REF-${Date.now().toString().slice(-6)}`;
    updated.paymentDate = new Date().toISOString().split('T')[0];
    updated.approvedBy = currentUser?.name || 'Super Admin';
    updated.approvedAt = new Date().toLocaleString();
    if (paymentNotes) {
      updated.notes = (updated.notes ? updated.notes + ' | ' : '') + paymentNotes;
    }

    StorageService.saveVendorInvoice(updated);
    setPaymentSuccessNotice(
      `Payment of PKR ${Number(paymentAmount).toLocaleString()} recorded & released for Invoice #${updated.invoiceNumber} (${updated.vendorName})!`
    );
    setTimeout(() => setPaymentSuccessNotice(null), 6000);
    setSelectedInvoiceForPayment(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Payment Success Alert */}
      {paymentSuccessNotice && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{paymentSuccessNotice}</span>
          </div>
          <button
            onClick={() => setPaymentSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Procurement & Vendor Orders
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Doctor → Branch Manager → Super Admin authorization with digital signatures & 3-way GRN matching.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {canAddPO && (
            <>
              <button
                onClick={handleAutoGeneratePO}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 transition active:scale-[0.99] cursor-pointer"
                title="Auto populate PO with items below reorder point"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Auto-Generate PO (Low Stock)</span>
              </button>
              <button
                onClick={() => setIsCreatingPO(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Purchase Order</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Segmented Tab Controls */}
      <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/80 max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition ${
            activeTab === 'pos'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Purchase Orders ({pos.length})
        </button>
        <button
          onClick={() => setActiveTab('grns')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition ${
            activeTab === 'grns'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Goods Receipt Notes ({grns.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices_3way')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === 'invoices_3way'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>3-Way Invoices ({invoices.length})</span>
        </button>
      </div>

      {/* View: Purchase Orders */}
      {activeTab === 'pos' && (
        <div className="space-y-4">
          {pos.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              <ShoppingCart className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">No purchase orders created yet</p>
              <p className="text-sm mt-1">Use "Auto-Generate PO" or "Create Purchase Order" to begin.</p>
            </div>
          ) : (
            pos.map((po) => {
              const isApproved = po.status === 'Approved';
              const isReceived = po.status === 'Received';
              const canApprove =
                canApprovePO &&
                (po.status === 'Doctor Pending' ||
                  po.status === 'Branch Manager Pending' ||
                  po.status === 'Super Admin Pending');

              return (
                <div
                  key={po.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                          {po.poNumber}
                        </span>
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">({po.vendorName})</span>
                        <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {po.branchName}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Created: {new Date(po.createdAt || po.orderDate || Date.now()).toLocaleDateString()} · Total: PKR{' '}
                        {(po.totalAmount || po.grandTotal || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`rounded-lg px-3 py-1 text-xs font-bold ${
                          isApproved || isReceived
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                        }`}
                      >
                        {po.status}
                      </span>

                      {canApprove && (
                        <button
                          onClick={() => handleOpenApproval(po)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>Review & Sign ({po.status.replace(' Pending', '')})</span>
                        </button>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => handleOpenGRNModal(po)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition"
                        >
                          <FileCheck2 className="h-4 w-4" />
                          <span>Receive GRN</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedPOForPrint(po)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                        title="Print Official Purchase Order (PDF/Challan)"
                      >
                        <Printer className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span>Print PO</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-Level Approval Stepper with Signatures */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(po.approvals || []).map((appr, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl p-3 text-xs border ${
                          appr.status === 'Approved'
                            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                            : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                            {idx + 1}. {appr.role.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`rounded px-1 text-[9px] font-bold ${
                              appr.status === 'Approved'
                                ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {appr.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{appr.userName}</p>

                        {/* Digital Signature rendering */}
                        {appr.signatureUrl && (
                          <div className="mt-2 rounded bg-white p-1 border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                            <img
                              src={appr.signatureUrl}
                              alt="Digital Signature"
                              className="h-7 w-auto mx-auto filter dark:invert"
                            />
                            <p className="text-[8px] text-center text-slate-400 mt-0.5">
                              Cryptographically Signed
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Line Items */}
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 dark:bg-slate-950">
                        <tr>
                          <th className="py-2 px-3">Item Description</th>
                          <th className="py-2 px-3">Quantity</th>
                          <th className="py-2 px-3">Unit Price (PKR)</th>
                          <th className="py-2 px-3 text-right">Total Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {po.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                              {item.itemName}
                            </td>
                            <td className="py-2 px-3">
                              {item.quantityOrdered ?? item.orderedQty ?? 0} {item.uom}
                            </td>
                            <td className="py-2 px-3 font-mono">PKR {item.unitPrice.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-teal-600 dark:text-teal-400">
                              PKR {(item.totalPrice ?? item.totalAmount ?? (item.unitPrice * (item.quantityOrdered ?? item.orderedQty ?? 1))).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* View: Goods Receipt Notes (GRN) */}
      {activeTab === 'grns' && (
        <div className="space-y-4">
          {grns.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              <FileCheck2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="font-bold text-slate-600 dark:text-slate-300">No Goods Receipt Notes generated</p>
              <p className="text-xs mt-1">When an approved PO arrives, click "Receive GRN" to verify stock into batches.</p>
            </div>
          ) : (
            grns.map((grn) => (
              <div
                key={grn.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                        {grn.grnNumber}
                      </span>
                      <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                        Linked PO: {grn.poNumber}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">({grn.vendorName})</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Invoice: <span className="font-mono font-bold">{grn.invoiceNumber}</span> • DC:{' '}
                      <span className="font-mono">{grn.deliveryChallanNumber}</span> • Verified By:{' '}
                      <strong>{grn.receivedByUserName}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {grn.attachments && grn.attachments.length > 0 && (
                      <button
                        onClick={() => setViewingGRNDocs(grn)}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition"
                      >
                        <FileText className="h-3 w-3" />
                        <span>{grn.attachments.length} Invoice{grn.attachments.length !== 1 ? 's' : ''} / Bill</span>
                      </button>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {grn.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {grn.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950"
                      >
                        <p className="font-bold text-slate-900 dark:text-white">{item.itemName}</p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            Batch: <strong className="font-mono text-slate-800 dark:text-slate-200">{item.batchNumber}</strong>
                          </span>
                          <span>Exp: {item.expiryDate}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between font-medium">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Accepted: {item.quantityReceived ?? item.acceptedQty ?? 0} {item.uom}
                          </span>
                          {(item.quantityRejected ?? item.rejectedQty ?? 0) > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              Rejected: {item.quantityRejected ?? item.rejectedQty ?? 0} (Defect)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* View: 3-Way Matching & Vendor Invoices */}
      {activeTab === 'invoices_3way' && (
        <div className="space-y-4">
          {/* Header Description & KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Invoiced</span>
              <p className="font-mono text-base font-black text-slate-900 dark:text-white mt-1">
                PKR {invoices.reduce((s, i) => s + (i.invoiceBilledAmount || 0), 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{invoices.length} invoices registered</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paid & Released</span>
              <p className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
                PKR {invoices.reduce((s, i) => s + (i.paidAmount || 0), 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-600/80 mt-0.5">Cleared via Bank Wire / Cheque</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Payable</span>
              <p className="font-mono text-base font-black text-amber-600 dark:text-amber-400 mt-1">
                PKR {invoices.reduce((s, i) => s + Math.max(0, (i.invoiceBilledAmount || 0) - (i.paidAmount || 0)), 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-amber-600/80 mt-0.5">Approved & due for payment</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">3-Way Discrepancies</span>
              <p className="font-mono text-base font-black text-rose-600 dark:text-rose-400 mt-1">
                {invoices.filter((i) => (i.varianceAmount || 0) > 0 || i.threeWayMatchStatus === 'Variance Detected').length}
              </p>
              <p className="text-[10px] text-rose-600/80 mt-0.5">PO vs GRN billing variance</p>
            </div>
          </div>

          {/* Visual 3-Way Matching Concept Banner */}
          <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/60 dark:bg-teal-950/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shrink-0 shadow-xs">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Automated 3-Way Matching Protocol
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Every vendor invoice is mathematically reconciled against the authorized <strong>Purchase Order (PO)</strong> and verified <strong>Goods Receipt Note (GRN)</strong> before financial disbursement.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-800 dark:text-teal-200 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 shrink-0">
              <span>PO Price</span> ➔ <span>GRN Accepted Qty</span> ➔ <span>Invoice Bill</span>
            </div>
          </div>

          {/* Invoices List */}
          {invoices.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              <Receipt className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="font-bold text-slate-600 dark:text-slate-300">No vendor invoices recorded yet</p>
              <p className="text-xs mt-1">Invoices are automatically linked whenever a Goods Receipt Note (GRN) is received.</p>
            </div>
          ) : (
            invoices.map((inv) => {
              const isPaid = inv.paymentStatus === 'Paid & Released';
              const isPartial = inv.paymentStatus === 'Partially Paid';
              const hasVariance = (inv.varianceAmount || 0) > 0 || inv.threeWayMatchStatus === 'Variance Detected';

              return (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          {inv.invoiceNumber}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            hasVariance
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {hasVariance ? 'Variance Detected' : '3-Way Exact Match'}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isPaid
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                              : isPartial
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Vendor: <strong className="text-slate-700 dark:text-slate-300">{inv.vendorName}</strong> • {inv.branchName} • Due: {inv.dueDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedInvoiceForPrint(inv)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        title="Print 3-Way Match Payment Voucher"
                      >
                        <Printer className="h-3.5 w-3.5 text-slate-400" />
                        <span>Print Voucher</span>
                      </button>

                      {!isPaid && (
                        <button
                          onClick={() => {
                            setSelectedInvoiceForPayment(inv);
                            setPaymentAmount(inv.invoiceBilledAmount - (inv.paidAmount || 0));
                            setPaymentRefNumber('');
                            setPaymentNotes('');
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>Release Payment</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3-Way Comparison Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
                      <span className="text-[10px] uppercase font-bold text-slate-400">1. PO Authorization</span>
                      <p className="font-mono text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {inv.poNumber}
                      </p>
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        PKR {inv.poAmount.toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
                      <span className="text-[10px] uppercase font-bold text-slate-400">2. GRN Accepted Value</span>
                      <p className="font-mono text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {inv.grnNumber}
                      </p>
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        PKR {inv.grnAcceptedAmount.toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
                      <span className="text-[10px] uppercase font-bold text-slate-400">3. Vendor Billed Amount</span>
                      <p className="font-mono text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                        PKR {inv.invoiceBilledAmount.toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-950">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Reconciliation Variance</span>
                      <p
                        className={`font-mono text-xs font-black mt-0.5 ${
                          (inv.varianceAmount || 0) === 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {(inv.varianceAmount || 0) === 0 ? 'PKR 0 (Zero Variance)' : `+PKR ${inv.varianceAmount?.toLocaleString()} Overbilled`}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Paid: PKR {(inv.paidAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {inv.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg">
                      Note: {inv.notes}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal: Create PO */}
      {isCreatingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-8">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">Draft Purchase Order Requisition</h3>
              <button
                onClick={() => setIsCreatingPO(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Authorized Vendor
                  </label>
                  <select
                    value={poVendorId}
                    onChange={(e) => setPoVendorId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.leadTimeDays}d lead time)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Destination Branch
                  </label>
                  <select
                    value={poBranchId}
                    onChange={(e) => setPoBranchId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items in PO */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 dark:border-teal-900/40 dark:bg-teal-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200">
                    Order Reagents & Supplies
                  </span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItemToPO(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="rounded-lg border border-teal-300 bg-white px-2 py-1 text-xs dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">+ Add Item to PO...</option>
                    {inventory.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} (Cost: PKR {inv.costPrice})
                      </option>
                    ))}
                  </select>
                </div>

                {poItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No items added to PO yet.</p>
                ) : (
                  <div className="space-y-2">
                    {poItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg bg-white p-2 text-xs dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <p className="font-semibold text-slate-900 dark:text-white">{item.itemName}</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...poItems];
                              updated[idx].quantity = parseInt(e.target.value) || 1;
                              setPoItems(updated);
                            }}
                            className="w-16 rounded border border-slate-200 px-2 py-1 text-center font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                          <span className="text-xs text-slate-500">{item.uom}</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                            PKR {(item.quantity * item.unitPrice).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 font-bold ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Procurement Notes
                </label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingPO(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  Submit PO for Multi-Tier Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: GRN Receiving Verification with 3-way matching */}
      {selectedPOForGRN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-8">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Goods Receipt Note (GRN) Inspection</h3>
                <p className="text-xs text-teal-600 font-semibold">{selectedPOForGRN.poNumber} — 3-Way Match</p>
              </div>
              <button
                onClick={() => setSelectedPOForGRN(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGRN} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor Invoice # *
                  </label>
                  <input
                    type="text"
                    required
                    value={grnInvoiceNumber}
                    onChange={(e) => setGrnInvoiceNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Delivery Challan #
                  </label>
                  <input
                    type="text"
                    value={grnDeliveryChallan}
                    onChange={(e) => setGrnDeliveryChallan(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Physical Receiving & Batch Extraction */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Verify Physical Batches & Quantities (Auto-updates Stock):
                </span>
                {selectedPOForGRN.items.map((item) => (
                  <div
                    key={item.itemId}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950 space-y-2.5"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-slate-900 dark:text-white">{item.itemName}</p>
                      <span className="text-[11px] text-slate-500">
                        PO Ordered: {item.quantityOrdered ?? item.orderedQty ?? 0} {item.uom}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500">Received Qty</label>
                        <input
                          type="number"
                          min="0"
                          value={grnReceivedQty[item.itemId] ?? (item.quantityOrdered ?? item.orderedQty ?? 0)}
                          onChange={(e) =>
                            setGrnReceivedQty({
                              ...grnReceivedQty,
                              [item.itemId]: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded border border-slate-200 bg-white py-1 px-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">Rejected Qty</label>
                        <input
                          type="number"
                          min="0"
                          value={grnRejectedQty[item.itemId] ?? 0}
                          onChange={(e) =>
                            setGrnRejectedQty({
                              ...grnRejectedQty,
                              [item.itemId]: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded border border-slate-200 bg-white py-1 px-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-red-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">Batch / Lot #</label>
                        <input
                          type="text"
                          required
                          value={grnBatchNumbers[item.itemId] || ''}
                          onChange={(e) =>
                            setGrnBatchNumbers({
                              ...grnBatchNumbers,
                              [item.itemId]: e.target.value,
                            })
                          }
                          className="w-full rounded border border-slate-200 bg-white py-1 px-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">Expiry Date</label>
                        <input
                          type="date"
                          required
                          value={grnExpiryDates[item.itemId] || ''}
                          onChange={(e) =>
                            setGrnExpiryDates({
                              ...grnExpiryDates,
                              [item.itemId]: e.target.value,
                            })
                          }
                          className="w-full rounded border border-slate-200 bg-white py-1 px-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Receiving Inspection Notes (Cold Chain Check)
                </label>
                <input
                  type="text"
                  value={grnNotes}
                  onChange={(e) => setGrnNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Vendor Bill / Invoice Upload */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                <DocumentAttachmentPicker
                  attachments={grnAttachments}
                  onChange={setGrnAttachments}
                  title="Vendor Tax Invoice, Delivery Challan & CoA Bills"
                  description="Upload vendor tax bills, delivery challans, and Certificate of Analysis (CoA) (PDF, PNG, JPG)."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedPOForGRN(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  Post GRN & Inject into Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View GRN Invoices & Bills */}
      {viewingGRNDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  GRN Bills & Invoices: {viewingGRNDocs.grnNumber}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Invoice #{viewingGRNDocs.invoiceNumber} • PO: {viewingGRNDocs.poNumber} • Vendor: {viewingGRNDocs.vendorName}
                </p>
              </div>
              <button
                onClick={() => setViewingGRNDocs(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <DocumentAttachmentPicker
              attachments={viewingGRNDocs.attachments || []}
              onChange={(newAttachments) => {
                const updated = { ...viewingGRNDocs, attachments: newAttachments };
                StorageService.saveGRN(updated);
                setViewingGRNDocs(updated);
              }}
              title="Verified Vendor Bills"
              description="Review verified supplier invoices and delivery paperwork stored for this shipment."
              readOnly={!isSuperAdmin}
            />

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingGRNDocs(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Official Formal Printable Purchase Order */}
      {selectedPOForPrint && (
        <PurchaseOrderPrintModal
          po={selectedPOForPrint}
          onClose={() => setSelectedPOForPrint(null)}
          currentUser={currentUser}
        />
      )}

      {/* Modal: Process Vendor Payment (3-Way Matching Disbursement) */}
      {selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Release Vendor Disbursement • {selectedInvoiceForPayment.invoiceNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950 space-y-1.5 border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Authorized Vendor:</span>
                <strong className="text-slate-900 dark:text-white">{selectedInvoiceForPayment.vendorName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Matched References:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedInvoiceForPayment.poNumber} ➔ {selectedInvoiceForPayment.grnNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Billed Amount:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  PKR {selectedInvoiceForPayment.invoiceBilledAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Cleared:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  PKR {(selectedInvoiceForPayment.paidAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 font-bold">
                <span className="text-slate-700 dark:text-slate-300">Net Payable Balance:</span>
                <span className="font-mono text-teal-600 dark:text-teal-400">
                  PKR {(selectedInvoiceForPayment.invoiceBilledAmount - (selectedInvoiceForPayment.paidAmount || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleExecutePayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Disbursement Amount (PKR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedInvoiceForPayment.invoiceBilledAmount - (selectedInvoiceForPayment.paidAmount || 0)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 font-mono font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Bank Wire Transfer">Bank Wire Transfer (IBFT)</option>
                    <option value="Crossed Cheque">Crossed Cheque</option>
                    <option value="Direct Debit">Direct Debit</option>
                    <option value="Pay Order">Pay Order / Demand Draft</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bank Ref / Cheque #
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HBL-FT-99214 or CHQ-0419"
                    value={paymentRefNumber}
                    onChange={(e) => setPaymentRefNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Accounts Clearance Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved against GRN physical inspection; payment released from Habib Bank Main Corporate Account."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPayment(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 font-bold text-white shadow hover:bg-teal-700"
                >
                  Confirm & Release Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Printable 3-Way Match & Payment Clearance Voucher */}
      {selectedInvoiceForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-4 print:my-0 print:ring-0 print:shadow-none print:max-w-none print:rounded-none">
            {/* Modal Toolbar (hidden during print) */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-950 print:hidden">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  3-Way Match Payment Voucher • {selectedInvoiceForPrint.invoiceNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPrint(null)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Voucher Document */}
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
                        Finance & Procurement • 3-Way Match Payment Clearance Voucher
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 print:text-slate-700">
                    Standard Financial Control: ERP-FIN-3WAY-02 • Statutory Audit Compliant
                  </p>
                </div>

                <div className="text-right sm:text-right w-full sm:w-auto">
                  <span className="inline-block rounded-lg bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-800 border border-teal-200 print:border-black print:text-black">
                    PAYMENT CLEARANCE
                  </span>
                  <p className="font-mono text-base font-black text-slate-900 dark:text-white mt-1.5 print:text-black">
                    {selectedInvoiceForPrint.invoiceNumber}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 print:text-slate-700">
                    Date: <strong className="text-slate-800 print:text-black">{selectedInvoiceForPrint.invoiceDate}</strong>
                  </p>
                  <p className="text-xs text-slate-500">
                    Status: <strong className="text-teal-700 print:text-black">{selectedInvoiceForPrint.paymentStatus}</strong>
                  </p>
                </div>
              </div>

              {/* Vendor & Beneficiary Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60 print:bg-white print:border-slate-400 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Beneficiary / Supplier</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5 print:text-black">
                    {selectedInvoiceForPrint.vendorName}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Disbursing Branch</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5 print:text-black">
                    {selectedInvoiceForPrint.branchName}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Payment Reference</span>
                  <p className="font-bold font-mono text-slate-900 dark:text-white mt-0.5 print:text-black">
                    {selectedInvoiceForPrint.paymentReference || 'Pending Reference'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Payment Method</span>
                  <p className="font-bold text-teal-700 dark:text-teal-300 mt-0.5 print:text-black">
                    {selectedInvoiceForPrint.paymentMethod || 'Bank Wire'}
                  </p>
                </div>
              </div>

              {/* 3-Way Reconciled Match Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 print:border-black">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600 dark:bg-slate-950 dark:text-slate-400 print:bg-slate-200 print:text-black border-b border-slate-200 print:border-black">
                    <tr>
                      <th className="py-2.5 px-3">Audit Stage</th>
                      <th className="py-2.5 px-3">Document Number</th>
                      <th className="py-2.5 px-3">Verification Details</th>
                      <th className="py-2.5 px-3 text-right">Audited Value (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white print:text-black">
                        1. Purchase Order (PO)
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold">
                        {selectedInvoiceForPrint.poNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 print:text-black">
                        Authorized requisition approved by Medical Director & Super Admin
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        PKR {selectedInvoiceForPrint.poAmount.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white print:text-black">
                        2. Goods Receipt Note (GRN)
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold">
                        {selectedInvoiceForPrint.grnNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 print:text-black">
                        Physical inspection, cold chain verification, and barcode QA accepted
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        PKR {selectedInvoiceForPrint.grnAcceptedAmount.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white print:text-black">
                        3. Vendor Commercial Invoice
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold">
                        {selectedInvoiceForPrint.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 print:text-black">
                        Original vendor tax invoice billed to HR Diagnostics
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-700 dark:text-teal-300 print:text-black">
                        PKR {selectedInvoiceForPrint.invoiceBilledAmount.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/70 font-bold dark:bg-slate-950/70 print:bg-slate-100">
                      <td colSpan={3} className="py-2.5 px-3 uppercase text-[10px]">
                        Reconciliation Variance (PO / GRN vs Billed)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {(selectedInvoiceForPrint.varianceAmount || 0) === 0 ? (
                          <span className="text-emerald-700 print:text-black">PKR 0 (Exact Match)</span>
                        ) : (
                          <span className="text-rose-700 print:text-black">
                            +PKR {selectedInvoiceForPrint.varianceAmount?.toLocaleString()} (Discrepancy)
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="border-t-2 border-slate-200 pt-4 print:border-black">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 print:text-black">
                  Disbursement Clearance & Financial Sign-Offs:
                </p>
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-24">
                    <p className="text-[9px] font-bold uppercase text-slate-500 print:text-black">
                      Store & Receiving QA
                    </p>
                    <div className="my-auto font-serif italic text-xs text-teal-700 font-bold print:text-black">
                      [ GRN Verified ]
                    </div>
                    <p className="text-[9px] text-slate-400 print:text-slate-600">Store Incharge</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-24">
                    <p className="text-[9px] font-bold uppercase text-slate-500 print:text-black">
                      Finance & Accounts
                    </p>
                    <div className="my-auto font-serif italic text-xs text-teal-700 font-bold print:text-black">
                      [ 3-Way Reconciled ]
                    </div>
                    <p className="text-[9px] text-slate-400 print:text-slate-600">Accounts Officer</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-24">
                    <p className="text-[9px] font-bold uppercase text-slate-500 print:text-black">
                      Authorized Signatory
                    </p>
                    <div className="my-auto font-serif italic text-xs text-teal-700 font-bold print:text-black">
                      {selectedInvoiceForPrint.paymentStatus === 'Paid & Released'
                        ? '[ Released & Signed ]'
                        : '[ Payment Pending ]'}
                    </div>
                    <p className="text-[9px] text-slate-400 print:text-slate-600">Super Admin / CFO</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[9px] text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800 print:text-slate-600">
                <p>HR Diagnostics Internal Financial Control Record • System Ref #{selectedInvoiceForPrint.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Digital Signature Modal */}
      <DigitalSignaturePad
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        onSave={handleApplySignature}
        signerName={currentUser?.name || 'Super Admin'}
        signerRole={currentUser?.role || 'super_admin'}
        purpose={signaturePurpose}
      />
    </div>
  );
};
