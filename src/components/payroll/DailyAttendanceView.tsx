import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Building2,
  Fingerprint,
  RotateCcw,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { AttendanceRecord, ShiftTiming } from '../../types';

interface DailyAttendanceViewProps {
  activeBranchId?: string;
  onRecordPunched: () => void;
}

export const DailyAttendanceView: React.FC<DailyAttendanceViewProps> = ({
  activeBranchId = 'all',
  onRecordPunched,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [records, setRecords] = useState<AttendanceRecord[]>(() =>
    StorageService.getAttendanceRecords({ date: todayStr, branchId: activeBranchId })
  );
  const employees = StorageService.getEmployees(activeBranchId);
  const branches = StorageService.getBranches();

  // Manual Punch Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [punchType, setPunchType] = useState<'check_in' | 'check_out'>('check_in');
  const [punchTime, setPunchTime] = useState(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState('Manual correction / on-duty punch');

  const refreshList = (date: string) => {
    setRecords(StorageService.getAttendanceRecords({ date, branchId: activeBranchId }));
  };

  const handleManualPunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) return;

    StorageService.recordAttendancePunch({
      employeeId: selectedEmpId,
      date: selectedDate,
      time: `${punchTime}:00`,
      punchType,
      punchMethod: 'Manual Log',
      notes,
    });

    refreshList(selectedDate);
    setIsManualModalOpen(false);
    onRecordPunched();
  };

  const presentCount = records.filter((r) => r.status === 'Present').length;
  const lateCount = records.filter((r) => r.status === 'Late').length;
  const halfDayCount = records.filter((r) => r.status === 'Half Day').length;

  return (
    <div className="space-y-4">
      {/* Top Bar with Date & Manual Punch */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-teal-600" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Attendance Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              refreshList(e.target.value);
            }}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Manual Punch / Mark Present
          </button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Present On-Duty</span>
          <h4 className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{presentCount} staff</h4>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Late Arrivals</span>
          <h4 className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{lateCount} staff</h4>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Half Day</span>
          <h4 className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">{halfDayCount} staff</h4>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Total Enrolled</span>
          <h4 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{employees.length} staff</h4>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-2xs">
        {records.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No biometric attendance logs found for <strong>{selectedDate}</strong>. Use "Manual Punch" or click "Sync Logs Now" in Biometric Machines.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider dark:bg-slate-800 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Branch & Dept</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4 text-center">Work Hours</th>
                  <th className="py-3 px-4">Method / Machine</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{r.employeeName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">ID: {r.employeeCode}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{r.branchName}</div>
                      <div className="text-[11px] text-slate-400">{r.departmentName}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                      {r.checkInTime || '—'}
                      {r.lateMinutes > 0 && (
                        <span className="block text-[10px] text-rose-500 font-normal">
                          +{r.lateMinutes}m late
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {r.checkOutTime || '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {r.workHours ? `${r.workHours} hrs` : 'In Progress'}
                      {r.overtimeHours > 0 && (
                        <span className="block text-[10px] text-emerald-600 font-bold">
                          +{r.overtimeHours}h OT
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Fingerprint className="h-3.5 w-3.5 text-teal-600" />
                        <span>{r.punchMethod}</span>
                      </div>
                      {r.deviceName && (
                        <span className="text-[10px] text-slate-400 truncate max-w-xs block">
                          {r.deviceName}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                          r.status === 'Present'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : r.status === 'Late'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Punch Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-teal-600" />
              Manual Attendance Punch
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mark check-in or check-out for staff without biometric punch.
            </p>

            <form onSubmit={handleManualPunch} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Employee</label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode}) — {emp.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Punch Type</label>
                  <select
                    value={punchType}
                    onChange={(e) => setPunchType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="check_in">Check-In (Arrival)</option>
                    <option value="check_out">Check-Out (Departure)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Time (HH:MM)</label>
                  <input
                    type="time"
                    required
                    value={punchTime}
                    onChange={(e) => setPunchTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Remarks / Reason</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Device offline, field visit, on-duty approval"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700"
                >
                  Confirm Punch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
