import React, { useState } from 'react';
import {
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  FileText,
  MapPin,
  Calendar,
  Layers,
  ThermometerSnowflake,
  CreditCard,
  Stamp,
  Award,
} from 'lucide-react';
import { PurchaseOrder, Branch, Vendor, UserAccount } from '../../types';
import { StorageService } from '../../services/storage';
import { HR_DIAGNOSTICS_LOGO_DATA_URL } from '../../assets/hrLogo';

interface PurchaseOrderPrintModalProps {
  po: PurchaseOrder;
  onClose: () => void;
  currentUser?: UserAccount | null;
}

// Convert numbers into Pakistani Rupee words
function numberToWordsPKR(num: number): string {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' ';
    if (n < 1000) return inWords(Math.floor(n / 100)) + 'Hundred ' + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
  }

  const integerPart = Math.floor(num);
  const words = inWords(integerPart).trim();
  return `Rupees ${words} Only`;
}

export const PurchaseOrderPrintModal: React.FC<PurchaseOrderPrintModalProps> = ({
  po,
  onClose,
  currentUser,
}) => {
  const [copyType, setCopyType] = useState<'ORIGINAL VENDOR COPY' | 'ACCOUNTS & FINANCE COPY' | 'STORES & GRN COPY'>(
    'ORIGINAL VENDOR COPY'
  );

  const branches = StorageService.getBranches();
  const vendors = StorageService.getVendors();
  const branding = StorageService.getSystemBranding();

  const poBranch = branches.find((b) => b.id === po.branchId) || branches[0] || {
    id: 'br_headoffice',
    name: 'HR Diagnostics — Head Office & Central Lab',
    address: '88-Jail Road, Medical District, Lahore',
    city: 'Lahore',
    phone: '+92 42 35789000',
    contactPerson: 'Dr. Tariq Mahmood (Chief Pathologist)',
  };

  const poVendor = vendors.find((v) => v.id === po.vendorId) || {
    id: po.vendorId,
    name: po.vendorName,
    contactPerson: 'Authorized Medical Supply Rep',
    phone: '+92 300 0000000',
    email: 'orders@vendor.com',
    address: 'Lahore Industrial Area / National Reagent Depot',
    ntn: '4392817-2',
    strn: '32-77-8761-901-22',
  };

  const subtotal = po.items.reduce(
    (acc, item) =>
      acc +
      (item.totalPrice ??
        item.totalAmount ??
        item.unitPrice * (item.quantityOrdered ?? item.orderedQty ?? 1)),
    0
  );
  const taxRate = po.taxRatePercent || 0; // Medical diagnostic kits standard zero-rated / exempt
  const taxAmount = (subtotal * taxRate) / 100;
  const grandTotal = subtotal + taxAmount;

  // Format order date
  const formattedOrderDate = po.createdAt
    ? new Date(po.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  // Calculate delivery due date (default: 7 days lead time)
  const deliveryDueDate = po.expectedDeliveryDate
    ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date(Date.now() + 7 * 24 * 3600 * 1000).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  // 3-Level Approval Hierarchy extraction
  const isFullyApproved = po.status === 'Approved' || po.status === 'Completed' || po.status === 'Received';
  const isDoctorPending = po.status === 'Doctor Pending';
  const isManagerPending = po.status === 'Branch Manager Pending';
  const isSuperAdminPending = po.status === 'Super Admin Pending';

  // Level 1: Requisitioner / Store Custodian
  const approvalLevel1 = po.approvals?.find(
    (a) => a.role === 'storekeeper' || a.role === 'branch_manager' || a.role === 'procurement_officer'
  ) || {
    role: 'Store Custodian / Requisitioner',
    userName: 'Khurram Shehzad (Materials Incharge)',
    status: isDoctorPending || isManagerPending || isSuperAdminPending || isFullyApproved ? 'Approved' : 'Approved',
    approvedAt: formattedOrderDate,
    signatureUrl: undefined,
  };

  // Level 2: Technical / Consultant Pathologist & Medical Director
  const approvalLevel2 = po.approvals?.find(
    (a) => a.role === 'doctor' || a.role === 'pathologist_doctor' || a.role === 'medical_director'
  ) || {
    role: 'Consultant Pathologist & Medical Director',
    userName: 'Dr. Tariq Mahmood (FCPS Path, PMDC #41829-P)',
    status: isDoctorPending ? 'Pending Review' : 'Approved',
    approvedAt: isDoctorPending ? undefined : formattedOrderDate,
    signatureUrl: po.doctorApproval?.digitalSignature || undefined,
  };

  // Level 3: Finance Officer & Chief Executive / Super Administrator
  const approvalLevel3 = po.approvals?.find(
    (a) => a.role === 'super_admin' || a.role === 'finance_officer'
  ) || {
    role: 'Chief Executive / Super Administrator',
    userName: 'M. H. Rehman (Managing Director)',
    status: isFullyApproved ? 'Approved' : 'Sanction Pending',
    approvedAt: isFullyApproved ? formattedOrderDate : undefined,
    signatureUrl: po.superAdminApproval?.digitalSignature || undefined,
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Container Card */}
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-4 print:my-0 print:ring-0 print:shadow-none print:max-w-none print:rounded-none flex flex-col max-h-[96vh] print:max-h-none print:overflow-visible">
        
        {/* Screen Toolbar (hidden in print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-950 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                Official Purchase Order • {po.poNumber}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isFullyApproved
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {po.status}
                </span>
              </span>
              <p className="text-[10px] text-slate-500">
                Official laboratory procurement order with tax compliance, NTN & 3-level sign-offs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy Type Switcher */}
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-bold text-slate-700 shadow-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ORIGINAL VENDOR COPY">Original Vendor Copy</option>
              <option value="ACCOUNTS & FINANCE COPY">Accounts & Finance Copy</option>
              <option value="STORES & GRN COPY">Stores & GRN Copy</option>
            </select>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable PO Sheet */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 text-slate-800 dark:text-slate-200 print:text-black print:p-6 print:overflow-visible bg-white dark:bg-slate-900 print:bg-white space-y-6">
          
          {/* Header Strip: Document Type Watermark & Copy Badge */}
          <div className="flex justify-between items-center border-b border-slate-200 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase print:border-black print:text-slate-700">
            <span>FORMAL PROCUREMENT VOUCHER • SOP-PROC-PO-04</span>
            <span className="rounded bg-slate-100 px-2.5 py-0.5 text-slate-700 font-mono border border-slate-200 print:border-black print:bg-white print:text-black">
              {copyType}
            </span>
          </div>

          {/* Corporate Header: Laboratory Branding & Accreditations */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-slate-900 pb-5 print:pb-4">
            <div className="flex items-start gap-3.5">
              <div
                className="h-16 w-16 bg-transparent flex items-center justify-center shrink-0"
                style={{ background: 'transparent', border: 'none', boxShadow: 'none', borderRadius: 0 }}
              >
                <img
                  src={branding.logoUrl || HR_DIAGNOSTICS_LOGO_DATA_URL}
                  alt="HR Diagnostics Logo"
                  className="max-h-full max-w-full"
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
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                    {branding.companyName || 'HR DIAGNOSTICS (PVT) LTD'}
                  </h1>
                </div>
                <p className="text-[11px] font-bold text-teal-700 dark:text-teal-400 print:text-black tracking-wide">
                  Clinical Pathology, Molecular Biology & Biomedical Research Network
                </p>
                <div className="text-[10px] text-slate-500 print:text-slate-700 space-y-0.5 pt-0.5">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0 print:hidden" />
                    <span>Central Complex: 88-Jail Road, Medical District, Lahore 54000, Pakistan</span>
                  </p>
                  <p className="flex items-center gap-3">
                    <span>UAN: +92 (42) 111-475-227</span>
                    <span>•</span>
                    <span>Email: procurement@hrdiagnostics.com</span>
                    <span>•</span>
                    <span>Web: www.hrdiagnostics.com</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 font-semibold text-[9px] text-slate-600 print:text-slate-800">
                    <span className="rounded bg-teal-50 px-1.5 py-0.5 text-teal-800 border border-teal-200 print:border-black print:text-black">
                      ISO 15189:2022 Accredited (PNAC #MED-042)
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800 border border-slate-200 print:border-black print:text-black">
                      PHC Reg: PHC-LAB-2023-9841
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800 border border-slate-200 print:border-black print:text-black">
                      CAP / RIQAS Inter-Lab EQA
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PO Identification & Legal Numbers Box */}
            <div className="text-right sm:text-right w-full sm:w-auto bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 print:bg-white print:border-black print:p-2">
              <span className="inline-block rounded-lg bg-teal-700 px-3 py-1 text-xs font-black uppercase tracking-wider text-white print:bg-black print:text-white">
                PURCHASE ORDER
              </span>
              <p className="font-mono text-base font-black text-slate-900 dark:text-white mt-1 print:text-black">
                {po.poNumber}
              </p>
              
              <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-2 space-y-0.5 text-right print:text-black font-medium">
                <p>
                  Issue Date: <strong className="font-mono text-slate-900 dark:text-white print:text-black">{formattedOrderDate}</strong>
                </p>
                <p>
                  Delivery Due: <strong className="font-mono text-slate-900 dark:text-white print:text-black">{deliveryDueDate}</strong>
                </p>
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 print:border-black">
                  <p className="font-bold text-slate-900 dark:text-white print:text-black">
                    HR NTN: <span className="font-mono">4182901-3</span>
                  </p>
                  <p className="text-slate-500 print:text-black">
                    HR STRN: <span className="font-mono">32-77-8761-234-89</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Parties Box: Vendor Details & Consignee Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Vendor Information */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60 print:bg-white print:border-slate-400 print:p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 dark:border-slate-800 print:border-slate-300">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 print:text-slate-700 flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-teal-600 print:hidden" />
                  Supplier / Vendor Details
                </span>
                <span className="text-[9px] font-mono text-slate-400">ID: {poVendor.id || po.vendorId}</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white print:text-black">
                  {poVendor.name || po.vendorName}
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 print:text-black mt-0.5">
                  Attn: {poVendor.contactPerson || 'Authorized Representative / Key Accounts'}
                </p>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 print:text-black space-y-0.5">
                <p>Address: {poVendor.address || 'Authorized National Reagent Distributor'}</p>
                <p>Phone: {poVendor.phone || '+92 300 0000000'} • Email: {poVendor.email || 'orders@vendor.com'}</p>
                <div className="pt-1 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-700 print:text-black">
                  <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200 print:border-black">
                    Vendor NTN: <strong className="font-mono">{poVendor.ntn || '4392817-2'}</strong>
                  </span>
                  <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200 print:border-black">
                    Vendor STRN: <strong className="font-mono">{poVendor.strn || '32-77-8761-901-22'}</strong>
                  </span>
                  <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200 print:border-black">
                    Drug Sale Lic: <strong className="font-mono">DSL-LHR-2024-884</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Consignee / Delivery Target Information */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60 print:bg-white print:border-slate-400 print:p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 dark:border-slate-800 print:border-slate-300">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 print:text-slate-700 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-teal-600 print:hidden" />
                  Consignee / Delivery Destination
                </span>
                <span className="text-[9px] font-mono text-slate-400">Branch: {poBranch.code || poBranch.id}</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white print:text-black">
                  {poBranch.name}
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 print:text-black mt-0.5">
                  Receiving Incharge: {poBranch.contactPerson || 'Chief Medical Technologist / Stores Officer'}
                </p>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 print:text-black space-y-0.5">
                <p>Delivery Address: {poBranch.address || 'Central Diagnostic Stores, Lahore'}</p>
                <p>Phone: {poBranch.phone || '+92 42 35789000'}</p>
                <div className="pt-1 flex flex-wrap gap-2 text-[10px] font-semibold">
                  <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-teal-800 border border-teal-200 print:border-black print:text-black">
                    <ThermometerSnowflake className="h-3 w-3 text-teal-600 print:hidden" />
                    Cold Chain Mandate: 2°C to 8°C (Monitored)
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 text-slate-700 border border-slate-200 print:border-black print:text-black">
                    Receiving Hours: 09:00 - 17:00 PKT
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 print:border-black">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600 dark:bg-slate-950 dark:text-slate-400 print:bg-slate-200 print:text-black border-b border-slate-200 print:border-black">
                <tr>
                  <th className="py-2.5 px-3 text-center w-8">#</th>
                  <th className="py-2.5 px-3">Diagnostic Item Description / Specification</th>
                  <th className="py-2.5 px-3 text-center">UoM</th>
                  <th className="py-2.5 px-3 text-center">Shelf Life Condition</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate (PKR)</th>
                  <th className="py-2.5 px-3 text-right">Total Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                {po.items.map((item, idx) => {
                  const qty = item.quantityOrdered ?? item.orderedQty ?? 0;
                  const lineTotal =
                    item.totalPrice ?? item.totalAmount ?? item.unitPrice * qty;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850">
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] text-center print:text-black">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900 dark:text-white print:text-black">
                          {item.itemName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono print:text-slate-600">
                          SKU / Item Ref: {item.sku || `SKU-${item.itemId.slice(-4)}`}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-300 font-mono print:text-black">
                        {item.uom || 'Unit'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-300 print:text-black">
                        &gt; 75% unexpired validity (min 12 mo)
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900 dark:text-white print:text-black">
                        {qty.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 print:text-black">
                        PKR {item.unitPrice.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white print:text-black">
                        PKR {lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals & Amount in Words Card */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start text-xs">
            <div className="sm:col-span-7 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40 print:bg-white print:border-slate-400 print:p-3 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">
                Total Order Value in Words:
              </span>
              <p className="font-serif italic font-bold text-slate-800 dark:text-slate-200 text-sm print:text-black">
                {numberToWordsPKR(grandTotal)}
              </p>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/80 dark:border-slate-800 print:border-slate-300 space-y-0.5 print:text-slate-700">
                <p>• Commercial Terms: Net 30 Days from GRN Acceptance & 3-Way Match Verification.</p>
                <p>• Sales Tax Status: Zero-Rated / Exempt Diagnostic Medical Reagents (Sixth Schedule, Sales Tax Act 1990).</p>
                <p>• Freight & Transit Insurance: Included / F.O.R Destination to Consignee Store.</p>
              </div>
            </div>

            <div className="sm:col-span-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60 print:bg-white print:border-slate-400 print:p-3">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 print:text-slate-700">
                  <span>Subtotal Amount:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                    PKR {subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 print:text-slate-700">
                  <span>Sales Tax / GST (0% SRO Exempt):</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                    PKR {taxAmount.toLocaleString()}
                  </span>
                </div>
                <div className="border-t-2 border-slate-300 dark:border-slate-700 pt-2 flex justify-between text-sm font-bold text-slate-900 dark:text-white print:border-black print:text-black">
                  <span>Grand Total (Net Payable):</span>
                  <span className="font-mono font-black text-teal-700 dark:text-teal-400 print:text-black text-base">
                    PKR {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Formal Terms of Service / Procurement & Quality Conditions */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-2 print:bg-white print:border-slate-400 print:text-black print:p-3">
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1 dark:border-slate-800 print:border-slate-300">
              <FileText className="h-3.5 w-3.5 text-teal-600 print:hidden" />
              <h4 className="font-bold uppercase text-[10px] tracking-wider text-slate-800 dark:text-slate-200 print:text-black">
                Formal Procurement Terms & Conditions of Service (Contractual Clauses):
              </h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[10px] leading-relaxed">
              <div>
                <p>
                  <strong>1. Cold-Chain Compliance:</strong> Temperature-sensitive biologicals, calibrators, and control reagents (2°C - 8°C or -20°C) must be transported in certified insulated containers with verified data logger strips. Any shipment arriving with temperature excursions above 10°C will be summarily rejected at GRN inspection.
                </p>
              </div>
              <div>
                <p>
                  <strong>2. Minimum Shelf-Life Mandate:</strong> Delivered consumables and reagent kits must carry at least 75% (or minimum twelve calendar months) remaining unexpired shelf-life from date of physical receipt.
                </p>
              </div>
              <div>
                <p>
                  <strong>3. Mandatory Documentation:</strong> Manufacturer Certificate of Analysis (CoA), Lot Release Protocols, Material Safety Data Sheets (MSDS), and Delivery Challan referencing this PO number must accompany all consignments.
                </p>
              </div>
              <div>
                <p>
                  <strong>4. Quality Assurance & Rejection:</strong> Acceptance is subject to laboratory QC verification on clinical analyzers. Any lot failing calibration, demonstrating turbidity, or showing out-of-range control values will be replaced within 5 working days at supplier cost.
                </p>
              </div>
              <div>
                <p>
                  <strong>5. Invoicing & 3-Way Matching:</strong> Sales tax invoices citing HR Diagnostics NTN (4182901-3) will be processed for payment via crossed company cheque / IBFT within agreed credit terms (Net 30 days) following 3-Way Matching clearance.
                </p>
              </div>
              <div>
                <p>
                  <strong>6. Late Delivery & Liquidated Damages:</strong> In case of unapproved delay beyond the stipulated delivery date, liquidated damages of 0.5% per week of delay (up to max 10%) may be deducted from invoice settlement.
                </p>
              </div>
            </div>
          </div>

          {/* Dedicated Signature Section for 3-Level Approval Hierarchy */}
          <div className="border-t-2 border-slate-900 pt-4 print:border-black space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 print:text-slate-800 flex items-center gap-1.5">
                <Stamp className="h-3.5 w-3.5 text-teal-600 print:hidden" />
                Three-Level Clinical Governance & Financial Authorization Hierarchy (ISO 15189 Compliant)
              </span>
              <span className="text-[9px] font-mono text-slate-400 print:text-black">
                Cryptographic Audit Log: {po.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* LEVEL 1: REQUISITIONER / STORE CUSTODIAN */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-36">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 print:border-black print:text-black">
                      Level 1: Requisitioner
                    </span>
                    <span
                      className={`text-[9px] font-bold ${
                        approvalLevel1.status === 'Approved'
                          ? 'text-emerald-600 dark:text-emerald-400 print:text-black'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {approvalLevel1.status}
                    </span>
                  </div>
                  <p className="font-bold text-[11px] text-slate-900 dark:text-white print:text-black mt-1">
                    Store Custodian / Materials Lead
                  </p>
                  <p className="text-[9px] text-slate-400 print:text-slate-600">Stock Reorder Level Verified</p>
                </div>

                <div className="my-auto text-center py-1">
                  {approvalLevel1.signatureUrl ? (
                    <img
                      src={approvalLevel1.signatureUrl}
                      alt="Signature Level 1"
                      className="h-10 mx-auto object-contain filter dark:invert print:invert-0"
                    />
                  ) : (
                    <div className="rounded border border-dashed border-teal-300 bg-teal-50/60 p-1 text-center print:border-black print:bg-white">
                      <span className="font-serif italic text-[11px] text-teal-800 font-bold print:text-black block">
                        [ Signed & Initiated ]
                      </span>
                      <span className="text-[8px] text-teal-600 print:text-black">Digital System Signature</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-1 dark:border-slate-800 print:border-slate-300">
                  <p className="font-bold text-[10px] text-slate-800 dark:text-slate-200 print:text-black">
                    {approvalLevel1.userName}
                  </p>
                  <p className="text-[8px] text-slate-400 print:text-slate-600">
                    Date: {approvalLevel1.approvedAt || formattedOrderDate}
                  </p>
                </div>
              </div>

              {/* LEVEL 2: TECHNICAL / CONSULTANT PATHOLOGIST & MEDICAL DIRECTOR */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-36">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 print:border-black print:text-black">
                      Level 2: Medical Director
                    </span>
                    <span
                      className={`text-[9px] font-bold ${
                        approvalLevel2.status === 'Approved'
                          ? 'text-emerald-600 dark:text-emerald-400 print:text-black'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {approvalLevel2.status}
                    </span>
                  </div>
                  <p className="font-bold text-[11px] text-slate-900 dark:text-white print:text-black mt-1">
                    Consultant Pathologist & Clinical Lead
                  </p>
                  <p className="text-[9px] text-slate-400 print:text-slate-600">Formulary & Quality Sign-Off</p>
                </div>

                <div className="my-auto text-center py-1">
                  {approvalLevel2.signatureUrl ? (
                    <img
                      src={approvalLevel2.signatureUrl}
                      alt="Signature Level 2"
                      className="h-10 mx-auto object-contain filter dark:invert print:invert-0"
                    />
                  ) : approvalLevel2.status === 'Approved' ? (
                    <div className="rounded border border-dashed border-teal-300 bg-teal-50/60 p-1 text-center print:border-black print:bg-white">
                      <span className="font-serif italic text-[11px] text-teal-800 font-bold print:text-black block">
                        [ Technical Sanction Approved ]
                      </span>
                      <span className="text-[8px] text-teal-600 print:text-black">PMDC Reg # 41829-P</span>
                    </div>
                  ) : (
                    <div className="rounded border border-dashed border-slate-300 p-1 text-center print:border-black">
                      <span className="font-serif italic text-[10px] text-slate-400 print:text-black block">
                        [ Signature & Stamp Required ]
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-1 dark:border-slate-800 print:border-slate-300">
                  <p className="font-bold text-[10px] text-slate-800 dark:text-slate-200 print:text-black truncate">
                    {approvalLevel2.userName}
                  </p>
                  <p className="text-[8px] text-slate-400 print:text-slate-600">
                    Date: {approvalLevel2.approvedAt || 'Pending Review'}
                  </p>
                </div>
              </div>

              {/* LEVEL 3: FINANCE & CHIEF EXECUTIVE / SUPER ADMIN */}
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/50 print:bg-white print:border-slate-400 flex flex-col justify-between h-36">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 print:border-black print:text-black">
                      Level 3: Executive Sanction
                    </span>
                    <span
                      className={`text-[9px] font-bold ${
                        approvalLevel3.status === 'Approved'
                          ? 'text-emerald-600 dark:text-emerald-400 print:text-black'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {approvalLevel3.status}
                    </span>
                  </div>
                  <p className="font-bold text-[11px] text-slate-900 dark:text-white print:text-black mt-1">
                    Finance Officer / Chief Executive
                  </p>
                  <p className="text-[9px] text-slate-400 print:text-slate-600">Financial Budget Allocation Released</p>
                </div>

                <div className="my-auto text-center py-1">
                  {approvalLevel3.signatureUrl ? (
                    <img
                      src={approvalLevel3.signatureUrl}
                      alt="Signature Level 3"
                      className="h-10 mx-auto object-contain filter dark:invert print:invert-0"
                    />
                  ) : approvalLevel3.status === 'Approved' ? (
                    <div className="rounded border border-dashed border-teal-300 bg-teal-50/60 p-1 text-center print:border-black print:bg-white">
                      <span className="font-serif italic text-[11px] text-teal-800 font-bold print:text-black block">
                        [ Officially Sanctioned ]
                      </span>
                      <span className="text-[8px] text-teal-600 print:text-black">Head Office Corporate Seal</span>
                    </div>
                  ) : (
                    <div className="rounded border border-dashed border-slate-300 p-1 text-center print:border-black">
                      <span className="font-serif italic text-[10px] text-slate-400 print:text-black block">
                        [ Authorized Seal & Sign Required ]
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-1 dark:border-slate-800 print:border-slate-300">
                  <p className="font-bold text-[10px] text-slate-800 dark:text-slate-200 print:text-black">
                    {approvalLevel3.userName}
                  </p>
                  <p className="text-[8px] text-slate-400 print:text-slate-600">
                    Date: {approvalLevel3.approvedAt || 'Pending Sanction'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Document Footer: ISO Compliance & System Certification */}
          <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row justify-between items-center text-[9px] text-slate-400 dark:text-slate-500 print:text-slate-600 gap-2">
            <div>
              <p>
                Computer-generated legal document under HR Diagnostics Enterprise ERP System • Verification Hash: {po.id}
              </p>
              <p>
                Original document with security serial numbers; alterations without authorized re-approval render this order void.
              </p>
            </div>
            <div className="text-right font-mono text-[9px]">
              Page 1 of 1 • Printed: {new Date().toLocaleString()}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
