import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Tag,
  ShieldCheck,
  Download,
  Loader2,
  FileText,
  Boxes,
  Layers,
  ThermometerSnowflake,
  QrCode,
  CheckCircle2,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { InventoryItem, AssetRecord, ItemBatch } from '../../types';
import { HR_DIAGNOSTICS_LOGO_DATA_URL } from '../../assets/hrLogo';
import {
  InventoryLabelItem,
  LabelSizePreset,
  LabelGenerationOptions,
  createLabelItem,
  buildWarehouseQRPayload,
  generateQRCodeDataUrl,
  generateInventoryLabelsPDF,
  downloadInventoryLabelsPDF,
  printInventoryLabelsPDF,
} from '../../utils/labelGenerator';

interface QRLabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
  batch?: ItemBatch | null;
  asset?: AssetRecord | null;
  bulkItems?: { item: InventoryItem; batch?: ItemBatch }[] | null;
  warehouseName?: string;
  branchName?: string;
}

export const QRLabelPrintModal: React.FC<QRLabelPrintModalProps> = ({
  isOpen,
  onClose,
  item,
  batch,
  asset,
  bulkItems,
  warehouseName = 'Central Medical Warehouse',
  branchName = 'HR Central Diagnostic Lab',
}) => {
  const [labelSize, setLabelSize] = useState<LabelSizePreset>('70x40');
  const [copies, setCopies] = useState<number>(1);
  const [includeQrCode, setIncludeQrCode] = useState<boolean>(true);
  const [includeBarcode, setIncludeBarcode] = useState<boolean>(true);
  const [includeLocationBin, setIncludeLocationBin] = useState<boolean>(true);
  const [includeStorageCondition, setIncludeStorageCondition] = useState<boolean>(true);
  const [includeExpiryDate, setIncludeExpiryDate] = useState<boolean>(true);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>('');
  const [previewPayload, setPreviewPayload] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Normalize single or multiple items to InventoryLabelItem[]
  const labelItems: InventoryLabelItem[] = React.useMemo(() => {
    if (bulkItems && bulkItems.length > 0) {
      return bulkItems.map(({ item: itm, batch: bth }) =>
        createLabelItem(itm, bth, { warehouseName, branchName })
      );
    }

    if (item) {
      return [createLabelItem(item, batch, { warehouseName, branchName })];
    }

    if (asset) {
      return [
        {
          id: asset.id,
          sku: asset.assetTag,
          name: asset.name,
          category: asset.category,
          uom: 'Unit',
          costPrice: asset.purchaseCost,
          locationBin: asset.departmentId || 'Biomedical Engineering',
          branchName,
          warehouseName,
          batchNumber: `SN:${asset.serialNumber}`,
          expiryDate: asset.nextMaintenanceDue ? `PM Due: ${asset.nextMaintenanceDue}` : 'N/A',
          storageCondition: 'Operational',
          qrPayload: `HR-ASSET|TAG:${asset.assetTag}|SN:${asset.serialNumber}|MODEL:${asset.brandModel}`,
        },
      ];
    }

    return [];
  }, [item, batch, asset, bulkItems, warehouseName, branchName]);

  const activePrimaryItem = labelItems[0];

  // Generate live QR code for preview
  useEffect(() => {
    if (!isOpen || !activePrimaryItem) return;

    let isMounted = true;
    const payload = buildWarehouseQRPayload(activePrimaryItem);
    setPreviewPayload(payload);

    generateQRCodeDataUrl(payload).then((dataUrl) => {
      if (isMounted) {
        setPreviewQrDataUrl(dataUrl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activePrimaryItem]);

  if (!isOpen || labelItems.length === 0) return null;

  const currentOptions: LabelGenerationOptions = {
    size: labelSize,
    copies,
    includeQrCode,
    includeBarcode,
    includeLocationBin,
    includeStorageCondition,
    includeExpiryDate,
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true);
      const doc = await generateInventoryLabelsPDF(labelItems, currentOptions);
      const filename =
        labelItems.length === 1
          ? `HR_Warehouse_Label_${activePrimaryItem.sku}_${activePrimaryItem.batchNumber || 'MAIN'}.pdf`
          : `HR_Warehouse_Labels_Bulk_${labelItems.length}items.pdf`;

      downloadInventoryLabelsPDF(doc, filename);
      setSuccessToast(`Saved printable PDF: ${filename}`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to download PDF labels:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintPDF = async () => {
    try {
      setIsPrinting(true);
      const doc = await generateInventoryLabelsPDF(labelItems, currentOptions);
      await printInventoryLabelsPDF(doc);
      setSuccessToast('Triggered printer dialog with high-res vector labels.');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to print PDF labels:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const totalLabelsToPrint = labelItems.length * copies;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-500/10 p-2.5 text-teal-600 dark:text-teal-400">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Warehouse Printable PDF Labels
                </h3>
                <span className="rounded-full bg-teal-100 dark:bg-teal-950 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:text-teal-300">
                  PDF & Thermal Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate high-resolution printable labels with SKU, batch number, and scannable 2D QR code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Alert Toast */}
        {successToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        <div className="max-h-[75vh] overflow-y-auto">
          {/* Controls Bar */}
          <div className="border-b border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Preset Format */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Label Dimensions / Layout
                </label>
                <select
                  value={labelSize}
                  onChange={(e) => setLabelSize(e.target.value as LabelSizePreset)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-xs focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <optgroup label="Direct Thermal Roll / Barcode Stickers (mm)">
                    <option value="50x25">50 x 25 mm (Thermal Barcode Roll - Zebra / Xprinter / TSC / Gprinter)</option>
                    <option value="50x30">50 x 30 mm (Small Reagent / Vial)</option>
                    <option value="70x40">70 x 40 mm (Standard Kit / Box)</option>
                    <option value="100x50">100 x 50 mm (Warehouse Shelf / Bin / Rack)</option>
                    <option value="100x150">100 x 150 mm (4"x6" Master Carton / Pallet)</option>
                  </optgroup>
                  <optgroup label="Multi-Label Sticker Sheets (A4 Paper)">
                    <option value="a4_sheet_2x4">A4 Sheet: 2x4 (8 Large Labels per sheet)</option>
                    <option value="a4_sheet_3x7">A4 Sheet: 3x7 (21 Standard Labels per sheet)</option>
                  </optgroup>
                </select>
              </div>

              {/* Number of Copies */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Copies per Batch / Item
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-xs focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <div className="text-[11px] text-slate-500 whitespace-nowrap">
                    Total: <strong className="text-teal-600 dark:text-teal-400">{totalLabelsToPrint}</strong>
                  </div>
                </div>
              </div>

              {/* Scope summary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Warehouse Scope
                </label>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 truncate">
                  {labelItems.length > 1 ? (
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      Bulk Queue: {labelItems.length} Unique Items / Batches
                    </span>
                  ) : (
                    <span>
                      SKU: <strong className="font-mono">{activePrimaryItem.sku}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Customization Checkbox Toggles */}
            <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeQrCode}
                  onChange={(e) => setIncludeQrCode(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Include 2D QR Code</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBarcode}
                  onChange={(e) => setIncludeBarcode(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Linear Barcode Strip</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLocationBin}
                  onChange={(e) => setIncludeLocationBin(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Bin Location</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStorageCondition}
                  onChange={(e) => setIncludeStorageCondition(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Storage Temp</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExpiryDate}
                  onChange={(e) => setIncludeExpiryDate(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Expiry Date</span>
              </label>
            </div>
          </div>

          {/* Visual Label Print Preview Canvas */}
          <div className="p-6 flex flex-col items-center justify-center bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Interactive Label Preview ({labelSize})</span>
            </div>

            {/* Label Card Mockup representing the exact printed label */}
            <div
              className={`bg-white text-slate-900 border-2 border-teal-500/40 p-4 shadow-xl rounded-xl flex flex-col justify-between transition-all ${
                labelSize === '50x30'
                  ? 'w-[320px] min-h-[180px]'
                  : labelSize === '70x40'
                  ? 'w-[420px] min-h-[220px]'
                  : labelSize === '100x50'
                  ? 'w-[480px] min-h-[240px]'
                  : labelSize === '100x150'
                  ? 'w-[380px] min-h-[380px]'
                  : 'w-[450px] min-h-[240px]'
              }`}
            >
              {/* Brand Top Header with Official Logo */}
              <div className="flex items-center justify-between border-b border-teal-100 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="bg-transparent flex items-center justify-center" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
                    <img
                      src={HR_DIAGNOSTICS_LOGO_DATA_URL}
                      alt="HR Diagnostics Logo"
                      className="h-7 w-7 shrink-0"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        borderRadius: 0,
                        objectFit: 'contain',
                      }}
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.onerror = null;
                        img.src = '/hr-diagnostics-logo-transparent.png';
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-[12px] font-black tracking-wider uppercase text-slate-950 leading-none block">
                      HR DIAGNOSTICS
                    </span>
                    <span className="text-[9px] font-bold text-teal-600 uppercase tracking-widest block pt-0.5">
                      WAREHOUSE INVENTORY
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>FEFO VERIFIED</span>
                </div>
              </div>

              {/* Main Content: Left Details + Right QR Code */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1 overflow-hidden">
                  <h4 className="font-black text-sm text-slate-950 leading-tight line-clamp-2">
                    {activePrimaryItem.name}
                  </h4>

                  {/* SKU and Batch Number badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="font-mono text-xs font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      SKU: {activePrimaryItem.sku}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      BATCH: {activePrimaryItem.batchNumber || 'NO-BATCH'}
                    </span>
                  </div>

                  {/* Metadata: Expiry, Temp, Location */}
                  <div className="text-[11px] text-slate-600 pt-1 space-y-0.5">
                    {includeExpiryDate && (
                      <p className="flex items-center gap-1 font-semibold text-slate-800">
                        <span>Exp:</span>
                        <strong className="text-red-700">{activePrimaryItem.expiryDate}</strong>
                        {activePrimaryItem.currentQuantity !== undefined && (
                          <span className="text-slate-500 font-normal">
                            ({activePrimaryItem.currentQuantity} {activePrimaryItem.uom})
                          </span>
                        )}
                      </p>
                    )}

                    {includeStorageCondition && activePrimaryItem.storageCondition && (
                      <p className="flex items-center gap-1 text-[10px] text-sky-700">
                        <ThermometerSnowflake className="w-3 h-3 text-sky-600" />
                        <span>Storage: {activePrimaryItem.storageCondition}</span>
                      </p>
                    )}

                    {includeLocationBin && activePrimaryItem.locationBin && (
                      <p className="flex items-center gap-1 text-[10px] text-teal-700 font-bold">
                        <Layers className="w-3 h-3 text-teal-600" />
                        <span>Loc Bin: {activePrimaryItem.locationBin}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Scannable Real QR Code Preview */}
                {includeQrCode && (
                  <div className="flex flex-col items-center shrink-0 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    {previewQrDataUrl ? (
                      <img
                        src={previewQrDataUrl}
                        alt="Warehouse QR Code"
                        className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                      />
                    ) : (
                      <div className="w-20 h-20 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                      </div>
                    )}
                    <span className="font-mono text-[8px] text-slate-500 mt-0.5">SCAN 2D QR</span>
                  </div>
                )}
              </div>

              {/* Bottom Simulated Linear Barcode */}
              {includeBarcode && (
                <div className="mt-2 pt-1 border-t border-slate-200">
                  <div className="flex items-center justify-between gap-0.5 h-4 w-full bg-slate-100 p-0.5 rounded">
                    {[3, 1, 5, 2, 4, 1, 6, 2, 3, 5, 1, 4, 2, 6, 1, 3, 4, 2, 5, 1, 3, 2, 4, 2].map((w, i) => (
                      <div
                        key={i}
                        className={`h-full bg-slate-900 ${i % 2 === 0 ? 'opacity-100' : 'opacity-0'}`}
                        style={{ width: `${w * 2}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-0.5">
                    <span>{activePrimaryItem.sku}</span>
                    <span>{activePrimaryItem.batchNumber}</span>
                  </div>
                </div>
              )}
            </div>

            {/* QR Payload inspect string */}
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 max-w-lg truncate">
              <QrCode className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="truncate">Payload: <code className="font-mono text-slate-700 dark:text-slate-300">{previewPayload}</code></span>
            </div>
          </div>

          {/* Bulk Items List Preview if multiple */}
          {labelItems.length > 1 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
              <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Items in Print Queue ({labelItems.length})
              </h5>
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 rounded-xl bg-white dark:bg-slate-950 dark:border-slate-800">
                {labelItems.map((itm, idx) => (
                  <div key={idx} className="p-2 text-xs flex items-center justify-between">
                    <div className="truncate mr-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{itm.name}</span>
                      <span className="ml-2 font-mono text-teal-600 dark:text-teal-400">[{itm.sku}]</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[11px] text-slate-500">
                        Batch: {itm.batchNumber}
                      </span>
                      <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                        {copies} {copies === 1 ? 'copy' : 'copies'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Tag className="h-4 w-4 text-teal-500" />
            <span>
              Ready to print <strong className="text-slate-800 dark:text-slate-200">{totalLabelsToPrint}</strong> label{totalLabelsToPrint === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              Close
            </button>

            {/* Download PDF button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal-800 shadow-xs hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900 transition disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 text-teal-600" />
                  <span>Download PDF Labels</span>
                </>
              )}
            </button>

            {/* Direct Print PDF button */}
            <button
              onClick={handlePrintPDF}
              disabled={isPrinting || isGenerating}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition disabled:opacity-50"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Sending to Printer...</span>
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  <span>Print PDF ({totalLabelsToPrint})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
