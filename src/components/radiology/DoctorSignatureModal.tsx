import React, { useState } from 'react';
import {
  X,
  Upload,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  FileSignature,
  Building2,
  User,
  Award,
} from 'lucide-react';
import { ClinicDoctor } from '../../types';
import { StorageService } from '../../services/storage';

interface DoctorSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDoctorsUpdated?: () => void;
}

export const DoctorSignatureModal: React.FC<DoctorSignatureModalProps> = ({
  isOpen,
  onClose,
  onDoctorsUpdated,
}) => {
  const [doctors, setDoctors] = useState<ClinicDoctor[]>(() => StorageService.getClinicDoctors());
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || '');
  const [isUploading, setIsUploading] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid PNG or JPEG signature image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSignaturePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignature = () => {
    if (!currentDoctor) return;
    const updated = {
      ...currentDoctor,
      digitalSignatureUrl: signaturePreview || currentDoctor.digitalSignatureUrl,
    };
    StorageService.saveClinicDoctor(updated);
    const refreshed = StorageService.getClinicDoctors();
    setDoctors(refreshed);
    setSignaturePreview('');
    setIsUploading(false);
    if (onDoctorsUpdated) onDoctorsUpdated();
    showToast(`Digital signature updated for ${currentDoctor.name}.`);
  };

  const handleRemoveSignature = () => {
    if (!currentDoctor) return;
    const updated = {
      ...currentDoctor,
      digitalSignatureUrl: undefined,
    };
    StorageService.saveClinicDoctor(updated);
    const refreshed = StorageService.getClinicDoctors();
    setDoctors(refreshed);
    setSignaturePreview('');
    if (onDoctorsUpdated) onDoctorsUpdated();
    showToast(`Removed signature for ${currentDoctor.name}.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-6 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-300">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Radiologist &amp; Doctor Digital Signatures</h2>
              <p className="text-xs text-slate-400">
                Manage doctor credentials, qualifications, PMDC registration and authenticated digital signatures
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

        {/* Toast */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-semibold flex items-center justify-between">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6 text-xs">
          {/* Doctor Selector */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Radiologist / Reporting Consultant:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoctorId(doc.id);
                    setSignaturePreview('');
                    setIsUploading(false);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    currentDoctor?.id === doc.id
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-100 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm truncate">{doc.name}</span>
                    {doc.digitalSignatureUrl && (
                      <span title="Signature Configured">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {doc.specialization}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {doc.department || doc.departmentName}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {currentDoctor && (
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    {currentDoctor.name}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">
                    {currentDoctor.specialization} • Department of {currentDoctor.department || currentDoctor.departmentName}
                  </p>
                  <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                    Registration / PMDC ID: {currentDoctor.regNumber || currentDoctor.pmdcNumber || 'PMDC-41829-R'}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      currentDoctor.digitalSignatureUrl
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {currentDoctor.digitalSignatureUrl ? 'Signature Verified' : 'No Signature Uploaded'}
                  </span>
                </div>
              </div>

              {/* Signature Preview Box */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Official Digital Signature Image (Will appear on Word and PDF reports):
                </label>
                <div className="h-32 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center p-4 relative overflow-hidden">
                  {signaturePreview ? (
                    <img
                      src={signaturePreview}
                      alt="Signature Preview"
                      className="max-h-24 max-w-full object-contain"
                    />
                  ) : currentDoctor.digitalSignatureUrl ? (
                    <img
                      src={currentDoctor.digitalSignatureUrl}
                      alt="Configured Signature"
                      className="max-h-24 max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <FileSignature className="w-8 h-8 mx-auto mb-1 text-slate-300 dark:text-slate-600" />
                      <p>No digital signature attached for this consultant.</p>
                      <p className="text-[10px]">PNG with transparent background is recommended</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Controls */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <label className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Signature Image (PNG/JPG)
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                  </label>

                  {signaturePreview && (
                    <button
                      onClick={handleSaveSignature}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Save Signature
                    </button>
                  )}
                </div>

                {currentDoctor.digitalSignatureUrl && (
                  <button
                    onClick={handleRemoveSignature}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
