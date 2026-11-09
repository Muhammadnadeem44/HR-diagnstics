import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Printer,
  Download,
  Share2,
  Send,
  UserCheck,
  Calendar,
  Clock,
  ShieldCheck,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { RadiologyStudyReport } from '../../types';
import { StorageService } from '../../services/storage';
import { RadiologyExportService } from '../../services/radiologyExportService';

interface ReportDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: RadiologyStudyReport | null;
  onDelivered: (updated: RadiologyStudyReport) => void;
  onOpenPrint: () => void;
}

export const ReportDeliveryModal: React.FC<ReportDeliveryModalProps> = ({
  isOpen,
  onClose,
  report,
  onDelivered,
  onOpenPrint,
}) => {
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientContact, setRecipientContact] = useState<string>('');
  const [deliveryType, setDeliveryType] = useState<'Patient in Person' | 'Attendant / Family' | 'Hospital Ward / IPD' | 'Referring Doctor Courier'>('Patient in Person');
  const [dispatchNote, setDispatchNote] = useState<string>('');

  if (!isOpen || !report) return null;

  const handleConfirmDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRecipient = recipientName ? `${recipientName} [${deliveryType}]` : `${report.patientName} [${deliveryType}]`;
    const res = StorageService.recordReportDelivery(report.id, finalRecipient, recipientContact || report.contactNumber);

    if (res.success && res.study) {
      onDelivered(res.study);
      onClose();
    }
  };

  const handleShareWhatsApp = () => {
    const phone = (recipientContact || report.contactNumber || '').replace(/[^\d]/g, '');
    const message = encodeURIComponent(
      `Dear ${report.patientName},\n\nYour diagnostic radiology report for *${report.examinationType}* (Study ID: ${report.studyId}) has been finalized and verified by ${report.reportingDoctorName} at HR Diagnostics.\n\nYou can collect your official printed report and films from our main reception desk.\n\nHR Diagnostics & Imaging Complex\nUAN: +92 42 111-473-424`
    );
    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-6 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/30 border border-emerald-500/40 rounded-xl text-emerald-300">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Report Dispatch &amp; Delivery Management</h2>
              <p className="text-xs text-slate-400">
                Study: {report.studyId} • {report.patientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirmDelivery} className="p-6 space-y-4 text-xs">
          {/* Status Alert */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Report Status:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px]">
                {report.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Exam:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{report.examinationType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Reporting Radiologist:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{report.reportingDoctorName}</span>
            </div>
            {report.isDelivered && (
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Previously delivered to: {report.deliveredTo} on {new Date(report.deliveredAt || '').toLocaleString()}
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Delivery Channel / Destination *
            </label>
            <select
              value={deliveryType}
              onChange={(e) => setDeliveryType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
            >
              <option value="Patient in Person">Patient in Person (Self Collection at Counter)</option>
              <option value="Attendant / Family">Attendant / Family Member</option>
              <option value="Hospital Ward / IPD">Hospital Ward / IPD Nurse Handover</option>
              <option value="Referring Doctor Courier">Referring Doctor Clinic Courier</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Receiving Person Name (Leave blank if Patient himself):
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder={`e.g. ${report.patientName} or relative name`}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Contact Mobile / WhatsApp:
            </label>
            <input
              type="text"
              value={recipientContact}
              onChange={(e) => setRecipientContact(e.target.value)}
              placeholder={report.contactNumber || '+92 300 1234567'}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Dispatch Remarks / Film Count / Notes:
            </label>
            <textarea
              rows={2}
              value={dispatchNote}
              onChange={(e) => setDispatchNote(e.target.value)}
              placeholder="e.g. Handed 1 X-Ray dry laser film + printed color report envelope..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onOpenPrint}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print A4 Report
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp Notice
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Record Delivery
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
