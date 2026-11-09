import React, { useRef } from 'react';
import { Printer, Download, X, Activity, Clock, User, QrCode } from 'lucide-react';
import { ClinicToken } from '../../types';

interface TokenSlipPrintModalProps {
  isOpen: boolean;
  token: ClinicToken | null;
  clinicName?: string;
  onClose: () => void;
}

export const TokenSlipPrintModal: React.FC<TokenSlipPrintModalProps> = ({
  isOpen,
  token,
  clinicName = 'HR DIAGNOSTICS',
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !token) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-300 space-y-4">
        {/* Modal Controls Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Print Patient Token Slip
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 80mm Thermal Slip Preview Area */}
        <div
          ref={printAreaRef}
          className="bg-white p-5 rounded-xl border border-dashed border-slate-300 font-mono text-slate-900 text-xs space-y-3 shadow-inner"
        >
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-blue-600 font-black text-sm">
              <Activity className="w-5 h-5" />
              <span>{clinicName}</span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Diagnostic & Imaging Center
            </p>
            <p className="text-[9px] text-slate-400">Main Boulevard, Lahore • Tel: 042-111-255-255</p>
          </div>

          <div className="border-t border-dashed border-slate-400 my-2" />

          {/* Token Header Banner */}
          <div className="text-center space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              PATIENT QUEUE TOKEN
            </span>
            <div className="text-4xl font-black text-[#0c2340] tracking-wider py-1">
              {token.tokenNumber}
            </div>
            <div className="inline-block px-3 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
              {token.department} • {token.counterNumber}
            </div>
          </div>

          <div className="border-t border-dashed border-slate-400 my-2" />

          {/* Patient Details */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Patient:</span>
              <strong className="text-slate-900 truncate max-w-[170px]">{token.patientName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Patient ID:</span>
              <span>{token.patientId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">MR Number:</span>
              <span>{token.patientMRN}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Examination:</span>
              <span className="truncate max-w-[170px] text-right font-bold">{token.serviceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Time:</span>
              <span>{token.tokenDate} {token.createdAt.split('T')[1]?.slice(0, 5) || '12:45'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Waiting Pos:</span>
              <span className="font-bold text-blue-600">#{token.waitingPosition || 1} in Queue</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-400 my-2" />

          {/* Notice to Patient */}
          <div className="text-center text-[10px] space-y-1">
            <p className="font-bold text-slate-800">
              "Please wait until your token number is announced."
            </p>
            <p className="text-slate-400 text-[9px]">
              Watch waiting room TV screens for live updates.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Token (80mm/58mm)</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
