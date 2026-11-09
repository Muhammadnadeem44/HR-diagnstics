import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { InventoryItem, AssetRecord } from '../../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemFound?: (item: InventoryItem | AssetRecord, type: 'inventory' | 'asset') => void;
  onScanSuccess?: (code: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onItemFound,
  onScanSuccess,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [foundResult, setFoundResult] = useState<{ item: InventoryItem | AssetRecord; type: 'inventory' | 'asset' } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setFoundResult(null);
      setManualCode('');
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        setCameraError('Camera API not supported in this browser/environment. Use manual barcode input below.');
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('Camera access denied or unavailable. You can enter or simulate barcode scan below.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleSearchCode = (query: string) => {
    const q = query.trim().toUpperCase();
    if (!q) return;

    // Search inventory by SKU, Batch #, or QR code
    const inventory = StorageService.getInventory();
    const matchedInv = inventory.find(
      (item) =>
        item.sku.toUpperCase() === q ||
        item.name.toUpperCase().includes(q) ||
        item.batches.some((b) => b.batchNumber.toUpperCase() === q || b.qrCode?.toUpperCase() === q)
    );

    if (matchedInv) {
      setFoundResult({ item: matchedInv, type: 'inventory' });
      return;
    }

    // Search Assets by Asset Tag, Serial #, or QR Code
    const assets = StorageService.getAssets();
    const matchedAsset = assets.find(
      (a) =>
        a.assetTag.toUpperCase() === q ||
        a.serialNumber.toUpperCase() === q ||
        a.name.toUpperCase().includes(q) ||
        a.qrCode?.toUpperCase() === q
    );

    if (matchedAsset) {
      setFoundResult({ item: matchedAsset, type: 'asset' });
      return;
    }

    setFoundResult(null);
    alert(`No matching inventory item or asset found for code: "${query}"`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-teal-500/10 p-2 text-teal-600 dark:text-teal-400">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">QR & Barcode Optical Scanner</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Scan reagents, test kits, or machine asset tags</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video / Camera Viewport */}
        <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {cameraActive ? (
            <>
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              {/* Overlay targeting box */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative h-48 w-48 rounded-xl border-2 border-teal-400/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.6)] animate-pulse">
                  <div className="absolute -top-1 -left-1 h-4 w-4 border-t-4 border-l-4 border-teal-400" />
                  <div className="absolute -top-1 -right-1 h-4 w-4 border-t-4 border-r-4 border-teal-400" />
                  <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-teal-400" />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-teal-400" />
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/70 shadow-[0_0_8px_red]" />
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-slate-400">
              <Camera className="mx-auto h-12 w-12 text-slate-600 mb-2 opacity-60" />
              <p className="text-sm font-medium text-slate-300">Optical Camera Standby</p>
              {cameraError && (
                <p className="mt-1 text-xs text-amber-400 max-w-xs mx-auto flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {cameraError}
                </p>
              )}
              <button
                onClick={startCamera}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-teal-400 hover:bg-slate-700"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Manual Barcode / SKU Input */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Enter or Simulate Barcode / SKU / Batch / Asset Tag
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchCode(manualCode)}
                  placeholder="e.g. RGT-HEM-001 or ASSET-LAB-0101"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <button
                onClick={() => handleSearchCode(manualCode)}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition"
              >
                Lookup
              </button>
            </div>
          </div>

          {/* Result Card */}
          {foundResult && (
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/50 dark:bg-teal-950/20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div>
                    <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 mb-1">
                      {foundResult.type === 'inventory' ? 'Inventory SKU' : 'Equipment Asset'}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{foundResult.item.name}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {foundResult.type === 'inventory'
                        ? `SKU: ${(foundResult.item as InventoryItem).sku} • Stock: ${(foundResult.item as InventoryItem).totalQuantity} ${(foundResult.item as InventoryItem).uom}`
                        : `Tag: ${(foundResult.item as AssetRecord).assetTag} • S/N: ${(foundResult.item as AssetRecord).serialNumber}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (onItemFound) {
                      onItemFound(foundResult.item, foundResult.type);
                    }
                    if (onScanSuccess) {
                      const code =
                        foundResult.type === 'inventory'
                          ? (foundResult.item as InventoryItem).sku
                          : (foundResult.item as AssetRecord).assetTag;
                      onScanSuccess(code);
                    }
                    onClose();
                  }}
                  className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-teal-700"
                >
                  Open Record
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
