import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Search,
  Printer,
  Sparkles,
  Layers,
  FileSignature,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Download,
  Image as ImageIcon,
  User,
  Building2,
  RefreshCw,
  Phone,
  ShieldCheck,
  X,
  Mic,
  MicOff,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  RotateCcw,
  RotateCw,
  Save,
  Sliders,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Zap,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  Power,
  Bell,
  Stethoscope,
  Activity,
  CreditCard,
  Plus,
  ArrowRight,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  RadiologyStudyReport,
  RadiologyTemplate,
  MedicalShortcut,
  RadiologyModality,
  ReportStatus,
  ClinicPatient,
  ClinicDoctor,
  RadiologyStudyImage,
} from '../../types';
import { StorageService } from '../../services/storage';
import { RadiologyExportService } from '../../services/radiologyExportService';
import { RadiologyReportPrintModal } from './RadiologyReportPrintModal';
import { MedicalShortcutsManagerModal } from './MedicalShortcutsManagerModal';
import { TemplateBuilderModal } from './TemplateBuilderModal';
import { DoctorSignatureModal } from './DoctorSignatureModal';
import { ReportDeliveryModal } from './ReportDeliveryModal';
import { DICOMImageUploaderModal } from './DICOMImageUploaderModal';

export interface RadiologyReportingProps {
  activeBranchId?: string;
  onNavigate?: (tab: string) => void;
}

const WORKFLOW_STEPS: ReportStatus[] = [
  'Requested',
  'Pending',
  'In Progress',
  'Awaiting Doctor Verification',
  'Approved',
  'Delivered',
];

export const RadiologyReporting: React.FC<RadiologyReportingProps> = ({ onNavigate }) => {
  // Studies & Active Selection
  const [studies, setStudies] = useState<RadiologyStudyReport[]>([]);
  const [activeStudy, setActiveStudy] = useState<RadiologyStudyReport | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Layout Collapsibility & Viewport Controls
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 75, 90, 100, 110, 125
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isStudyQueueOpen, setIsStudyQueueOpen] = useState<boolean>(false);

  // Template & Shortcut Library State (Right Panel)
  const [templates, setTemplates] = useState<RadiologyTemplate[]>([]);
  const [shortcuts, setShortcuts] = useState<MedicalShortcut[]>([]);
  const [rightPanelTab, setRightPanelTab] = useState<'templates' | 'shortcuts' | 'findings' | 'history'>('templates');
  const [templateModalityFilter, setTemplateModalityFilter] = useState<string>('All');
  const [templateSearch, setTemplateSearch] = useState<string>('');
  const [selectedTemplateCardId, setSelectedTemplateCardId] = useState<string>('tpl_usg_whole_abdomen');
  const [shortcutSearch, setShortcutSearch] = useState<string>('');
  const [selectedShortcutCategory, setSelectedShortcutCategory] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Status dropdown & Notifications
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState<boolean>(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Formatting Toolbar States
  const [fontFamily, setFontFamily] = useState<string>('Arial');
  const [fontSize, setFontSize] = useState<string>('11');
  const [textColor, setTextColor] = useState<string>('#0f172a');
  const [isHighlightActive, setIsHighlightActive] = useState<boolean>(false);

  // Clinical Registry
  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);

  // Editor State
  const [reportingMode, setReportingMode] = useState<'template' | 'word' | 'hybrid'>('template');
  const [language, setLanguage] = useState<'english' | 'urdu'>('english');
  const [isRTL, setIsRTL] = useState<boolean>(false);
  const [structuredFindings, setStructuredFindings] = useState<Record<string, string>>({
    sec_liver: 'Normal in size and echotexture. No focal lesion.',
    sec_gb: 'Well distended. No calculus.',
    sec_cbd: 'Normal.',
    sec_pancreas: 'Normal in size.',
    sec_spleen: 'Normal.',
    sec_kidneys: 'Normal in size and echotexture. No hydronephrosis.',
    sec_bladder: 'Well distended.',
  });
  const [freeFormContent, setFreeFormContent] = useState<string>('');
  const [impression, setImpression] = useState<string>('Normal Study.');
  const [clinicalHistory, setClinicalHistory] = useState<string>('Pain in abdomen for last 2 weeks.');

  // Voice Dictation
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const [speechRecognizerInstance, setSpeechRecognizerInstance] = useState<any>(null);

  // Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isTemplateBuilderOpen, setIsTemplateBuilderOpen] = useState<boolean>(false);
  const [isDoctorSignatureOpen, setIsDoctorSignatureOpen] = useState<boolean>(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState<boolean>(false);
  const [isDICOMModalOpen, setIsDICOMModalOpen] = useState<boolean>(false);
  const [isNewStudyModalOpen, setIsNewStudyModalOpen] = useState<boolean>(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial Load: Local registries & Default data
  useEffect(() => {
    setTemplates(StorageService.getRadiologyTemplates());
    setShortcuts(StorageService.getMedicalShortcuts());
    setPatients(StorageService.getClinicPatients());
    setDoctors(StorageService.getClinicDoctors());

    return () => {
      if (speechRecognizerInstance) {
        try {
          speechRecognizerInstance.stop();
        } catch {}
      }
    };
  }, [speechRecognizerInstance]);

  // 2. Real-time Firestore Sync for Radiology Studies
  useEffect(() => {
    const studiesCollectionRef = collection(db, 'radiology_studies');
    const q = query(studiesCollectionRef, orderBy('createdAt', 'desc'));

    setIsSyncing(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setIsFirestoreConnected(true);
        setIsSyncing(false);
        if (!snapshot.empty) {
          const remoteList: RadiologyStudyReport[] = [];
          snapshot.forEach((docSnap) => {
            remoteList.push(docSnap.data() as RadiologyStudyReport);
          });
          setStudies(remoteList);

          // If no active study is selected, pick the reference study or first
          setActiveStudy((current) => {
            if (!current && remoteList.length > 0) {
              const matchAli = remoteList.find((s) => s.patientName?.toLowerCase().includes('muhammad ali') || s.studyId === 'US-2026-1105-001');
              return matchAli || remoteList[0];
            }
            if (current) {
              const updated = remoteList.find((s) => s.id === current.id);
              return updated || current;
            }
            return null;
          });
        } else {
          // If Firestore is empty, seed from local storage
          const localStudies = StorageService.getRadiologyStudies();
          if (localStudies.length > 0) {
            setStudies(localStudies);
            setActiveStudy(localStudies[0]);
            localStudies.forEach(async (std) => {
              try {
                await setDoc(doc(db, 'radiology_studies', std.id), {
                  ...std,
                  _updatedAt: Date.now(),
                });
              } catch (err) {
                console.warn('Failed to upload seed study to Firestore:', err);
              }
            });
          }
        }
      },
      (error) => {
        console.warn('Firestore onSnapshot subscription fallback:', error);
        setIsFirestoreConnected(false);
        setIsSyncing(false);
        const local = StorageService.getRadiologyStudies();
        setStudies(local);
        if (local.length > 0 && !activeStudy) {
          const matchAli = local.find((s) => s.patientName?.toLowerCase().includes('muhammad ali') || s.studyId === 'US-2026-1105-001');
          setActiveStudy(matchAli || local[0]);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Synchronize active study into editor fields
  useEffect(() => {
    if (!activeStudy) return;

    setReportingMode(activeStudy.reportingMode || 'template');
    if (activeStudy.structuredFindings && Object.keys(activeStudy.structuredFindings).length > 0) {
      setStructuredFindings(activeStudy.structuredFindings);
    }
    setImpression(activeStudy.impression || 'Normal Study.');
    setClinicalHistory(activeStudy.clinicalHistory || 'Pain in abdomen for last 2 weeks.');

    if (activeStudy.freeFormContent) {
      setFreeFormContent(activeStudy.freeFormContent);
    } else {
      generateDocumentContentFromTemplate(activeStudy);
    }
  }, [activeStudy?.id]);

  const generateDocumentContentFromTemplate = (study: RadiologyStudyReport) => {
    const findingsObj = study.structuredFindings || structuredFindings;
    let htmlContent = `
      <p><strong>Liver:</strong> ${findingsObj.sec_liver || 'Normal in size and echotexture. No focal lesion.'}</p>
      <p><strong>Gall Bladder:</strong> ${findingsObj.sec_gb || 'Well distended. No calculus.'}</p>
      <p><strong>CBD:</strong> ${findingsObj.sec_cbd || 'Normal.'}</p>
      <p><strong>Pancreas:</strong> ${findingsObj.sec_pancreas || 'Normal in size.'}</p>
      <p><strong>Spleen:</strong> ${findingsObj.sec_spleen || 'Normal.'}</p>
      <p><strong>Both Kidneys:</strong> ${findingsObj.sec_kidneys || 'Normal in size and echotexture. No hydronephrosis.'}</p>
      <p><strong>Urinary Bladder:</strong> ${findingsObj.sec_bladder || 'Well distended.'}</p>
    `;
    setFreeFormContent(htmlContent);
  };

  // 4. Save & Status Updates (synchronous local storage + Firestore)
  const saveStudyToDatabase = async (
    updatedStudy: RadiologyStudyReport,
    notifyMsg = 'Report saved successfully'
  ) => {
    setIsSyncing(true);
    StorageService.saveRadiologyStudy(updatedStudy);
    setActiveStudy(updatedStudy);
    setStudies((prev) => prev.map((s) => (s.id === updatedStudy.id ? updatedStudy : s)));

    try {
      await setDoc(doc(db, 'radiology_studies', updatedStudy.id), {
        ...updatedStudy,
        _updatedAt: Date.now(),
      });
      setIsFirestoreConnected(true);
      showToast(notifyMsg);

      // Synchronize linked token status with Waiting Room TV & POS in real time
      if (updatedStudy.patientMRN || updatedStudy.invoiceId) {
        const allTokens = StorageService.getClinicTokens();
        const linkedToken = allTokens.find(
          (t) =>
            (updatedStudy.invoiceId && t.invoiceId === updatedStudy.invoiceId) ||
            t.patientMRN === updatedStudy.patientMRN
        );
        if (linkedToken) {
          let nextTokenStatus = linkedToken.status;
          if (updatedStudy.status === 'In Progress') {
            nextTokenStatus = 'In Progress';
          } else if (
            updatedStudy.status === 'Completed' ||
            updatedStudy.status === 'Approved' ||
            updatedStudy.status === 'Delivered'
          ) {
            nextTokenStatus = 'Completed';
          }
          if (nextTokenStatus !== linkedToken.status) {
            const tokUpdate = { ...linkedToken, status: nextTokenStatus };
            StorageService.saveClinicToken(tokUpdate);
            setDoc(doc(db, 'clinic_tokens', tokUpdate.id), {
              ...tokUpdate,
              _updatedAt: Date.now(),
            }).catch(() => {});
          }
        }
      }
    } catch (error) {
      console.warn('Firestore write warning:', error);
      setIsFirestoreConnected(false);
      showToast(`${notifyMsg} (saved locally)`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateStatus = (newStatus: ReportStatus) => {
    if (!activeStudy) return;

    const updated: RadiologyStudyReport = {
      ...activeStudy,
      status: newStatus,
      reportingMode,
      structuredFindings,
      freeFormContent,
      impression,
      clinicalHistory,
      version: activeStudy.version + 1,
      versionHistory: [
        ...(activeStudy.versionHistory || []),
        {
          version: activeStudy.version + 1,
          timestamp: new Date().toISOString(),
          userId: 'usr_nadeem_typist',
          userName: 'Mr. Muhammad Nadeem',
          userRole: 'typist',
          status: newStatus,
          changeSummary: `Status moved to ${newStatus}`,
          contentSnapshot: freeFormContent,
          impressionSnapshot: impression,
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    if (newStatus === 'Delivered') {
      updated.isDelivered = true;
      updated.deliveredAt = new Date().toISOString();
      updated.deliveredTo = activeStudy.patientName;
    }

    saveStudyToDatabase(updated, `Report status: ${newStatus}`);
    setIsStatusDropdownOpen(false);
  };

  const handleSaveDraft = () => {
    if (!activeStudy) return;

    const updated: RadiologyStudyReport = {
      ...activeStudy,
      reportingMode,
      structuredFindings,
      freeFormContent,
      impression,
      clinicalHistory,
      status: activeStudy.status === 'Requested' ? 'In Progress' : activeStudy.status,
      version: activeStudy.version + 1,
      updatedAt: new Date().toISOString(),
    };

    saveStudyToDatabase(updated, 'Draft report saved successfully');
  };

  const handleSaveAndNext = () => {
    handleSaveDraft();
    // Switch to next pending report in queue
    const nextStudy = studies.find(
      (s) => s.id !== activeStudy?.id && (s.status === 'Draft' || s.status === 'Pending' || s.status === 'In Progress')
    );
    if (nextStudy) {
      setActiveStudy(nextStudy);
      showToast(`Saved. Switched to next study: ${nextStudy.patientName}`);
    } else {
      showToast('All pending studies completed!');
    }
  };

  // 5. Template Selection Action
  const handleApplyTemplate = (tmpl: RadiologyTemplate) => {
    setSelectedTemplateCardId(tmpl.id);
    if (!activeStudy) return;

    const initialFindings: Record<string, string> = {};
    if (tmpl.sections && tmpl.sections.length > 0) {
      tmpl.sections.forEach((sec) => {
        initialFindings[sec.id] = sec.defaultNormalText;
      });
    } else {
      initialFindings.sec_liver = 'Normal in size and echotexture. No focal lesion.';
      initialFindings.sec_gb = 'Well distended. No calculus.';
      initialFindings.sec_cbd = 'Normal.';
      initialFindings.sec_pancreas = 'Normal in size.';
      initialFindings.sec_spleen = 'Normal.';
      initialFindings.sec_kidneys = 'Normal in size and echotexture. No hydronephrosis.';
      initialFindings.sec_bladder = 'Well distended.';
    }

    setStructuredFindings(initialFindings);
    setImpression(tmpl.defaultImpression || 'Normal Study.');

    const updated: RadiologyStudyReport = {
      ...activeStudy,
      templateId: tmpl.id,
      templateTitle: tmpl.title,
      structuredFindings: initialFindings,
      impression: tmpl.defaultImpression || 'Normal Study.',
      examinationType: tmpl.title,
      updatedAt: new Date().toISOString(),
    };

    generateDocumentContentFromTemplate(updated);
    saveStudyToDatabase(updated, `Template loaded: ${tmpl.title}`);
  };

  // 6. Medical Shortcut Insertion
  const handleInsertShortcut = (sc: MedicalShortcut) => {
    // Insert text directly into findings or free-form editor
    setFreeFormContent((prev) => `${prev} <p><strong>${sc.title}:</strong> ${sc.expandedText}</p>`);
    setStructuredFindings((prev) => ({
      ...prev,
      [sc.code.toLowerCase()]: sc.expandedText,
    }));
    showToast(`Inserted shortcut [${sc.code}]: ${sc.title}`);
  };

  // Quick shortcut chips
  const QUICK_SHORTCUTS = [
    { code: 'LIVN', text: 'Normal in size and echotexture. No focal lesion.' },
    { code: 'GBN', text: 'Well distended. No calculus or sludge.' },
    { code: 'KIDN', text: 'Both kidneys normal in size and echotexture. No hydronephrosis.' },
    { code: 'NFX', text: 'Normal study with no acute focal pathology.' },
    { code: 'SPN', text: 'Spleen is normal in size and homogeneous in echotexture.' },
    { code: 'UTN', text: 'Uterus is normal in size, myometrium homogeneous.' },
    { code: 'PROSN', text: 'Prostate is normal in size (< 25 cc) and homogeneous.' },
  ];

  // 7. Voice Dictation Controller
  const toggleDictation = () => {
    if (isDictating && speechRecognizerInstance) {
      try {
        speechRecognizerInstance.stop();
      } catch {}
      setIsDictating(false);
      showToast('Voice Dictation Paused');
      return;
    }

    if (!RadiologyExportService.isSpeechRecognitionSupported()) {
      showToast('Speech recognition not supported in this browser. Please use Chrome/Edge or type manually.');
      return;
    }

    try {
      const recognizer = RadiologyExportService.createSpeechRecognizer(
        language === 'urdu' ? 'ur-PK' : 'en-US',
        (text: string, isFinal: boolean) => {
          if (isFinal) {
            setFreeFormContent((prev) => `${prev} ${text}`);
            setImpression((prev) => (prev ? `${prev} ${text}` : text));
          }
        },
        (err: any) => {
          console.warn('Speech recognition error', err);
          setIsDictating(false);
        }
      );

      if (recognizer) {
        recognizer.start();
        setSpeechRecognizerInstance(recognizer);
        setIsDictating(true);
        showToast(`Dictation active (${language === 'urdu' ? 'Urdu' : 'English'}). Speak now...`);
      }
    } catch (e) {
      console.error('Speech recognition start failed', e);
      setIsDictating(false);
    }
  };

  // 8. Rich Editor Formatting helper
  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setFreeFormContent(editorRef.current.innerHTML);
    }
  };

  // Filter templates & shortcuts for Right Panel
  const filteredTemplates = templates.filter((t) => {
    const matchesMod =
      templateModalityFilter === 'All' ||
      t.modality.toLowerCase() === templateModalityFilter.toLowerCase();
    const matchesQuery =
      !templateSearch ||
      t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.examinationType.toLowerCase().includes(templateSearch.toLowerCase());
    return matchesMod && matchesQuery;
  });

  const filteredShortcuts = shortcuts.filter((sc) => {
    const matchesCat =
      selectedShortcutCategory === 'All' || sc.category === selectedShortcutCategory;
    const q = shortcutSearch.toLowerCase();
    const matchesSearch =
      !shortcutSearch ||
      sc.code.toLowerCase().includes(q) ||
      sc.title.toLowerCase().includes(q) ||
      sc.expandedText.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  // Current display study
  const displayStudy: RadiologyStudyReport = activeStudy || {
    id: 'rad_std_ali_vip',
    studyId: 'US-2026-1105-001',
    patientId: 'P-10452',
    patientMRN: 'MR-5712298',
    patientName: 'Muhammad Ali',
    age: 32,
    gender: 'Male',
    contactNumber: '0300-1234567',
    examinationDate: '05-11-2026',
    modality: 'Ultrasound',
    examinationType: 'Whole Abdomen Ultrasound',
    referringDoctor: 'Dr. Tariq Mahmood',
    reportingDoctorId: 'DOC-AHSAN-RAZA',
    reportingDoctorName: 'Dr. Ahsan Raza',
    reportingDoctorQualification: 'MBBS, FCPS (Radiology)',
    reportingDoctorRegNo: '74231-PMC',
    status: 'Draft',
    reportingMode: 'template',
    clinicalHistory: 'Pain in abdomen for last 2 weeks.',
    impression: 'Normal Study.',
    structuredFindings,
    freeFormContent,
    attachedImages: [],
    version: 1,
    versionHistory: [],
    isDelivered: false,
    createdAt: '2026-11-05T11:30:00Z',
    updatedAt: '2026-11-05T11:45:00Z',
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-[calc(100vh-4rem)] bg-[#e2e8f0] text-slate-900 font-sans select-none overflow-hidden ${
        isFullScreen ? 'fixed inset-0 z-50 h-screen w-screen bg-[#e2e8f0]' : ''
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0c2340] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-cyan-400 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER: Dark Navy Blue Header (#0c2340) Matching Reference Image   */}
      {/* ========================================================================= */}
      <header className="h-[72px] bg-[#0c2340] text-white px-5 flex items-center justify-between shrink-0 shadow-md border-b border-[#1b3a5b] z-20">
        {/* Left Brand & Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            {/* Glowing Heartbeat Cross Logo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <h1 className="font-extrabold text-base tracking-wider text-white">
                  HR DIAGNOSTICS
                </h1>
              </div>
              <p className="text-[11px] text-cyan-300 font-medium tracking-wide">
                Radiology Information System
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-700/60 mx-1 hidden sm:block" />

          {/* Active Navigation Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1a385c] border border-[#2b5282] text-white font-semibold text-xs shadow-inner">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Radiology Reporting</span>
          </div>
        </div>

        {/* Center / Right Metadata & Typist Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Report Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#142d4a] hover:bg-[#1b3d64] border border-[#234b75] text-xs font-semibold text-slate-100 transition-colors shadow-xs"
            >
              <span className="text-slate-400">Report Status:</span>
              <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                {displayStudy.status}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-[#0c2340] border border-[#20456c] rounded-xl shadow-2xl py-1.5 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-700/60">
                  Update Workflow Status
                </div>
                {WORKFLOW_STEPS.map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(st)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#1b3d64] text-slate-200 transition-colors ${
                      displayStudy.status === st ? 'text-cyan-300 font-bold bg-[#142d4a]' : ''
                    }`}
                  >
                    <span>{st}</span>
                    {displayStudy.status === st && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-700/60 hidden md:block" />

          {/* Date & Time Widget */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-200">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="font-bold leading-tight">05 Nov 2026</p>
              <p className="text-[10px] text-slate-400 leading-tight">Wed, 11:45 AM</p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700/60 hidden lg:block" />

          {/* Typist Profile */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full ring-2 ring-cyan-400/60 overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                alt="Typist Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <User className="w-5 h-5 text-slate-300" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-white leading-tight">Mr. Muhammad Nadeem</p>
              <p className="text-[10px] text-cyan-300 font-medium leading-tight">Typist</p>
            </div>
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="w-8 h-8 rounded-full bg-[#142d4a] hover:bg-[#1b3d64] flex items-center justify-center text-slate-300 hover:text-white transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
                3
              </span>
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0c2340] border border-[#20456c] rounded-xl shadow-2xl p-3 z-50 text-xs">
                <div className="font-bold text-white mb-2 flex items-center justify-between">
                  <span>Recent Notifications</span>
                  <span className="text-[10px] text-cyan-300">3 new</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2 rounded-lg bg-[#142d4a] text-[11px] text-slate-300">
                    <p className="font-semibold text-white">New Ultrasound Ordered</p>
                    <p className="text-slate-400 text-[10px]">Patient: Muhammad Ali (P-10452)</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[#142d4a] text-[11px] text-slate-300">
                    <p className="font-semibold text-white">Dr. Ahsan Raza Signed</p>
                    <p className="text-slate-400 text-[10px]">Chest X-Ray for Abdul Rehman verified.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Logout / Exit */}
          <button
            onClick={() => onNavigate?.('dashboard')}
            className="w-8 h-8 rounded-full bg-[#142d4a] hover:bg-rose-900/60 hover:text-rose-200 flex items-center justify-center text-slate-300 transition-colors"
            title="Exit / Dashboard"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SECOND TOOLBAR: Professional Word-Style Formatting Toolbar             */}
      {/* ========================================================================= */}
      <div className="h-[60px] bg-[#f8fafc] border-b border-slate-300 px-4 flex items-center justify-between shrink-0 shadow-xs z-10 overflow-x-auto gap-2">
        {/* Left Section: Back & Reporting Modes */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate?.('dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg border border-slate-300">
            <button
              onClick={() => setReportingMode('template')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                reportingMode === 'template'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Template Mode</span>
            </button>

            <button
              onClick={() => setReportingMode('word')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                reportingMode === 'word'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              <span className="font-serif font-black text-xs text-blue-700 bg-white px-1 rounded">W</span>
              <span>Word Mode</span>
            </button>

            <button
              onClick={() => setReportingMode('hybrid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                reportingMode === 'hybrid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Hybrid Mode</span>
            </button>
          </div>
        </div>

        {/* Center Formatting Tools */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Font Family Dropdown */}
          <select
            value={fontFamily}
            onChange={(e) => {
              setFontFamily(e.target.value);
              execCmd('fontName', e.target.value);
            }}
            className="h-8 px-2 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Calibri">Calibri</option>
            <option value="Segoe UI">Segoe UI</option>
            <option value="Georgia">Georgia</option>
            <option value="Jameel Noori Nastaleeq">Urdu Nastaleeq</option>
          </select>

          {/* Font Size Dropdown */}
          <select
            value={fontSize}
            onChange={(e) => {
              setFontSize(e.target.value);
              execCmd('fontSize', '3');
            }}
            className="h-8 w-14 px-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="9">9</option>
            <option value="10">10</option>
            <option value="11">11</option>
            <option value="12">12</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
          </select>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* B / I / U / Color / Highlight */}
          <button
            onClick={() => execCmd('bold')}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center font-black text-slate-800 text-xs"
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            onClick={() => execCmd('italic')}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center italic font-serif font-bold text-slate-800 text-xs"
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            onClick={() => execCmd('underline')}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center underline font-bold text-slate-800 text-xs"
            title="Underline (Ctrl+U)"
          >
            U
          </button>
          <button
            onClick={() => execCmd('foreColor', '#dc2626')}
            className="w-7 h-7 rounded hover:bg-slate-200 flex flex-col items-center justify-center font-bold text-slate-800 text-xs"
            title="Text Color"
          >
            <span>A</span>
            <span className="w-3.5 h-0.5 bg-red-600 rounded-full" />
          </button>
          <button
            onClick={() => {
              setIsHighlightActive(!isHighlightActive);
              execCmd('hiliteColor', '#fef08a');
            }}
            className="w-7 h-7 rounded hover:bg-slate-200 flex flex-col items-center justify-center font-bold text-slate-800 text-xs"
            title="Text Highlight"
          >
            <span className="text-[10px]">🖊</span>
            <span className="w-3.5 h-0.5 bg-yellow-400 rounded-full" />
          </button>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Alignment */}
          <button
            onClick={() => execCmd('justifyLeft')}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-700"
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => execCmd('justifyCenter')}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-700"
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => execCmd('justifyRight')}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-700"
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => execCmd('justifyFull')}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-700"
            title="Justify"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-slate-300 mx-0.5" />

          {/* Bullets & Numbers */}
          <button
            onClick={() => execCmd('insertUnorderedList')}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-700"
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => execCmd('insertOrderedList')}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-700"
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          {/* Table & Image */}
          <button
            onClick={() => {
              const tableHtml = `<table border="1" style="width:100%; border-collapse:collapse; margin:10px 0; border:1px solid #cbd5e1;"><tr><th style="padding:4px; background:#f1f5f9;">Structure</th><th style="padding:4px; background:#f1f5f9;">Measurement</th><th style="padding:4px; background:#f1f5f9;">Status</th></tr><tr><td style="padding:4px;">Liver</td><td style="padding:4px;">13.5 cm</td><td style="padding:4px;">Normal</td></tr></table><p></p>`;
              execCmd('insertHTML', tableHtml);
            }}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-700"
            title="Insert Table"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsDICOMModalOpen(true)}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-700"
            title="Attach Ultrasound/X-Ray Images (DICOM)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
          </button>

          {/* Undo / Redo */}
          <button
            onClick={() => execCmd('undo')}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-700"
            title="Undo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => execCmd('redo')}
            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-700"
            title="Redo"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Voice Dictation Mic Button on Toolbar */}
          <button
            onClick={toggleDictation}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all shadow-xs ${
              isDictating
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="Voice Dictation (Speech-to-Text)"
          >
            {isDictating ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span className="hidden xl:inline">{isDictating ? 'Listening...' : 'Voice Dictate'}</span>
          </button>
        </div>

        {/* Right Section: Zoom, Full Screen, Preview */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom Dropdown */}
          <select
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="h-8 px-2 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value={75}>↔ 75%</option>
            <option value={90}>↔ 90%</option>
            <option value={100}>↔ 100%</option>
            <option value={110}>↔ 110%</option>
            <option value={125}>↔ 125%</option>
          </select>

          {/* Full Screen Button */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="w-8 h-8 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Preview Button */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE: 3-PANEL LAYOUT (LEFT 23% | CENTER 54% | RIGHT 23%)     */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ========================================================= */}
        {/* LEFT PANEL: Dark Navy Blue Patient Information Sidebar    */}
        {/* ========================================================= */}
        <aside
          className={`bg-[#0c2340] text-white flex flex-col shrink-0 border-r border-[#1a3a60] transition-all duration-300 overflow-hidden relative ${
            isLeftCollapsed ? 'w-12' : 'w-80 lg:w-[360px]'
          }`}
        >
          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            className="absolute top-3 right-2.5 z-30 w-6 h-6 rounded-md bg-[#163860] hover:bg-blue-600 flex items-center justify-center text-slate-200 transition-colors"
            title={isLeftCollapsed ? 'Expand Patient Panel' : 'Collapse Patient Panel'}
          >
            {isLeftCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {!isLeftCollapsed ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Header Title & Switch Patient button */}
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-cyan-400">
                    <User className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-sm text-white tracking-wide">
                    Patient Information
                  </h3>
                </div>

                <button
                  onClick={() => setIsStudyQueueOpen(!isStudyQueueOpen)}
                  className="text-[11px] text-cyan-300 hover:text-white font-semibold underline pr-6"
                >
                  {isStudyQueueOpen ? 'Close Queue' : 'Switch Study'}
                </button>
              </div>

              {/* Study Switcher Queue Drawer (if expanded) */}
              {isStudyQueueOpen && (
                <div className="p-2.5 rounded-xl bg-[#142d4a] border border-[#234b75] space-y-1.5 max-h-48 overflow-y-auto">
                  <p className="text-[10px] font-bold uppercase text-slate-400 px-1">
                    Pending Radiology Studies ({studies.length})
                  </p>
                  {studies.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActiveStudy(s);
                        setIsStudyQueueOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                        s.id === displayStudy.id
                          ? 'bg-blue-600 text-white font-bold'
                          : 'hover:bg-[#1e4168] text-slate-200'
                      }`}
                    >
                      <div className="truncate">
                        <p className="font-bold truncate">{s.patientName}</p>
                        <p className="text-[10px] opacity-80">{s.modality} • {s.examinationType}</p>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/30">
                        {s.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Patient Photo & Identity Card */}
              <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#142d4a]/70 border border-[#1e4168] shadow-inner">
                {/* Photo matching reference image */}
                <div className="w-20 h-24 rounded-xl overflow-hidden bg-slate-800 border-2 border-cyan-400/50 shadow-md shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80"
                    alt="Patient Portrait"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <User className="w-10 h-10 text-slate-400 m-auto mt-6" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="font-extrabold text-base text-white truncate leading-tight">
                    {displayStudy.patientName}
                  </h4>

                  {/* Patient ID Badge */}
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-600 text-white font-bold text-[11px] shadow-xs">
                    Patient ID: {displayStudy.patientId}
                  </div>

                  <p className="text-xs text-slate-300 font-mono flex items-center gap-1.5 pt-0.5">
                    <span>🪪</span>
                    <span>MRN: {displayStudy.patientMRN}</span>
                  </p>

                  <p className="text-xs text-slate-300 flex items-center gap-1.5">
                    <span>👥</span>
                    <span>Age / Gender: {displayStudy.age} Years / {displayStudy.gender}</span>
                  </p>

                  <p className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                    <span>📞</span>
                    <span>Mobile: {displayStudy.contactNumber}</span>
                  </p>
                </div>
              </div>

              {/* Study Meta Rows */}
              <div className="p-3 rounded-xl bg-[#142d4a]/40 border border-[#1e4168]/70 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Examination Date:
                  </span>
                  <span className="font-bold text-white font-mono">{displayStudy.examinationDate}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-cyan-400" /> Referring Doctor:
                  </span>
                  <span className="font-bold text-white truncate max-w-[170px] text-right">
                    {displayStudy.referringDoctor}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" /> Department:
                  </span>
                  <span className="font-bold text-cyan-300">Radiology</span>
                </div>
              </div>

              {/* Section: Previous Reports (3) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-white">Previous Reports (3)</h4>
                  <button
                    onClick={() => setIsComparisonModalOpen(true)}
                    className="text-[11px] text-cyan-400 hover:underline font-semibold"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-1.5">
                  {/* Card 1: Abdominal Ultrasound */}
                  <div
                    onClick={() => {
                      showToast('Comparing with previous Abdominal Ultrasound (12-08-2026)');
                      setIsComparisonModalOpen(true);
                    }}
                    className="p-2.5 rounded-xl bg-[#142d4a] hover:bg-[#1a385c] border border-[#1e4168] flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                        <img
                          src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=120&q=80"
                          alt="USG Thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                          Abdominal Ultrasound
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">12-08-2026</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  </div>

                  {/* Card 2: Chest X-Ray */}
                  <div
                    onClick={() => {
                      showToast('Comparing with previous Chest X-Ray (01-06-2026)');
                      setIsComparisonModalOpen(true);
                    }}
                    className="p-2.5 rounded-xl bg-[#142d4a] hover:bg-[#1a385c] border border-[#1e4168] flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                        <img
                          src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=120&q=80"
                          alt="XRay Thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                          Chest X-Ray
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">01-06-2026</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  </div>

                  {/* Card 3: Pelvis Ultrasound */}
                  <div
                    onClick={() => {
                      showToast('Comparing with previous Pelvis Ultrasound (15-03-2026)');
                      setIsComparisonModalOpen(true);
                    }}
                    className="p-2.5 rounded-xl bg-[#142d4a] hover:bg-[#1a385c] border border-[#1e4168] flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                        <img
                          src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=120&q=80"
                          alt="Pelvis Thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                          Pelvis Ultrasound
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">15-03-2026</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  </div>
                </div>
              </div>

              {/* Section: Quick Actions (2x2 Grid) */}
              <div className="space-y-2 pt-2 border-t border-slate-700/60">
                <h4 className="font-bold text-xs text-white">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  {/* New Patient */}
                  <button
                    onClick={() => setIsNewStudyModalOpen(true)}
                    className="h-10 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 transition-transform active:scale-95"
                  >
                    <User className="w-4 h-4" />
                    <span>New Patient</span>
                  </button>

                  {/* Add Service */}
                  <button
                    onClick={() => {
                      showToast('Opening service catalog...');
                      onNavigate?.('billing');
                    }}
                    className="h-10 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/30 transition-transform active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Service</span>
                  </button>

                  {/* Print Receipt */}
                  <button
                    onClick={() => setIsPrintModalOpen(true)}
                    className="h-10 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-900/30 transition-transform active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>

                  {/* Close Report */}
                  <button
                    onClick={() => handleUpdateStatus('Approved')}
                    className="h-10 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-900/30 transition-transform active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Close Report</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Collapsed mini view */
            <div className="flex flex-col items-center py-4 space-y-4 text-cyan-400">
              <User className="w-5 h-5" />
              <div className="w-px h-8 bg-slate-700" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 [writing-mode:vertical-lr]">
                Patient Info
              </span>
            </div>
          )}
        </aside>

        {/* ========================================================= */}
        {/* CENTER PANEL: True A4 Report Page in Gray Canvas Studio   */}
        {/* ========================================================= */}
        <main className="flex-1 flex flex-col bg-[#cbd5e1] overflow-y-auto relative p-6 items-center">
          {/* Top Ruler Bar (Metric centimeter / inch markings like Word) */}
          <div className="w-full max-w-[794px] h-4 bg-white/70 border-b border-slate-300 mb-3 rounded-t-sm flex items-end justify-between px-2 text-[8px] font-mono text-slate-500 select-none shadow-xs">
            <span>| . . | . . |</span>
            <span>1</span>
            <span>| . . | . . |</span>
            <span>2</span>
            <span>| . . | . . |</span>
            <span>3</span>
            <span>| . . | . . |</span>
            <span>4</span>
            <span>| . . | . . |</span>
            <span>5</span>
            <span>| . . | . . |</span>
            <span>6</span>
            <span>| . . | . . |</span>
            <span>7</span>
            <span>| . . | . . |</span>
          </div>

          {/* Scaled A4 Document Container */}
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="w-[794px] min-h-[1123px] bg-white text-slate-900 shadow-2xl rounded-sm p-12 border border-slate-300 space-y-5 text-sm select-text flex flex-col justify-between"
          >
            {/* Top Sheet Content */}
            <div className="space-y-5">
              {/* Institutional Header Matching Reference Image */}
              <div className="flex items-start justify-between pb-3">
                {/* Left Clinic Brand */}
                <div className="flex items-center gap-3.5">
                  {/* Cyan Pulse Heart Logo */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                    <Activity className="w-9 h-9 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#0c2340] tracking-wider font-sans">
                      HR DIAGNOSTICS
                    </h2>
                    <p className="text-[11px] font-extrabold text-[#0284c7] tracking-widest uppercase">
                      DIAGNOSTIC & IMAGING CENTER
                    </p>
                    <p className="text-[10px] text-slate-400 italic font-serif">
                      Better Health... Brighter Tomorrow
                    </p>
                  </div>
                </div>

                {/* Right Contact Info */}
                <div className="text-right text-xs space-y-0.5 border-l-2 border-slate-300 pl-4 text-slate-700">
                  <p className="flex items-center justify-end gap-1.5 font-semibold">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>042-111-255-255</span>
                  </p>
                  <p className="flex items-center justify-end gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Main Boulevard, Lahore</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    ✉ info@hrdiagnostics.com
                  </p>
                </div>
              </div>

              {/* Blue Horizontal Accent Line */}
              <div className="h-0.5 w-full bg-[#0096c7]" />

              {/* Centered Deep Blue Report Title Banner */}
              <div className="flex justify-center my-2">
                <div className="bg-[#0c2340] text-white px-8 py-1 rounded-full font-extrabold tracking-widest text-sm shadow-md">
                  {displayStudy.modality.toUpperCase()} REPORT
                </div>
              </div>

              {/* 2-Column Demographics Table Matching Reference Image */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs py-2 border-y border-slate-200">
                {/* Left Column */}
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-28 font-bold text-slate-800">Patient Name</span>
                    <span className="text-slate-900">: <strong>{displayStudy.patientName}</strong></span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-slate-800">Age / Gender</span>
                    <span className="text-slate-900">: {displayStudy.age} Years / {displayStudy.gender}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-slate-800">MRN</span>
                    <span className="text-slate-900 font-mono">: {displayStudy.patientMRN}</span>
                  </div>
                  <div className="flex">
                    <span className="w-28 font-bold text-slate-800">Ref. Doctor</span>
                    <span className="text-slate-900">: {displayStudy.referringDoctor}</span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-800">Patient ID</span>
                    <span className="text-slate-900 font-bold">: {displayStudy.patientId}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-800">Examination Date</span>
                    <span className="text-slate-900 font-mono">: {displayStudy.examinationDate}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-800">Department</span>
                    <span className="text-slate-900">: Radiology</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-bold text-slate-800">Study ID</span>
                    <span className="text-slate-900 font-mono">: {displayStudy.studyId}</span>
                  </div>
                </div>
              </div>

              {/* Section 1: Examination Badge & Title */}
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-md bg-[#1d4ed8] text-white font-extrabold text-xs shadow-xs">
                  Examination:
                </span>
                <span className="font-bold text-sm text-slate-900">
                  {displayStudy.examinationType}
                </span>
              </div>

              {/* Section 2: Clinical History Badge & History */}
              <div className="flex items-start gap-3">
                <span className="px-3 py-1 rounded-md bg-[#1d4ed8] text-white font-extrabold text-xs shadow-xs shrink-0">
                  Clinical History:
                </span>
                <input
                  type="text"
                  value={clinicalHistory}
                  onChange={(e) => setClinicalHistory(e.target.value)}
                  className="w-full text-slate-800 font-medium text-xs border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent"
                />
              </div>

              {/* Section 3: Findings Badge & Clinical Findings */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-md bg-[#1d4ed8] text-white font-extrabold text-xs shadow-xs">
                    Findings:
                  </span>
                </div>

                {/* Findings Content (Interactive in Template Mode OR Word Mode) */}
                {reportingMode === 'word' ? (
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => setFreeFormContent(e.currentTarget.innerHTML)}
                    dangerouslySetInnerHTML={{ __html: freeFormContent }}
                    className="p-3 bg-slate-50/50 rounded-lg border border-slate-200 outline-none text-xs leading-relaxed min-h-[220px]"
                  />
                ) : (
                  <div className="pl-6 space-y-1.5 text-xs text-slate-800 leading-relaxed">
                    <div className="flex items-baseline">
                      <strong className="w-28 shrink-0 text-slate-900">Liver:</strong>
                      <input
                        type="text"
                        value={structuredFindings.sec_liver || 'Normal in size and echotexture. No focal lesion.'}
                        onChange={(e) =>
                          setStructuredFindings({ ...structuredFindings, sec_liver: e.target.value })
                        }
                        className="w-full bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1"
                      />
                    </div>

                    <div className="flex items-baseline">
                      <strong className="w-28 shrink-0 text-slate-900">Gall Bladder:</strong>
                      <input
                        type="text"
                        value={structuredFindings.sec_gb || 'Well distended. No calculus.'}
                        onChange={(e) =>
                          setStructuredFindings({ ...structuredFindings, sec_gb: e.target.value })
                        }
                        className="w-full bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1"
                      />
                    </div>

                    <div className="flex items-baseline">
                      <strong className="w-28 shrink-0 text-slate-900">CBD:</strong>
                      <input
                        type="text"
                        value={structuredFindings.sec_cbd || 'Normal.'}
                        onChange={(e) =>
                          setStructuredFindings({ ...structuredFindings, sec_cbd: e.target.value })
                        }
                        className="w-full bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1"
                      />
                    </div>

                    <div className="flex items-baseline">
                      <strong className="w-28 shrink-0 text-slate-900">Pancreas:</strong>
                      <input
                        type="text"
                        value={structuredFindings.sec_pancreas || 'Normal in size.'}
                        onChange={(e) =>
                          setStructuredFindings({ ...structuredFindings, sec_pancreas: e.target.value })
                        }
                        className="w-full bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1"
                      />
                    </div>

                    <div className="flex items-baseline">
                      <strong className="w-28 shrink-0 text-slate-900">Spleen:</strong>
                      <input
                        type="text"
                        value={structuredFindings.sec_spleen || 'Normal.'}
                        onChange={(e) =>
                          setStructuredFindings({ ...structuredFindings, sec_spleen: e.target.value })
                        }
                        className="w-full bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1"
                      />
                    </div>

                    <div className="flex items-baseline">
                      <strong className="w-28 shrink-0 text-slate-900">Both Kidneys:</strong>
                      <input
                        type="text"
                        value={structuredFindings.sec_kidneys || 'Normal in size and echotexture. No hydronephrosis.'}
                        onChange={(e) =>
                          setStructuredFindings({ ...structuredFindings, sec_kidneys: e.target.value })
                        }
                        className="w-full bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1"
                      />
                    </div>

                    <div className="flex items-baseline">
                      <strong className="w-28 shrink-0 text-slate-900">Urinary Bladder:</strong>
                      <input
                        type="text"
                        value={structuredFindings.sec_bladder || 'Well distended.'}
                        onChange={(e) =>
                          setStructuredFindings({ ...structuredFindings, sec_bladder: e.target.value })
                        }
                        className="w-full bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-400 rounded px-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Impression Badge & Highlighted Box */}
              <div className="space-y-1.5 pt-2">
                <span className="px-3 py-1 rounded-md bg-[#1d4ed8] text-white font-extrabold text-xs shadow-xs inline-block">
                  Impression:
                </span>
                <div className="p-3 bg-[#e0f2fe] border border-[#bae6fd] rounded-lg">
                  <input
                    type="text"
                    value={impression}
                    onChange={(e) => setImpression(e.target.value)}
                    className="w-full font-bold text-slate-900 text-xs bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Sheet Footer: Doctor & Cursive Signature */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <div className="flex items-end justify-between text-xs">
                {/* Reporting Doctor */}
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">
                    Reporting Doctor:
                  </p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {displayStudy.reportingDoctorName || 'Dr. Ahsan Raza'}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    {displayStudy.reportingDoctorQualification || 'MBBS, FCPS (Radiology)'}
                  </p>
                  <p className="text-slate-500 font-mono text-[10px]">
                    Reg. No: {displayStudy.reportingDoctorRegNo || '74231-PMC'}
                  </p>
                </div>

                {/* Digital Cursive Signature */}
                <div className="text-right flex flex-col items-end">
                  <div className="h-10 w-36 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="140"
                      height="40"
                      viewBox="0 0 160 50"
                      className="text-blue-700"
                    >
                      <path
                        d="M10,35 Q35,5 65,28 T115,18 T150,38"
                        fill="none"
                        stroke="#1d4ed8"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="w-36 border-t border-slate-800 pt-0.5 font-bold text-[11px] text-slate-900 text-center">
                    Signature
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                    Date: {displayStudy.examinationDate}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Page 1 of 1
                  </div>
                </div>
              </div>

              {/* Bottom Clinical Note */}
              <p className="text-center text-[10px] italic text-blue-700 font-semibold tracking-wide">
                This report is for clinical correlation only.
              </p>
            </div>
          </div>
        </main>

        {/* ========================================================= */}
        {/* RIGHT PANEL: Smart Tools & Templates Drawer               */}
        {/* ========================================================= */}
        <aside
          className={`bg-white text-slate-800 flex flex-col shrink-0 border-l border-slate-300 transition-all duration-300 overflow-hidden relative shadow-lg ${
            isRightCollapsed ? 'w-12' : 'w-80 lg:w-[360px]'
          }`}
        >
          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setIsRightCollapsed(!isRightCollapsed)}
            className="absolute top-3 left-2.5 z-30 w-6 h-6 rounded-md bg-slate-100 hover:bg-blue-600 hover:text-white flex items-center justify-center text-slate-600 transition-colors"
            title={isRightCollapsed ? 'Expand Smart Tools' : 'Collapse Smart Tools'}
          >
            {isRightCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {!isRightCollapsed ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 4 Smart Tools Tabs Matching Reference Image */}
              <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 p-1.5 gap-1 shrink-0">
                <button
                  onClick={() => setRightPanelTab('templates')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    rightPanelTab === 'templates'
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-[10px]">Templates</span>
                </button>

                <button
                  onClick={() => setRightPanelTab('shortcuts')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    rightPanelTab === 'shortcuts'
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span className="text-[10px]">Shortcuts</span>
                </button>

                <button
                  onClick={() => setRightPanelTab('findings')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    rightPanelTab === 'findings'
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  <span className="text-[10px]">Findings</span>
                </button>

                <button
                  onClick={() => setRightPanelTab('history')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                    rightPanelTab === 'history'
                      ? 'bg-[#1d4ed8] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-[10px]">History</span>
                </button>
              </div>

              {/* TAB 1: TEMPLATES VIEW */}
              {rightPanelTab === 'templates' && (
                <div className="flex-1 flex flex-col overflow-hidden p-3.5 space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  {/* Filter Pills: All, Ultrasound, X-Ray, Other */}
                  <div className="flex items-center gap-1.5">
                    {['All', 'Ultrasound', 'X-Ray', 'Other'].map((mod) => (
                      <button
                        key={mod}
                        onClick={() => setTemplateModalityFilter(mod)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          templateModalityFilter === mod
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>

                  {/* 2-Column Template Cards Grid */}
                  <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2.5 pr-0.5">
                    {/* Card 1: Whole Abdomen USG (Selected) */}
                    <div
                      onClick={() => setSelectedTemplateCardId('tpl_usg_whole_abdomen')}
                      className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col items-center text-center group ${
                        selectedTemplateCardId === 'tpl_usg_whole_abdomen'
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-blue-400 bg-slate-50/30'
                      }`}
                    >
                      {selectedTemplateCardId === 'tpl_usg_whole_abdomen' && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div className="w-16 h-20 bg-white border border-slate-200 rounded-md shadow-xs p-1 mb-2 flex flex-col items-center justify-center space-y-1">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <div className="w-10 h-0.5 bg-slate-300" />
                        <div className="w-8 h-0.5 bg-slate-200" />
                        <div className="w-10 h-0.5 bg-slate-200" />
                      </div>
                      <p className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 leading-tight">
                        Whole Abdomen USG
                      </p>
                    </div>

                    {/* Card 2: Pelvis Ultrasound */}
                    <div
                      onClick={() => setSelectedTemplateCardId('tpl_usg_pelvis_female')}
                      className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col items-center text-center group ${
                        selectedTemplateCardId === 'tpl_usg_pelvis_female'
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-blue-400 bg-slate-50/30'
                      }`}
                    >
                      {selectedTemplateCardId === 'tpl_usg_pelvis_female' && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div className="w-16 h-20 bg-white border border-slate-200 rounded-md shadow-xs p-1 mb-2 flex flex-col items-center justify-center space-y-1">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <div className="w-10 h-0.5 bg-slate-300" />
                        <div className="w-8 h-0.5 bg-slate-200" />
                        <div className="w-10 h-0.5 bg-slate-200" />
                      </div>
                      <p className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 leading-tight">
                        Pelvis Ultrasound
                      </p>
                    </div>

                    {/* Card 3: Chest X-Ray Report */}
                    <div
                      onClick={() => setSelectedTemplateCardId('tpl_xray_chest_pa')}
                      className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col items-center text-center group ${
                        selectedTemplateCardId === 'tpl_xray_chest_pa'
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-blue-400 bg-slate-50/30'
                      }`}
                    >
                      {selectedTemplateCardId === 'tpl_xray_chest_pa' && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div className="w-16 h-20 bg-white border border-slate-200 rounded-md shadow-xs p-1 mb-2 flex flex-col items-center justify-center space-y-1">
                        <ImageIcon className="w-4 h-4 text-indigo-600" />
                        <div className="w-10 h-0.5 bg-slate-300" />
                        <div className="w-8 h-0.5 bg-slate-200" />
                        <div className="w-10 h-0.5 bg-slate-200" />
                      </div>
                      <p className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 leading-tight">
                        Chest X-Ray Report
                      </p>
                    </div>

                    {/* Card 4: Lumbar Spine X-Ray */}
                    <div
                      onClick={() => setSelectedTemplateCardId('tpl_xray_lumbar')}
                      className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col items-center text-center group ${
                        selectedTemplateCardId === 'tpl_xray_lumbar'
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-blue-400 bg-slate-50/30'
                      }`}
                    >
                      {selectedTemplateCardId === 'tpl_xray_lumbar' && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div className="w-16 h-20 bg-white border border-slate-200 rounded-md shadow-xs p-1 mb-2 flex flex-col items-center justify-center space-y-1">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <div className="w-10 h-0.5 bg-slate-300" />
                        <div className="w-8 h-0.5 bg-slate-200" />
                        <div className="w-10 h-0.5 bg-slate-200" />
                      </div>
                      <p className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 leading-tight">
                        Lumbar Spine X-Ray
                      </p>
                    </div>
                  </div>

                  {/* Actions: Load Template & Preview Template */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        const targetTmpl = templates.find((t) => t.id === selectedTemplateCardId) || templates[0];
                        if (targetTmpl) handleApplyTemplate(targetTmpl);
                      }}
                      className="py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-transform"
                    >
                      <Download className="w-4 h-4" />
                      <span>Load Template</span>
                    </button>

                    <button
                      onClick={() => setIsTemplateBuilderOpen(true)}
                      className="py-2.5 px-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>Preview Template</span>
                    </button>
                  </div>

                  {/* Bottom Section: Medical Shortcuts with Chips */}
                  <div className="pt-2.5 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1">
                        Medical Shortcuts
                        <span className="text-slate-400 hover:text-blue-600 cursor-pointer text-[11px]">(i)</span>
                      </span>
                      <button
                        onClick={() => setIsShortcutsModalOpen(true)}
                        className="text-[10px] text-blue-600 hover:underline font-bold"
                      >
                        Excel Manager
                      </button>
                    </div>

                    {/* Quick Shortcut Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_SHORTCUTS.map((sc) => (
                        <button
                          key={sc.code}
                          onClick={() => {
                            setFreeFormContent((prev) => `${prev} <p>${sc.text}</p>`);
                            showToast(`Inserted shortcut ${sc.code}`);
                          }}
                          className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-100 hover:text-blue-800 border border-slate-300 text-slate-700 text-xs font-mono font-bold transition-colors"
                          title={sc.text}
                        >
                          {sc.code}
                        </button>
                      ))}
                      <button
                        onClick={() => setIsShortcutsModalOpen(true)}
                        className="px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-colors"
                      >
                        + More...
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SHORTCUTS FULL VIEW */}
              {rightPanelTab === 'shortcuts' && (
                <div className="flex-1 flex flex-col overflow-hidden p-3.5 space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search shortcuts..."
                      value={shortcutSearch}
                      onChange={(e) => setShortcutSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">Click to auto-insert</span>
                    <button
                      onClick={() => setIsShortcutsModalOpen(true)}
                      className="text-blue-600 font-bold hover:underline text-[11px]"
                    >
                      Import / Export Excel
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filteredShortcuts.map((sc) => (
                      <div
                        key={sc.id}
                        onClick={() => handleInsertShortcut(sc)}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-blue-500 hover:bg-blue-50/40 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-black text-blue-700 text-xs bg-blue-100 px-1.5 py-0.5 rounded">
                            {sc.code}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">{sc.category}</span>
                        </div>
                        <h5 className="font-bold text-xs text-slate-900">{sc.title}</h5>
                        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{sc.expandedText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: FINDINGS LIBRARY */}
              {rightPanelTab === 'findings' && (
                <div className="flex-1 flex flex-col overflow-hidden p-3.5 space-y-3">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs">
                    <p className="font-bold text-blue-900">Normal Findings Library</p>
                    <p className="text-blue-700 text-[11px] mt-0.5">
                      Click any organ to insert standard normal findings directly into the report.
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {[
                      { organ: 'Liver', text: 'Liver is normal in size, smooth contour and uniform echotexture. No focal mass.' },
                      { organ: 'Gall Bladder', text: 'Gall bladder is well distended. Wall is thin. No calculus or sludge.' },
                      { organ: 'Pancreas', text: 'Pancreas visualised is normal in size and echogenicity.' },
                      { organ: 'Spleen', text: 'Spleen is normal in size (< 12 cm) and homogeneous in texture.' },
                      { organ: 'Right Kidney', text: 'Right kidney measures 10.5 cm. Cortical thickness normal. No stone or hydronephrosis.' },
                      { organ: 'Left Kidney', text: 'Left kidney measures 10.8 cm. Corticomedullary differentiation intact. No hydronephrosis.' },
                      { organ: 'Urinary Bladder', text: 'Urinary bladder adequately distended with smooth mucosal lining. No calculus.' },
                      { organ: 'Prostate', text: 'Prostate measures normal in size with homogeneous parenchymal echo pattern.' },
                    ].map((item) => (
                      <div
                        key={item.organ}
                        onClick={() => {
                          setFreeFormContent((prev) => `${prev} <p><strong>${item.organ}:</strong> ${item.text}</p>`);
                          showToast(`Inserted ${item.organ} findings`);
                        }}
                        className="p-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer text-xs transition-colors"
                      >
                        <p className="font-bold text-slate-900">{item.organ}</p>
                        <p className="text-slate-600 text-[11px]">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: HISTORY VIEW */}
              {rightPanelTab === 'history' && (
                <div className="flex-1 flex flex-col overflow-hidden p-3.5 space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <p className="font-bold text-slate-900">Audit Trail & Version History</p>
                    <p className="text-slate-500 text-[11px]">Active Study: {displayStudy.studyId}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>v1.0 (Current Draft)</span>
                        <span className="text-[10px] text-emerald-600 font-mono">05-11-2026</span>
                      </div>
                      <p className="text-[11px] text-slate-600">Initial draft generated from Whole Abdomen template.</p>
                      <p className="text-[10px] text-slate-400">Typist: Mr. Muhammad Nadeem</p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>Invoice # INV-2026-00452</span>
                        <span className="text-[10px] text-blue-600 font-mono">Paid</span>
                      </div>
                      <p className="text-[11px] text-slate-600">POS Bill generated for Rs. 5,000 (Cash received).</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Collapsed mini right view */
            <div className="flex flex-col items-center py-4 space-y-4 text-blue-600">
              <BookOpen className="w-5 h-5" />
              <div className="w-px h-8 bg-slate-300" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 [writing-mode:vertical-lr]">
                Smart Tools
              </span>
            </div>
          )}
        </aside>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM ACTION BAR: Billing Summary & Actions Matching Reference Image  */}
      {/* ========================================================================= */}
      <footer className="h-[72px] bg-white border-t border-slate-300 px-6 flex items-center justify-between shrink-0 shadow-lg z-20 overflow-x-auto gap-4">
        {/* Left Side: Financial Status KPI Cards */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Card 1: Total Services */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 leading-tight">Total Services</p>
              <p className="font-extrabold text-sm text-slate-900 leading-tight">4</p>
            </div>
          </div>

          {/* Card 2: Total Amount */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/60 border border-amber-200 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
              ₹
            </div>
            <div>
              <p className="text-[10px] text-slate-500 leading-tight">Total Amount</p>
              <p className="font-extrabold text-sm text-slate-900 leading-tight">Rs. 5,000</p>
            </div>
          </div>

          {/* Card 3: Paid Amount */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 leading-tight">Paid Amount</p>
              <p className="font-extrabold text-sm text-emerald-700 leading-tight">Rs. 5,000</p>
            </div>
          </div>

          {/* Card 4: Balance */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50/60 border border-purple-200 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 leading-tight">Balance</p>
              <p className="font-extrabold text-sm text-slate-900 leading-tight">Rs. 0</p>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-300 hidden xl:block" />

        {/* Right Side: Action Buttons Matching Reference Image */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Save Draft Button (Blue) */}
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>

          {/* Save & Next Button (Green) */}
          <button
            onClick={handleSaveAndNext}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save & Next</span>
          </button>

          {/* Export Dropdown (Dark Blue) */}
          <div className="relative">
            <button
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0c2340] hover:bg-[#15345a] text-white font-bold text-xs shadow-md transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 bottom-full mb-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 text-xs z-50">
                <button
                  onClick={() => {
                    RadiologyExportService.exportToDocx(displayStudy);
                    setIsExportDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-800 font-medium"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Microsoft Word (.docx)</span>
                </button>
                <button
                  onClick={() => {
                    setIsPrintModalOpen(true);
                    setIsExportDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-800 font-medium"
                >
                  <Printer className="w-4 h-4 text-rose-600" />
                  <span>PDF Document (.pdf)</span>
                </button>
                <button
                  onClick={() => {
                    RadiologyExportService.exportToExcel(displayStudy);
                    setIsExportDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-800 font-medium"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel Ledger (.xlsx)</span>
                </button>
              </div>
            )}
          </div>

          {/* Print Button (White Outline) */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-700" />
            <span>Print</span>
          </button>

          {/* Download PDF Button (Red) */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold text-xs shadow-md shadow-red-500/20 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          {/* Download Excel Button (Green) */}
          <button
            onClick={() => RadiologyExportService.exportToExcel(displayStudy)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel</span>
          </button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 5. MODAL DIALOGS: Delivery, Print, Shortcuts, Builders, Comparison        */}
      {/* ========================================================================= */}

      {/* Printable Report Modal with QR Verification */}
      <RadiologyReportPrintModal
        isOpen={isPrintModalOpen}
        report={displayStudy}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Medical Shortcuts Manager Modal */}
      <MedicalShortcutsManagerModal
        isOpen={isShortcutsModalOpen}
        onClose={() => {
          setIsShortcutsModalOpen(false);
          setShortcuts(StorageService.getMedicalShortcuts());
        }}
      />

      {/* Template Builder Modal */}
      <TemplateBuilderModal
        isOpen={isTemplateBuilderOpen}
        onClose={() => {
          setIsTemplateBuilderOpen(false);
          setTemplates(StorageService.getRadiologyTemplates());
        }}
      />

      {/* Doctor Digital Signature Modal */}
      <DoctorSignatureModal
        isOpen={isDoctorSignatureOpen}
        onClose={() => {
          setIsDoctorSignatureOpen(false);
          setDoctors(StorageService.getClinicDoctors());
        }}
      />

      {/* Report Delivery & Tracking Modal */}
      <ReportDeliveryModal
        isOpen={isDeliveryModalOpen}
        report={displayStudy}
        onClose={() => setIsDeliveryModalOpen(false)}
        onDelivered={(updated) => {
          saveStudyToDatabase(updated, 'Study marked as Delivered');
          setIsDeliveryModalOpen(false);
        }}
        onOpenPrint={() => {
          setIsDeliveryModalOpen(false);
          setIsPrintModalOpen(true);
        }}
      />

      {/* DICOM / PACS Viewer Modal */}
      <DICOMImageUploaderModal
        isOpen={isDICOMModalOpen}
        studyId={displayStudy.studyId}
        patientName={displayStudy.patientName}
        modality={displayStudy.modality}
        images={displayStudy.attachedImages || []}
        onClose={() => setIsDICOMModalOpen(false)}
        onImagesChange={(images: RadiologyStudyImage[]) => {
          const updated = { ...displayStudy, attachedImages: images };
          saveStudyToDatabase(updated, 'DICOM Study Images Updated');
        }}
      />

      {/* Report Comparison Modal */}
      {isComparisonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-300 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Previous Reports History & Longitudinal Comparison
              </h3>
              <button
                onClick={() => setIsComparisonModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Previous Report 1 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Abdominal Ultrasound</span>
                  <span className="font-mono text-blue-600">12-08-2026</span>
                </div>
                <p className="text-slate-600">Liver: 13.2 cm, normal echotexture. Gall bladder well distended, no calculus.</p>
                <p className="font-semibold text-slate-700">Impression: Normal study.</p>
                <button
                  onClick={() => {
                    setClinicalHistory('Previous exam 12-08-2026 was normal.');
                    setIsComparisonModalOpen(false);
                    showToast('Imported history notes into active study');
                  }}
                  className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold"
                >
                  Copy Notes into Current Report
                </button>
              </div>

              {/* Previous Report 2 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Chest X-Ray PA View</span>
                  <span className="font-mono text-blue-600">01-06-2026</span>
                </div>
                <p className="text-slate-600">Lungs clear. CTR ratio normal (&lt; 50%). Both CP angles sharp.</p>
                <p className="font-semibold text-slate-700">Impression: Normal chest radiograph.</p>
                <button
                  onClick={() => {
                    setClinicalHistory('Previous Chest X-Ray 01-06-2026 was clear.');
                    setIsComparisonModalOpen(false);
                    showToast('Imported history notes into active study');
                  }}
                  className="px-2.5 py-1 rounded bg-blue-600 text-white font-bold"
                >
                  Copy Notes into Current Report
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsComparisonModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Study Request Modal */}
      {isNewStudyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-300 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Initiate New Radiology Study Request
              </h3>
              <button
                onClick={() => setIsNewStudyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newStudy: RadiologyStudyReport = {
                  id: `rad_std_${Date.now()}`,
                  studyId: `RAD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                  patientId: displayStudy.patientId,
                  patientMRN: displayStudy.patientMRN,
                  patientName: displayStudy.patientName,
                  age: displayStudy.age,
                  gender: displayStudy.gender,
                  contactNumber: displayStudy.contactNumber,
                  examinationDate: new Date().toISOString().split('T')[0],
                  modality: 'Ultrasound',
                  examinationType: 'Whole Abdomen Ultrasound',
                  referringDoctor: displayStudy.referringDoctor,
                  reportingDoctorId: 'DOC-AHSAN-RAZA',
                  reportingDoctorName: 'Dr. Ahsan Raza',
                  reportingDoctorQualification: 'MBBS, FCPS (Radiology)',
                  reportingDoctorRegNo: '74231-PMC',
                  status: 'Draft',
                  reportingMode: 'template',
                  clinicalHistory: 'Abdominal pain evaluation.',
                  impression: 'Normal Study.',
                  structuredFindings,
                  freeFormContent: '',
                  attachedImages: [],
                  version: 1,
                  versionHistory: [],
                  isDelivered: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                saveStudyToDatabase(newStudy, `Created Study ${newStudy.studyId}`);
                setIsNewStudyModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Patient *
                </label>
                <select
                  required
                  defaultValue={displayStudy.patientMRN}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.mrNumber}>
                      {p.mrNumber} • {p.name || p.fullName} ({p.age} Y / {p.gender})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Modality *</label>
                  <select
                    defaultValue="Ultrasound"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="Ultrasound">Ultrasound</option>
                    <option value="X-Ray">Digital X-Ray</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Doctor *</label>
                  <select
                    defaultValue="Dr. Ahsan Raza"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="Dr. Ahsan Raza">Dr. Ahsan Raza (Radiologist)</option>
                    <option value="Dr. Farhan Qureshi">Dr. Farhan Qureshi</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewStudyModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md"
                >
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadiologyReporting;
