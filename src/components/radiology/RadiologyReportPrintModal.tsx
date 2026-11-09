import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  Download,
  X,
  FileText,
  CheckCircle2,
  Calendar,
  User,
  Building2,
  ShieldCheck,
  Share2,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { RadiologyStudyReport } from '../../types';
import { HR_DIAGNOSTICS_LOGO_DATA_URL } from '../../assets/hrLogo';
import { RadiologyExportService } from '../../services/radiologyExportService';

interface RadiologyReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: RadiologyStudyReport | null;
  onDeliveryRecord?: (studyId: string, deliveredTo: string) => void;
}

export const RadiologyReportPrintModal: React.FC<RadiologyReportPrintModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const [languageMode, setLanguageMode] = useState<'english' | 'urdu' | 'mixed'>('english');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (report) {
      const qrPayload = JSON.stringify({
        id: report.studyId,
        mrn: report.patientMRN,
        pat: report.patientName,
        exam: report.examinationType,
        date: report.examinationDate,
        doc: report.reportingDoctorName,
        status: report.status,
        verified: 'HR-DIAGNOSTICS-OFFICIAL-SECURITY-SEAL',
      });

      QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 120,
        color: { dark: '#0F2942', light: '#ffffff' },
      }).then(setQrCodeDataUrl).catch(console.error);
    }
  }, [report]);

  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportDocx = async () => {
    await RadiologyExportService.exportToDocx(report);
  };

  const handleExportExcel = () => {
    RadiologyExportService.exportToExcel(report);
  };

  const handleCopyLink = () => {
    const text = `Diagnostic Radiology Report - HR Diagnostics\nPatient: ${report.patientName} (${report.patientMRN})\nStudy ID: ${report.studyId}\nExamination: ${report.examinationType}\nDate: ${report.examinationDate}\nImpression: ${report.impression}\nDoctor: ${report.reportingDoctorName}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header (Screen Only) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Diagnostic Report Print &amp; Export</h2>
              <p className="text-xs text-slate-400">
                {report.examinationType} • {report.studyId} • {report.patientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Options */}
            <div className="flex items-center gap-2 mr-3 bg-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeLetterhead}
                  onChange={(e) => setIncludeLetterhead(e.target.checked)}
                  className="rounded text-blue-500 focus:ring-0"
                />
                Include Letterhead
              </label>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => setLanguageMode(languageMode === 'english' ? 'urdu' : 'english')}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                {languageMode === 'english' ? 'Switch to Urdu View' : 'Switch to English'}
              </button>
            </div>

            <button
              onClick={handleExportDocx}
              title="Download Microsoft Word .docx"
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Word (.docx)
            </button>

            <button
              onClick={handleExportExcel}
              title="Download Excel .xlsx"
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Excel (.xlsx)
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (Exact A4 Styling) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div
            ref={printContentRef}
            className={`w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 sm:p-12 shadow-lg border border-slate-300 relative print:p-0 print:border-none print:shadow-none print:m-0 ${
              languageMode === 'urdu' ? 'font-serif text-right' : ''
            }`}
            style={{ fontFamily: languageMode === 'urdu' ? 'Arial, "Noto Nastaliq Urdu", sans-serif' : 'inherit' }}
          >
            {/* Watermark for draft or reprint */}
            {report.status !== 'Approved' && report.status !== 'Completed' && report.status !== 'Delivered' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 select-none rotate-[-35deg]">
                <span className="text-8xl font-black text-rose-600 tracking-widest border-8 border-rose-600 p-8 rounded-3xl">
                  UNVERIFIED DRAFT
                </span>
              </div>
            )}

            {/* Letterhead Header */}
            {includeLetterhead && (
              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={HR_DIAGNOSTICS_LOGO_DATA_URL}
                      alt="HR Diagnostics Logo"
                      className="w-16 h-16 object-contain"
                    />
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-slate-950">
                        HR DIAGNOSTICS &amp; IMAGING
                      </h1>
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Advanced Ultrasound, Digital X-Ray &amp; Clinical Pathology Complex
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Main Boulevard, Gulberg III, Lahore • UAN: +92 (42) 111-473-424 • info@hrdiagnostics.com
                      </p>
                    </div>
                  </div>

                  {qrCodeDataUrl && (
                    <div className="text-center flex flex-col items-center">
                      <img src={qrCodeDataUrl} alt="Report QR" className="w-18 h-18 border border-slate-200" />
                      <span className="text-[9px] font-mono text-slate-500 mt-0.5">SCAN TO VERIFY</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Patient & Study Demographics Box */}
            <div className="border border-slate-400 rounded-lg p-3.5 mb-6 bg-slate-50 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
                <div>
                  <span className="font-semibold text-slate-500 block">Patient Name:</span>
                  <span className="font-bold text-slate-950 text-sm">{report.patientName}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">MR Number:</span>
                  <span className="font-mono font-bold text-slate-950">{report.patientMRN}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Age / Gender:</span>
                  <span className="font-medium text-slate-900">{report.age} Yrs / {report.gender}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Study ID:</span>
                  <span className="font-mono font-bold text-blue-900">{report.studyId}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Exam Date:</span>
                  <span className="font-medium text-slate-900">{report.examinationDate}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Modality:</span>
                  <span className="font-bold text-slate-900">{report.modality}</span>
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-slate-500 block">Referring Doctor:</span>
                  <span className="font-medium text-slate-900">{report.referringDoctor || 'Self / Walk-in'}</span>
                </div>
              </div>
            </div>

            {/* Examination Title Banner */}
            <div className="text-center py-2 mb-6 border-y border-slate-300 bg-slate-100">
              <h2 className="text-base font-black tracking-wide text-slate-950 uppercase">
                {report.examinationType}
              </h2>
            </div>

            {/* Clinical History */}
            {report.clinicalHistory && (
              <div className="mb-5 text-xs text-slate-800">
                <span className="font-bold uppercase tracking-wider text-slate-900">Clinical Indication: </span>
                <span className="italic">{report.clinicalHistory}</span>
              </div>
            )}

            {/* Findings Section */}
            <div className="mb-6 space-y-4 text-xs leading-relaxed text-slate-900">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-950 border-b border-slate-200 pb-1">
                Imaging Findings &amp; Observations
              </h3>

              {report.structuredFindings && Object.keys(report.structuredFindings).length > 0 ? (
                Object.entries(report.structuredFindings).map(([key, val]) => {
                  if (!val || !val.trim()) return null;
                  const title = key.replace(/^sec_/, '').replace(/_/g, ' ').toUpperCase();
                  return (
                    <div key={key} className="space-y-1">
                      <span className="font-bold text-slate-950">{title}: </span>
                      <span className="text-slate-800">{val}</span>
                    </div>
                  );
                })
              ) : report.freeFormContent ? (
                <div
                  className="prose prose-sm max-w-none text-slate-900"
                  dangerouslySetInnerHTML={{ __html: report.freeFormContent }}
                />
              ) : (
                <p className="text-slate-500 italic">No detailed findings documented.</p>
              )}
            </div>

            {/* Impression Section */}
            <div className="mb-6 p-4 rounded-lg bg-slate-100 border-l-4 border-slate-900 text-xs">
              <h4 className="font-black text-slate-950 uppercase tracking-wider mb-1">
                IMPRESSION / CONCLUSION:
              </h4>
              <p className="font-bold text-slate-900 leading-normal whitespace-pre-line text-sm">
                {report.impression || 'Study within normal limits.'}
              </p>
            </div>

            {/* Recommendations */}
            {report.recommendations && (
              <div className="mb-8 text-xs text-slate-800">
                <span className="font-bold text-slate-950 uppercase">Recommendations: </span>
                <span>{report.recommendations}</span>
              </div>
            )}

            {/* Doctor Signature Block */}
            <div className="mt-12 pt-6 border-t border-slate-300 flex items-end justify-between text-xs">
              <div>
                <p className="text-[11px] text-slate-500">Report Transcribed By:</p>
                <p className="font-semibold text-slate-800">{report.typistName || 'Medical Typist'}</p>
                <p className="text-[10px] text-slate-400">
                  Version: {report.version || 1} • Printed: {new Date().toLocaleString()}
                </p>
              </div>

              <div className="text-right flex flex-col items-end">
                {report.digitalSignatureUrl ? (
                  <img
                    src={report.digitalSignatureUrl}
                    alt="Doctor Signature"
                    className="h-12 w-auto mb-1 object-contain"
                  />
                ) : (
                  <div className="h-10 w-32 border-b border-dashed border-slate-400 mb-1" />
                )}
                <p className="font-bold text-sm text-slate-950">{report.reportingDoctorName}</p>
                <p className="text-xs text-slate-700">{report.reportingDoctorQualification || 'Consultant Radiologist'}</p>
                {report.reportingDoctorRegNo && (
                  <p className="text-[11px] font-mono text-slate-600">Reg No: {report.reportingDoctorRegNo}</p>
                )}
                {report.approvedAt && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-medium mt-1">
                    <ShieldCheck className="w-3 h-3" /> Digitally Verified &amp; Signed
                  </span>
                )}
              </div>
            </div>

            {/* Footer Disclaimer */}
            <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-2">
              This report is electronically signed and archived in the HR Diagnostics Hospital Information System.
              For clinical inquiries or online access, visit https://www.hrdiagnostics.com/verify
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions (Screen Only) */}
        <div className="print:hidden flex items-center justify-between px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="font-medium">Report Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                report.status === 'Approved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {report.status}
            </span>
            {report.isDelivered && (
              <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                Delivered
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-300 transition-colors"
            >
              {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopied ? 'Summary Copied!' : 'Copy Summary'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
