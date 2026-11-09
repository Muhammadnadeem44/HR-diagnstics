import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Sliders,
  Building2,
  Users,
  Database,
  FileCheck,
  Download,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Hash,
  Clock,
  Sparkles,
  Info,
  Server,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { SuperAdminActivityLog, SuperAdminLogCategory, SuperAdminLogActionType } from '../../types';

interface SuperAdminActivityLedgerProps {
  embeddedInAudits?: boolean;
}

export const SuperAdminActivityLedger: React.FC<SuperAdminActivityLedgerProps> = ({
  embeddedInAudits = false,
}) => {
  const [logs, setLogs] = useState<SuperAdminActivityLog[]>(() =>
    StorageService.getSuperAdminActivityLogs()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | SuperAdminLogCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE' | 'BLOCKED'>('ALL');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    checkedCount: number;
    brokenIndex?: number;
    error?: string;
  } | null>(null);

  // Refresh logs from storage
  const reloadLogs = () => {
    const fresh = StorageService.getSuperAdminActivityLogs();
    setLogs(fresh);
  };

  // Listen to in-window and broadcast ledger updates
  useEffect(() => {
    const handleEntry = () => reloadLogs();
    window.addEventListener('hr-sa-ledger-entry', handleEntry);
    return () => window.removeEventListener('hr-sa-ledger-entry', handleEntry);
  }, []);

  // Run integrity verification on load
  useEffect(() => {
    const result = StorageService.verifyLedgerIntegrity();
    setVerificationResult(result);
  }, [logs]);

  const handleRunIntegrityCheck = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const result = StorageService.verifyLedgerIntegrity();
      setVerificationResult(result);
      setIsVerifying(false);
    }, 400);
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category Filter
      if (categoryFilter !== 'ALL' && log.category !== categoryFilter) return false;
      // Status Filter
      if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;
      // Action Type Filter
      if (actionTypeFilter !== 'ALL' && log.actionType !== actionTypeFilter) return false;

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDetails = log.details.toLowerCase().includes(q);
        const matchActor = log.actorEmail.toLowerCase().includes(q) || log.actorName.toLowerCase().includes(q);
        const matchAction = log.actionType.toLowerCase().includes(q);
        const matchTarget = (log.targetEntity || '').toLowerCase().includes(q);
        const matchHash = log.currentHash.toLowerCase().includes(q) || log.previousHash.toLowerCase().includes(q);
        const matchSeq = `#${log.sequenceNumber}`.includes(q);
        if (!matchDetails && !matchActor && !matchAction && !matchTarget && !matchHash && !matchSeq) {
          return false;
        }
      }

      return true;
    });
  }, [logs, categoryFilter, statusFilter, actionTypeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const loginAttempts = logs.filter((l) => l.category === 'LOGIN_ATTEMPT').length;
    const configChanges = logs.filter((l) => l.category === 'CONFIG_CHANGE').length;
    const successfulLogins = logs.filter((l) => l.actionType === 'LOGIN_SUCCESS').length;
    const failedLogins = logs.filter((l) => l.actionType === 'LOGIN_FAILED' || l.actionType === 'LOGIN_LOCKED').length;
    const userRoleChanges = logs.filter((l) => l.actionType === 'RBAC_PERMISSION_CHANGE' || l.actionType.startsWith('USER_')).length;
    const branchChanges = logs.filter((l) => l.actionType.startsWith('BRANCH_')).length;

    return {
      total,
      loginAttempts,
      configChanges,
      successfulLogins,
      failedLogins,
      userRoleChanges,
      branchChanges,
    };
  }, [logs]);

  // Export verifiable audit certificate JSON
  const handleExportAuditLedger = () => {
    const exportPackage = {
      system: 'HR Diagnostics Multi-Branch ERP',
      module: 'Super Admin Immutable Activity & Configuration Ledger',
      exportedAt: new Date().toISOString(),
      integrityStatus: verificationResult?.isValid ? 'VERIFIED_CRYPTOGRAPHICALLY_INTACT' : 'TAMPER_DETECTED',
      totalChainedBlocks: logs.length,
      headHash: logs[0]?.currentHash || 'N/A',
      genesisHash: logs[logs.length - 1]?.previousHash || '0000000000000000000000000000000000000000000000000000000000000000',
      ledgerEntries: logs,
    };

    const blob = new Blob([JSON.stringify(exportPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HR_Diagnostics_SuperAdmin_ImmutableLedger_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getActionBadgeColor = (actionType: SuperAdminLogActionType) => {
    switch (actionType) {
      case 'LOGIN_SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'LOGIN_FAILED':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
      case 'LOGIN_LOCKED':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
      case 'LOGOUT':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      case 'BRANCH_CREATED':
      case 'BRANCH_UPDATED':
      case 'BRANCH_DELETED':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800';
      case 'USER_CREATED':
      case 'USER_UPDATED':
      case 'USER_DELETED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
      case 'RBAC_PERMISSION_CHANGE':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'SECURITY_POLICY_CHANGE':
        return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800';
      case 'DATABASE_BACKUP_EXPORT':
      case 'DATABASE_RESTORE':
      case 'DATABASE_CLEAN_RESET':
      case 'FORMULARY_INITIALIZE':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    }
  };

  const getActionIcon = (actionType: SuperAdminLogActionType) => {
    switch (actionType) {
      case 'LOGIN_SUCCESS':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'LOGIN_FAILED':
        return <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />;
      case 'LOGIN_LOCKED':
        return <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />;
      case 'LOGOUT':
        return <Clock className="h-3.5 w-3.5 text-slate-500" />;
      case 'BRANCH_CREATED':
      case 'BRANCH_UPDATED':
      case 'BRANCH_DELETED':
        return <Building2 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />;
      case 'USER_CREATED':
      case 'USER_UPDATED':
      case 'USER_DELETED':
        return <Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'RBAC_PERMISSION_CHANGE':
        return <Sliders className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
      case 'SECURITY_POLICY_CHANGE':
        return <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />;
      case 'DATABASE_BACKUP_EXPORT':
      case 'DATABASE_RESTORE':
      case 'DATABASE_CLEAN_RESET':
      case 'FORMULARY_INITIALIZE':
        return <Database className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />;
      default:
        return <FileCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Headline */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <span>Super Admin Immutable Activity & Configuration Ledger</span>
            </h3>
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-teal-800 uppercase dark:bg-teal-950 dark:text-teal-300">
              WORM Ledger
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Immutable, append-only chronological log of all login attempts and configuration changes performed by the Super Admin account (<span className="font-semibold text-slate-700 dark:text-slate-300">mrnadeemmobile20@gmail.com</span>). Sealed with SHA-256 cryptographic chaining.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunIntegrityCheck}
            disabled={isVerifying}
            className="flex items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50/80 px-3.5 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 transition shadow-xs dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Verifying Hashes...' : 'Verify Cryptographic Integrity'}</span>
          </button>

          <button
            onClick={handleExportAuditLedger}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Immutable Audit Record</span>
          </button>
        </div>
      </div>

      {/* Cryptographic Integrity Status Banner */}
      {verificationResult && (
        <div
          className={`rounded-2xl border p-4 transition-all ${
            verificationResult.isValid
              ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20'
              : 'border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/20'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  verificationResult.isValid
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                }`}
              >
                {verificationResult.isValid ? (
                  <ShieldCheck className="h-5 w-5" />
                ) : (
                  <ShieldAlert className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      verificationResult.isValid ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {verificationResult.isValid
                      ? 'Cryptographic Immutability Verified'
                      : 'Cryptographic Chain Alert'}
                  </span>
                  <span className="rounded bg-white/80 dark:bg-slate-900 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    {verificationResult.checkedCount} Chained Blocks Tested
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {verificationResult.isValid
                    ? `Every block's SHA-256 seal matches its chronological predecessor. No unauthorized deletions, sequence alterations, or record modifications detected.`
                    : verificationResult.error}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase font-bold text-slate-400">Head Block Hash</div>
              <div className="font-mono text-[11px] font-bold text-teal-700 dark:text-teal-300 truncate max-w-[200px] sm:max-w-[260px]">
                {logs[0]?.currentHash ? `${logs[0].currentHash.slice(0, 16)}...${logs[0].currentHash.slice(-8)}` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Immutable Logs</span>
            <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <div className="mt-1 text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
            Append-Only Cryptographic Chain
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Login Attempts</span>
            <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {stats.loginAttempts}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">{stats.successfulLogins} Success</span>
            <span>•</span>
            <span className="text-rose-600 font-bold">{stats.failedLogins} Failed/Blocked</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Configuration Changes</span>
            <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {stats.configChanges}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>{stats.userRoleChanges} User/RBAC</span>
            <span>•</span>
            <span>{stats.branchChanges} Branches</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Super Admin Account</span>
            <Lock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white truncate">
            Mr. Nadeem
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
            mrnadeemmobile20@gmail.com
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by details, actor, action, hash, sequence # or target entity..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-teal-400"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
            Category:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="ALL">All Categories ({logs.length})</option>
            <option value="LOGIN_ATTEMPT">Login Attempts Only ({stats.loginAttempts})</option>
            <option value="CONFIG_CHANGE">Configuration Changes ({stats.configChanges})</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILURE">Failures</option>
            <option value="BLOCKED">Blocked / Locked</option>
          </select>
        </div>

        {/* Action Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
            Action:
          </span>
          <select
            value={actionTypeFilter}
            onChange={(e) => setActionTypeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-teal-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white max-w-[160px]"
          >
            <option value="ALL">All Actions</option>
            <option value="LOGIN_SUCCESS">Login: Success</option>
            <option value="LOGIN_FAILED">Login: Failed</option>
            <option value="LOGIN_LOCKED">Login: Locked Out</option>
            <option value="LOGOUT">Session Logout</option>
            <option value="BRANCH_CREATED">Branch: Created</option>
            <option value="BRANCH_UPDATED">Branch: Updated</option>
            <option value="BRANCH_DELETED">Branch: Decommissioned</option>
            <option value="USER_CREATED">User: Provisioned</option>
            <option value="USER_UPDATED">User: Updated</option>
            <option value="USER_DELETED">User: Deleted</option>
            <option value="RBAC_PERMISSION_CHANGE">RBAC Permissions</option>
            <option value="SECURITY_POLICY_CHANGE">Security Policies</option>
            <option value="BRANDING_CONFIG_CHANGE">Branding & Logo</option>
            <option value="DATABASE_BACKUP_EXPORT">Backup Export</option>
            <option value="DATABASE_RESTORE">Database Restore</option>
            <option value="DATABASE_CLEAN_RESET">Commissioning Reset</option>
            <option value="FORMULARY_INITIALIZE">Formulary Seed</option>
          </select>
        </div>
      </div>

      {/* Immutable Ledger Records Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Immutable Ledger Stream ({filteredLogs.length} Records)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
            <Lock className="h-3 w-3 text-teal-500" />
            <span>Strict Immutability Enforced: Zero Alterations / Deletions Permitted</span>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              No activity logs match the selected filter criteria.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('ALL');
                setStatusFilter('ALL');
                setActionTypeFilter('ALL');
              }}
              className="mt-3 text-xs text-teal-600 hover:underline font-semibold"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const dateObj = new Date(log.timestamp);
              const formattedDate = dateObj.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const formattedTime = dateObj.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: Sequence, Icon, Action, and Details */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Sequence Badge */}
                      <div className="shrink-0 pt-0.5">
                        <span className="inline-flex items-center justify-center font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          #{String(log.sequenceNumber).padStart(3, '0')}
                        </span>
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {/* Action Type Badge */}
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getActionBadgeColor(
                              log.actionType
                            )}`}
                          >
                            {getActionIcon(log.actionType)}
                            <span>{log.actionType.replace(/_/g, ' ')}</span>
                          </span>

                          {/* Category Tag */}
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {log.category === 'LOGIN_ATTEMPT' ? 'Authentication Gate' : 'System Configuration'}
                          </span>

                          {/* Status */}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : log.status === 'BLOCKED'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {log.status}
                          </span>

                          {/* Target Entity */}
                          {log.targetEntity && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[220px]">
                              → {log.targetEntity}
                            </span>
                          )}
                        </div>

                        {/* Details text */}
                        <div className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                          {log.details}
                        </div>

                        {/* Actor & Timestamp */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <span className="font-bold">{log.actorName}</span>
                            <span className="text-slate-400">({log.actorEmail})</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>
                              {formattedDate} at {formattedTime}
                            </span>
                          </span>
                          {log.metadata?.ipAddress && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-slate-400">
                                IP: {log.metadata.ipAddress}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Cryptographic Chain Inspector Toggle */}
                    <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <Hash className="h-3 w-3 text-teal-500" />
                        <span>SHA-256 Seal</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Cryptographic Inspector Accordion */}
                  {isExpanded && (
                    <div className="mt-3.5 rounded-xl border border-teal-200 bg-teal-50/40 p-3.5 dark:border-teal-900/60 dark:bg-teal-950/20 text-xs font-mono space-y-2.5">
                      <div className="flex items-center justify-between border-b border-teal-200/60 pb-2 dark:border-teal-900/60 font-sans">
                        <span className="font-bold text-teal-900 dark:text-teal-200 text-xs flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-teal-600" />
                          <span>Tamper-Evident Cryptographic Block #{log.sequenceNumber}</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/50 px-2 py-0.5 rounded">
                          ✓ Hash Verified Intact
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <div className="text-[10px] font-sans font-bold uppercase text-slate-500 dark:text-slate-400">
                            Current Block SHA-256 Hash
                          </div>
                          <div className="mt-0.5 break-all font-mono font-bold text-teal-800 dark:text-teal-300 bg-white/80 dark:bg-slate-900 p-2 rounded border border-teal-100 dark:border-teal-900/40">
                            {log.currentHash}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-sans font-bold uppercase text-slate-500 dark:text-slate-400">
                            Previous Block Hash (Chained)
                          </div>
                          <div className="mt-0.5 break-all font-mono font-medium text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                            {log.previousHash}
                          </div>
                        </div>
                      </div>

                      {log.metadata && (
                        <div className="pt-2 border-t border-teal-200/60 dark:border-teal-900/60 font-sans text-[11px] text-slate-600 dark:text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Client Context: </span>
                          <span>{log.metadata.userAgent || 'Enterprise Node'}</span>
                          {log.metadata.failureReason && (
                            <div className="mt-1 text-rose-600 font-bold">
                              Reason: {log.metadata.failureReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security & Immutability Architecture Callout */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60 flex items-start gap-3">
        <Info className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <span className="font-bold text-slate-900 dark:text-white">
            Enterprise Security Compliance (ISO 15189 & HIPAA/CAP Audit Trail):
          </span>{' '}
          All administrative configuration changes (branch setup, user roles, RBAC matrix, branding, backup exports, and database resets) as well as executive login attempts are automatically sealed into this ledger. No user, including the Super Admin, can modify or delete existing blocks.
        </div>
      </div>
    </div>
  );
};
