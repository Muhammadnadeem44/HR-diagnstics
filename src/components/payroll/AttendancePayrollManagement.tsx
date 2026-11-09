import React, { useState } from 'react';
import {
  Fingerprint,
  Users,
  DollarSign,
  CreditCard,
  Cpu,
  Calendar,
  Building2,
  Sparkles,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { DailyAttendanceView } from './DailyAttendanceView';
import { BiometricMachineManager } from './BiometricMachineManager';
import { EmployeeProfileManager } from './EmployeeProfileManager';
import { AdvanceLoanManager } from './AdvanceLoanManager';
import { PayrollGenerator } from './PayrollGenerator';
import { StorageService } from '../../services/storage';

interface AttendancePayrollManagementProps {
  currentUser?: UserAccount | null;
  activeBranchId?: string;
}

export const AttendancePayrollManagement: React.FC<AttendancePayrollManagementProps> = ({
  currentUser,
  activeBranchId = 'all',
}) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'devices' | 'employees' | 'loans' | 'payroll'>('attendance');
  const [dataVersion, setDataVersion] = useState(0);

  const branches = StorageService.getBranches();
  const currentBranchName =
    activeBranchId === 'all'
      ? 'All Diagnostic Facilities'
      : branches.find((b) => b.id === activeBranchId)?.name || 'Central Facility';

  const triggerUpdate = () => setDataVersion((v) => v + 1);

  return (
    <div className="space-y-7 pb-16">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/90 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Human Capital & Operations</span>
            <span aria-hidden="true">·</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              Attendance & Payroll Engine
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Staff Attendance & Automated Payroll
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            ZKTeco Biometric device synchronization, daily punch audit, advance loan ledger, and automated salary slip engine.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2 dark:bg-slate-800/80 dark:border-slate-700">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {currentBranchName}
            </span>
          </div>
        </div>
      </div>

      {/* Modern Segmented Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Fingerprint className="h-4 w-4" />
          <span>Daily Punch Logs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('devices')}
          className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
            activeTab === 'devices'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>Biometric Machines (ZKTeco)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('employees')}
          className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
            activeTab === 'employees'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Staff & Compensation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loans')}
          className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
            activeTab === 'loans'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Advance Salary & Loans</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payroll')}
          className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
            activeTab === 'payroll'
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Salary Engine & Accounting</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'attendance' && (
          <DailyAttendanceView
            activeBranchId={activeBranchId}
            onRecordPunched={triggerUpdate}
          />
        )}

        {activeTab === 'devices' && (
          <BiometricMachineManager
            activeBranchId={activeBranchId}
            onPunchesImported={triggerUpdate}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeProfileManager
            activeBranchId={activeBranchId}
            onEmployeeSaved={triggerUpdate}
          />
        )}

        {activeTab === 'loans' && (
          <AdvanceLoanManager
            activeBranchId={activeBranchId}
            onLoanUpdated={triggerUpdate}
          />
        )}

        {activeTab === 'payroll' && (
          <PayrollGenerator
            activeBranchId={activeBranchId}
            onPayrollGenerated={triggerUpdate}
          />
        )}
      </div>
    </div>
  );
};
