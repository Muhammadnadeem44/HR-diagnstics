import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Building2,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Briefcase,
  Layers,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { EmployeeProfile, ShiftTiming } from '../../types';

interface EmployeeProfileManagerProps {
  activeBranchId?: string;
  onEmployeeSaved: () => void;
}

export const EmployeeProfileManager: React.FC<EmployeeProfileManagerProps> = ({
  activeBranchId = 'all',
  onEmployeeSaved,
}) => {
  const [employees, setEmployees] = useState<EmployeeProfile[]>(() => StorageService.getEmployees(activeBranchId));
  const branches = StorageService.getBranches();
  const departments = StorageService.getDepartments();
  const shifts = StorageService.getShiftTimings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [phone, setPhone] = useState('+92 300 1234567');
  const [email, setEmail] = useState('');
  const [cnic, setCnic] = useState('35201-1234567-1');
  const [designation, setDesignation] = useState('Medical Lab Technologist (MLT)');
  const [branchId, setBranchId] = useState(branches[0]?.id || 'br_headoffice');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || 'dept_hematology');
  const [shiftId, setShiftId] = useState(shifts[0]?.id || 'shift_morning');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [employmentType, setEmploymentType] = useState<EmployeeProfile['employmentType']>('Permanent');
  
  // Salary structure (PKR)
  const [basicSalary, setBasicSalary] = useState(55000);
  const [medicalAllowance, setMedicalAllowance] = useState(8000);
  const [transportAllowance, setTransportAllowance] = useState(7000);
  const [housingAllowance, setHousingAllowance] = useState(10000);
  const [specialAllowance, setSpecialAllowance] = useState(5000);
  const [paymentMode, setPaymentMode] = useState<EmployeeProfile['paymentMode']>('Bank Transfer');
  const [bankName, setBankName] = useState('Habib Bank Limited (HBL)');
  const [accountNumber, setAccountNumber] = useState('PK36HABB00012345678901');

  const grossSalary = Number(basicSalary) + Number(medicalAllowance) + Number(transportAllowance) + Number(housingAllowance) + Number(specialAllowance);

  const handleOpenAdd = () => {
    setEditingEmpId(null);
    setName('');
    setEmployeeCode(`EMP-${Math.floor(100 + Math.random() * 900)}`);
    setPhone('+92 300 1234567');
    setEmail('');
    setCnic('35201-1234567-1');
    setDesignation('Medical Lab Technologist (MLT)');
    setBasicSalary(55000);
    setMedicalAllowance(8000);
    setTransportAllowance(7000);
    setHousingAllowance(10000);
    setSpecialAllowance(5000);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeProfile) => {
    setEditingEmpId(emp.id);
    setName(emp.name);
    setEmployeeCode(emp.employeeCode);
    setPhone(emp.phone);
    setEmail(emp.email || '');
    setCnic(emp.cnic || '');
    setDesignation(emp.designation);
    setBranchId(emp.branchId);
    setDepartmentId(emp.departmentId);
    setShiftId(emp.shiftId || shifts[0]?.id || '');
    setJoiningDate(emp.joiningDate);
    setEmploymentType(emp.employmentType);
    setBasicSalary(emp.basicSalary);
    setMedicalAllowance(emp.medicalAllowance);
    setTransportAllowance(emp.transportAllowance);
    setHousingAllowance(emp.housingAllowance);
    setSpecialAllowance(emp.specialAllowance);
    setPaymentMode(emp.paymentMode);
    setBankName(emp.bankName || '');
    setAccountNumber(emp.accountNumberOrIBAN || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const branchName = branches.find((b) => b.id === branchId)?.name || 'Central Lab';
    const deptName = departments.find((d) => d.id === departmentId)?.name || 'Pathology';

    const empProfile: EmployeeProfile = {
      id: editingEmpId || `emp_${Date.now()}`,
      employeeCode,
      name,
      phone,
      email,
      cnic,
      designation,
      branchId,
      branchName,
      departmentId,
      departmentName: deptName,
      shiftId,
      joiningDate,
      employmentType,
      salaryType: 'Monthly Fixed',
      basicSalary: Number(basicSalary),
      medicalAllowance: Number(medicalAllowance),
      transportAllowance: Number(transportAllowance),
      housingAllowance: Number(housingAllowance),
      specialAllowance: Number(specialAllowance),
      grossSalary,
      paymentMode,
      bankName,
      accountNumberOrIBAN: accountNumber,
      isActive: true,
    };

    StorageService.saveEmployee(empProfile);
    setEmployees(StorageService.getEmployees(activeBranchId));
    setIsModalOpen(false);
    onEmployeeSaved();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this employee profile?')) {
      StorageService.deleteEmployee(id);
      setEmployees(StorageService.getEmployees(activeBranchId));
      onEmployeeSaved();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-600" />
            Hospital & Lab Staff Directory ({employees.length})
          </h3>
          <p className="text-xs text-slate-500">
            Pathologists, Lab Technologists, Phlebotomists, Biomedical Engineers, and Storekeepers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Employee Profile
        </button>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900 space-y-3">
          <Users className="h-10 w-10 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Employee Profiles Enrolled</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Enroll your staff members with their Biometric enroll ID (ZKTeco device code) and monthly salary structure.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" /> Enroll First Staff Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{emp.name}</h4>
                    <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">{emp.designation}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Code: <strong className="text-slate-700 dark:text-slate-200">{emp.employeeCode}</strong> • {emp.departmentName}
                    </p>
                  </div>
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-extrabold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {emp.employmentType}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Branch:</span>
                    <span className="font-semibold truncate max-w-[150px]">{emp.branchName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gross Salary:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      Rs. {emp.grossSalary.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-mono">{emp.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Mode:</span>
                    <span>{emp.paymentMode}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(emp)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  title="Edit Profile & Salary"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(emp.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Delete Profile"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              {editingEmpId ? 'Edit Employee Profile & Pay Structure' : 'Enroll New Laboratory Staff Member'}
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Hina Bano / Asad MLT"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Biometric Enroll ID (ZK Code)</label>
                  <input
                    type="text"
                    required
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="e.g. EMP-101 or 101"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Designation / Title</label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Senior Pathologist"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">CNIC / ID Card</label>
                  <input
                    type="text"
                    value={cnic}
                    onChange={(e) => setCnic(e.target.value)}
                    placeholder="35201-xxxxxxx-x"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Branch</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Shift</label>
                  <select
                    value={shiftId}
                    onChange={(e) => setShiftId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Salary Structure Section */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-900 dark:bg-teal-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    Salary & Compensation Structure (PKR)
                  </h4>
                  <span className="text-xs font-mono font-black text-teal-700 dark:text-teal-300">
                    Gross: Rs. {grossSalary.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Basic Pay</label>
                    <input
                      type="number"
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(Number(e.target.value))}
                      className="mt-0.5 w-full rounded-lg border border-slate-300 p-1.5 text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Medical Allow.</label>
                    <input
                      type="number"
                      value={medicalAllowance}
                      onChange={(e) => setMedicalAllowance(Number(e.target.value))}
                      className="mt-0.5 w-full rounded-lg border border-slate-300 p-1.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Transport Allow.</label>
                    <input
                      type="number"
                      value={transportAllowance}
                      onChange={(e) => setTransportAllowance(Number(e.target.value))}
                      className="mt-0.5 w-full rounded-lg border border-slate-300 p-1.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Housing Allowance</label>
                    <input
                      type="number"
                      value={housingAllowance}
                      onChange={(e) => setHousingAllowance(Number(e.target.value))}
                      className="mt-0.5 w-full rounded-lg border border-slate-300 p-1.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Special / Diagnostic Allow.</label>
                    <input
                      type="number"
                      value={specialAllowance}
                      onChange={(e) => setSpecialAllowance(Number(e.target.value))}
                      className="mt-0.5 w-full rounded-lg border border-slate-300 p-1.5 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HBL / Meezan"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bank Account # / IBAN</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="PK36..."
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
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
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
