import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  Download,
  X,
  FileText,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Building2,
  CreditCard,
  Banknote,
  Share2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { ClinicInvoice } from '../../types';
import { HR_DIAGNOSTICS_LOGO_DATA_URL } from '../../assets/hrLogo';
import { StorageService } from '../../services/storage';

interface BillingReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: ClinicInvoice | null;
  onInvoiceUpdated?: (updated: ClinicInvoice) => void;
}

export const BillingReceiptModal: React.FC<BillingReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onInvoiceUpdated,
}) => {
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal_80mm' | 'thermal_58mm'>('thermal_80mm');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (invoice) {
      // Generate verify QR code containing verification link / payload
      const qrPayload = JSON.stringify({
        inv: invoice.invoiceNumber,
        rec: invoice.receiptNumber,
        mrn: invoice.patientMRN,
        pat: invoice.patientName,
        amt: invoice.netPayable,
        paid: invoice.paidAmount,
        date: invoice.createdAt,
        verified: 'HR-DIAGNOSTICS-SECURITY-SIGNED',
      });

      QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 140,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const isDuplicate = invoice.reprintCount > 0;

  const handlePrint = () => {
    // Increment reprint count if printed again
    const newCount = StorageService.recordReceiptReprint(invoice.id);
    if (onInvoiceUpdated) {
      onInvoiceUpdated({ ...invoice, reprintCount: newCount });
    }
    window.print();
  };

  const handleCopyInvoiceNumber = () => {
    navigator.clipboard.writeText(invoice.invoiceNumber);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formattedDate = new Date(invoice.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = new Date(invoice.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/75 p-3 sm:p-5 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Top Control Bar (Non-Printable) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-950/50 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Clinic Cash Receipt & Invoice
                </h3>
                {isDuplicate && (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                    DUPLICATE (Reprint #{invoice.reprintCount})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Invoice: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{invoice.invoiceNumber}</span> · Rec: <span className="font-mono">{invoice.receiptNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Selector */}
            <div className="flex rounded-xl bg-white p-1 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal_80mm')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  printFormat === 'thermal_80mm'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal_58mm')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  printFormat === 'thermal_58mm'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                58mm Slip
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  printFormat === 'a4'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                A4 Invoice
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleCopyInvoiceNumber}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              title="Copy Invoice Number"
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isCopied ? 'Copied!' : 'Copy #'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950 flex justify-center">
          
          {/* Printable Document Box */}
          <div
            ref={printAreaRef}
            id="printable-clinic-receipt"
            className={`bg-white text-slate-900 shadow-xl transition-all ${
              printFormat === 'thermal_80mm'
                ? 'w-[320px] p-4 text-[12px] font-sans'
                : printFormat === 'thermal_58mm'
                ? 'w-[230px] p-2.5 text-[10px] font-sans'
                : 'w-full max-w-[760px] p-8 text-[13px] font-sans rounded-2xl border border-slate-200'
            }`}
            style={{ color: '#0f172a' }}
          >
            {/* Watermark for Duplicate */}
            {isDuplicate && (
              <div className="mb-2 text-center">
                <span className="inline-block border-2 border-dashed border-red-500 px-3 py-0.5 text-xs font-black tracking-widest text-red-600 uppercase">
                  *** DUPLICATE RECEIPT COPY #{invoice.reprintCount} ***
                </span>
              </div>
            )}

            {/* Cancelled Banner */}
            {invoice.isCancelled && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-300 p-2 text-center text-red-700 font-bold text-xs">
                ⚠️ THIS INVOICE WAS OFFICIALLY CANCELLED ({invoice.cancellationReason || 'Authorized by Admin'})
              </div>
            )}

            {/* Clinic Brand Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-center mb-1">
                <img
                  src={HR_DIAGNOSTICS_LOGO_DATA_URL}
                  alt="HR Diagnostics"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                HR DIAGNOSTICS & CLINIC
              </h1>
              <p className="text-[11px] font-semibold text-slate-600">
                {invoice.branchName || 'Central Diagnostic Hub'}
              </p>
              <p className="text-[10px] text-slate-500">
                Tel: 042-35871234 · UAN: 0300-8451921 · 24/7 Helpline
              </p>
              <p className="text-[9px] text-slate-400">
                ISO 15189 Accredited · Licensed Clinical Diagnostics
              </p>
            </div>

            {/* Receipt Identification Line */}
            <div className="my-2.5 py-1.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between font-bold">
                <span>Receipt #: {invoice.receiptNumber}</span>
                <span>Inv #: {invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[10px]">
                <span>Date: {formattedDate} {formattedTime}</span>
                <span>Counter: {invoice.counterName}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[10px]">
                <span>Cashier: {invoice.cashierName}</span>
                <span className={`font-bold ${invoice.paymentStatus === 'Fully Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  Status: {invoice.paymentStatus.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Patient Information Section */}
            <div className="mb-3 rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient MRN:</span>
                <span className="font-mono font-bold text-slate-900">{invoice.patientMRN}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient Name:</span>
                <span className="font-extrabold text-slate-900">{invoice.patientName}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Age / Gender:</span>
                <span className="font-semibold text-slate-800">{invoice.patientAge} Yrs / {invoice.patientGender}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Mobile Phone:</span>
                <span className="font-mono text-slate-800">{invoice.patientPhone}</span>
              </div>
              {invoice.patientCnic && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">CNIC / ID:</span>
                  <span className="font-mono text-slate-800">{invoice.patientCnic}</span>
                </div>
              )}
              {invoice.referredDoctorName && (
                <div className="flex justify-between text-[10px] pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Doctor:</span>
                  <span className="font-bold text-slate-900 text-right">{invoice.referredDoctorName}</span>
                </div>
              )}
            </div>

            {/* Services Table */}
            <div className="mb-3">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-300 font-bold text-slate-700">
                    <th className="py-1">Service / Test</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1.5 pr-2">
                        <div className="font-bold text-slate-900">{item.serviceName}</div>
                        <div className="text-[9px] text-slate-500">{item.category}</div>
                        {item.discountAmount > 0 && (
                          <div className="text-[9px] text-emerald-600 font-semibold">
                            Disc: -Rs. {item.discountAmount.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="py-1.5 text-center font-mono">{item.quantity}</td>
                      <td className="py-1.5 text-right font-mono text-slate-600">
                        {item.unitPrice.toLocaleString()}
                      </td>
                      <td className="py-1.5 text-right font-bold font-mono text-slate-900">
                        {item.netAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">Rs. {invoice.subtotal.toLocaleString()}</span>
              </div>

              {invoice.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount {invoice.discountReason ? `(${invoice.discountReason})` : ''}:</span>
                  <span className="font-mono">-Rs. {invoice.totalDiscount.toLocaleString()}</span>
                </div>
              )}

              {invoice.totalTax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Govt Tax / Surcharge:</span>
                  <span className="font-mono">+Rs. {invoice.totalTax.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-[13px] font-black text-slate-900 pt-1 border-t border-slate-300">
                <span>Net Total Payable:</span>
                <span className="font-mono text-blue-900">Rs. {invoice.netPayable.toLocaleString()}</span>
              </div>

              <div className="flex justify-between font-bold text-emerald-800 text-[12px] pt-1">
                <span>Paid Amount:</span>
                <span className="font-mono">Rs. {invoice.paidAmount.toLocaleString()}</span>
              </div>

              {invoice.balanceDue > 0 && (
                <div className="flex justify-between font-black text-red-700 text-[12px] pt-1 bg-red-50 p-1 rounded">
                  <span>Remaining Balance Due:</span>
                  <span className="font-mono">Rs. {invoice.balanceDue.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Payment Method Breakdown */}
            <div className="mt-2.5 pt-2 border-t border-dashed border-slate-300 text-[10px] space-y-1">
              <span className="font-bold text-slate-700 block">Payment Breakdown:</span>
              {invoice.payments.map((p, idx) => (
                <div key={idx} className="flex justify-between text-slate-600">
                  <span>• {p.method} {p.referenceNumber ? `(${p.referenceNumber})` : ''}:</span>
                  <span className="font-mono font-bold text-slate-800">Rs. {p.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Refund Notice if refunded */}
            {invoice.refundAmount && invoice.refundAmount > 0 && (
              <div className="mt-2 rounded bg-amber-50 p-1.5 border border-amber-300 text-[10px] text-amber-800">
                <span className="font-bold">Refund Processed:</span> Rs. {invoice.refundAmount.toLocaleString()}
                <div>Reason: {invoice.refundReason || 'Patient Request'}</div>
                <div>Authorized By: {invoice.refundApprovedBy || 'Supervisor'}</div>
              </div>
            )}

            {/* QR Code Verification & Barcode Area */}
            <div className="mt-4 pt-3 border-t border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
              {qrCodeDataUrl && (
                <img
                  src={qrCodeDataUrl}
                  alt="Invoice Security QR Code"
                  className="h-20 w-20 object-contain mb-1.5 border border-slate-200 p-0.5 rounded"
                />
              )}
              <div className="font-mono text-[9px] tracking-widest text-slate-500 uppercase">
                *{invoice.invoiceNumber}*
              </div>
              <p className="text-[9px] text-slate-400 mt-1">
                Scan QR to verify authentic diagnostic report & billing validity.
              </p>
            </div>

            {/* Footer Terms & Signatures */}
            <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">
                Thank you for choosing HR Diagnostics Clinical Laboratory.
              </p>
              <p>
                • Collect your laboratory test reports online or from the reception counter with this receipt.
              </p>
              <p>
                • Fasting test results ready same evening. Ultrasound & X-Ray films delivered immediately.
              </p>
              
              <div className="pt-6 flex justify-between items-end text-[10px] text-slate-700">
                <div className="text-center">
                  <div className="w-24 border-b border-slate-400 mb-1" />
                  <span>Cashier Sign</span>
                </div>
                <div className="text-center">
                  <div className="w-28 border-b border-slate-400 mb-1" />
                  <span>Patient / Attendant</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900 print:hidden shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>Printed via HR Diagnostics Billing POS</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-extrabold text-white shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Receipt Now</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
