import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { InventoryItem, ItemBatch } from '../types';
import { HR_DIAGNOSTICS_LOGO_DATA_URL } from '../assets/hrLogo';

export interface InventoryLabelItem {
  id: string;
  sku: string;
  name: string;
  category?: string;
  uom?: string;
  costPrice?: number;
  locationBin?: string;
  branchName?: string;
  warehouseName?: string;
  departmentName?: string;
  isNarcoticOrControlled?: boolean;
  batchNumber?: string;
  lotNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;
  storageCondition?: string;
  currentQuantity?: number;
  qrPayload?: string;
}

export type LabelSizePreset =
  | '50x25' // Direct Thermal Roll Sticker (50mm x 25mm - Zebra / Xprinter / TSC / Gprinter)
  | '50x30' // Small Vial / Reagent Bottle (50mm x 30mm)
  | '70x40' // Standard Diagnostic Box / Kit (70mm x 40mm)
  | '100x50' // Warehouse Bin / Rack Label (100mm x 50mm)
  | '100x150' // 4x6 inch Master Carton / Pallet Label (100mm x 150mm)
  | 'a4_sheet_2x4' // A4 Sheet: 8 labels (2 columns x 4 rows)
  | 'a4_sheet_3x7'; // A4 Sheet: 21 labels (3 columns x 7 rows - Avery style)

export interface LabelGenerationOptions {
  size: LabelSizePreset;
  copies?: number;
  includeQrCode?: boolean;
  includeBarcode?: boolean;
  includeCompanyHeader?: boolean;
  includeLocationBin?: boolean;
  includeStorageCondition?: boolean;
  includeExpiryDate?: boolean;
  includeCostPrice?: boolean;
  customNotes?: string;
}

/**
 * Builds standardized scannable QR payload string for warehouse scanners and mobile apps
 */
export function buildWarehouseQRPayload(item: InventoryLabelItem): string {
  if (item.qrPayload) return item.qrPayload;
  
  // Format: HR-INV|SKU|BATCH|EXP|BIN|WH
  const sku = item.sku || 'UNKNOWN';
  const batch = item.batchNumber || 'NO-BATCH';
  const exp = item.expiryDate || 'N/A';
  const bin = item.locationBin || 'GENERAL';
  const wh = item.warehouseName || 'CENTRAL';
  
  return `HR-INV|SKU:${sku}|BATCH:${batch}|EXP:${exp}|BIN:${bin}|WH:${wh}`;
}

/**
 * Converts InventoryItem and ItemBatch into normalized label item
 */
export function createLabelItem(
  item: InventoryItem,
  batch?: ItemBatch | null,
  extra?: { warehouseName?: string; branchName?: string; departmentName?: string }
): InventoryLabelItem {
  const chosenBatch = batch || (item.batches && item.batches[0]);

  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    category: item.category,
    uom: item.uom,
    costPrice: item.costPrice,
    locationBin: item.locationBin || 'General Shelf',
    branchName: extra?.branchName || 'HR Central Diagnostic Lab',
    warehouseName: extra?.warehouseName || 'Central Medical Warehouse',
    departmentName: extra?.departmentName,
    isNarcoticOrControlled: !!item.isNarcoticOrControlled,
    batchNumber: chosenBatch ? chosenBatch.batchNumber : 'MAIN-STOCK',
    lotNumber: chosenBatch?.lotNumber,
    expiryDate: chosenBatch?.expiryDate || 'N/A',
    manufacturingDate: chosenBatch?.manufacturingDate,
    storageCondition: chosenBatch?.storageCondition || 'Room Temp',
    currentQuantity: chosenBatch ? chosenBatch.currentQuantity : item.totalQuantity,
  };
}

/**
 * Generates Base64 PNG QR code data URL
 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code Data URL:', err);
    // Return a 1x1 transparent png fallback
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
}

/**
 * Draw barcode simulation onto PDF at specific x, y, width, height
 */
function drawBarcodeSimulation(doc: jsPDF, x: number, y: number, width: number, height: number, codeText: string) {
  doc.setFillColor(245, 247, 250);
  doc.rect(x, y, width, height, 'F');

  // Pseudo-pattern of bars
  const seed = codeText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const barCount = Math.floor(width / 1.1);
  const barWidth = width / barCount;

  doc.setFillColor(15, 23, 42); // Slate 900
  for (let i = 0; i < barCount; i++) {
    // Determine bar presence by pseudo-hash
    const bit = ((seed * (i + 13)) ^ (i * 37)) % 100 > 38;
    if (bit) {
      doc.rect(x + i * barWidth, y, barWidth * 0.75, height - 2.5, 'F');
    }
  }

  // Barcode human readable text
  doc.setFont('courier', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(71, 85, 105);
  doc.text(codeText.slice(0, 24), x + width / 2, y + height - 0.5, { align: 'center' });
}

/**
 * Renders a single warehouse label inside a designated bounding box in mm
 */
async function renderLabelCard(
  doc: jsPDF,
  item: InventoryLabelItem,
  x: number,
  y: number,
  w: number,
  h: number,
  options: LabelGenerationOptions,
  qrDataUrl: string
) {
  // Card background & border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');

  // Sizing tiers
  const isUltraCompact = h <= 26;
  const isCompact = w <= 55 || h <= 32;
  const isLarge = w >= 95;

  // Header Bar with Official HR Diagnostics Corporate Logo
  const headerH = isUltraCompact ? 4.0 : isCompact ? 5.2 : isLarge ? 8 : 6.2;
  doc.setFillColor(15, 23, 42); // Sleek slate-900 / dark medical blue
  doc.roundedRect(x, y, w, headerH, isUltraCompact ? 1.0 : 1.5, isUltraCompact ? 1.0 : 1.5, 'F');
  doc.rect(x, y + headerH - 1, w, 1, 'F'); // Square bottom of header bar

  // Embed Authentic Corporate Logo on Label
  const logoSize = isUltraCompact ? 3.2 : isCompact ? 4.4 : isLarge ? 7.0 : 5.4;
  const logoX = x + (isUltraCompact ? 0.8 : 1.2);
  const logoY = y + (headerH - logoSize) / 2;
  try {
    doc.addImage(HR_DIAGNOSTICS_LOGO_DATA_URL, 'PNG', logoX, logoY, logoSize, logoSize);
  } catch (err) {
    console.warn('Could not add logo to label:', err);
  }

  // Header Text
  const textLeft = logoX + logoSize + (isUltraCompact ? 1.0 : 1.6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isUltraCompact ? 5.0 : isCompact ? 5.8 : isLarge ? 8.5 : 7.2);
  doc.setTextColor(255, 255, 255);
  doc.text('HR DIAGNOSTICS', textLeft, y + (headerH / 2) + (isUltraCompact ? 0.6 : isCompact ? 0.7 : 0.9));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isUltraCompact ? 3.8 : isCompact ? 4.4 : isLarge ? 6 : 5.2);
  doc.setTextColor(14, 217, 255); // Cyan brand color
  const companyWidth = doc.getTextWidth('HR DIAGNOSTICS');
  doc.text(isUltraCompact ? '• LAB' : '• WAREHOUSE', textLeft + companyWidth + 1.0, y + (headerH / 2) + (isUltraCompact ? 0.6 : isCompact ? 0.7 : 0.9));

  if (item.isNarcoticOrControlled) {
    doc.setFillColor(220, 38, 38); // Red-600
    doc.roundedRect(x + w - 16, y + (headerH - 2.8) / 2, 14.5, 2.8, 0.5, 0.5, 'F');
    doc.setFontSize(4.5);
    doc.setTextColor(255, 255, 255);
    doc.text('CONTROLLED', x + w - 8.8, y + (headerH / 2) + 0.8, { align: 'center' });
  }

  // Layout calculations
  const pad = isUltraCompact ? 1.2 : 2;
  const contentTop = y + headerH + (isUltraCompact ? 0.8 : 1.2);
  const contentH = h - headerH - 2;

  const qrSize = isUltraCompact ? 13.5 : isCompact ? 17 : isLarge ? 28 : 22;
  const qrX = x + w - qrSize - pad;
  const qrY = contentTop + 0.2;

  // Add QR Code Image
  if (options.includeQrCode !== false && qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.1);
      doc.rect(qrX, qrY, qrSize, qrSize, 'S');

      // Caption under QR
      doc.setFont('courier', 'normal');
      doc.setFontSize(isUltraCompact ? 3.5 : isCompact ? 4 : 5);
      doc.setTextColor(100, 116, 139);
      doc.text('SCAN QR', qrX + qrSize / 2, qrY + qrSize + (isUltraCompact ? 1.5 : 2), { align: 'center' });
    } catch (e) {
      console.warn('Could not add QR image to label PDF:', e);
    }
  }

  // Left Content Details
  const leftX = x + pad;
  let curY = contentTop + (isUltraCompact ? 2.2 : 3);
  const maxTextW = qrX - leftX - 1.2;

  // Item Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isUltraCompact ? 6.2 : isCompact ? 7.5 : isLarge ? 11 : 9);
  doc.setTextColor(15, 23, 42); // Slate 900
  const splitTitle = doc.splitTextToSize(item.name || 'Unnamed Item', maxTextW);
  doc.text(splitTitle.slice(0, 2), leftX, curY);
  curY += (splitTitle.slice(0, 2).length * (isUltraCompact ? 2.5 : isCompact ? 3.2 : 4)) + 0.8;

  // SKU in bold mono
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isUltraCompact ? 5.5 : isCompact ? 6.5 : isLarge ? 9 : 7.5);
  doc.setTextColor(13, 148, 136); // Teal 600
  doc.text(`SKU: ${item.sku || 'N/A'}`, leftX, curY);

  if (item.uom && !isUltraCompact) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isCompact ? 5.5 : 6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`(${item.uom})`, leftX + doc.getTextWidth(`SKU: ${item.sku || 'N/A'}`) + 1.5, curY);
  }
  curY += isUltraCompact ? 2.6 : isCompact ? 3.2 : 4;

  // Batch Number (Prominent with highlight background)
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.roundedRect(leftX, curY - (isUltraCompact ? 2.0 : 2.5), maxTextW, isUltraCompact ? 3.4 : isCompact ? 4 : 5, 0.6, 0.6, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isUltraCompact ? 5.2 : isCompact ? 6 : 7.5);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text(`LOT: ${item.batchNumber || 'MAIN'}`, leftX + 1.0, curY + (isUltraCompact ? 0.3 : isCompact ? 0.3 : 1));
  curY += isUltraCompact ? 3.6 : isCompact ? 4.5 : 5.5;

  // Expiry Date & Storage Condition
  if (options.includeExpiryDate !== false && item.expiryDate) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isCompact ? 5.5 : 6.5);
    
    // Check if near expiry or expired
    const isExpired = item.expiryDate !== 'N/A' && new Date(item.expiryDate).getTime() < Date.now();
    if (isExpired) {
      doc.setTextColor(220, 38, 38); // Red
      doc.text(`EXP: ${item.expiryDate} (EXPIRED)`, leftX, curY);
    } else {
      doc.setTextColor(51, 65, 85);
      doc.text(`EXP: ${item.expiryDate}`, leftX, curY);
    }
    curY += isCompact ? 3 : 3.5;
  }

  // Storage Condition
  if (options.includeStorageCondition !== false && item.storageCondition) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isCompact ? 5 : 6);
    doc.setTextColor(71, 85, 105);
    doc.text(`Cond: ${item.storageCondition}`, leftX, curY);
    curY += isCompact ? 2.8 : 3.2;
  }

  // Warehouse Bin Location
  if (options.includeLocationBin !== false && item.locationBin) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isCompact ? 5 : 6);
    doc.setTextColor(15, 118, 110); // Teal 700
    doc.text(`LOC: ${item.locationBin}`, leftX, curY);
    
    if (item.warehouseName && isLarge) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(` • ${item.warehouseName}`, leftX + doc.getTextWidth(`LOC: ${item.locationBin}`), curY);
    }
    curY += isCompact ? 3 : 3.5;
  }

  // Barcode strip across the bottom if space allows
  if (options.includeBarcode !== false && h >= 38) {
    const barcodeY = y + h - (isCompact ? 6 : 7.5);
    const barcodeW = w - (pad * 2);
    const barcodeH = isCompact ? 5 : 6.5;
    const barcodeText = `${item.sku}|${item.batchNumber || ''}`;
    drawBarcodeSimulation(doc, leftX, barcodeY, barcodeW, barcodeH, barcodeText);
  }
}

/**
 * Main Function: Generate Printable PDF Labels for single or multiple inventory items
 */
export async function generateInventoryLabelsPDF(
  items: InventoryLabelItem[],
  options: LabelGenerationOptions = { size: '70x40', copies: 1 }
): Promise<jsPDF> {
  const copies = Math.max(1, Math.min(100, options.copies || 1));
  const { size } = options;

  // Multiply items by copies
  const expandedItems: InventoryLabelItem[] = [];
  items.forEach((item) => {
    for (let c = 0; c < copies; c++) {
      expandedItems.push(item);
    }
  });

  // Pre-generate QR code data URLs in parallel for maximum speed
  const qrPromises = expandedItems.map((it) => {
    const payload = buildWarehouseQRPayload(it);
    return generateQRCodeDataUrl(payload);
  });
  const qrDataUrls = await Promise.all(qrPromises);

  // A4 Multi-label Sheets
  if (size === 'a4_sheet_2x4' || size === 'a4_sheet_3x7') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4', // 210 x 297 mm
    });

    const is2x4 = size === 'a4_sheet_2x4';
    const cols = is2x4 ? 2 : 3;
    const rows = is2x4 ? 4 : 7;
    const labelsPerPage = cols * rows;

    const pageW = 210;
    const pageH = 297;
    const marginX = is2x4 ? 7 : 5;
    const marginY = is2x4 ? 9 : 7;
    const gapX = is2x4 ? 4 : 3;
    const gapY = is2x4 ? 4 : 3;

    const labelW = (pageW - (marginX * 2) - ((cols - 1) * gapX)) / cols;
    const labelH = (pageH - (marginY * 2) - ((rows - 1) * gapY)) / rows;

    for (let idx = 0; idx < expandedItems.length; idx++) {
      const pageIndex = Math.floor(idx / labelsPerPage);
      const slotIndex = idx % labelsPerPage;

      if (slotIndex === 0 && pageIndex > 0) {
        doc.addPage('a4', 'portrait');
      }

      const col = slotIndex % cols;
      const row = Math.floor(slotIndex / cols);
      const x = marginX + (col * (labelW + gapX));
      const y = marginY + (row * (labelH + gapY));

      await renderLabelCard(
        doc,
        expandedItems[idx],
        x,
        y,
        labelW,
        labelH,
        options,
        qrDataUrls[idx]
      );
    }

    return doc;
  }

  // Individual Thermal Labels (Page per label)
  let pageW = 70;
  let pageH = 40;
  let orientation: 'landscape' | 'portrait' = 'landscape';

  if (size === '50x25') {
    pageW = 50;
    pageH = 25;
    orientation = 'landscape';
  } else if (size === '50x30') {
    pageW = 50;
    pageH = 30;
    orientation = 'landscape';
  } else if (size === '70x40') {
    pageW = 70;
    pageH = 40;
    orientation = 'landscape';
  } else if (size === '100x50') {
    pageW = 100;
    pageH = 50;
    orientation = 'landscape';
  } else if (size === '100x150') {
    pageW = 100;
    pageH = 150;
    orientation = 'portrait';
  }

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageW, pageH],
  });

  for (let idx = 0; idx < expandedItems.length; idx++) {
    if (idx > 0) {
      doc.addPage([pageW, pageH], orientation);
    }

    const margin = size === '50x25' ? 0.8 : 1.5;
    const cardW = pageW - (margin * 2);
    const cardH = pageH - (margin * 2);

    await renderLabelCard(
      doc,
      expandedItems[idx],
      margin,
      margin,
      cardW,
      cardH,
      options,
      qrDataUrls[idx]
    );
  }

  return doc;
}

/**
 * Downloads generated PDF labels directly with a clean filename
 */
export function downloadInventoryLabelsPDF(doc: jsPDF, filename = 'Warehouse_Inventory_Labels.pdf') {
  doc.save(filename);
}

/**
 * Directly prints the generated PDF using browser print dialog via an isolated invisible iframe
 */
export async function printInventoryLabelsPDF(doc: jsPDF): Promise<void> {
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  // Hidden iframe ensures browser prints strictly the PDF vector pages
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.border = 'none';
  iframe.src = blobUrl;

  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print failed, opening in tab:', err);
        window.open(blobUrl, '_blank');
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      }, 60000);
    }, 400);
  };
}
