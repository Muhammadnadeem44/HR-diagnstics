import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  CreditCard,
  TrendingDown,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { AdvanceLoanRecord, LoanType, EmployeeProfile } from '../../types';

interface AdvanceLoanManagerProps {
  activeBranchId?: string;
  onLoanUpdated: () => void;
}

export const AdvanceLoanManager: React.FC<AdvanceLoanManagerProps> = ({
  activeBranchId = 'all',
  onLoanUpdated,
}) => {
  const [loans, setLoans] = useState<AdvanceLoanRecord[]>(() => StorageService.getAdvanceLoans(activeBranchId));
  const employees = StorageService.getEmployees(activeBranchId);
  const branches = StorageService.getBranches();

  // Create Loan Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [loanType, setLoanType] = useState<LoanType>('Advance Salary');
  const [totalAmount, setTotalAmount] = useState<number>(20000);
  const [monthlyDeduction, setMonthlyDeduction] = useState<number>(5000);
  const [disbursedDate, setDisbursedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Personal / Medical emergency');

  // Manual Repayment Modal State
  const [repaymentModalLoan, setRepaymentModalLoan] = useState<AdvanceLoanRecord | null>(null);
  const [manualPaymentAmount, setManualPaymentAmount] = useState<number>(5000);

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === selectedEmpId);
    if (!emp) {
      alert('Please select a valid employee.');
      return;
    }

    const installmentsCount = Math.ceil(totalAmount / (monthlyDeduction || 1));
    const newLoan: AdvanceLoanRecord = {
      id: `loan_${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeCode: emp.employeeCode,
      branchId: emp.branchId,
      branchName: emp.branchName,
      loanType,
      totalAmount: Number(totalAmount),
      disbursedDate,
      monthlyDeductionAmount: Number(monthlyDeduction),
      remainingBalance: Number(totalAmount),
      installmentsCount,
      installmentsPaid: 0,
      reason,
      approvedBy: 'Super Admin',
      status: 'Active',
      repaymentHistory: [],
    };

    StorageService.saveAdvanceLoan(newLoan);
    setLoans(StorageService.getAdvanceLoans(activeBranchId));
    setIsModalOpen(false);
    onLoanUpdated();
  };

  const handleManualRepayment = () => {
    if (!repaymentModalLoan) return;
    const pay = Math.min(repaymentModalLoan.remainingBalance, Number(manualPaymentAmount));
    StorageService.recordLoanRepayment(repaymentModalLoan.id, pay);
    setLoans(StorageService.getAdvanceLoans(activeBranchId));
    setRepaymentModalLoan(null);
    onLoanUpdated();
  };

  const totalOutstandingBalance = loans
    .filter((l) => l.status === 'Active')
    .reduce((sum, l) => sum + (l.remainingBalance || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500">Total Outstanding Advances / Loans</span>
          <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            Rs. {totalOutstandingBalance.toLocaleString()}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Auto-deducted from monthly payslips</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500">Active Borrowers</span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {loans.filter((l) => l.status === 'Active').length} staff
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Across laboratory branches</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Quick Issue</span>
            <p className="text-xs text-slate-400 mt-0.5">Sanction new advance</p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Issue Advance / Loan
          </button>
        </div>
      </div>

      {/* Loans List */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-teal-600" />
            Advance Salary & Staff Loan Ledger
          </h4>
          <span className="text-xs text-slate-500">{loans.length} recorded</span>
        </div>

        {loans.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No employee loans or salary advances currently registered.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider dark:bg-slate-800 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Type & Reason</th>
                  <th className="py-3 px-4">Disbursed Date</th>
                  <th className="py-3 px-4 text-right">Total Sanctioned</th>
                  <th className="py-3 px-4 text-right">Monthly Cut</th>
                  <th className="py-3 px-4 text-right">Remaining Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{loan.employeeName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {loan.employeeCode} • {loan.branchName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-teal-700 dark:text-teal-400">{loan.loanType}</div>
                      <div className="text-[11px] text-slate-500 max-w-xs truncate">{loan.reason}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{loan.disbursedDate}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      Rs. {loan.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-600 dark:text-amber-400 font-bold">
                      Rs. {loan.monthlyDeductionAmount.toLocaleString()}/mo
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                      Rs. {loan.remainingBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                          loan.status === 'Active'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {loan.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {loan.remainingBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setRepaymentModalLoan(loan);
                            setManualPaymentAmount(Math.min(loan.remainingBalance, loan.monthlyDeductionAmount));
                          }}
                          className="rounded-lg bg-teal-50 border border-teal-200 px-2 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-100 dark:bg-teal-950/50 dark:border-teal-800 dark:text-teal-300"
                        >
                          Record Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sanction Loan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-teal-600" />
              Issue Advance Salary / Staff Loan
            </h3>

            <form onSubmit={handleCreateLoan} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Employee</label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode}) — {emp.designation} (Gross: Rs. {emp.grossSalary.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Loan / Advance Type</label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="Advance Salary">Advance Salary</option>
                    <option value="Personal Loan">Personal Loan</option>
                    <option value="Emergency Medical Loan">Emergency Medical Loan</option>
                    <option value="Bike / Vehicle Loan">Bike / Vehicle Loan</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Disbursed Date</label>
                  <input
                    type="date"
                    required
                    value={disbursedDate}
                    onChange={(e) => setDisbursedDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Amount (PKR)</label>
                  <input
                    type="number"
                    min={1000}
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Monthly Deduction (PKR)</label>
                  <input
                    type="number"
                    min={500}
                    required
                    value={monthlyDeduction}
                    onChange={(e) => setMonthlyDeduction(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reason / Notes</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Urgent family medical expense or advance for Eid"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700"
                >
                  Approve & Disburse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Repayment Modal */}
      {repaymentModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Cash / Direct Repayment</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Employee: <strong>{repaymentModalLoan.employeeName}</strong>
            </p>
            <p className="text-xs text-rose-600 font-mono mt-1">
              Outstanding: Rs. {repaymentModalLoan.remainingBalance.toLocaleString()}
            </p>

            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Repayment Amount (PKR)</label>
                <input
                  type="number"
                  min={1}
                  max={repaymentModalLoan.remainingBalance}
                  value={manualPaymentAmount}
                  onChange={(e) => setManualPaymentAmount(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRepaymentModalLoan(null)}
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualRepayment}
                  className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow"
                >
                  Confirm Repayment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
