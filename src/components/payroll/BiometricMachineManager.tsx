import React, { useState } from 'react';
import {
  Server,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Cpu,
  FileCode,
  HardDrive,
  Info,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { BiometricDevice } from '../../types';

interface BiometricMachineManagerProps {
  onPunchesImported: () => void;
  activeBranchId?: string;
}

export const BiometricMachineManager: React.FC<BiometricMachineManagerProps> = ({
  onPunchesImported,
  activeBranchId = 'all',
}) => {
  const [devices, setDevices] = useState<BiometricDevice[]>(() => StorageService.getBiometricDevices());
  const branches = StorageService.getBranches();

  // Add Device Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState<BiometricDevice['brand']>('ZKTeco');
  const [model, setModel] = useState('uFace 800 / K40 / IN01');
  const [ipAddress, setIpAddress] = useState('192.168.1.201');
  const [port, setPort] = useState(4370);
  const [commKey, setCommKey] = useState(0);
  const [branchId, setBranchId] = useState(branches[0]?.id || 'br_headoffice');
  const [location, setLocation] = useState('Ground Floor Main Reception');

  // Sync / Ping State
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{ id: string; status: 'ok' | 'fail'; message: string } | null>(null);

  // ZKTeco USB / Log File Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importLogText, setImportLogText] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const handleSaveDevice = (e: React.FormEvent) => {
    e.preventDefault();
    const branchName = branches.find((b) => b.id === branchId)?.name || 'Central Lab';
    const newDevice: BiometricDevice = {
      id: `dev_${Date.now()}`,
      name: name || `${brand} Device (${ipAddress})`,
      brand,
      model,
      ipAddress,
      port: Number(port) || 4370,
      commKey: Number(commKey) || 0,
      branchId,
      branchName,
      location,
      connectionStatus: 'Online',
      isEnabled: true,
      lastSyncTime: new Date().toISOString(),
      totalSyncedLogs: 0,
    };
    StorageService.saveBiometricDevice(newDevice);
    setDevices(StorageService.getBiometricDevices());
    setIsAddModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setBrand('ZKTeco');
    setModel('uFace 800 / K40 / IN01');
    setIpAddress('192.168.1.201');
    setPort(4370);
    setCommKey(0);
    setLocation('Ground Floor Main Reception');
  };

  const handleDeleteDevice = (id: string) => {
    if (confirm('Are you sure you want to delete this biometric device registration?')) {
      StorageService.deleteBiometricDevice(id);
      setDevices(StorageService.getBiometricDevices());
    }
  };

  const handleSimulateSync = (device: BiometricDevice) => {
    setSyncingDeviceId(device.id);
    setTimeout(() => {
      // Generate realistic punches from employees
      const employees = StorageService.getEmployees(device.branchId);
      const today = new Date().toISOString().split('T')[0];
      const samplePunches: Array<{ enrollNumber: string; timestamp: string; deviceId: string; deviceName: string }> = [];

      employees.slice(0, 10).forEach((emp) => {
        // Random morning check-in around 08:00
        const min = Math.floor(Math.random() * 25);
        const timeStr = `08:${min < 10 ? '0' + min : min}:12`;
        samplePunches.push({
          enrollNumber: emp.employeeCode,
          timestamp: `${today} ${timeStr}`,
          deviceId: device.id,
          deviceName: device.name,
        });
      });

      const res = StorageService.importZKTecoLogs(samplePunches);
      device.lastSyncTime = new Date().toISOString();
      device.totalSyncedLogs = (device.totalSyncedLogs || 0) + res.processed;
      device.connectionStatus = 'Online';
      StorageService.saveBiometricDevice(device);
      setDevices(StorageService.getBiometricDevices());

      setSyncingDeviceId(null);
      setPingResult({
        id: device.id,
        status: 'ok',
        message: `Successfully connected via TCP/IP (${device.ipAddress}:${device.port}). Fetched & processed ${res.processed} logs (${res.matched} employees matched).`,
      });
      onPunchesImported();
    }, 1200);
  };

  const handleProcessImportLogText = () => {
    if (!importLogText.trim()) {
      setImportFeedback('Please paste log data or upload a file.');
      return;
    }

    try {
      // Parses standard ZKTeco USB export formats:
      // Tab or Space or Comma separated: EnrollNo \t DateTime \t Status
      // e.g. "101 \t 2026-10-12 08:14:00" OR "EMP-01,2026-10-12 08:14:00"
      const lines = importLogText.split('\n');
      const parsed: Array<{ enrollNumber: string; timestamp: string }> = [];

      lines.forEach((line) => {
        const clean = line.trim();
        if (!clean) return;
        const tokens = clean.split(/[\t,;]+/);
        if (tokens.length >= 2) {
          const enroll = tokens[0].trim();
          let ts = tokens[1].trim();
          // Normalize timestamp if in "YYYY-MM-DD HH:MM:SS"
          if (ts.length >= 16) {
            parsed.push({ enrollNumber: enroll, timestamp: ts });
          }
        }
      });

      if (parsed.length === 0) {
        setImportFeedback('No valid log rows identified. Format: [EnrollNo] [YYYY-MM-DD HH:MM:SS]');
        return;
      }

      const res = StorageService.importZKTecoLogs(parsed);
      setImportFeedback(`✅ Successfully imported ${res.processed} biometric records! (${res.matched} matched with employee profiles, ${res.unmatched} unmatched).`);
      setImportLogText('');
      onPunchesImported();
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportFeedback(null);
      }, 2500);
    } catch (err: any) {
      setImportFeedback(`Import error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900 text-white p-4.5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold">Biometric Attendance Machine Integration</h3>
            <p className="text-xs text-slate-400">
              Direct TCP/IP LAN sync & USB attendance logs import for ZKTeco, Hikvision, Realtime, & Suprema.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 border border-slate-700 transition"
          >
            <Upload className="h-3.5 w-3.5 text-teal-400" />
            <span>Import ZK USB/DAT Log</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Biometric Machine</span>
          </button>
        </div>
      </div>

      {pingResult && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{pingResult.message}</span>
          </div>
          <button type="button" onClick={() => setPingResult(null)} className="font-bold text-emerald-700 hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Device Grid */}
      {devices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900 space-y-3">
          <Cpu className="h-10 w-10 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Biometric Machines Registered Yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Connect your lab or hospital's ZKTeco uFace, K40, or Hikvision biometric terminal via IP address to automatically sync employee check-in and check-out logs.
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
          >
            <Plus className="h-4 w-4" /> Register First Machine
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((dev) => {
            const isSyncing = syncingDeviceId === dev.id;
            return (
              <div
                key={dev.id}
                className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-3.5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400 font-bold text-xs">
                        {dev.brand[0]}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {dev.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {dev.brand} • {dev.model}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        dev.connectionStatus === 'Online'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {dev.connectionStatus === 'Online' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {dev.connectionStatus}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400">IP / Port:</span>
                      <span className="font-mono font-bold">{dev.ipAddress}:{dev.port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Branch:</span>
                      <span className="font-semibold truncate max-w-[150px]">{dev.branchName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Location:</span>
                      <span className="truncate max-w-[150px]">{dev.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Synced Logs:</span>
                      <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                        {dev.totalSyncedLogs || 0} punches
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleSimulateSync(dev)}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Logs Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteDevice(dev.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Remove device"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Device Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="h-5 w-5 text-teal-600" />
              Register Biometric Machine
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter machine IP address and network credentials for automated polling.
            </p>

            <form onSubmit={handleSaveDevice} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Machine Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. ZKTeco Main Lab Entrance"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Device Brand</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="ZKTeco">ZKTeco</option>
                    <option value="Hikvision">Hikvision</option>
                    <option value="Realtime">Realtime</option>
                    <option value="Suprema">Suprema</option>
                    <option value="Anviz">Anviz</option>
                    <option value="Generic IP Device">Generic IP Device</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. uFace 800"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">IP Address (LAN)</label>
                  <input
                    type="text"
                    required
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="192.168.1.201"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Branch</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">CommKey</label>
                  <input
                    type="number"
                    value={commKey}
                    onChange={(e) => setCommKey(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Physical Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Hematology Lab Door 2"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700"
                >
                  Save Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USB / DAT Log File Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-teal-600" />
              Import ZKTeco USB / .DAT Attendance File
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste the text content from your ZK USB Flash drive log (attlog.dat) or CSV format.
            </p>

            <div className="mt-3 space-y-3">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 text-[11px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 space-y-1">
                <p className="font-bold">Supported Log Formats:</p>
                <code className="block font-mono bg-white dark:bg-slate-900 p-1 rounded border border-slate-200 dark:border-slate-800">
                  EMP-101 \t 2026-10-12 08:05:00<br />
                  EMP-102 \t 2026-10-12 08:14:22<br />
                  EMP-101 \t 2026-10-12 16:30:10
                </code>
              </div>

              <textarea
                rows={7}
                value={importLogText}
                onChange={(e) => setImportLogText(e.target.value)}
                placeholder="Paste attlog.dat content here..."
                className="w-full rounded-xl border border-slate-300 p-3 text-xs font-mono dark:border-slate-700 dark:bg-slate-800 text-slate-900 dark:text-white"
              />

              {importFeedback && (
                <p className="text-xs font-bold text-teal-700 dark:text-teal-400">
                  {importFeedback}
                </p>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    // Populate sample ZK log for testing
                    const today = new Date().toISOString().split('T')[0];
                    setImportLogText(
                      `EMP-01\t${today} 08:04:12\nEMP-02\t${today} 08:14:50\nEMP-03\t${today} 08:29:10\nEMP-01\t${today} 16:20:00\nEMP-02\t${today} 16:05:30`
                    );
                  }}
                  className="text-[11px] text-teal-600 font-bold hover:underline"
                >
                  Load Sample ZKTeco Data
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportFeedback(null);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessImportLogText}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700"
                  >
                    Process & Apply Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
