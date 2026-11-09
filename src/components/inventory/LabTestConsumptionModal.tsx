import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  Layers,
  History,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Plus,
  Trash2,
  X,
  FileText,
  Calendar,
  Activity,
  Cpu,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { LabTestProtocol, LabTestExecutionLog, Branch, InventoryItem } from '../../types';

interface LabTestConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBranchId: string;
  currentUser?: any;
  onConsumptionExecuted?: () => void;
}

export const LabTestConsumptionModal: React.FC<LabTestConsumptionModalProps> = ({
  isOpen,
  onClose,
  activeBranchId,
  currentUser,
  onConsumptionExecuted,
}) => {
  const [activeTab, setActiveTab] = useState<'execute' | 'protocols' | 'history'>('execute');
  const [protocols, setProtocols] = useState<LabTestProtocol[]>(() => StorageService.getLabTestProtocols());
  const [executionLogs, setExecutionLogs] = useState<LabTestExecutionLog[]>(() => StorageService.getLabTestLogs());
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>(protocols[0]?.id || '');
  const [testCount, setTestCount] = useState<number>(50);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    activeBranchId === 'all' ? StorageService.getBranches()[0]?.id || 'br_headoffice' : activeBranchId
  );
  const [operatorRemarks, setOperatorRemarks] = useState<string>('Standard morning diagnostic outpatient batch run');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [selectedLogForPrint, setSelectedLogForPrint] = useState<LabTestExecutionLog | null>(null);

  // New Protocol Creation State
  const [isCreatingProtocol, setIsCreatingProtocol] = useState(false);
  const [newProtocolCode, setNewProtocolCode] = useState('');
  const [newProtocolName, setNewProtocolName] = useState('');
  const [newProtocolCat, setNewProtocolCat] = useState<LabTestProtocol['category']>('Hematology');
  const [newProtocolAnalyzer, setNewProtocolAnalyzer] = useState('');
  const [newProtocolCost, setNewProtocolCost] = useState<number>(500);
  const [newProtocolReagents, setNewProtocolReagents] = useState<
    { itemName: string; requiredQtyPerTest: number; uom: string }[]
  >([{ itemName: '', requiredQtyPerTest: 1, uom: 'ml' }]);

  if (!isOpen) return null;

  const branches = StorageService.getBranches();
  const inventory = StorageService.getInventory();
  const selectedProtocol = protocols.find((p) => p.id === selectedProtocolId) || protocols[0];
  const activeBranchName = branches.find((b) => b.id === selectedBranchId)?.name || 'Selected Branch';

  const handleExecuteRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProtocol) return;

    const res = StorageService.executeLabTestRun({
      protocolId: selectedProtocol.id,
      testCount: Number(testCount),
      branchId: selectedBranchId,
      branchName: activeBranchName,
      executedByUserId: currentUser?.id || 'admin',
      executedByUserName: currentUser?.name || 'Super Admin',
      analyzerUsed: selectedProtocol.targetAnalyzer,
      remarks: operatorRemarks,
    });

    if (res.success && res.log) {
      setSuccessNotice(
        `Successfully logged ${res.log.runNumber}: Deducted reagents for ${testCount}x ${selectedProtocol.testName} (FEFO Batches allocated).`
      );
      setExecutionLogs(StorageService.getLabTestLogs());
      if (onConsumptionExecuted) onConsumptionExecuted();
      setTimeout(() => setSuccessNotice(null), 6000);
    } else {
      alert(res.error || 'Failed to execute deduction.');
    }
  };

  const handleAddReagentRow = () => {
    setNewProtocolReagents([...newProtocolReagents, { itemName: '', requiredQtyPerTest: 1, uom: 'ml' }]);
  };

  const handleRemoveReagentRow = (idx: number) => {
    setNewProtocolReagents(newProtocolReagents.filter((_, i) => i !== idx));
  };

  const handleSaveNewProtocol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProtocolCode || !newProtocolName) {
      alert('Please fill in Test Code and Test Name.');
      return;
    }

    const validReagents = newProtocolReagents.filter((r) => r.itemName.trim().length > 0);
    if (validReagents.length === 0) {
      alert('Please add at least one reagent mapping.');
      return;
    }

    const newProto: LabTestProtocol = {
      id: `proto_${Date.now()}`,
      testCode: newProtocolCode.toUpperCase(),
      testName: newProtocolName,
      category: newProtocolCat,
      targetAnalyzer: newProtocolAnalyzer || 'Clinical Analyzer',
      costEstimatePKR: newProtocolCost,
      reagents: validReagents,
      active: true,
      notes: 'Custom laboratory test recipe created by user.',
    };

    StorageService.saveLabTestProtocol(newProto);
    const updated = StorageService.getLabTestProtocols();
    setProtocols(updated);
    setSelectedProtocolId(newProto.id);
    setIsCreatingProtocol(false);
    setNewProtocolCode('');
    setNewProtocolName('');
    setNewProtocolReagents([{ itemName: '', requiredQtyPerTest: 1, uom: 'ml' }]);
  };

  const handleDeleteProtocol = (id: string, name: string) => {
    if (confirm(`Confirm deletion of protocol: "${name}"?`)) {
      StorageService.deleteLabTestProtocol(id);
      const updated = StorageService.getLabTestProtocols();
      setProtocols(updated);
      if (selectedProtocolId === id) {
        setSelectedProtocolId(updated[0]?.id || '');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-4 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                Automated Test Consumption & Reagents Deduction
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  FEFO Auto-Engine
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formula-based consumption deduction (e.g. 1 CBC test = 20ml Diluent + 5ml Lyse) with batch expiry priority.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successNotice && (
          <div className="mx-6 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successNotice}</span>
            </div>
            <button
              onClick={() => setSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-200 px-6 pt-3 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('execute')}
            className={`border-b-2 pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'execute'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Play className="h-3.5 w-3.5" />
            <span>Execute Lab Run</span>
          </button>
          <button
            onClick={() => setActiveTab('protocols')}
            className={`border-b-2 pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'protocols'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Test Recipes & Formulas ({protocols.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`border-b-2 pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Execution Audit Logs ({executionLogs.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: EXECUTE LAB RUN */}
          {activeTab === 'execute' && (
            <div className="space-y-6">
              <form onSubmit={handleExecuteRun} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Diagnostic Test Protocol
                    </label>
                    <select
                      value={selectedProtocolId}
                      onChange={(e) => setSelectedProtocolId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs text-slate-900 font-semibold focus:border-teal-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      {protocols.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.testCode} - {p.testName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Executing Lab Branch
                    </label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs text-slate-900 font-semibold focus:border-teal-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Patient Tests Executed (Count)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="5000"
                      value={testCount}
                      onChange={(e) => setTestCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs font-mono font-bold text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                {/* Selected Protocol Summary & Calculated Consumption Card */}
                {selectedProtocol && (
                  <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 dark:border-teal-900/60 dark:bg-teal-950/20 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-200/60 pb-2.5 dark:border-teal-900/60">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase">
                          Target Analyzer: {selectedProtocol.targetAnalyzer || 'Standard Laboratory Analyzer'}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          Formula Calculations for {testCount} Tests ({selectedProtocol.testName})
                        </h4>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        Category: <strong className="text-slate-800 dark:text-slate-200">{selectedProtocol.category}</strong>
                      </span>
                    </div>

                    {/* Reagents Required Breakdown */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-bold uppercase text-[10px] text-slate-500 dark:bg-slate-950 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Reagent Component</th>
                            <th className="py-2.5 px-3">Per Test Dose</th>
                            <th className="py-2.5 px-3 text-right">Total Quantity Needed</th>
                            <th className="py-2.5 px-3 text-right">FEFO Rule Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {selectedProtocol.reagents.map((r, idx) => {
                            const totalReq = r.requiredQtyPerTest * testCount;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850">
                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                  {r.itemName}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 font-mono">
                                  {r.requiredQtyPerTest} {r.uom}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-700 dark:text-teal-300">
                                  {totalReq.toLocaleString()} {r.uom}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    <ShieldCheck className="h-3 w-3" />
                                    Auto Earliest Lot
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Operational Remarks / Sample Batch Reference
                  </label>
                  <input
                    type="text"
                    value={operatorRemarks}
                    onChange={(e) => setOperatorRemarks(e.target.value)}
                    placeholder="e.g. Morning OPD batch #42, tested by Technologist Asim, Quality Control passed."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                  >
                    <Play className="h-4 w-4" />
                    <span>Confirm & Execute Automated FEFO Deduction</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: TEST RECIPES & PROTOCOLS */}
          {activeTab === 'protocols' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    Predefined Reagent Consumption Formulas
                  </h4>
                  <p className="text-xs text-slate-500">
                    Standard operating procedures mapping each diagnostic test run to chemical reagent consumption.
                  </p>
                </div>
                {!isCreatingProtocol && (
                  <button
                    onClick={() => setIsCreatingProtocol(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Test Recipe</span>
                  </button>
                )}
              </div>

              {/* Form to Add New Protocol */}
              {isCreatingProtocol && (
                <form
                  onSubmit={handleSaveNewProtocol}
                  className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 dark:border-teal-900/60 dark:bg-teal-950/20 space-y-4 animate-fade-in"
                >
                  <div className="flex items-center justify-between border-b border-teal-200/60 pb-2 dark:border-teal-900/60">
                    <h5 className="font-bold text-slate-900 dark:text-white text-xs">
                      Define New Diagnostic Test & Consumption Formula
                    </h5>
                    <button
                      type="button"
                      onClick={() => setIsCreatingProtocol(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕ Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Test Code (e.g. CBC-01, CRP-02)
                      </label>
                      <input
                        type="text"
                        required
                        value={newProtocolCode}
                        onChange={(e) => setNewProtocolCode(e.target.value)}
                        placeholder="e.g. ELEC-01"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Full Test Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newProtocolName}
                        onChange={(e) => setNewProtocolName(e.target.value)}
                        placeholder="e.g. Serum Electrolytes (Na+, K+, Cl-)"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={newProtocolCat}
                        onChange={(e) => setNewProtocolCat(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="Hematology">Hematology</option>
                        <option value="Clinical Biochemistry">Clinical Biochemistry</option>
                        <option value="Microbiology">Microbiology</option>
                        <option value="Immunology & Serology">Immunology & Serology</option>
                        <option value="Molecular / PCR">Molecular / PCR</option>
                        <option value="Special Chemistry">Special Chemistry</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Target Analyzer Machine
                      </label>
                      <input
                        type="text"
                        value={newProtocolAnalyzer}
                        onChange={(e) => setNewProtocolAnalyzer(e.target.value)}
                        placeholder="e.g. Roche 9180 Electrolyte Analyzer"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Estimated Cost (PKR)
                      </label>
                      <input
                        type="number"
                        value={newProtocolCost}
                        onChange={(e) => setNewProtocolCost(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Reagents Rows */}
                  <div className="space-y-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs">
                      Reagent Deduction Formula (Components per 1 Patient Test):
                    </label>
                    {newProtocolReagents.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Reagent Name (e.g. Standard Solution A)"
                          value={r.itemName}
                          onChange={(e) => {
                            const copy = [...newProtocolReagents];
                            copy[i].itemName = e.target.value;
                            setNewProtocolReagents(copy);
                          }}
                          className="flex-1 rounded-xl border border-slate-200 bg-white py-1.5 px-3 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        />
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="Qty"
                          value={r.requiredQtyPerTest}
                          onChange={(e) => {
                            const copy = [...newProtocolReagents];
                            copy[i].requiredQtyPerTest = parseFloat(e.target.value) || 1;
                            setNewProtocolReagents(copy);
                          }}
                          className="w-20 rounded-xl border border-slate-200 bg-white py-1.5 px-2 text-xs font-mono dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        />
                        <select
                          value={r.uom}
                          onChange={(e) => {
                            const copy = [...newProtocolReagents];
                            copy[i].uom = e.target.value;
                            setNewProtocolReagents(copy);
                          }}
                          className="w-24 rounded-xl border border-slate-200 bg-white py-1.5 px-2 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="ml">ml</option>
                          <option value="µl">µl</option>
                          <option value="Test">Test</option>
                          <option value="Vial">Vial</option>
                          <option value="Reaction">Reaction</option>
                        </select>
                        {newProtocolReagents.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveReagentRow(i)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddReagentRow}
                      className="text-xs text-teal-600 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Another Reagent Component
                    </button>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-teal-200/60 dark:border-teal-900/60">
                    <button
                      type="button"
                      onClick={() => setIsCreatingProtocol(false)}
                      className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700"
                    >
                      Save Recipe Formula
                    </button>
                  </div>
                </form>
              )}

              {/* Protocol Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {protocols.map((proto) => (
                  <div
                    key={proto.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-teal-600 dark:text-teal-400">
                            {proto.testCode}
                          </span>
                          <h5 className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                            {proto.testName}
                          </h5>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {proto.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Analyzer: <strong className="text-slate-600 dark:text-slate-300">{proto.targetAnalyzer}</strong>
                      </p>

                      <div className="mt-2.5 rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-950 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Reagent Formula (Per 1 Test):
                        </span>
                        {proto.reagents.map((r, i) => (
                          <div key={i} className="flex justify-between text-[11px]">
                            <span className="text-slate-700 dark:text-slate-300">• {r.itemName}</span>
                            <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                              {r.requiredQtyPerTest} {r.uom}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400">
                        Est. Cost: <strong className="text-slate-700 dark:text-slate-300">PKR {proto.costEstimatePKR}</strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProtocolId(proto.id);
                            setActiveTab('execute');
                          }}
                          className="rounded-lg bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-300"
                        >
                          Use in Run ➔
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProtocol(proto.id, proto.testName)}
                          className="text-slate-400 hover:text-red-500 p-1"
                          title="Delete protocol"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RUN HISTORY & AUDIT LOGS */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Historical Lab Test Execution Runs
                </h4>
                <p className="text-xs text-slate-500">
                  Audit trail of all patient sample runs with specific batch lots deducted using FEFO priority.
                </p>
              </div>

              {executionLogs.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                  <FlaskConical className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">No lab runs executed yet</p>
                  <p className="text-xs mt-1">Use the "Execute Lab Run" tab to record your diagnostic batches.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {executionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {log.runNumber}
                            </span>
                            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                              {log.testCount} Tests Executed
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                            {log.testName} • {log.branchName} • Run By: {log.executedByUserName} ({log.executedDate})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedLogForPrint(log)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shrink-0"
                        >
                          <Printer className="h-3.5 w-3.5 text-slate-400" />
                          <span>Print Run Voucher</span>
                        </button>
                      </div>

                      {/* Deductions Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {log.deductions.map((d, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950 space-y-1"
                          >
                            <div className="flex justify-between font-bold">
                              <span className="text-slate-900 dark:text-white">{d.itemName}</span>
                              <span className="font-mono text-teal-600 dark:text-teal-400">
                                -{d.quantityDeducted} {d.uom}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Batches Consumed:{' '}
                              {d.batchesAffected.map((b, bIdx) => (
                                <span key={bIdx} className="font-mono text-slate-700 dark:text-slate-300 mr-2">
                                  {b.batchNumber} ({b.deductedFromBatch} {d.uom})
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {log.remarks && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg">
                          Operator Note: {log.remarks}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Printable Run Voucher Modal */}
      {selectedLogForPrint && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-4 print:my-0 print:ring-0 print:shadow-none print:max-w-none print:rounded-none">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3 dark:border-slate-800 dark:bg-slate-950 print:hidden">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Print Run Voucher • {selectedLogForPrint.runNumber}
              </span>
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
                  onClick={() => setSelectedLogForPrint(null)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Voucher Document */}
            <div className="p-8 space-y-6 text-slate-800 dark:text-slate-200 print:text-black print:p-8 print:space-y-4 text-xs">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-lg font-black uppercase text-slate-900 dark:text-white print:text-black">
                    HR Diagnostics (Pvt) Ltd
                  </h1>
                  <p className="text-[11px] font-semibold text-slate-500 print:text-slate-700">
                    Clinical Pathology Laboratory • Automated Test Reagents Consumption Certificate
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Standard Operating Procedure: SOP-LAB-FEFO-09 • PNAC ISO-15189 Compliant
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-lg bg-teal-50 px-3 py-1 text-xs font-black uppercase text-teal-800 border border-teal-200 print:border-black print:text-black">
                    RUN CERTIFICATE
                  </span>
                  <p className="font-mono text-sm font-black mt-1 print:text-black">
                    {selectedLogForPrint.runNumber}
                  </p>
                  <p className="text-[11px] text-slate-500">Date: {selectedLogForPrint.executedDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 print:bg-white print:border-black text-[11px]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Test Procedure</span>
                  <p className="font-bold print:text-black">{selectedLogForPrint.testName}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Tests Executed</span>
                  <p className="font-bold font-mono print:text-black">{selectedLogForPrint.testCount} Samples</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Laboratory Branch</span>
                  <p className="font-bold print:text-black">{selectedLogForPrint.branchName}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">Operator</span>
                  <p className="font-bold print:text-black">{selectedLogForPrint.executedByUserName}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 print:border-black">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600 print:bg-slate-200 print:text-black border-b border-slate-200 print:border-black">
                    <tr>
                      <th className="py-2 px-3">Reagent Component</th>
                      <th className="py-2 px-3">Deducted Qty</th>
                      <th className="py-2 px-3">FEFO Batch Lot Numbers Allocated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                    {selectedLogForPrint.deductions.map((d, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-semibold print:text-black">{d.itemName}</td>
                        <td className="py-2 px-3 font-mono font-bold print:text-black">
                          {d.quantityDeducted} {d.uom}
                        </td>
                        <td className="py-2 px-3 font-mono print:text-black">
                          {d.batchesAffected.map((b, bIdx) => (
                            <span key={bIdx} className="mr-3">
                              Lot #{b.batchNumber} ({b.deductedFromBatch} {d.uom}, Exp: {b.expiryDate})
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedLogForPrint.remarks && (
                <p className="text-[10px] text-slate-500 italic print:text-black">
                  Operational Justification: {selectedLogForPrint.remarks}
                </p>
              )}

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 print:border-black">
                <div className="text-center h-20 flex flex-col justify-between border border-slate-200 p-2 rounded-xl print:border-black">
                  <p className="text-[9px] uppercase font-bold text-slate-500 print:text-black">Medical Technologist / Analyst</p>
                  <p className="font-serif italic text-xs font-bold text-teal-700 print:text-black">[ Verified Run ]</p>
                  <p className="text-[9px] text-slate-400 print:text-black">{selectedLogForPrint.executedByUserName}</p>
                </div>
                <div className="text-center h-20 flex flex-col justify-between border border-slate-200 p-2 rounded-xl print:border-black">
                  <p className="text-[9px] uppercase font-bold text-slate-500 print:text-black">Pathologist / Lab Director</p>
                  <p className="font-serif italic text-xs font-bold text-teal-700 print:text-black">[ Authorized Sign-Off ]</p>
                  <p className="text-[9px] text-slate-400 print:text-black">Head Office Laboratory QA</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
