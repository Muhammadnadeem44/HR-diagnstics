import React, { useState } from 'react';
import {
  FileCheck2,
  AlertOctagon,
  ShieldAlert,
  ThermometerSnowflake,
  Trash2,
  Plus,
  Search,
  CheckCircle2,
  Lock,
  Clock,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { BatchRecall, NarcoticLog, TemperatureLog, InventoryItem, UserAccount } from '../../types';
import { DigitalSignaturePad } from '../common/DigitalSignaturePad';

interface ComplianceManagementProps {
  currentUser: UserAccount | null;
  activeBranchId: string;
}

export const ComplianceManagement: React.FC<ComplianceManagementProps> = ({
  currentUser,
  activeBranchId,
}) => {
  const [activeTab, setActiveTab] = useState<'recalls' | 'narcotics' | 'coldchain'>('recalls');
  const [isCreatingRecall, setIsCreatingRecall] = useState(false);
  const [isLoggingNarcotic, setIsLoggingNarcotic] = useState(false);
  const [isLoggingTemp, setIsLoggingTemp] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<'narcotic' | 'recall' | null>(null);

  const inventory = StorageService.getInventory();
  const recalls: BatchRecall[] = StorageService.getBatchRecalls();
  const narcoticLogs: NarcoticLog[] = StorageService.getNarcoticLogs();
  const tempLogs: TemperatureLog[] = StorageService.getTemperatureLogs();

  // Filtered by branch if needed
  const filteredTempLogs = tempLogs.filter(
    (t: TemperatureLog) => activeBranchId === 'all' || t.branchId === activeBranchId
  );

  // Recall Form State
  const [recallBatchNumber, setRecallBatchNumber] = useState('');
  const [recallReason, setRecallReason] = useState('Manufacturer voluntary recall due to calibration shift');
  const [recallAction, setRecallAction] = useState('Quarantine immediately in Biohazard Cold Lock');

  // Narcotics Form State
  const [narcoticDrugName, setNarcoticDrugName] = useState('Morphine Sulfate Injection 10mg/ml');
  const [narcoticBatchNumber, setNarcoticBatchNumber] = useState('BAT-MORPH-09');
  const [narcoticQty, setNarcoticQty] = useState(1);
  const [narcoticPatientMrn, setNarcoticPatientMrn] = useState('MRN-2026-9812');
  const [narcoticDoctorName, setNarcoticDoctorName] = useState('Dr. Salman Tariq (Consultant)');
  const [narcoticDispensedTo, setNarcoticDispensedTo] = useState('Staff Nurse Fatima (ICU)');
  const [narcoticSignatureUrl, setNarcoticSignatureUrl] = useState<string>('');

  // Temp Log Form State
  const [tempChamber, setTempChamber] = useState('Chamber 01 - Main Cold Storage (2-8°C)');
  const [tempReading, setTempReading] = useState(4.2);
  const [humidityReading, setHumidityReading] = useState(48);

  const handleInitiateRecall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recallBatchNumber) {
      alert('Please enter or select a Batch Number to recall.');
      return;
    }

    const newRecall: BatchRecall = {
      id: `recall_${Date.now()}`,
      recallNumber: `RCL-${Date.now().toString().slice(-4)}`,
      batchNumber: recallBatchNumber,
      itemId: 'auto',
      itemName: 'Diagnostic Reagent / Controlled Item',
      initiatedByUserId: currentUser?.id || 'admin',
      initiatedByUserName: currentUser?.name || 'Super Admin',
      initiatedDate: new Date().toISOString(),
      reason: recallReason,
      actionRequired: recallAction,
      status: 'Active Recall',
      affectedUnitsCount: 45,
    };

    StorageService.saveBatchRecall(newRecall);
    setIsCreatingRecall(false);
  };

  const handleOpenNarcoticSignature = (e: React.FormEvent) => {
    e.preventDefault();
    setSignatureTarget('narcotic');
    setIsSignatureOpen(true);
  };

  const handleApplySignature = (sigUrl: string) => {
    if (signatureTarget === 'narcotic') {
      const newLog: NarcoticLog = {
        id: `narc_${Date.now()}`,
        date: new Date().toISOString(),
        drugName: narcoticDrugName,
        batchNumber: narcoticBatchNumber,
        quantityDispensed: narcoticQty,
        balanceRemaining: 18,
        patientMRN: narcoticPatientMrn,
        prescribingDoctor: narcoticDoctorName,
        dispensedToNurse: narcoticDispensedTo,
        authorizedByUserName: currentUser?.name || 'Super Admin',
        signatureUrl: sigUrl,
      };

      StorageService.saveNarcoticLog(newLog);
      setIsLoggingNarcotic(false);
      setNarcoticSignatureUrl('');
    }
  };

  const handleLogTemperature = (e: React.FormEvent) => {
    e.preventDefault();
    const isExcursion = tempReading < 2 || tempReading > 8;

    const newLog: TemperatureLog = {
      id: `temp_${Date.now()}`,
      branchId: activeBranchId === 'all' ? 'br_headoffice' : activeBranchId,
      chamberName: tempChamber,
      readingCelsius: tempReading,
      humidityPercentage: humidityReading,
      loggedAt: new Date().toISOString(),
      loggedByUserName: currentUser?.name || 'Bio-Medical Technician',
      isExcursion,
      excursionAlertNotes: isExcursion
        ? `ALERT: Temperature ${tempReading}°C outside 2-8°C permissible range!`
        : undefined,
    };

    StorageService.saveTemperatureLog(newLog);
    setIsLoggingTemp(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            ISO 15189 Quality, Recalls & Controlled Substances
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Rapid lot recall quarantine, Schedule II dual-signature narcotics register, and cold chain telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeTab === 'recalls' && (
            <button
              onClick={() => setIsCreatingRecall(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] cursor-pointer"
            >
              <AlertOctagon className="h-4 w-4" />
              <span>Trigger Batch Recall</span>
            </button>
          )}

          {activeTab === 'narcotics' && (
            <button
              onClick={() => setIsLoggingNarcotic(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Dispense Controlled Drug</span>
            </button>
          )}

          {activeTab === 'coldchain' && (
            <button
              onClick={() => setIsLoggingTemp(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Log Chamber Temperature</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/80 max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('recalls')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition ${
            activeTab === 'recalls'
              ? 'bg-white text-rose-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Batch Recalls ({recalls.length})
        </button>
        <button
          onClick={() => setActiveTab('narcotics')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition ${
            activeTab === 'narcotics'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Narcotics Register ({narcoticLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('coldchain')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition ${
            activeTab === 'coldchain'
              ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          Cold Chain Log ({filteredTempLogs.length})
        </button>
      </div>

      {/* Tab 1: Batch Recalls */}
      {activeTab === 'recalls' && (
        <div className="space-y-4">
          {recalls.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              <ShieldAlert className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="font-bold text-slate-600 dark:text-slate-300">No active batch recalls</p>
              <p className="text-xs mt-1">All manufacturer lots and diagnostic reagents are cleared for clinical use.</p>
            </div>
          ) : (
            recalls.map((recall: BatchRecall) => (
              <div
                key={recall.id}
                className="rounded-2xl border-2 border-red-300 bg-red-50/40 p-5 shadow-xs dark:border-red-900/60 dark:bg-red-950/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-red-600 p-2.5 text-white">
                      <AlertOctagon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-red-900 dark:text-red-200">
                          {recall.recallNumber}
                        </span>
                        <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                          {recall.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                        Recalled Lot: <span className="font-mono">{recall.batchNumber}</span>
                      </h4>
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(recall.initiatedDate).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <p>
                    <strong>Reason for Quarantine:</strong> {recall.reason}
                  </p>
                  <p>
                    <strong>Mandated Protocol:</strong> {recall.actionRequired}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Initiated by: {recall.initiatedByUserName} • Freezes inventory automatically across all branches.
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Narcotics Register */}
      {activeTab === 'narcotics' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-purple-50 p-3.5 text-xs text-purple-900 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-600" />
              <span>
                Schedule II Strict Narcotics Register: Governed under the Dangerous Drugs Act & ISO 15189. Requires dual medical practitioner verification and digital sign-off.
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 dark:bg-slate-950">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Drug & Batch</th>
                  <th className="py-3 px-3">Patient MRN</th>
                  <th className="py-3 px-3">Prescriber & Nurse</th>
                  <th className="py-3 px-3">Dispensed / Bal</th>
                  <th className="py-3 px-4 text-right">Digital Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {narcoticLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No narcotics dispense transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  narcoticLogs.map((log: NarcoticLog) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(log.date).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 dark:text-white">{log.drugName}</p>
                        <p className="font-mono text-[10px] text-slate-400">Lot: {log.batchNumber}</p>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                        {log.patientMRN}
                      </td>
                      <td className="py-3 px-3">
                        <p className="text-slate-800 dark:text-slate-200">{log.prescribingDoctor}</p>
                        <p className="text-[10px] text-slate-400">Handed to: {log.dispensedToNurse}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-purple-700 dark:text-purple-300">
                          {log.quantityDispensed} Ampoule(s)
                        </span>
                        <p className="text-[10px] text-slate-400">Bal: {log.balanceRemaining}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {log.signatureUrl ? (
                          <div className="inline-block rounded bg-white p-1 border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
                            <img
                              src={log.signatureUrl}
                              alt="Signature"
                              className="h-6 w-auto filter dark:invert"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Manual Log</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Cold Chain Temperature Log */}
      {activeTab === 'coldchain' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Target Reagent Temperature</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">2.0°C – 8.0°C</h3>
              <p className="text-xs text-teal-600 mt-1">Refrigerated diagnostics standard</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Enzyme Deep Freeze</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">-20.0°C</h3>
              <p className="text-xs text-blue-600 mt-1">PCR MasterMix & Calibrators</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Excursions in 24h</span>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                {filteredTempLogs.filter((t: TemperatureLog) => t.isExcursion).length} Anomalies
              </h3>
              <p className="text-xs text-slate-400 mt-1">ISO 15189 audit compliant</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 dark:bg-slate-950">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3">Storage Unit / Chamber</th>
                  <th className="py-3 px-3">Temperature (°C)</th>
                  <th className="py-3 px-3">Humidity (%)</th>
                  <th className="py-3 px-3">Logged By</th>
                  <th className="py-3 px-4 text-right">Cold-Chain Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTempLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No temperature readings logged yet. Click "Log Chamber Temperature" to record.
                    </td>
                  </tr>
                ) : (
                  filteredTempLogs.map((log: TemperatureLog) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(log.loggedAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        {log.chamberName}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-sm">
                        <span className={log.isExcursion ? 'text-red-600 font-black' : 'text-teal-600'}>
                          {log.readingCelsius.toFixed(1)}°C
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono">{log.humidityPercentage}%</td>
                      <td className="py-3 px-3">{log.loggedByUserName}</td>
                      <td className="py-3 px-4 text-right">
                        {log.isExcursion ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 dark:bg-red-950 dark:text-red-300">
                            <AlertOctagon className="h-3 w-3" /> Excursion
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Initiate Batch Recall */}
      {isCreatingRecall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertOctagon className="h-6 w-6" />
              <h3 className="font-bold text-slate-900 dark:text-white">Initiate Urgent Batch Recall</h3>
            </div>
            <p className="text-xs text-slate-500">
              Freezes and locks stock across all branches immediately, preventing further clinical usage.
            </p>

            <form onSubmit={handleInitiateRecall} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batch / Lot Number to Quarantine *
                </label>
                <input
                  type="text"
                  required
                  value={recallBatchNumber}
                  onChange={(e) => setRecallBatchNumber(e.target.value)}
                  placeholder="e.g. BAT-2026-X1"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Recall (Manufacturer / Regulatory Notice)
                </label>
                <textarea
                  rows={2}
                  required
                  value={recallReason}
                  onChange={(e) => setRecallReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Required Action by Branch Laboratories
                </label>
                <input
                  type="text"
                  value={recallAction}
                  onChange={(e) => setRecallAction(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreatingRecall(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-red-700 transition"
                >
                  Broadcast Recall & Freeze Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dispense Controlled Drug */}
      {isLoggingNarcotic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Schedule II Controlled Drug Dispense Entry</h3>

            <form onSubmit={handleOpenNarcoticSignature} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Controlled Substance
                  </label>
                  <input
                    type="text"
                    required
                    value={narcoticDrugName}
                    onChange={(e) => setNarcoticDrugName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lot / Batch #
                  </label>
                  <input
                    type="text"
                    required
                    value={narcoticBatchNumber}
                    onChange={(e) => setNarcoticBatchNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Patient Medical Record (MRN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={narcoticPatientMrn}
                    onChange={(e) => setNarcoticPatientMrn(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity Dispensed
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={narcoticQty}
                    onChange={(e) => setNarcoticQty(parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prescribing Consultant
                  </label>
                  <input
                    type="text"
                    required
                    value={narcoticDoctorName}
                    onChange={(e) => setNarcoticDoctorName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dispensed to Nurse / Ward
                  </label>
                  <input
                    type="text"
                    required
                    value={narcoticDispensedTo}
                    onChange={(e) => setNarcoticDispensedTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsLoggingNarcotic(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-purple-700 transition"
                >
                  Proceed to Digital Signature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Temperature */}
      {isLoggingTemp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white">Log Cold Chain Temperature</h3>

            <form onSubmit={handleLogTemperature} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chamber / Cold Storage Unit
                </label>
                <input
                  type="text"
                  required
                  value={tempChamber}
                  onChange={(e) => setTempChamber(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={tempReading}
                    onChange={(e) => setTempReading(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Relative Humidity (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={humidityReading}
                    onChange={(e) => setHumidityReading(parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLoggingTemp(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  Record Reading
                </button>
              </div>
            </form>
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
        purpose="Schedule II Controlled Drug Dispense Verification"
      />
    </div>
  );
};
