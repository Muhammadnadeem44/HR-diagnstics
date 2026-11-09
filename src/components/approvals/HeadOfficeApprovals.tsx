import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  AlertTriangle,
  ArrowLeftRight,
  ShoppingCart,
  Trash2,
  FileText,
  User,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Calendar,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { HeadOfficeApprovalRequest, ApprovalRequestType, UserAccount } from '../../types';

interface HeadOfficeApprovalsProps {
  currentUser: UserAccount | null;
  onNavigate?: (tab: string) => void;
}

export const HeadOfficeApprovals: React.FC<HeadOfficeApprovalsProps> = ({
  currentUser,
  onNavigate,
}) => {
  const [activeStatusFilter, setActiveStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<HeadOfficeApprovalRequest | null>(null);
  const [reviewModalAction, setReviewModalAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('');

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const branches = StorageService.getBranches();
  const allRequests = StorageService.getApprovalRequests();

  // Filter requests
  const filteredRequests = allRequests.filter((req) => {
    // If not super admin, only show requests from their branch
    if (!isSuperAdmin && currentUser?.branchId && req.branchId !== currentUser.branchId) {
      return false;
    }

    const matchesStatus = activeStatusFilter === 'All' || req.status === activeStatusFilter;
    const matchesType = typeFilter === 'all' || req.type === typeFilter;
    const matchesBranch = branchFilter === 'all' || req.branchId === branchFilter;
    const matchesSearch =
      !searchTerm ||
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestedByUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.targetEntityCode && req.targetEntityCode.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesStatus && matchesType && matchesBranch && matchesSearch;
  });

  const pendingCount = allRequests.filter((r) => r.status === 'Pending').length;
  const approvedCount = allRequests.filter((r) => r.status === 'Approved').length;
  const rejectedCount = allRequests.filter((r) => r.status === 'Rejected').length;

  const handleOpenReview = (req: HeadOfficeApprovalRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setReviewModalAction(action);
    setReviewNotes(
      action === 'approve'
        ? 'Verified with compliance regulations and authorized by Head Office Administration.'
        : 'Request declined due to inventory policy discrepancy.'
    );
  };

  const handleConfirmReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !reviewModalAction) return;

    const reviewer = currentUser?.name || 'Head Office Super Admin';
    if (reviewModalAction === 'approve') {
      const res = StorageService.approveRequest(selectedRequest.id, reviewer, reviewNotes);
      if (!res.success) {
        alert(res.message);
        return;
      }
    } else {
      const res = StorageService.rejectRequest(selectedRequest.id, reviewer, reviewNotes);
      if (!res.success) {
        alert(res.message);
        return;
      }
    }

    setSelectedRequest(null);
    setReviewModalAction(null);
  };

  const getTypeBadge = (type: ApprovalRequestType) => {
    switch (type) {
      case 'inventory_deletion':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <Trash2 className="h-3 w-3" /> Stock Deletion
          </span>
        );
      case 'asset_deletion':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
            <Trash2 className="h-3 w-3" /> Asset Decommission
          </span>
        );
      case 'stock_transfer':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <ArrowLeftRight className="h-3 w-3" /> Stock Transfer
          </span>
        );
      case 'new_stock':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <ShoppingCart className="h-3 w-3" /> New Stock Indent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {type}
          </span>
        );
    }
  };

  const getStatusBadge = (status: HeadOfficeApprovalRequest['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock className="h-3 w-3 animate-spin" /> Pending Approval
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> Approved & Executed
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <XCircle className="h-3 w-3" /> Rejected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xs">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Head Office Central Approvals
              </h1>
              <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
                {isSuperAdmin
                  ? 'Central authorization required for branch write-offs, inter-branch stock transfers, and new requisitions.'
                  : `Your branch operational requests requiring Head Office clearance (${currentUser?.branchName || 'Assigned Branch'}).`}
              </p>
            </div>
          </div>
        </div>

        {/* Status Count Indicators */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-bold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>{pendingCount} Pending Clearance</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-bold text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{approvedCount} Approved</span>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Actions
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 font-bold text-xs">
              HO
            </span>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {pendingCount}
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
            Requires Super Admin Clearance
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Stock Transfers
            </span>
            <ArrowLeftRight className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {allRequests.filter((r) => r.type === 'stock_transfer').length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Inter-branch routing requests
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Deletions & Scraps
            </span>
            <Trash2 className="h-5 w-5 text-rose-600" />
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {allRequests.filter((r) => r.type === 'inventory_deletion' || r.type === 'asset_deletion').length}
          </p>
          <p className="mt-1 text-xs text-rose-600 font-semibold">
            Write-off Protection Ledger
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              New Requisitions
            </span>
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
            {allRequests.filter((r) => r.type === 'new_stock').length}
          </p>
          <p className="mt-1 text-xs text-emerald-600 font-semibold">
            Branch Indent Authorizations
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 overflow-x-auto">
          {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveStatusFilter(tab)}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                activeStatusFilter === tab
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search request title, code, branch name, or requester..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="all">All Request Types</option>
            <option value="stock_transfer">Stock Transfer</option>
            <option value="new_stock">New Stock Requisition</option>
            <option value="inventory_deletion">Inventory Deletion</option>
            <option value="asset_deletion">Asset Decommission</option>
          </select>

          {isSuperAdmin && (
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm font-semibold text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <ShieldCheck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No approval requests found
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {activeStatusFilter === 'Pending'
              ? 'All branch operational actions are currently cleared. When a Branch Manager initiates a stock transfer, deletion, or indent, it will appear here.'
              : 'No matching requests with current filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className={`rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md dark:bg-slate-900 ${
                req.status === 'Pending'
                  ? 'border-amber-200 dark:border-amber-900/50'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Left: Request Details */}
                <div className="space-y-2.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getTypeBadge(req.type)}
                    {getStatusBadge(req.status)}
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Building2 className="h-3 w-3 text-slate-400" />
                      {req.branchName}
                    </span>
                    {req.targetEntityCode && (
                      <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                        {req.targetEntityCode}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {req.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {req.description}
                    </p>
                  </div>

                  {/* Key metadata grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1 text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        Requested by:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {req.requestedByUserName}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        Date: {new Date(req.requestedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {req.reviewedBy && (
                      <div className="flex items-center gap-2 text-slate-500">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>
                          Reviewed by: <strong className="text-slate-800 dark:text-slate-200">{req.reviewedBy}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Structured Details Box */}
                  {req.details && Object.keys(req.details).length > 0 && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 text-xs">
                      <div className="font-bold text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                        Operational Justification & Parameters
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-slate-700 dark:text-slate-300">
                        {Object.entries(req.details).map(([key, val]) => (
                          <div key={key}>
                            <span className="text-slate-400 capitalize">
                              {key.replace(/([A-Z])/g, ' $1')}:{' '}
                            </span>
                            <span className="font-semibold">
                              {typeof val === 'number' && key.toLowerCase().includes('pkr')
                                ? `Rs. ${val.toLocaleString()}`
                                : Array.isArray(val)
                                ? val.join(', ')
                                : String(val)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {req.reviewNotes && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-2.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                      <span className="font-bold">Head Office Decision Note: </span>
                      {req.reviewNotes}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                {isSuperAdmin && req.status === 'Pending' && (
                  <div className="flex md:flex-col items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenReview(req, 'approve')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 active:scale-98 transition w-full md:w-36"
                    >
                      <Check className="h-4 w-4" />
                      <span>Approve & Execute</span>
                    </button>

                    <button
                      onClick={() => handleOpenReview(req, 'reject')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-xs hover:bg-rose-50 dark:border-slate-800 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/40 transition w-full md:w-36"
                    >
                      <X className="h-4 w-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Confirmation Modal */}
      {selectedRequest && reviewModalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  reviewModalAction === 'approve'
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                }`}
              >
                {reviewModalAction === 'approve' ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {reviewModalAction === 'approve'
                    ? 'Authorize & Execute Request'
                    : 'Decline / Reject Request'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedRequest.title} ({selectedRequest.branchName})
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300 space-y-1">
              <p>
                <strong>Requested Action:</strong> {selectedRequest.type.replace(/_/g, ' ')}
              </p>
              <p>
                <strong>Branch In-Charge:</strong> {selectedRequest.requestedByUserName}
              </p>
              {reviewModalAction === 'approve' && (
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                  Upon approval, this action will immediately be committed to the branch database and logged in ISO audit records.
                </p>
              )}
            </div>

            <form onSubmit={handleConfirmReview} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Head Office Reviewer Notes & Justification
                </label>
                <textarea
                  rows={3}
                  required
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter administrative notes, authorization code, or reason for rejection..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setReviewModalAction(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold text-white shadow transition ${
                    reviewModalAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {reviewModalAction === 'approve' ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Confirm Authorization</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      <span>Confirm Rejection</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
