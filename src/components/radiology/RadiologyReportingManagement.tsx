import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Printer,
  Sparkles,
  Layers,
  FileSignature,
  UserCheck,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Download,
  Image as ImageIcon,
  User,
  Building2,
  RefreshCw,
  Phone,
  Share2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { RadiologyStudyReport, RadiologyModality, ReportStatus, ClinicPatient } from '../../types';
import { StorageService } from '../../services/storage';
import { RadiologyWorkspaceModal } from './RadiologyWorkspaceModal';
import { RadiologyReportPrintModal } from './RadiologyReportPrintModal';
import { MedicalShortcutsManagerModal } from './MedicalShortcutsManagerModal';
import { TemplateBuilderModal } from './TemplateBuilderModal';
import { DoctorSignatureModal } from './DoctorSignatureModal';
import { ReportDeliveryModal } from './ReportDeliveryModal';
import { DICOMImageUploaderModal } from './DICOMImageUploaderModal';

export const RadiologyReportingManagement: React.FC = () => {
  const [studies, setStudies] = useState<RadiologyStudyReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModality, setSelectedModality] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'queue' | 'delivery' | 'stats'>('queue');

  // Active Workspace Study Modal
  const [activeWorkspaceStudyId, setActiveWorkspaceStudyId] = useState<string | null>(null);

  // Sub-modals
  const [printStudy, setPrintStudy] = useState<RadiologyStudyReport | null>(null);
  const [deliveryStudy, setDeliveryStudy] = useState<RadiologyStudyReport | null>(null);
  const [dicomStudy, setDicomStudy] = useState<RadiologyStudyReport | null>(null);
  const [isShortcutManagerOpen, setIsShortcutManagerOpen] = useState(false);
  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState(false);
  const [isDoctorSignatureOpen, setIsDoctorSignatureOpen] = useState(false);
  const [isNewStudyModalOpen, setIsNewStudyModalOpen] = useState(false);

  // New Study Form State
  const [newStudyForm, setNewStudyForm] = useState({
    patientMRN: '',
    modality: 'Ultrasound' as RadiologyModality,
    examinationType: 'Ultrasound Whole Abdomen',
    referringDoctor: '',
    reportingDoctorId: 'DOC-102',
    clinicalHistory: '',
  });

  const loadData = () => {
    const list = StorageService.getRadiologyStudies();
    setStudies(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = StorageService.getRadiologyDashboardStats();
  const patients = StorageService.getClinicPatients();
  const doctors = StorageService.getClinicDoctors();

  // Filtered Studies Queue
  const filteredStudies = studies.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.studyId.toLowerCase().includes(q) ||
      s.patientName.toLowerCase().includes(q) ||
      s.patientMRN.toLowerCase().includes(q) ||
      s.examinationType.toLowerCase().includes(q) ||
      (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(q)) ||
      (s.contactNumber && s.contactNumber.toLowerCase().includes(q));

    const matchesModality = selectedModality === 'All' || s.modality === selectedModality;
    const matchesStatus = selectedStatus === 'All' || s.status === selectedStatus;
    const matchesDate = !selectedDate || s.examinationDate.startsWith(selectedDate);

    return matchesSearch && matchesModality && matchesStatus && matchesDate;
  });

  // Handle Quick Create Study
  const handleCreateStudy = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.mrNumber === newStudyForm.patientMRN);
    if (!pat) {
      alert('Please select an existing patient MRN or register the patient first.');
      return;
    }

    const doctor = doctors.find((d) => d.id === newStudyForm.reportingDoctorId) || doctors[0];

    const newStudy: RadiologyStudyReport = {
      id: `rad_std_${Date.now()}`,
      studyId: `RAD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: pat.id,
      patientMRN: pat.mrNumber,
      patientName: pat.name || pat.fullName || 'Unknown Patient',
      age: pat.age,
      gender: pat.gender,
      contactNumber: pat.phone || pat.contactNumber || '',
      examinationDate: new Date().toISOString().split('T')[0],
      modality: newStudyForm.modality,
      examinationType: newStudyForm.examinationType,
      referringDoctor: newStudyForm.referringDoctor || 'Self / Walk-in',
      reportingDoctorId: doctor?.id || 'DOC-102',
      reportingDoctorName: doctor?.name || 'Dr. Farhan Qureshi',
      reportingDoctorQualification: doctor?.specialization || 'Consultant Radiologist',
      reportingDoctorRegNo: doctor?.regNumber || doctor?.pmdcNumber || 'PMDC-41829-R',
      digitalSignatureUrl: doctor?.digitalSignatureUrl,
      clinicalHistory: newStudyForm.clinicalHistory,
      status: 'Requested',
      reportingMode: 'template',
      structuredFindings: {},
      freeFormContent: '',
      impression: '',
      attachedImages: [],
      version: 1,
      versionHistory: [],
      isDelivered: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveRadiologyStudy(newStudy);
    loadData();
    setIsNewStudyModalOpen(false);
    setActiveWorkspaceStudyId(newStudy.id);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#0c1527] via-[#0f2347] to-[#122e5d] rounded-2xl p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Department of Radiology &amp; Clinical Imaging
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                AI &amp; Speech-Ready
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Ultrasound &amp; X-Ray Reporting Management
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Enterprise clinical workstation with automated template matching, medical shortcut expansions, voice dictation, digital signatures, and multi-format exports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsShortcutManagerOpen(true)}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Medical Shortcuts
            </button>

            <button
              onClick={() => setIsTemplateBuilderOpen(true)}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Layers className="w-4 h-4 text-blue-400" />
              Template Builder
            </button>

            <button
              onClick={() => setIsDoctorSignatureOpen(true)}
              className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
            >
              <FileSignature className="w-4 h-4 text-emerald-400" />
              Doctor Signatures
            </button>

            <button
              onClick={() => setIsNewStudyModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-900/40 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Study Order
            </button>
          </div>
        </div>

        {/* 8 Essential Operational KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-6 pt-6 border-t border-slate-700/60">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Total Studies
            </span>
            <span className="text-xl font-black text-white mt-1 block">
              {stats.totalStudies}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block truncate">
              Pending Reports
            </span>
            <span className="text-xl font-black text-amber-300 mt-1 block">
              {stats.pendingTotal}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block truncate">
              Ultrasound Pending
            </span>
            <span className="text-xl font-black text-purple-300 mt-1 block">
              {stats.ultrasoundPending}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block truncate">
              X-Ray Pending
            </span>
            <span className="text-xl font-black text-cyan-300 mt-1 block">
              {stats.xrayPending}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block truncate">
              In Progress
            </span>
            <span className="text-xl font-black text-blue-300 mt-1 block">
              {stats.inProgress}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block truncate">
              Awaiting Doctor
            </span>
            <span className="text-xl font-black text-rose-300 mt-1 block">
              {stats.awaitingVerification}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block truncate">
              Approved
            </span>
            <span className="text-xl font-black text-emerald-300 mt-1 block">
              {stats.completed}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block truncate">
              Delivered
            </span>
            <span className="text-xl font-black text-sky-300 mt-1 block">
              {stats.delivered}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'queue'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          Active Reporting Queue ({filteredStudies.length})
        </button>

        <button
          onClick={() => setActiveTab('delivery')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'delivery'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          Dispatch &amp; Delivery Tracking
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'stats'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
          }`}
        >
          Workload &amp; Radiologist Analytics
        </button>
      </div>

      {/* Main Tab: Active Reporting Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Patient Name, MRN, Study ID, Exam, or Invoice #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedModality}
                onChange={(e) => setSelectedModality(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold focus:ring-0"
              >
                <option value="All">All Modalities</option>
                <option value="Ultrasound">Ultrasound</option>
                <option value="X-Ray">Digital X-Ray</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold focus:ring-0"
              >
                <option value="All">All Statuses</option>
                <option value="Requested">Requested</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Awaiting Doctor Verification">Awaiting Verification</option>
                <option value="Approved">Approved</option>
                <option value="Delivered">Delivered</option>
              </select>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:ring-0"
              />

              {(searchQuery || selectedModality !== 'All' || selectedStatus !== 'All' || selectedDate) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedModality('All');
                    setSelectedStatus('All');
                    setSelectedDate('');
                  }}
                  className="px-3 py-2 text-rose-600 hover:text-rose-700 font-bold"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Study ID / Date</th>
                    <th className="py-3 px-4">Patient Demographics</th>
                    <th className="py-3 px-4">Modality &amp; Examination</th>
                    <th className="py-3 px-4">Reporting Radiologist</th>
                    <th className="py-3 px-4">Typist / Version</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-800 dark:text-slate-200">
                  {filteredStudies.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">
                          {s.studyId}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {s.examinationDate}
                        </span>
                        {s.invoiceNumber && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Inv: {s.invoiceNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {s.patientName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono font-semibold">{s.patientMRN}</span>
                          <span>•</span>
                          <span>
                            {s.age}Y / {s.gender}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              s.modality === 'Ultrasound'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
                            }`}
                          >
                            {s.modality}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {s.examinationType}
                          </span>
                        </div>
                        {s.clinicalHistory && (
                          <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5 italic">
                            Indication: {s.clinicalHistory}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {s.reportingDoctorName}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {s.reportingDoctorQualification || 'Radiologist'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 dark:text-slate-300 block font-medium">
                          {s.typistName || 'Medical Typist'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          v{s.version || 1}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              s.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : s.status === 'Awaiting Doctor Verification'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : s.status === 'Delivered'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {s.status}
                          </span>
                          {s.isDelivered && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Delivered
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveWorkspaceStudyId(s.id)}
                            title="Open in Radiology Reporting Workstation"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Workstation
                          </button>

                          <button
                            onClick={() => setPrintStudy(s)}
                            title="Print / Save PDF / Word"
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeliveryStudy(s)}
                            title="Dispatch & Delivery"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredStudies.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="font-bold text-sm">No radiology studies found</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Try adjusting search filters or click "New Study Order" above.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Dispatch & Delivery Tracking */}
      {activeTab === 'delivery' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Completed &amp; Delivered Diagnostic Reports
              </h3>
              <p className="text-xs text-slate-500">
                Audit tracking for patient collection, ward dispatch, and courier deliveries
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {studies
              .filter((s) => s.isDelivered || s.status === 'Approved' || s.status === 'Completed')
              .map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {s.studyId}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {s.patientName} ({s.patientMRN})
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700">
                        {s.examinationType}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-500 mt-1.5 text-[11px]">
                      <span>Exam Date: {s.examinationDate}</span>
                      <span>Radiologist: {s.reportingDoctorName}</span>
                      {s.isDelivered ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Delivered to: {s.deliveredTo} on {new Date(s.deliveredAt || '').toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold">
                          Awaiting Collection at Reception
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPrintStudy(s)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </button>
                    <button
                      onClick={() => setDeliveryStudy(s)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {s.isDelivered ? 'Update Delivery' : 'Dispatch Now'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab 3: Workload & Radiologist Analytics */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Typist Workload Breakdown */}
          <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              Medical Typist Workload Distribution
            </h3>
            <p className="text-slate-500">
              Active volume and completion rate for medical typists and transcriptionists
            </p>

            <div className="space-y-3 pt-2">
              {Object.entries(stats.typistWorkload).map(([name, data]) => (
                <div
                  key={name}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm block">
                      {name}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {data.completed} Completed • {data.pending} Pending
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-blue-600 dark:text-blue-400 text-base block">
                      {data.total} Studies
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {Math.round((data.completed / (data.total || 1)) * 100)}% Verified
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Doctor Approval Analytics */}
          <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Reporting Radiologists &amp; Consultants
            </h3>
            <p className="text-slate-500">
              Doctor-wise study sign-offs, digital verification, and review volume
            </p>

            <div className="space-y-3 pt-2">
              {Object.entries(stats.doctorReports).map(([docName, data]) => (
                <div
                  key={docName}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm block">
                      {docName}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {data.approved} Digitally Signed &amp; Approved
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-base block">
                      {data.total} Studies
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {Math.round((data.approved / (data.total || 1)) * 100)}% Sign-off Rate
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE NEW STUDY ORDER                            */}
      {/* ======================================================== */}
      {isNewStudyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Register New Diagnostic Radiology Study
              </h3>
              <button
                onClick={() => setIsNewStudyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudy} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Registered Patient (Search by MR Number or Name) *
                </label>
                <select
                  required
                  value={newStudyForm.patientMRN}
                  onChange={(e) => setNewStudyForm({ ...newStudyForm, patientMRN: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.mrNumber}>
                      {p.mrNumber} • {p.name || p.fullName} ({p.age} Y / {p.gender})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Modality *
                  </label>
                  <select
                    value={newStudyForm.modality}
                    onChange={(e) => {
                      const mod = e.target.value as RadiologyModality;
                      setNewStudyForm({
                        ...newStudyForm,
                        modality: mod,
                        examinationType:
                          mod === 'Ultrasound'
                            ? 'Ultrasound Whole Abdomen'
                            : 'Chest X-Ray PA View',
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                  >
                    <option value="Ultrasound">Ultrasound</option>
                    <option value="X-Ray">Digital X-Ray</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Examination Type *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudyForm.examinationType}
                    onChange={(e) => setNewStudyForm({ ...newStudyForm, examinationType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Referring Doctor
                </label>
                <input
                  type="text"
                  value={newStudyForm.referringDoctor}
                  onChange={(e) => setNewStudyForm({ ...newStudyForm, referringDoctor: e.target.value })}
                  placeholder="e.g. Dr. Kamran Lodhi / Self"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Indication / Presenting Complaint:
                </label>
                <textarea
                  rows={2}
                  value={newStudyForm.clinicalHistory}
                  onChange={(e) => setNewStudyForm({ ...newStudyForm, clinicalHistory: e.target.value })}
                  placeholder="e.g. Persistent cough, right hypochondriac pain..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewStudyModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Create &amp; Open Workstation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Radiology Workstation Modal */}
      {activeWorkspaceStudyId && (
        <RadiologyWorkspaceModal
          isOpen={Boolean(activeWorkspaceStudyId)}
          studyId={activeWorkspaceStudyId}
          onClose={() => setActiveWorkspaceStudyId(null)}
          onStudyUpdated={(updated) => {
            loadData();
          }}
        />
      )}

      {/* Print / Export Report Modal */}
      {printStudy && (
        <RadiologyReportPrintModal
          isOpen={Boolean(printStudy)}
          onClose={() => setPrintStudy(null)}
          report={printStudy}
        />
      )}

      {/* Medical Shortcuts Manager */}
      {isShortcutManagerOpen && (
        <MedicalShortcutsManagerModal
          isOpen={isShortcutManagerOpen}
          onClose={() => setIsShortcutManagerOpen(false)}
        />
      )}

      {/* Template Builder */}
      {isTemplateBuilderOpen && (
        <TemplateBuilderModal
          isOpen={isTemplateBuilderOpen}
          onClose={() => setIsTemplateBuilderOpen(false)}
        />
      )}

      {/* Doctor Signatures Manager */}
      {isDoctorSignatureOpen && (
        <DoctorSignatureModal
          isOpen={isDoctorSignatureOpen}
          onClose={() => setIsDoctorSignatureOpen(false)}
        />
      )}

      {/* Delivery Tracking Modal */}
      {deliveryStudy && (
        <ReportDeliveryModal
          isOpen={Boolean(deliveryStudy)}
          onClose={() => setDeliveryStudy(null)}
          report={deliveryStudy}
          onDelivered={(u) => {
            loadData();
          }}
          onOpenPrint={() => {
            setPrintStudy(deliveryStudy);
            setDeliveryStudy(null);
          }}
        />
      )}
    </div>
  );
};
