import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Truck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Printer,
  Boxes,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { StockTransfer, InventoryItem, Branch, Department } from '../../types';

interface WarehouseTransfersProps {
  activeBranchId: string;
  currentUser?: any;
}

export const WarehouseTransfers: React.FC<WarehouseTransfersProps> = ({ activeBranchId, currentUser }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [receivingTransfer, setReceivingTransfer] = useState<StockTransfer | null>(null);
  const [selectedTransferForPrint, setSelectedTransferForPrint] = useState<StockTransfer | null>(null);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [receivingNotes, setReceivingNotes] = useState('');

  const isSuperAdmin = !currentUser || currentUser.role === 'super_admin';
  const effectiveBranchId = isSuperAdmin ? activeBranchId : (currentUser?.branchId || activeBranchId);

  const allTransfers = StorageService.getTransfers();
  const branches = StorageService.getBranches();
  const departments = StorageService.getDepartments();
  const inventory = StorageService.getInventory();

  // Filter transfers with strict branch isolation for non-super_admins
  const transfers = allTransfers.filter((t) => {
    if (effectiveBranchId === 'all') return true;
    return t.sourceBranchId === effectiveBranchId || t.targetBranchId === effectiveBranchId;
  });

  // Transfer Form State
  const [transferType, setTransferType] = useState<StockTransfer['type']>('Warehouse to Branch');
  const [sourceBranchId, setSourceBranchId] = useState(effectiveBranchId === 'all' ? branches[0]?.id || 'br_headoffice' : effectiveBranchId);
  const [targetBranchId, setTargetBranchId] = useState(branches[1]?.id || 'br_gulberg');
  const [sourceDeptId, setSourceDeptId] = useState('');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [courierName, setCourierName] = useState('HR Cold-Chain Express Van');
  const [trackingNumber, setTrackingNumber] = useState(`TRK-${Date.now().toString().slice(-6)}`);
  const [transferNotes, setTransferNotes] = useState('');

  // Selected items to transfer
  const [transferItems, setTransferItems] = useState<{
    itemId: string;
    itemName: string;
    batchNumber: string;
    quantity: number;
    uom: string;
  }[]>([]);

  const handleAddItemToTransfer = (itemId: string) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    // Pick first batch with stock
    const batch = item.batches.find((b) => b.currentQuantity > 0);
    if (!batch) {
      alert(`No active batch stock available for ${item.name}`);
      return;
    }

    setTransferItems([
      ...transferItems,
      {
        itemId: item.id,
        itemName: item.name,
        batchNumber: batch.batchNumber,
        quantity: 1,
        uom: item.uom,
      },
    ]);
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferItems.length === 0) {
      alert('Please add at least one item to transfer.');
      return;
    }

    if (transferType !== 'Inter-Department' && sourceBranchId === targetBranchId) {
      alert('Source and Target branch cannot be the same for inter-branch transfers.');
      return;
    }

    const sourceBranch = branches.find((b) => b.id === sourceBranchId);
    const targetBranch = branches.find((b) => b.id === targetBranchId);

    const initialStatus = isSuperAdmin ? 'In Transit' : 'Pending Approval';

    const newTransfer: StockTransfer = {
      id: `transfer_${Date.now()}`,
      transferNumber: `TRF-${Date.now().toString().slice(-5)}`,
      type: transferType,
      sourceBranchId,
      sourceBranchName: sourceBranch?.name || 'Head Office Central Lab',
      targetBranchId,
      targetBranchName: targetBranch?.name || 'Gulberg Diagnostic Center',
      sourceDepartmentId: sourceDeptId,
      targetDepartmentId: targetDeptId,
      status: initialStatus,
      items: transferItems.map((ti) => ({
        itemId: ti.itemId,
        itemName: ti.itemName,
        batchNumber: ti.batchNumber,
        quantitySent: ti.quantity,
        quantityReceived: 0,
        uom: ti.uom,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dispatchedAt: isSuperAdmin ? new Date().toISOString() : undefined,
      courierName,
      trackingNumber,
      notes: transferNotes,
    };

    StorageService.saveTransfer(newTransfer);
    StorageService.logAction(
      'Transfers',
      `Initiated transfer ${newTransfer.transferNumber} (${transferItems.length} items) from ${sourceBranch?.name} to ${targetBranch?.name}.`
    );

    if (!isSuperAdmin) {
      StorageService.saveApprovalRequest({
        id: `req_trf_${Date.now()}`,
        type: 'stock_transfer',
        title: `Inter-Branch Stock Transfer (${newTransfer.transferNumber})`,
        description: `Transfer of ${transferItems.length} reagent / consumable items from ${sourceBranch?.name} to ${targetBranch?.name}.`,
        branchId: sourceBranchId,
        branchName: sourceBranch?.name || 'Origin Branch',
        requestedByUserId: currentUser?.id || 'usr_unknown',
        requestedByUserName: currentUser?.name || 'Branch Manager',
        requestedByUserRole: currentUser?.role || 'branch_manager',
        targetEntityId: newTransfer.id,
        targetEntityCode: newTransfer.transferNumber,
        details: {
          transferNumber: newTransfer.transferNumber,
          sourceBranch: sourceBranch?.name,
          targetBranch: targetBranch?.name,
          itemCount: transferItems.length,
          items: transferItems.map((ti) => `${ti.itemName} (${ti.quantity} ${ti.uom})`),
          courierName,
          trackingNumber,
          notes: transferNotes,
        },
        status: 'Pending',
        requestedAt: new Date().toISOString(),
      });

      alert(
        `✅ Transfer Request Submitted to Head Office!\n\nTransfer ${newTransfer.transferNumber} requires Head Office Admin clearance before dispatch.`
      );
    }

    setIsCreating(false);
    setTransferItems([]);
  };

  const handleApproveTransferDirect = (transfer: StockTransfer) => {
    const updated: StockTransfer = {
      ...transfer,
      status: 'In Transit',
      dispatchedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    StorageService.saveTransfer(updated);

    // Also update any matching approval request
    const reqs = StorageService.getApprovalRequests();
    const match = reqs.find((r) => r.targetEntityId === transfer.id && r.status === 'Pending');
    if (match) {
      StorageService.approveRequest(match.id, currentUser?.name || 'Super Admin', 'Approved from Transfers Dashboard.');
    }
  };

  const handleOpenReceiveModal = (transfer: StockTransfer) => {
    setReceivingTransfer(transfer);
    const initialRecv: Record<string, number> = {};
    transfer.items.forEach((item) => {
      initialRecv[item.itemId] = item.quantitySent; // Default match
    });
    setReceivedQuantities(initialRecv);
    setReceivingNotes('');
  };

  const handleConfirmReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingTransfer) return;

    let hasDiscrepancy = false;
    const updatedItems = receivingTransfer.items.map((item) => {
      const recvQty = receivedQuantities[item.itemId] || 0;
      if (recvQty !== item.quantitySent) {
        hasDiscrepancy = true;
      }
      return {
        ...item,
        quantityReceived: recvQty,
        discrepancyNotes:
          recvQty !== item.quantitySent
            ? `Sent: ${item.quantitySent}, Received: ${recvQty}. Variance: ${recvQty - item.quantitySent}`
            : undefined,
      };
    });

    receivingTransfer.items = updatedItems;
    receivingTransfer.status = hasDiscrepancy ? 'Discrepancy' : 'Delivered / Received';
    receivingTransfer.receivedAt = new Date().toISOString();
    receivingTransfer.notes = receivingNotes ? `${receivingTransfer.notes || ''} | Receiving Notes: ${receivingNotes}` : receivingTransfer.notes;

    StorageService.saveTransfer(receivingTransfer);
    StorageService.logAction(
      'Transfers',
      `Confirmed receipt of transfer ${receivingTransfer.transferNumber}. Status: ${receivingTransfer.status}.`
    );
    setReceivingTransfer(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Warehouse & Inter-Branch Stock Transfers
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Real-time in-transit cold-chain dispatch, gate pass verification, and receiving variance tracking.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Create Stock Transfer</span>
        </button>
      </div>

      {/* Transfers List */}
      <div className="space-y-4">
        {transfers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            <Truck className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">No stock transfers in log</p>
            <p className="text-sm mt-1">Click "Create Stock Transfer" to dispatch reagents between branches.</p>
          </div>
        ) : (
          transfers.map((trf) => {
            const isInTransit = trf.status === 'In Transit';
            const isDelivered = trf.status === 'Delivered / Received';
            const isDiscrepancy = trf.status === 'Discrepancy';

            return (
              <div
                key={trf.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                          {trf.transferNumber}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 uppercase">
                          {trf.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Courier: {trf.courierName} · Tracking: <span className="font-mono">{trf.trackingNumber}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                        trf.status === 'Pending Approval'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                          : isInTransit
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : isDelivered
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : isDiscrepancy
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {trf.status === 'Pending Approval' ? (
                        <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      ) : isInTransit ? (
                        <Clock className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {trf.status}
                    </span>

                    {trf.status === 'Pending Approval' && isSuperAdmin && (
                      <button
                        onClick={() => handleApproveTransferDirect(trf)}
                        className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
                      >
                        Approve & Dispatch
                      </button>
                    )}

                    {isInTransit && (
                      <button
                        onClick={() => handleOpenReceiveModal(trf)}
                        className="rounded-xl bg-teal-600 px-3 py-1 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                      >
                        Receive & Verify
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedTransferForPrint(trf)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition"
                      title="Print Official Delivery Challan & Gate Pass (PDF format)"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Gate Pass</span>
                    </button>
                  </div>
                </div>

                {/* Route Route Visualization */}
                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Origin</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{trf.sourceBranchName}</p>
                    </div>
                  </div>

                  <ArrowLeftRight className="h-4 w-4 text-teal-600 dark:text-teal-400" />

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Destination</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{trf.targetBranchName}</p>
                  </div>
                </div>

                {/* Transferred Items List */}
                <div className="mt-3 space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Dispatched Reagent Packages:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {trf.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{it.itemName}</p>
                          <p className="font-mono text-[10px] text-slate-400">Batch: {it.batchNumber}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-teal-700 dark:text-teal-300">
                            {it.quantitySent} {it.uom}
                          </span>
                          {(it.quantityReceived ?? 0) > 0 && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              Recv: {it.quantityReceived}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Create Transfer */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-8">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">Create Stock Transfer Dispatch</h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Transfer Mode
                </label>
                <select
                  value={transferType}
                  onChange={(e) => setTransferType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                >
                  <option value="Warehouse to Branch">Central Warehouse → Branch Hub</option>
                  <option value="Branch to Branch">Branch Hub → Branch Hub</option>
                  <option value="Inter-Department">Inter-Department Redistribution</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Source Branch
                  </label>
                  <select
                    value={sourceBranchId}
                    onChange={(e) => setSourceBranchId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
                    Destination Branch
                  </label>
                  <select
                    value={targetBranchId}
                    onChange={(e) => setTargetBranchId(e.target.value)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Courier / Vehicle
                  </label>
                  <input
                    type="text"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tracking / Waybill #
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Items Picker */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3.5 dark:border-teal-900/40 dark:bg-teal-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200">
                    Reagents & Supplies to Dispatch
                  </span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItemToTransfer(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="rounded-lg border border-teal-300 bg-white px-2 py-1 text-xs dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">+ Add Item from Inventory...</option>
                    {inventory.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.totalQuantity} {inv.uom} available)
                      </option>
                    ))}
                  </select>
                </div>

                {transferItems.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No items selected yet.</p>
                ) : (
                  <div className="space-y-2">
                    {transferItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg bg-white p-2 text-xs dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{item.itemName}</p>
                          <p className="text-[10px] text-slate-400">Batch: {item.batchNumber}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...transferItems];
                              updated[idx].quantity = parseInt(e.target.value) || 1;
                              setTransferItems(updated);
                            }}
                            className="w-16 rounded border border-slate-200 px-2 py-1 text-center font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          />
                          <span className="text-xs text-slate-500">{item.uom}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTransferItems(transferItems.filter((_, i) => i !== idx));
                            }}
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

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  Dispatch Transfer Gate Pass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Receive & Verify Stock at Destination */}
      {receivingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Receive & Verify Shipment</h3>
                <p className="text-xs text-teal-600 font-semibold">{receivingTransfer.transferNumber}</p>
              </div>
              <button
                onClick={() => setReceivingTransfer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReceive} className="p-6 space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Verify Physical Count Received:
                </span>
                {receivingTransfer.items.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{item.itemName}</p>
                      <p className="text-[10px] text-slate-400">
                        Dispatched: {item.quantitySent} {item.uom}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Recv:</span>
                      <input
                        type="number"
                        min="0"
                        value={receivedQuantities[item.itemId] ?? item.quantitySent}
                        onChange={(e) =>
                          setReceivedQuantities({
                            ...receivedQuantities,
                            [item.itemId]: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-16 rounded-lg border border-slate-300 bg-white py-1 px-2 text-center text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <span className="text-xs text-slate-500">{item.uom}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Receiving / Damage Notes (If any discrepancy)
                </label>
                <input
                  type="text"
                  value={receivingNotes}
                  onChange={(e) => setReceivingNotes(e.target.value)}
                  placeholder="e.g. 1 vial broken in transit, cold chain temperature verified 4°C"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setReceivingTransfer(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  Confirm Receipt & Update Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Official Printable Delivery Challan & Gate Pass */}
      {selectedTransferForPrint && (() => {
        const srcBranch = branches.find(b => b.id === selectedTransferForPrint.sourceBranchId) || {
          name: selectedTransferForPrint.sourceBranchName,
          address: 'Central Diagnostic Warehouse, Jail Road, Lahore',
          phone: '+92 42 111-475-227'
        };
        const destBranch = branches.find(b => b.id === selectedTransferForPrint.targetBranchId) || {
          name: selectedTransferForPrint.targetBranchName,
          address: 'Branch Clinical Laboratory',
          phone: '+92 42 35789123'
        };
        const totalItemsCount = selectedTransferForPrint.items.reduce((acc, i) => acc + (i.quantitySent || 0), 0);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
            <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-4 print:my-0 print:ring-0 print:shadow-none print:max-w-none print:rounded-none">
              {/* Modal Toolbar (hidden during print) */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-950 print:hidden">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Inter-Branch Delivery Gate Pass • {selectedTransferForPrint.transferNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Gate Pass</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTransferForPrint(null)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Printable Gate Pass Sheet */}
              <div className="p-8 sm:p-10 space-y-5 text-slate-800 dark:text-slate-200 print:text-black print:p-8 print:space-y-4">
                {/* Header: Company & Pass Meta */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-slate-900 pb-5 print:pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-black text-lg">
                        HR
                      </div>
                      <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                          HR Diagnostics Logistics & Transport
                        </h1>
                        <p className="text-[11px] font-semibold text-slate-500 print:text-slate-700">
                          Cold-Chain Supply Chain, Reagents Distribution & Gate Pass
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 print:text-slate-700">
                      UAN: +92 (42) 111-475-227 • Cold-Chain Monitoring Division • Lahore, Pakistan
                    </p>
                  </div>

                  <div className="text-right sm:text-right w-full sm:w-auto">
                    <span className="inline-block rounded-lg bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-800 border border-teal-200 print:border-black print:text-black">
                      DELIVERY CHALLAN & GATE PASS
                    </span>
                    <p className="font-mono text-base font-black text-slate-900 dark:text-white mt-1.5 print:text-black">
                      {selectedTransferForPrint.transferNumber}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 print:text-slate-700">
                      Dispatch Date: <strong className="text-slate-800 print:text-black">{selectedTransferForPrint.dispatchedAt ? selectedTransferForPrint.dispatchedAt.split('T')[0] : (selectedTransferForPrint.createdAt ? selectedTransferForPrint.createdAt.split('T')[0] : 'N/A')}</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      Status: <strong className="text-teal-700 print:text-black">{selectedTransferForPrint.status}</strong>
                    </p>
                  </div>
                </div>

                {/* Transit & Vehicle Information */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60 print:bg-white print:border-slate-400 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Transit Mode / Vehicle</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5 print:text-black">
                        {selectedTransferForPrint.courierName || 'HR Cold-Chain Van #5'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Vehicle / Tracking ID</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 print:text-black">
                        {selectedTransferForPrint.trackingNumber || 'TRK-COLD-882'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Cold Box Temp</span>
                      <p className="font-bold text-teal-700 dark:text-teal-300 mt-0.5 print:text-black">
                        2.0°C - 6.5°C (Active Logged)
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Total Units Sent</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5 print:text-black">
                        {totalItemsCount} Reagent Packs
                      </p>
                    </div>
                  </div>
                </div>

                {/* Route: Consignor (Origin) & Consignee (Destination) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 print:border-slate-400">
                    <span className="text-[10px] uppercase font-black text-slate-400 print:text-slate-600">
                      Consignor (Dispatching Location):
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1 print:text-black">
                      {srcBranch.name}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 print:text-black">
                      Address: {srcBranch.address || 'Central Warehouse, Lahore'}<br />
                      Phone: {srcBranch.phone || '+92 42 111-475-227'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800 print:border-slate-400">
                    <span className="text-[10px] uppercase font-black text-slate-400 print:text-slate-600">
                      Consignee (Receiving Destination):
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1 print:text-black">
                      {destBranch.name}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 print:text-black">
                      Address: {destBranch.address || 'Branch Diagnostics Center'}<br />
                      Phone: {destBranch.phone || '+92 42 35789123'}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 print:border-black">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600 dark:bg-slate-950 dark:text-slate-400 print:bg-slate-200 print:text-black border-b border-slate-200 print:border-black">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Item Name / Description</th>
                        <th className="py-2.5 px-3">Batch Number</th>
                        <th className="py-2.5 px-3 text-center">UoM</th>
                        <th className="py-2.5 px-3 text-center">Qty Dispatched</th>
                        <th className="py-2.5 px-3 text-center">Qty Received</th>
                        <th className="py-2.5 px-3">Condition Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                      {selectedTransferForPrint.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white print:text-black">
                            {it.itemName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">{it.batchNumber}</td>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{it.uom}</td>
                          <td className="py-2.5 px-3 text-center font-bold font-mono">{it.quantitySent}</td>
                          <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-700 print:text-black">
                            {it.quantityReceived ?? '—'}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-500 print:text-black">
                            {it.discrepancyNotes || 'Cold-chain seal intact'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Handover & Multi-Party Sign-Off Boxes */}
                <div className="border-t-2 border-slate-200 pt-4 print:border-black">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 print:text-black">
                    Security Gate & Chain of Custody Signatures:
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center text-xs">
                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-28">
                      <p className="text-[10px] font-bold uppercase text-slate-500 print:text-black">
                        1. Dispatched by (Warehouse Officer)
                      </p>
                      <div className="my-auto font-serif italic text-xs text-teal-700 font-bold print:text-black">
                        [ Inspected & Cleared ]
                      </div>
                      <div>
                        <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200 print:text-black">
                          Central Warehouse In-Charge
                        </p>
                        <p className="text-[9px] text-slate-400 print:text-slate-600">Seal # WHS-9941</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-28">
                      <p className="text-[10px] font-bold uppercase text-slate-500 print:text-black">
                        2. Driver / Transporter Acknowledgment
                      </p>
                      <div className="my-auto text-[11px] text-slate-600 print:text-black">
                        Received {totalItemsCount} boxes cold-chain
                      </div>
                      <div>
                        <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200 print:text-black">
                          Driver Signature / CNIC
                        </p>
                        <p className="text-[9px] text-slate-400 print:text-slate-600">HR Van Transport Service</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-28">
                      <p className="text-[10px] font-bold uppercase text-slate-500 print:text-black">
                        3. Received by (Branch Technologist)
                      </p>
                      <div className="my-auto font-serif italic text-xs text-teal-700 font-bold print:text-black">
                        {selectedTransferForPrint.status === 'Delivered / Received' ? '[ Verified & Accepted ]' : '[ Pending Arrival ]'}
                      </div>
                      <div>
                        <p className="font-bold text-[11px] text-slate-800 dark:text-slate-200 print:text-black">
                          Destination Branch Manager
                        </p>
                        <p className="text-[9px] text-slate-400 print:text-slate-600">Clinical Pathology Dept</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="text-center text-[9px] text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800 print:text-slate-600">
                  <p>HR Diagnostics Official Gate Pass • Must be retained by security at gate exit and destination arrival.</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
