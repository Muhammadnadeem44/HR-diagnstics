import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  X,
  Filter,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ThermometerSnowflake,
  CheckCircle2,
  FileDown,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { StorageService } from '../../services/storage';
import { InventoryItem, Branch } from '../../types';
import { HR_DIAGNOSTICS_LOGO_DATA_URL } from '../../assets/hrLogo';

interface StockCountSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBranchId: string;
  currentUser?: any;
}

export const StockCountSheetModal: React.FC<StockCountSheetModalProps> = ({
  isOpen,
  onClose,
  activeBranchId,
  currentUser,
}) => {
  const branches = StorageService.getBranches();
  const allInventory = StorageService.getInventory();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    activeBranchId === 'all' ? branches[0]?.id || 'br_headoffice' : activeBranchId
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [isBlindCount, setIsBlindCount] = useState<boolean>(false);
  const [onlyColdChain, setOnlyColdChain] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter items based on selections
  const filteredItems = useMemo(() => {
    return allInventory.filter((item) => {
      // Branch filter
      if (selectedBranchId !== 'all' && item.branchId && item.branchId !== selectedBranchId) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Department filter
      if (selectedDepartment !== 'all' && item.departmentId !== selectedDepartment) {
        return false;
      }
      // Cold chain filter
      if (onlyColdChain) {
        const batchCond = item.batches?.[0]?.storageCondition?.toLowerCase() || '';
        const isCold =
          batchCond.includes('2-8') ||
          batchCond.includes('cold') ||
          batchCond.includes('-20');
        if (!isCold) return false;
      }
      return true;
    });
  }, [allInventory, selectedBranchId, selectedCategory, selectedDepartment, onlyColdChain]);

  if (!isOpen) return null;

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const branchName = selectedBranchId === 'all' ? 'All Branches (Consolidated)' : currentBranch?.name || 'Central Lab';
  const todayFormatted = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const sheetReferenceNumber = `AUD-SHT-${Date.now().toString().slice(-6)}`;

  // Download PDF implementation using jsPDF
  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4', // 297 x 210 mm
      });

      const pageW = 297;
      const pageH = 210;
      const margin = 10;
      const contentW = pageW - margin * 2;

      let currentY = margin;

      // 1. Header Banner
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.roundedRect(margin, currentY, contentW, 16, 2, 2, 'F');

      // Corporate Logo
      try {
        doc.addImage(HR_DIAGNOSTICS_LOGO_DATA_URL, 'PNG', margin + 3, currentY + 2, 12, 12);
      } catch (e) {
        console.warn('Could not add logo to PDF:', e);
      }

      // Title & Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text('HR DIAGNOSTICS - CLINICAL PHYSICAL STOCK COUNT SHEET', margin + 18, currentY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(14, 217, 255); // Cyan
      doc.text(
        `BRANCH: ${branchName.toUpperCase()}  •  REF: ${sheetReferenceNumber}  •  DATE: ${todayFormatted}  •  MODE: ${
          isBlindCount ? 'BLIND AUDIT (SYSTEM QUANTITIES HIDDEN)' : 'STANDARD VERIFICATION'
        }`,
        margin + 18,
        currentY + 12.5
      );

      currentY += 21;

      // 2. Table Column Dimensions (Landscape A4: 277mm usable)
      const colIdx = 10;
      const colName = 65;
      const colSku = 28;
      const colLoc = 32;
      const colBatch = 30;
      const colExp = 25;
      const colSys = 22;
      const colPhys = 28;
      const colVar = 18;
      const colRemarks = 19; // total ~ 277mm

      const renderTableHeader = (yPos: number) => {
        doc.setFillColor(241, 245, 249); // Slate 100
        doc.rect(margin, yPos, contentW, 8, 'F');
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.setLineWidth(0.2);
        doc.rect(margin, yPos, contentW, 8, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59); // Slate 800

        let curX = margin;
        doc.text('#', curX + 3, yPos + 5.5);
        curX += colIdx;
        doc.text('ITEM / REAGENT NAME', curX + 2, yPos + 5.5);
        curX += colName;
        doc.text('SKU / CODE', curX + 2, yPos + 5.5);
        curX += colSku;
        doc.text('LOCATION / TEMP', curX + 2, yPos + 5.5);
        curX += colLoc;
        doc.text('ACTIVE BATCH #', curX + 2, yPos + 5.5);
        curX += colBatch;
        doc.text('EXPIRY', curX + 2, yPos + 5.5);
        curX += colExp;
        doc.text(isBlindCount ? 'SYS (BLIND)' : 'SYSTEM QTY', curX + 2, yPos + 5.5);
        curX += colSys;
        doc.text('PHYSICAL COUNT', curX + 2, yPos + 5.5);
        curX += colPhys;
        doc.text('VARIANCE', curX + 2, yPos + 5.5);
        curX += colVar;
        doc.text('REMARKS / SIGN', curX + 2, yPos + 5.5);
      };

      renderTableHeader(currentY);
      currentY += 8;

      // 3. Render Item Rows
      const rowHeight = 7.5;
      let pageNumber = 1;

      filteredItems.forEach((item, index) => {
        // Page overflow check
        if (currentY + rowHeight > pageH - 25) {
          // Render page footer
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text(`Page ${pageNumber} • HR Diagnostics Physical Stock Audit`, margin, pageH - 8);
          doc.text(`Printed: ${new Date().toLocaleString()}`, pageW - margin - 50, pageH - 8);

          doc.addPage('a4', 'landscape');
          pageNumber++;
          currentY = margin;

          // Repeat Header banner on new page
          doc.setFillColor(15, 23, 42);
          doc.roundedRect(margin, currentY, contentW, 10, 1.5, 1.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255);
          doc.text(`HR DIAGNOSTICS STOCK COUNT SHEET (CONT.) — ${branchName.toUpperCase()}`, margin + 5, currentY + 6.5);
          currentY += 13;

          renderTableHeader(currentY);
          currentY += 8;
        }

        const primaryBatch = item.batches && item.batches[0];
        const batchNum = primaryBatch?.batchNumber || 'MAIN';
        const expDate = primaryBatch?.expiryDate || 'N/A';
        const locationText = `${item.locationBin || 'Shelf'} (${primaryBatch?.storageCondition || 'RT'})`;

        // Row background alternating
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252); // Slate 50
          doc.rect(margin, currentY, contentW, rowHeight, 'F');
        }

        // Row border
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.15);
        doc.line(margin, currentY + rowHeight, margin + contentW, currentY + rowHeight);

        // Draw vertical column dividers
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(51, 65, 85);

        let curX = margin;
        // Index
        doc.text(`${index + 1}`, curX + 2.5, currentY + 5);
        curX += colIdx;

        // Item Name (truncated)
        doc.setFont('helvetica', 'bold');
        doc.text(doc.splitTextToSize(item.name, colName - 3)[0] || item.name, curX + 2, currentY + 5);
        doc.setFont('helvetica', 'normal');
        curX += colName;

        // SKU
        doc.text(item.sku, curX + 2, currentY + 5);
        curX += colSku;

        // Location / Temp
        doc.text(doc.splitTextToSize(locationText, colLoc - 3)[0] || locationText, curX + 2, currentY + 5);
        curX += colLoc;

        // Batch
        doc.text(batchNum, curX + 2, currentY + 5);
        curX += colBatch;

        // Expiry
        doc.text(expDate, curX + 2, currentY + 5);
        curX += colExp;

        // System Qty
        if (isBlindCount) {
          doc.setTextColor(148, 163, 184);
          doc.text('[ BLIND ]', curX + 2, currentY + 5);
          doc.setTextColor(51, 65, 85);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.text(`${item.totalQuantity} ${item.uom || ''}`, curX + 2, currentY + 5);
          doc.setFont('helvetica', 'normal');
        }
        curX += colSys;

        // Blank Physical Count Box for Auditor Pen
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);
        doc.roundedRect(curX + 2, currentY + 1.2, colPhys - 4, rowHeight - 2.4, 0.5, 0.5, 'S');
        curX += colPhys;

        // Blank Variance Line
        doc.setDrawColor(203, 213, 225);
        doc.line(curX + 2, currentY + rowHeight - 2, curX + colVar - 2, currentY + rowHeight - 2);
        curX += colVar;

        // Blank Remarks Line
        doc.line(curX + 2, currentY + rowHeight - 2, curX + colRemarks - 2, currentY + rowHeight - 2);

        currentY += rowHeight;
      });

      // 4. Sign-off Footer block
      currentY = Math.min(currentY + 5, pageH - 24);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, currentY, contentW, 16, 1.5, 1.5, 'FD');
      doc.setDrawColor(203, 213, 225);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      // Auditor Block
      doc.text('PHYSICAL COUNT COMPLETED BY (AUDITOR):', margin + 4, currentY + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: _______________________   Signature: _______________________   Date: ___________`, margin + 4, currentY + 11.5);

      // Supervisor Block
      doc.setFont('helvetica', 'bold');
      doc.text('SUPERVISOR / LAB DIRECTOR VERIFICATION:', margin + (contentW / 2) + 4, currentY + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: _______________________   Signature: _______________________   Date: ___________`, margin + (contentW / 2) + 4, currentY + 11.5);

      const fileName = `HR_Diagnostics_Stock_Count_Sheet_${branchName.replace(/\s+/g, '_')}_${todayFormatted.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);

      setToastMessage(`Downloaded PDF: ${fileName}`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Error generating PDF stock sheet:', err);
      alert(`Could not generate PDF: ${err.message || err}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Browser print trigger
  const handlePrint = () => {
    window.print();
  };

  // Export CSV template
  const handleExportCSV = () => {
    const headers = [
      'Index',
      'Item Name',
      'SKU',
      'Category',
      'Location Bin',
      'Storage Condition',
      'Batch Number',
      'Expiry Date',
      isBlindCount ? 'System Qty (Blind)' : 'System Quantity',
      'UOM',
      'Physical Count (Write Here)',
      'Variance',
      'Auditor Remarks',
    ];

    const rows = filteredItems.map((item, idx) => {
      const b = item.batches && item.batches[0];
      return [
        idx + 1,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.sku}"`,
        `"${item.category || ''}"`,
        `"${item.locationBin || ''}"`,
        `"${b?.storageCondition || 'Room Temp'}"`,
        `"${b?.batchNumber || 'MAIN'}"`,
        `"${b?.expiryDate || 'N/A'}"`,
        isBlindCount ? '""' : item.totalQuantity,
        `"${item.uom || ''}"`,
        '""', // Blank for physical count
        '""', // Blank for variance
        '""', // Blank for remarks
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Stock_Count_Sheet_${branchName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setToastMessage('Exported stock count CSV spreadsheet.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-4 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                Physical Stock Count Sheet & Audit Taker Form
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  ISO 15189 Ready
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate printable & downloadable physical stock counting forms for clinical inventory verification.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="mx-6 mt-3 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-2 print:hidden">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Filters and Options Bar (Screen only) */}
        <div className="border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Branch selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Branch Location
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">All Branches (Consolidated)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Category Filter
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">All Categories</option>
                <option value="Reagents">Diagnostic Reagents</option>
                <option value="Rapid Test Kits">Rapid Test Kits</option>
                <option value="Radiology Consumables">Radiology & Contrast</option>
                <option value="Narcotics & Controlled">Narcotics & Controlled</option>
                <option value="Pathology Glassware">Pathology Glassware</option>
                <option value="PPE & Safety">PPE & Safety</option>
              </select>
            </div>

            {/* Blind Count Toggle */}
            <div className="flex flex-col justify-end">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={isBlindCount}
                  onChange={(e) => setIsBlindCount(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Blind Count Mode
                </span>
                <span className="text-[10px] text-slate-400 block ml-auto">Hide sys qty</span>
              </label>
            </div>

            {/* Cold Chain Only Toggle */}
            <div className="flex flex-col justify-end">
              <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={onlyColdChain}
                  onChange={(e) => setOnlyColdChain(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1">
                  <ThermometerSnowflake className="h-3.5 w-3.5 text-sky-600" />
                  Cold Chain Only
                </span>
              </label>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Selected: <strong className="text-teal-600 dark:text-teal-400 font-bold">{filteredItems.length} SKUs</strong> in {branchName}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition cursor-pointer"
              >
                <FileDown className="h-3.5 w-3.5 text-slate-500" />
                <span>Export CSV Template</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF || filteredItems.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 disabled:opacity-50 transition cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isGeneratingPDF ? 'Generating PDF...' : 'Download Count Sheet (PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Directly</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sheet Live Preview (Scrollable view and print area) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70 dark:bg-slate-950/40 print:p-0 print:bg-white">
          <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-200 print:border-none print:shadow-none print:p-2 print:text-black print:bg-white space-y-4">
            {/* Sheet Letterhead Header */}
            <div className="flex justify-between items-start gap-4 border-b-2 border-slate-900 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={HR_DIAGNOSTICS_LOGO_DATA_URL}
                  alt="HR Diagnostics Logo"
                  className="h-10 w-10 object-contain rounded-lg"
                />
                <div>
                  <h1 className="text-lg font-black uppercase text-slate-900 dark:text-white print:text-black leading-tight">
                    HR Diagnostics (Pvt) Ltd
                  </h1>
                  <p className="text-[11px] font-semibold text-slate-500 print:text-slate-700">
                    Department of Quality Assurance & Warehouse Materials Management
                  </p>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="inline-block rounded-md bg-teal-50 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-teal-800 border border-teal-300 print:border-black print:text-black">
                  PHYSICAL STOCK COUNT SHEET
                </span>
                <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 print:text-black">
                  Ref: {sheetReferenceNumber}
                </p>
                <p className="text-[11px] text-slate-500 print:text-slate-700">
                  Date: <strong className="text-slate-900 print:text-black">{todayFormatted}</strong>
                </p>
              </div>
            </div>

            {/* Scope Summary Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/60 print:bg-white print:border-slate-300">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 block">Location / Branch</span>
                <strong className="text-slate-900 dark:text-white print:text-black">{branchName}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 block">Total Items to Verify</span>
                <strong className="text-slate-900 dark:text-white print:text-black">{filteredItems.length} SKUs</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 block">Counting Mode</span>
                <strong className="text-teal-700 dark:text-teal-400 print:text-black">
                  {isBlindCount ? 'Blind Count (Unbiased)' : 'Standard Verification'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 block">Auditor In-Charge</span>
                <strong className="text-slate-900 dark:text-white print:text-black">
                  {currentUser?.name || 'Assigned Lead Auditor'}
                </strong>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 print:border-black">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-950 dark:text-slate-400 print:bg-slate-200 print:text-black border-b border-slate-200 print:border-black">
                  <tr>
                    <th className="py-2 px-2.5 w-8">#</th>
                    <th className="py-2 px-2.5">Item & Description</th>
                    <th className="py-2 px-2">SKU Code</th>
                    <th className="py-2 px-2">Location / Bin</th>
                    <th className="py-2 px-2">Batch #</th>
                    <th className="py-2 px-2">Expiry</th>
                    <th className="py-2 px-2 text-center">{isBlindCount ? 'System (Blind)' : 'System Qty'}</th>
                    <th className="py-2 px-2 text-center w-28 bg-teal-50/50 print:bg-slate-100">
                      Physical Count [Pen]
                    </th>
                    <th className="py-2 px-2 text-center w-16">Variance</th>
                    <th className="py-2 px-2">Remarks / Sign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No inventory records match the selected branch and category filter.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const b = item.batches && item.batches[0];
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-slate-900 dark:text-white print:text-black">
                            {item.name}
                          </td>
                          <td className="py-2 px-2 font-mono text-teal-700 dark:text-teal-400 print:text-black">
                            {item.sku}
                          </td>
                          <td className="py-2 px-2 text-slate-600 dark:text-slate-300 print:text-black text-[11px]">
                            {item.locationBin || 'Shelf'}{' '}
                            <span className="text-[10px] text-slate-400">({b?.storageCondition || 'RT'})</span>
                          </td>
                          <td className="py-2 px-2 font-mono text-[11px]">{b?.batchNumber || 'MAIN'}</td>
                          <td className="py-2 px-2 text-[11px]">{b?.expiryDate || 'N/A'}</td>
                          <td className="py-2 px-2 text-center font-bold font-mono">
                            {isBlindCount ? (
                              <span className="text-slate-400 text-[10px]">[ BLIND ]</span>
                            ) : (
                              `${item.totalQuantity} ${item.uom || ''}`
                            )}
                          </td>
                          {/* Blank box for manual pen entry */}
                          <td className="py-1 px-2 text-center bg-teal-50/30 print:bg-white">
                            <div className="h-6 w-full rounded border-2 border-dashed border-slate-300 print:border-black flex items-center justify-center text-[10px] text-slate-300 print:text-transparent">
                              [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
                            </div>
                          </td>
                          {/* Blank variance */}
                          <td className="py-1 px-2 text-center">
                            <div className="h-6 w-full border-b border-slate-300 print:border-black"></div>
                          </td>
                          {/* Blank remarks */}
                          <td className="py-1 px-2">
                            <div className="h-6 w-full border-b border-slate-300 print:border-black"></div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Sign-Off Section */}
            <div className="border-t-2 border-slate-200 pt-4 print:border-black">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-700 mb-2">
                Auditor & Management Signatures (Physical Count Verification):
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-24">
                  <p className="text-[10px] font-bold uppercase text-slate-500 print:text-black">
                    Physical Stock Counted & Signed By:
                  </p>
                  <div className="border-b border-slate-400 mt-6 mb-1"></div>
                  <p className="text-[10px] text-slate-500 print:text-black">
                    Auditor Name & Signature • Date: ____________
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-24">
                  <p className="text-[10px] font-bold uppercase text-slate-500 print:text-black">
                    Verified & Acknowledged by Branch Manager:
                  </p>
                  <div className="border-b border-slate-400 mt-6 mb-1"></div>
                  <p className="text-[10px] text-slate-500 print:text-black">
                    Branch In-Charge Signature • Date: ____________
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
