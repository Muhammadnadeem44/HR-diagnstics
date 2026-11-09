import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  Save,
  CheckCircle2,
  Printer,
  Download,
  Mic,
  MicOff,
  Sparkles,
  Layers,
  Copy,
  Clock,
  History,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  AlertTriangle,
  Type,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Undo,
  Redo,
  Table as TableIcon,
  Search,
  Lock,
  User,
  Calendar,
  Building2,
  HelpCircle,
} from 'lucide-react';
import {
  RadiologyStudyReport,
  RadiologyTemplate,
  MedicalShortcut,
  ReportStatus,
  ClinicDoctor,
} from '../../types';
import { StorageService } from '../../services/storage';
import { RadiologyExportService } from '../../services/radiologyExportService';
import { RadiologyReportPrintModal } from './RadiologyReportPrintModal';
import { DICOMImageUploaderModal } from './DICOMImageUploaderModal';
import { ReportDeliveryModal } from './ReportDeliveryModal';

interface RadiologyWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  studyId: string;
  onStudyUpdated: (study: RadiologyStudyReport) => void;
}

export const RadiologyWorkspaceModal: React.FC<RadiologyWorkspaceModalProps> = ({
  isOpen,
  onClose,
  studyId,
  onStudyUpdated,
}) => {
  const [study, setStudy] = useState<RadiologyStudyReport | null>(null);
  const [activeMode, setActiveMode] = useState<'template' | 'word' | 'hybrid'>('template');
  const [languageMode, setLanguageMode] = useState<'en' | 'ur' | 'mixed'>('en');

  // Templates & Shortcuts state
  const [templates, setTemplates] = useState<RadiologyTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<RadiologyTemplate | null>(null);
  const [shortcuts, setShortcuts] = useState<MedicalShortcut[]>([]);
  const [shortcutSearch, setShortcutSearch] = useState<string>('');

  // Structured findings & free-form content
  const [structuredFindings, setStructuredFindings] = useState<Record<string, string>>({});
  const [freeFormContent, setFreeFormContent] = useState<string>('');
  const [impression, setImpression] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');
  const [clinicalHistory, setClinicalHistory] = useState<string>('');

  // Voice Dictation state
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const [dictationLanguage, setDictationLanguage] = useState<'en-US' | 'ur-PK'>('en-US');
  const [speechRecognitionInstance, setSpeechRecognitionInstance] = useState<any>(null);
  const [dictationBuffer, setDictationBuffer] = useState<string>('');
  const [activeFieldTarget, setActiveFieldTarget] = useState<string>('impression');

  // Autosave and layout state
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [recoveredDraftAlert, setRecoveredDraftAlert] = useState<boolean>(false);

  // Sub-modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isDICOMModalOpen, setIsDICOMModalOpen] = useState<boolean>(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState<boolean>(false);
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState<boolean>(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctorApprovalPin, setDoctorApprovalPin] = useState<string>('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load study and initial dependencies
  useEffect(() => {
    if (isOpen && studyId) {
      const existing = StorageService.getRadiologyStudyById(studyId);
      if (existing) {
        setStudy(existing);
        setActiveMode(existing.reportingMode || 'template');
        setStructuredFindings(existing.structuredFindings || {});
        setFreeFormContent(existing.freeFormContent || '');
        setImpression(existing.impression || '');
        setRecommendations(existing.recommendations || '');
        setClinicalHistory(existing.clinicalHistory || '');
        setSelectedDoctorId(existing.reportingDoctorId || 'DOC-102');

        // Check for autosaved crash recovery draft
        const draft = StorageService.getAutosaveDraft(studyId);
        if (draft && draft.savedAt && (!existing.updatedAt || draft.savedAt > existing.updatedAt)) {
          setRecoveredDraftAlert(true);
        }
      }

      // Load templates and shortcuts
      const tpls = StorageService.getRadiologyTemplates();
      setTemplates(tpls);
      const scList = StorageService.getMedicalShortcuts();
      setShortcuts(scList);
    }
  }, [isOpen, studyId]);

  // Automatic Template Matching
  useEffect(() => {
    if (study && templates.length > 0 && !selectedTemplate) {
      // Find template matching study examination type or modality
      const matched =
        templates.find((t) => t.id === study.templateId) ||
        templates.find(
          (t) =>
            t.examinationType.toLowerCase() === study.examinationType.toLowerCase() ||
            t.title.toLowerCase().includes(study.examinationType.toLowerCase()) ||
            study.examinationType.toLowerCase().includes(t.title.toLowerCase())
        ) ||
        templates.find((t) => t.modality === study.modality && t.isDefault) ||
        templates[0];

      if (matched) {
        setSelectedTemplate(matched);
        // If structured findings are empty, initialize with template section defaults
        if (!study.structuredFindings || Object.keys(study.structuredFindings).length === 0) {
          const initialFindings: Record<string, string> = {};
          matched.sections.forEach((sec) => {
            initialFindings[sec.id] = sec.defaultNormalText;
          });
          setStructuredFindings(initialFindings);
          if (!impression) {
            setImpression(matched.defaultImpression);
          }
          if (!recommendations && matched.defaultAdvice) {
            setRecommendations(matched.defaultAdvice);
          }
        }
      }
    }
  }, [study, templates]);

  // Periodic Autosave (every 10 seconds)
  useEffect(() => {
    if (!study || !isOpen) return;

    const timer = setInterval(() => {
      handleAutosave();
    }, 12000);

    return () => clearInterval(timer);
  }, [study, structuredFindings, freeFormContent, impression, recommendations, activeMode]);

  const handleAutosave = () => {
    if (!study) return;
    setAutosaveStatus('saving');
    StorageService.saveAutosaveDraft(study.id, {
      structuredFindings,
      freeFormContent,
      impression,
      recommendations,
      reportingMode: activeMode,
    });
    setAutosaveStatus('saved');
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const restoreDraft = () => {
    if (!study) return;
    const draft = StorageService.getAutosaveDraft(study.id);
    if (draft) {
      if (draft.structuredFindings) setStructuredFindings(draft.structuredFindings);
      if (draft.freeFormContent) setFreeFormContent(draft.freeFormContent);
      if (draft.impression) setImpression(draft.impression);
      if (draft.recommendations) setRecommendations(draft.recommendations);
      if (draft.reportingMode) setActiveMode(draft.reportingMode);
      setRecoveredDraftAlert(false);
      showToast('Recovered unsaved draft successfully.');
    }
  };

  const dismissDraft = () => {
    if (!study) return;
    StorageService.clearAutosaveDraft(study.id);
    setRecoveredDraftAlert(false);
  };

  // Shortcut Expansion Handler on typing Space or Tab
  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    fieldKey: string,
    currentVal: string,
    setter: (val: string) => void
  ) => {
    if (e.key === ' ' || e.key === 'Tab') {
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = currentVal.substring(0, cursorPos);
      const words = textBeforeCursor.trim().split(/\s+/);
      const lastWord = words[words.length - 1];

      if (lastWord) {
        const matchingShortcut = shortcuts.find(
          (s) => s.code.toUpperCase() === lastWord.toUpperCase() && s.isActive
        );

        if (matchingShortcut) {
          e.preventDefault();
          const wordStartPos = textBeforeCursor.lastIndexOf(lastWord);
          const newText =
            currentVal.substring(0, wordStartPos) +
            matchingShortcut.expandedText +
            ' ' +
            currentVal.substring(cursorPos);
          setter(newText);
          showToast(`Expanded shortcut: [${matchingShortcut.code}]`);
        }
      }
    }
  };

  // Voice Dictation Toggle
  const toggleDictation = () => {
    if (isDictating) {
      if (speechRecognitionInstance) {
        speechRecognitionInstance.stop();
      }
      setIsDictating(false);
    } else {
      if (!RadiologyExportService.isSpeechRecognitionSupported()) {
        alert(
          'Speech recognition is not supported in this browser. Please use Google Chrome, Edge, or type manually.'
        );
        return;
      }

      const recognizer = RadiologyExportService.createSpeechRecognizer(
        dictationLanguage,
        (transcript, isFinal) => {
          if (isFinal) {
            insertDictatedText(transcript);
            setDictationBuffer('');
          } else {
            setDictationBuffer(transcript);
          }
        },
        (err) => {
          console.warn('Speech recognition error', err);
          setIsDictating(false);
        }
      );

      if (recognizer) {
        setSpeechRecognitionInstance(recognizer);
        recognizer.start();
        setIsDictating(true);
        showToast(`Voice dictation started (${dictationLanguage === 'ur-PK' ? 'Urdu' : 'English'}). Speak findings...`);
      }
    }
  };

  const insertDictatedText = (text: string) => {
    const formatted = text.trim() + '. ';
    if (activeFieldTarget === 'impression') {
      setImpression((prev) => (prev ? prev + '\n' + formatted : formatted));
    } else if (activeFieldTarget === 'freeform') {
      setFreeFormContent((prev) => (prev ? prev + '<p>' + formatted + '</p>' : '<p>' + formatted + '</p>'));
    } else if (activeFieldTarget.startsWith('sec_')) {
      setStructuredFindings((prev) => ({
        ...prev,
        [activeFieldTarget]: (prev[activeFieldTarget] ? prev[activeFieldTarget] + ' ' : '') + formatted,
      }));
    }
  };

  // Fill All Normal Findings
  const handleFillNormalFindings = () => {
    if (!selectedTemplate) return;
    const filled: Record<string, string> = {};
    selectedTemplate.sections.forEach((sec) => {
      filled[sec.id] = sec.defaultNormalText;
    });
    setStructuredFindings(filled);
    setImpression(selectedTemplate.defaultImpression);
    if (selectedTemplate.defaultAdvice) setRecommendations(selectedTemplate.defaultAdvice);
    showToast('Applied normal anatomical findings to all sections.');
  };

  // Insert a specific shortcut directly into active field
  const handleInsertShortcut = (sc: MedicalShortcut) => {
    if (activeFieldTarget === 'impression') {
      setImpression((prev) => (prev ? prev + '\n' + sc.expandedText : sc.expandedText));
    } else if (activeFieldTarget === 'freeform') {
      setFreeFormContent((prev) => prev + `<p>${sc.expandedText}</p>`);
    } else if (activeFieldTarget.startsWith('sec_')) {
      setStructuredFindings((prev) => ({
        ...prev,
        [activeFieldTarget]: prev[activeFieldTarget] ? `${prev[activeFieldTarget]} ${sc.expandedText}` : sc.expandedText,
      }));
    }
    showToast(`Inserted phrase [${sc.code}]`);
  };

  // Save Report Draft
  const handleSaveDraft = (newStatus: ReportStatus = 'Draft', changeNote?: string) => {
    if (!study) return;

    // Build freeform HTML representation from structured findings if in hybrid or template mode
    let updatedFreeForm = freeFormContent;
    if (activeMode === 'template' || activeMode === 'hybrid') {
      let html = '';
      if (selectedTemplate) {
        selectedTemplate.sections.forEach((sec) => {
          const val = structuredFindings[sec.id];
          if (val) {
            html += `<p><strong>${sec.title}:</strong> ${val}</p>`;
          }
        });
      }
      updatedFreeForm = html || freeFormContent;
    }

    const updatedStudy: RadiologyStudyReport = {
      ...study,
      clinicalHistory,
      reportingMode: activeMode,
      templateId: selectedTemplate?.id,
      templateTitle: selectedTemplate?.title,
      structuredFindings,
      freeFormContent: updatedFreeForm,
      impression,
      recommendations,
      status: newStatus,
    };

    const currentUser = StorageService.getActiveUser();
    const saved = StorageService.saveRadiologyStudy(
      updatedStudy,
      currentUser
        ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
        : undefined,
      changeNote || `Saved as ${newStatus}`
    );

    setStudy(saved);
    onStudyUpdated(saved);
    StorageService.clearAutosaveDraft(study.id);
    showToast(`Report successfully saved as [${newStatus}].`);
  };

  // Submit to Doctor for Verification (Typist Action)
  const handleSubmitForVerification = () => {
    if (!impression.trim()) {
      alert('Please provide a final impression before submitting for verification.');
      return;
    }
    handleSaveDraft('Awaiting Doctor Verification', 'Typist completed transcription and submitted for doctor signature.');
  };

  // Doctor Approval & Digital Signature Confirmation
  const handleConfirmApproval = () => {
    if (!study) return;
    const doctors = StorageService.getClinicDoctors();
    const doctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

    if (!doctor) {
      alert('Please select a valid radiologist to sign the report.');
      return;
    }

    // First save the current findings
    handleSaveDraft(study.status, 'Prepared for final signature');

    const res = StorageService.approveRadiologyReport(study.id, {
      id: doctor.id,
      name: doctor.name,
      qualification: doctor.specialization || 'Consultant Radiologist',
      regNo: doctor.regNumber || 'PMDC-41829-R',
      signatureUrl: doctor.digitalSignatureUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="50"><path d="M10,35 Q50,5 90,30 T150,20" fill="none" stroke="%231e3a8a" stroke-width="2"/></svg>',
    });

    if (res.success && res.study) {
      setStudy(res.study);
      onStudyUpdated(res.study);
      setIsApproveConfirmOpen(false);
      showToast(res.message);
    }
  };

  // Prior Reports for this Patient
  const priorReports = study
    ? StorageService.getPatientRadiologyHistory(study.patientMRN).filter((s) => s.id !== study.id)
    : [];

  // Copy prior report findings into draft (with verification prompt)
  const handleCopyPriorReport = (prior: RadiologyStudyReport) => {
    if (
      confirm(
        `MEDICAL SAFETY VERIFICATION:\n\nAre you sure you want to copy findings from prior exam on ${prior.examinationDate}? All copied observations and measurements must be verified clinically.`
      )
    ) {
      if (prior.structuredFindings && Object.keys(prior.structuredFindings).length > 0) {
        setStructuredFindings({ ...prior.structuredFindings });
      }
      if (prior.freeFormContent) {
        setFreeFormContent(prior.freeFormContent);
      }
      if (prior.impression) {
        setImpression(prior.impression);
      }
      showToast(`Copied findings from study ${prior.studyId} as draft. Please review and update.`);
    }
  };

  if (!isOpen || !study) return null;

  const isApproved = study.status === 'Approved' || study.status === 'Completed' || study.status === 'Delivered';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-hidden ${
        isFullScreen ? 'p-0!' : ''
      }`}
    >
      <div
        className={`relative w-full bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-all ${
          isFullScreen ? 'h-screen w-screen rounded-none' : 'max-w-[98vw] h-[95vh] rounded-2xl'
        }`}
      >
        {/* Top Header Banner */}
        <div className="px-5 py-3 bg-[#0c1527] text-white border-b border-slate-800 flex items-center justify-between gap-4 select-none shrink-0">
          {/* Patient Details & Exam Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-300 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black truncate text-white">
                  {study.patientName}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-bold border border-slate-700">
                  {study.patientMRN}
                </span>
                <span className="text-xs text-slate-300">
                  {study.age} Y / {study.gender}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                    study.modality === 'Ultrasound'
                      ? 'bg-purple-900/60 text-purple-300 border border-purple-700'
                      : 'bg-cyan-900/60 text-cyan-300 border border-cyan-700'
                  }`}
                >
                  {study.modality}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    isApproved
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-amber-950 text-amber-300 border border-amber-700'
                  }`}
                >
                  {study.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {study.examinationType} • Study ID: <strong className="text-slate-200">{study.studyId}</strong>
                {study.invoiceNumber && ` • Linked Invoice: ${study.invoiceNumber}`}
              </p>
            </div>
          </div>

          {/* Center Mode Controls & Voice Dictation */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Reporting Mode */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setActiveMode('template')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeMode === 'template'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Template Mode
              </button>
              <button
                onClick={() => setActiveMode('word')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeMode === 'word'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Word-Style Mode
              </button>
              <button
                onClick={() => setActiveMode('hybrid')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeMode === 'hybrid'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hybrid Sync
              </button>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setLanguageMode('en')}
                className={`px-2.5 py-1 rounded-lg font-bold ${
                  languageMode === 'en' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN (LTR)
              </button>
              <button
                onClick={() => setLanguageMode('ur')}
                className={`px-2.5 py-1 rounded-lg font-bold font-serif ${
                  languageMode === 'ur' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                اردو (RTL)
              </button>
            </div>

            {/* Voice Dictation Button */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-700">
              <button
                onClick={toggleDictation}
                title="Voice Dictation (Speech to Text)"
                className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                  isDictating
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isDictating ? <Mic className="w-3.5 h-3.5 animate-bounce" /> : <MicOff className="w-3.5 h-3.5" />}
                {isDictating ? 'Recording Voice...' : 'Voice Dictate'}
              </button>
              <select
                value={dictationLanguage}
                onChange={(e) => setDictationLanguage(e.target.value as any)}
                className="bg-transparent text-[11px] text-slate-300 font-medium focus:outline-none"
              >
                <option value="en-US">EN</option>
                <option value="ur-PK">اردو</option>
              </select>
            </div>

            {/* Autosave Status */}
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  autosaveStatus === 'saving' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                }`}
              />
              {autosaveStatus === 'saving'
                ? 'Autosaving...'
                : lastSavedTime
                ? `Saved ${lastSavedTime}`
                : 'Autosaved'}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveDraft(study.status)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>

            {!isApproved ? (
              <>
                <button
                  onClick={handleSubmitForVerification}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Submit to Doctor
                </button>
                <button
                  onClick={() => setIsApproveConfirmOpen(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Approve &amp; Sign
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsDeliveryModalOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Dispatch / Deliver
              </button>
            )}

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Export
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recovered Unsaved Draft Alert */}
        {recoveredDraftAlert && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Crash Recovery Detected:</strong> An unsaved draft from a recent browser session was found for this study. Would you like to restore it?
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={restoreDraft}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-md"
              >
                Restore Unsaved Changes
              </button>
              <button
                onClick={dismissDraft}
                className="px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* 3-Panel Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* ======================================================== */}
          {/* LEFT PANEL: Patient Details, History, Images, DICOM      */}
          {/* ======================================================== */}
          <div
            className={`border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex flex-col transition-all duration-200 ${
              isLeftCollapsed ? 'w-10' : 'w-72 lg:w-80'
            }`}
          >
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
              {!isLeftCollapsed && <span>PATIENT &amp; STUDY CONTEXT</span>}
              <button
                onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded"
                title={isLeftCollapsed ? 'Expand panel' : 'Collapse panel'}
              >
                {isLeftCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {!isLeftCollapsed && (
              <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
                {/* Clinical Indication */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider text-[11px]">
                    Clinical Indication / History:
                  </label>
                  <textarea
                    rows={2}
                    value={clinicalHistory}
                    onChange={(e) => setClinicalHistory(e.target.value)}
                    placeholder="e.g. Pain in right hypochondrium for 2 weeks..."
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                {/* Patient Demographics Card */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Referring Doctor:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {study.referringDoctor || 'Self / Walk-in'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Contact Number:</span>
                    <span className="font-mono text-slate-900 dark:text-white">
                      {study.contactNumber || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Study Date:</span>
                    <span className="text-slate-900 dark:text-white">{study.examinationDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Assigned Typist:</span>
                    <span className="text-slate-900 dark:text-white">{study.typistName || 'Active Typist'}</span>
                  </div>
                </div>

                {/* DICOM & Attached Study Images */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                      Images ({study.attachedImages?.length || 0})
                    </span>
                    <button
                      onClick={() => setIsDICOMModalOpen(true)}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-[11px] font-semibold"
                    >
                      Open PACS Viewer
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(study.attachedImages || []).slice(0, 4).map((img) => (
                      <div
                        key={img.id}
                        onClick={() => setIsDICOMModalOpen(true)}
                        className="h-20 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-black cursor-pointer group relative"
                      >
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                          View
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsDICOMModalOpen(true)}
                    className="w-full py-1.5 px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold text-center text-xs transition-colors"
                  >
                    + Upload Scans / DICOM Files
                  </button>
                </div>

                {/* Prior Patient Radiology History */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-amber-500" />
                    Patient History ({priorReports.length})
                  </span>

                  <div className="space-y-2">
                    {priorReports.map((prior) => (
                      <div
                        key={prior.id}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900 dark:text-white truncate">
                            {prior.examinationType}
                          </span>
                          <span className="text-[10px] text-slate-500">{prior.examinationDate}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                          "{prior.impression || 'Normal study'}"
                        </p>
                        <button
                          onClick={() => handleCopyPriorReport(prior)}
                          className="w-full py-1 mt-1 text-[11px] bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-semibold rounded flex items-center justify-center gap-1 border border-blue-200 dark:border-blue-800"
                        >
                          <Copy className="w-3 h-3" />
                          Copy Findings to Draft
                        </button>
                      </div>
                    ))}

                    {priorReports.length === 0 && (
                      <p className="text-slate-400 text-center py-2 text-[11px]">
                        No prior radiology records on file for this MRN.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* CENTER PANEL: Main Report Writing Station (Dual/Hybrid)   */}
          {/* ======================================================== */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
            {/* Template Selector & Quick Normal Fill Bar */}
            <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">Template:</span>
                <select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => {
                    const tpl = templates.find((t) => t.id === e.target.value);
                    if (tpl) {
                      setSelectedTemplate(tpl);
                      // Pre-fill missing sections from new template
                      const updated = { ...structuredFindings };
                      tpl.sections.forEach((s) => {
                        if (!updated[s.id]) updated[s.id] = s.defaultNormalText;
                      });
                      setStructuredFindings(updated);
                      if (!impression) setImpression(tpl.defaultImpression);
                    }
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                >
                  {templates
                    .filter((t) => t.modality === study.modality)
                    .map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleFillNormalFindings}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold rounded-lg border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Fill All Normal Findings
                </button>
              </div>
            </div>

            {/* Word Mode Formatting Ribbon (Active when in Word or Hybrid Mode) */}
            {(activeMode === 'word' || activeMode === 'hybrid') && (
              <div className="px-6 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1 border-r border-slate-300 dark:border-slate-700 pr-2">
                  <button
                    onClick={() => document.execCommand('bold', false)}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => document.execCommand('italic', false)}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => document.execCommand('underline', false)}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Underline"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1 border-r border-slate-300 dark:border-slate-700 pr-2">
                  <button
                    onClick={() => document.execCommand('justifyLeft', false)}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Align Left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => document.execCommand('justifyCenter', false)}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Align Center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => document.execCommand('insertUnorderedList', false)}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    title="Bullets"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-mono italic">
                  Press Space or Tab after any shortcut code (e.g. LIVN, GBN, CHESTN) to auto-expand.
                </span>
              </div>
            )}

            {/* Main Scrollable Typing Body */}
            <div
              className={`flex-1 overflow-y-auto p-6 space-y-6 ${
                languageMode === 'ur' ? 'font-serif text-right' : ''
              }`}
              dir={languageMode === 'ur' ? 'rtl' : 'ltr'}
            >
              {/* MODE 1: TEMPLATE STRUCTURED SECTIONS */}
              {activeMode === 'template' && (
                <div className="space-y-5">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                      Structured Anatomical Findings &amp; Organs
                    </h3>
                    <span className="text-slate-400 text-xs">
                      Click inside any section to dictate or type shortcuts
                    </span>
                  </div>

                  {selectedTemplate?.sections.map((sec) => (
                    <div
                      key={sec.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <label className="font-black text-slate-900 dark:text-white text-xs tracking-wide">
                          {sec.title}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setStructuredFindings((prev) => ({
                              ...prev,
                              [sec.id]: sec.defaultNormalText,
                            }));
                            showToast(`Reset ${sec.title} to normal findings.`);
                          }}
                          className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                        >
                          Reset Normal
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={structuredFindings[sec.id] || ''}
                        onFocus={() => setActiveFieldTarget(sec.id)}
                        onChange={(e) =>
                          setStructuredFindings({
                            ...structuredFindings,
                            [sec.id]: e.target.value,
                          })
                        }
                        onKeyDown={(e) =>
                          handleTextareaKeyDown(
                            e,
                            sec.id,
                            structuredFindings[sec.id] || '',
                            (v) => setStructuredFindings({ ...structuredFindings, [sec.id]: v })
                          )
                        }
                        placeholder={`Document clinical observation for ${sec.title} or type shortcuts...`}
                        className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* MODE 2: FREE-FORM WORD-STYLE REPORTING */}
              {activeMode === 'word' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center justify-between">
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                      Free-Form Narrative Document Editor
                    </h3>
                    <span className="text-slate-400 text-xs">Microsoft Word-Style Free Narrative</span>
                  </div>

                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={() => setActiveFieldTarget('freeform')}
                    onBlur={(e) => setFreeFormContent(e.currentTarget.innerHTML)}
                    dangerouslySetInnerHTML={{ __html: freeFormContent }}
                    className="min-h-[350px] p-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner prose prose-sm max-w-none"
                  />
                </div>
              )}

              {/* MODE 3: HYBRID REPORTING (Both Structured Sections & Formatted Preview) */}
              {activeMode === 'hybrid' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Structured Sections */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      Structured Fields
                    </h4>
                    {selectedTemplate?.sections.map((sec) => (
                      <div key={sec.id} className="space-y-1">
                        <label className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {sec.title}
                        </label>
                        <textarea
                          rows={2}
                          value={structuredFindings[sec.id] || ''}
                          onFocus={() => setActiveFieldTarget(sec.id)}
                          onChange={(e) =>
                            setStructuredFindings({
                              ...structuredFindings,
                              [sec.id]: e.target.value,
                            })
                          }
                          onKeyDown={(e) =>
                            handleTextareaKeyDown(
                              e,
                              sec.id,
                              structuredFindings[sec.id] || '',
                              (v) => setStructuredFindings({ ...structuredFindings, [sec.id]: v })
                            )
                          }
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Right Column: Live Formatted Report Document */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      Formatted Report Document
                    </h4>
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      onFocus={() => setActiveFieldTarget('freeform')}
                      onBlur={(e) => setFreeFormContent(e.currentTarget.innerHTML)}
                      dangerouslySetInnerHTML={{ __html: freeFormContent }}
                      className="min-h-[400px] p-5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs leading-relaxed shadow-inner"
                    />
                  </div>
                </div>
              )}

              {/* IMPRESSION SECTION (MANDATORY & HIGHLIGHTED) */}
              <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    FINAL RADIOLOGICAL IMPRESSION / CONCLUSION *
                  </label>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                    Core diagnostic finding
                  </span>
                </div>

                <textarea
                  rows={3}
                  required
                  value={impression}
                  onFocus={() => setActiveFieldTarget('impression')}
                  onChange={(e) => setImpression(e.target.value)}
                  onKeyDown={(e) =>
                    handleTextareaKeyDown(e, 'impression', impression, setImpression)
                  }
                  placeholder="Summarize final diagnostic opinion or impression..."
                  className="w-full p-3.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-xl text-slate-950 dark:text-white font-bold text-xs leading-relaxed shadow-xs"
                />
              </div>

              {/* RECOMMENDATIONS SECTION */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                  ADVICE &amp; CLINICAL RECOMMENDATIONS:
                </label>
                <input
                  type="text"
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="e.g. Clinical correlation recommended. Review after 6 months."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT PANEL: Medical Shortcuts & Expansion Library       */}
          {/* ======================================================== */}
          <div
            className={`border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex flex-col transition-all duration-200 ${
              isRightCollapsed ? 'w-10' : 'w-72 lg:w-80'
            }`}
          >
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
              <button
                onClick={() => setIsRightCollapsed(!isRightCollapsed)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded"
                title={isRightCollapsed ? 'Expand panel' : 'Collapse panel'}
              >
                {isRightCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {!isRightCollapsed && <span>MEDICAL SHORTCUTS</span>}
            </div>

            {!isRightCollapsed && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search shortcut (e.g. LIVN)..."
                      value={shortcutSearch}
                      onChange={(e) => setShortcutSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Shortcuts List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                  {shortcuts
                    .filter(
                      (s) =>
                        s.code.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
                        s.title.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
                        s.expandedText.toLowerCase().includes(shortcutSearch.toLowerCase())
                    )
                    .map((sc) => (
                      <div
                        key={sc.id}
                        onClick={() => handleInsertShortcut(sc)}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-blue-400 cursor-pointer transition-all space-y-1 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                            {sc.code}
                          </span>
                          <span className="text-[10px] text-slate-500">{sc.category}</span>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {sc.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {sc.expandedText}
                        </p>
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 font-semibold pt-1">
                          Click to insert at cursor &rarr;
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* DOCTOR APPROVAL CONFIRMATION MODAL                      */}
        {/* ======================================================== */}
        {isApproveConfirmOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Radiologist Digital Approval &amp; Signature
                  </h3>
                </div>
                <button
                  onClick={() => setIsApproveConfirmOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-400">
                  Only registered radiologists with authorized digital signature privileges can approve this study report. Once approved, the report is locked for editing and ready for printing.
                </p>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Approving Radiologist:
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                  >
                    {StorageService.getClinicDoctors().map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.specialization} - {d.regNumber || 'PMDC'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                  <p className="font-bold">Medical Legal Statement:</p>
                  <p className="text-[11px] mt-0.5">
                    I confirm that I have reviewed the imaging examination, verified all measurements, and apply my digital signature to this report.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setIsApproveConfirmOpen(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmApproval}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Sign &amp; Approve Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print & PDF Export Modal */}
        {isPrintModalOpen && (
          <RadiologyReportPrintModal
            isOpen={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
            report={study}
          />
        )}

        {/* DICOM / PACS Viewer Modal */}
        {isDICOMModalOpen && (
          <DICOMImageUploaderModal
            isOpen={isDICOMModalOpen}
            onClose={() => setIsDICOMModalOpen(false)}
            modality={study.modality}
            studyId={study.studyId}
            patientName={study.patientName}
            images={study.attachedImages || []}
            onImagesChange={(imgs) => {
              const updated = { ...study, attachedImages: imgs };
              setStudy(updated);
              StorageService.saveRadiologyStudy(updated);
              onStudyUpdated(updated);
            }}
          />
        )}

        {/* Report Delivery Modal */}
        {isDeliveryModalOpen && (
          <ReportDeliveryModal
            isOpen={isDeliveryModalOpen}
            onClose={() => setIsDeliveryModalOpen(false)}
            report={study}
            onDelivered={(updated) => {
              setStudy(updated);
              onStudyUpdated(updated);
            }}
            onOpenPrint={() => setIsPrintModalOpen(true)}
          />
        )}
      </div>
    </div>
  );
};
