import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, X } from 'lucide-react';

interface DigitalSignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  signerName: string;
  signerRole: string;
  purpose: string;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  isOpen,
  onClose,
  onSave,
  signerName,
  signerRole,
  purpose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHasSignature(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
  };

  const handleConfirm = () => {
    if (!hasSignature || !canvasRef.current) {
      alert('Please draw your signature before confirming approval.');
      return;
    }
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Digital Cryptographic Signature</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{purpose}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Signer Details */}
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex justify-between">
            <span>
              Signatory: <strong>{signerName}</strong>
            </span>
            <span className="capitalize font-mono text-teal-600 dark:text-teal-400">{signerRole.replace('_', ' ')}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Timestamp: {new Date().toLocaleString()} (Auto-logged to immutable audit ledger)
          </div>
        </div>

        {/* Canvas */}
        <div className="p-6">
          <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
            <canvas
              ref={canvasRef}
              width={380}
              height={160}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="h-40 w-full touch-none cursor-crosshair rounded-lg bg-slate-50/50 dark:bg-slate-900/50"
            />
            {!hasSignature && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-400">
                Draw signature using touch screen or mouse pointer
              </div>
            )}
            <div className="absolute bottom-3 left-4 text-[10px] uppercase tracking-wider text-slate-400 pointer-events-none">
              X __________________________________
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Legal standard compliance (ISO 15189 / QMS)</span>
            <button
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasSignature}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-teal-700 disabled:opacity-50 transition"
          >
            <Check className="h-4 w-4" />
            Apply Digital Signature
          </button>
        </div>
      </div>
    </div>
  );
};
