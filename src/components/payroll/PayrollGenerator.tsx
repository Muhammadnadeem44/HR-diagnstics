import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Building2,
  Calendar,
  X,
  CreditCard,
  Search,
  Filter,
  FileText,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { StorageService } from '../../services/storage';
import { PayrollSlip, EmployeeProfile } from '../../types';
import { HR_DIAGNOSTICS_LOGO_DATA_URL } from '../../assets/hrLogo';

interface PayrollGeneratorProps {
  activeBranchId?: string;
  onPayrollGenerated: () => void;
}

export const PayrollGenerator: React.FC<PayrollGeneratorProps> = ({
  activeBranchId = 'all',
  onPayrollGenerated,
}) => {
  const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(activeBranchId);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [slips, setSlips] = useState<PayrollSlip[]>(() =>
    StorageService.getPayrollSlips(currentMonthStr, activeBranchId)
  );
  const branches = StorageService.getBranches();

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSlipForPrint, setSelectedSlipForPrint] = useState<PayrollSlip | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const reloadSlips = (month: string, branch: string) => {
    setSlips(StorageService.getPayrollSlips(month, branch));
  };

  const handleGeneratePayroll = () => {
    if (
      confirm(
        `Run automated payroll engine for month ${selectedMonth}? This will calculate attendance, lates, leaves, overtime pay, and deduct active advance loans.`
      )
    ) {
      setIsGenerating(true);
      setTimeout(() => {
        const res = StorageService.generateMonthlyPayroll({
          payrollMonth: selectedMonth,
          branchId: selectedBranchFilter,
          generatedBy: 'Super Admin',
        });
        reloadSlips(selectedMonth, selectedBranchFilter);
        setIsGenerating(false);
        onPayrollGenerated();
        showToast(
          `Payroll Generated! ${res.generatedCount} employee salary slips processed. Total Net: Rs. ${res.totalNet.toLocaleString()}`
        );
      }, 1000);
    }
  };

  const handleStatusChange = (slip: PayrollSlip, status: PayrollSlip['paymentStatus']) => {
    slip.paymentStatus = status;
    if (status === 'Paid') slip.paymentDate = new Date().toISOString().split('T')[0];
    StorageService.savePayrollSlip(slip);
    reloadSlips(selectedMonth, selectedBranchFilter);
    showToast(`Status updated for ${slip.employeeName}: ${status}`);
  };

  // Filtered slips based on search, status and branch
  const filteredSlips = useMemo(() => {
    return slips.filter((s) => {
      if (selectedBranchFilter !== 'all' && s.branchId !== selectedBranchFilter) return false;
      if (paymentStatusFilter !== 'all' && s.paymentStatus !== paymentStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.employeeName?.toLowerCase().includes(q);
        const matchesCode = s.employeeCode?.toLowerCase().includes(q);
        const matchesDesig = s.designation?.toLowerCase().includes(q);
        const matchesDept = s.departmentName?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDesig && !matchesDept) return false;
      }
      return true;
    });
  }, [slips, selectedBranchFilter, paymentStatusFilter, searchQuery]);

  // Aggregate metrics
  const totalBasic = filteredSlips.reduce((sum, s) => sum + (s.basicSalary || 0), 0);
  const totalAllowancesAndOT = filteredSlips.reduce(
    (sum, s) => sum + (s.allowances || 0) + (s.overtimePay || 0) + (s.bonusAmount || 0),
    0
  );
  const totalGross = filteredSlips.reduce((sum, s) => sum + (s.grossEarnings || 0), 0);
  const totalAbsentLateCuts = filteredSlips.reduce(
    (sum, s) => sum + (s.lateDeduction || 0) + (s.absentDeduction || 0),
    0
  );
  const totalLoanDeductions = filteredSlips.reduce(
    (sum, s) => sum + (s.advanceLoanDeduction || 0),
    0
  );
  const totalTaxAndOther = filteredSlips.reduce(
    (sum, s) => sum + (s.taxDeduction || 0) + (s.otherDeductions || 0),
    0
  );
  const totalDeductions = filteredSlips.reduce((sum, s) => sum + (s.totalDeductions || 0), 0);
  const totalNet = filteredSlips.reduce((sum, s) => sum + (s.netSalary || 0), 0);

  // ==========================================
  // 1-CLICK EXPORT ACCOUNTING CSV
  // ==========================================
  const handleExportCSV = () => {
    if (filteredSlips.length === 0) {
      alert('No payroll records to export for current filters.');
      return;
    }

    // Map employees to obtain bank details and CNIC
    const allEmployees = StorageService.getEmployees();
    const empMap = new Map<string, EmployeeProfile>();
    allEmployees.forEach((e) => {
      empMap.set(e.id, e);
      empMap.set(e.employeeCode, e);
    });

    const headers = [
      'Sr #',
      'Payroll Month',
      'Employee Code',
      'Employee Name',
      'CNIC / National ID',
      'Designation',
      'Department',
      'Branch',
      'Employment Type',
      'Present Days',
      'Absent Days',
      'Late Days',
      'OT Hours',
      'Basic Salary (PKR)',
      'Allowances (PKR)',
      'Overtime Pay (PKR)',
      'Bonus (PKR)',
      'Gross Earnings (PKR)',
      'Absent Deduction (PKR)',
      'Late Fine (PKR)',
      'Advance Loan Cut (PKR)',
      'Tax Deduction (PKR)',
      'Other Deductions (PKR)',
      'Total Deductions (PKR)',
      'Net Salary Payable (PKR)',
      'Payment Mode',
      'Bank Name',
      'Account Title',
      'Account / IBAN Number',
      'Payment Status',
      'Payment Date',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows: string[] = [];
    csvRows.push(headers.map(escapeCsv).join(','));

    filteredSlips.forEach((slip, index) => {
      const emp = empMap.get(slip.employeeId) || empMap.get(slip.employeeCode);
      const row = [
        index + 1,
        slip.payrollMonth,
        slip.employeeCode,
        slip.employeeName,
        emp?.cnic || '—',
        slip.designation,
        slip.departmentName,
        slip.branchName,
        emp?.employmentType || 'Permanent',
        slip.presentDays,
        slip.absentDays,
        slip.lateDays,
        slip.overtimeHours,
        slip.basicSalary,
        slip.allowances,
        slip.overtimePay,
        slip.bonusAmount || 0,
        slip.grossEarnings,
        slip.absentDeduction,
        slip.lateDeduction,
        slip.advanceLoanDeduction,
        slip.taxDeduction,
        slip.otherDeductions,
        slip.totalDeductions,
        slip.netSalary,
        emp?.paymentMode || slip.paymentMethod || 'Bank Transfer',
        emp?.bankName || '—',
        emp?.accountTitle || slip.employeeName,
        emp?.accountNumberOrIBAN || '—',
        slip.paymentStatus,
        slip.paymentDate || 'Pending',
      ];
      csvRows.push(row.map(escapeCsv).join(','));
    });

    // Add Totals Summary Row
    const totalsRow = [
      'TOTALS',
      selectedMonth,
      `${filteredSlips.length} Staff`,
      'CONSOLIDATED SUMMARY',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalBasic,
      '',
      '',
      '',
      totalGross,
      '',
      '',
      totalLoanDeductions,
      '',
      '',
      totalDeductions,
      totalNet,
      '',
      '',
      '',
      '',
      '',
      '',
    ];
    csvRows.push(totalsRow.map(escapeCsv).join(','));

    // UTF-8 BOM for proper Excel encoding
    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `HRD_Payroll_Accounting_Summary_${selectedMonth}_${Date.now().toString().slice(-4)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Accounting CSV report exported successfully (${filteredSlips.length} employees).`);
  };

  // ==========================================
  // 1-CLICK DOWNLOAD ACCOUNTING PDF SUMMARY
  // ==========================================
  const handleDownloadPDF = async () => {
    if (filteredSlips.length === 0) {
      alert('No payroll records to print for current filters.');
      return;
    }

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
      const contentW = pageW - margin * 2; // 277 mm

      const currentBranchObj = branches.find((b) => b.id === selectedBranchFilter);
      const branchLabel =
        selectedBranchFilter === 'all'
          ? 'All Branches (Consolidated)'
          : currentBranchObj?.name || 'Main Laboratory';
      const todayFormatted = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const sheetRef = `PAY-ACC-${selectedMonth.replace('-', '')}-${Date.now().toString().slice(-4)}`;

      let currentY = margin;

      // 1. Header Banner
      const renderHeaderBanner = (isContinuation: boolean = false) => {
        doc.setFillColor(15, 23, 42); // Slate 900
        const bannerH = isContinuation ? 11 : 16;
        doc.roundedRect(margin, currentY, contentW, bannerH, 2, 2, 'F');

        // Logo
        try {
          doc.addImage(
            HR_DIAGNOSTICS_LOGO_DATA_URL,
            'PNG',
            margin + 3,
            currentY + (isContinuation ? 1.5 : 2),
            isContinuation ? 8 : 12,
            isContinuation ? 8 : 12
          );
        } catch (e) {
          // ignore fallback
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isContinuation ? 10 : 13);
        doc.setTextColor(255, 255, 255);
        const titleText = isContinuation
          ? `HR DIAGNOSTICS — PAYROLL & SALARY DISBURSEMENT SHEET (CONT.)`
          : 'HR DIAGNOSTICS — MONTHLY PAYROLL & SALARY DISBURSEMENT SHEET';
        doc.text(titleText, margin + (isContinuation ? 14 : 18), currentY + (isContinuation ? 5.5 : 6.8));

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isContinuation ? 7.5 : 8.5);
        doc.setTextColor(14, 217, 255); // Cyan
        const subText = isContinuation
          ? `MONTH: ${selectedMonth}  •  BRANCH: ${branchLabel.toUpperCase()}  •  REF: ${sheetRef}`
          : `MONTH: ${selectedMonth}  •  BRANCH: ${branchLabel.toUpperCase()}  •  STATUS: ${paymentStatusFilter.toUpperCase()}  •  REF: ${sheetRef}  •  DATE: ${todayFormatted}`;
        doc.text(subText, margin + (isContinuation ? 14 : 18), currentY + (isContinuation ? 9.5 : 12.5));

        currentY += bannerH + 3;
      };

      renderHeaderBanner(false);

      // 2. Financial KPI Summary Box (Only on First Page)
      doc.setFillColor(248, 250, 252); // Slate 50
      doc.roundedRect(margin, currentY, contentW, 13, 1.5, 1.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, currentY, contentW, 13, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);

      // Box 1: Processed Staff
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL STAFF', margin + 3, currentY + 4.5);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.text(`${filteredSlips.length} Employees`, margin + 3, currentY + 9.5);

      // Box 2: Total Basic Pay
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('BASIC SALARY', margin + 45, currentY + 4.5);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.text(`Rs. ${totalBasic.toLocaleString()}`, margin + 45, currentY + 9.5);

      // Box 3: Gross Earnings
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('GROSS EARNINGS', margin + 92, currentY + 4.5);
      doc.setTextColor(37, 99, 235); // Blue
      doc.setFontSize(9);
      doc.text(`Rs. ${totalGross.toLocaleString()}`, margin + 92, currentY + 9.5);

      // Box 4: Loan Deductions
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('LOAN RECOVERIES', margin + 142, currentY + 4.5);
      doc.setTextColor(217, 119, 6); // Amber
      doc.setFontSize(9);
      doc.text(`Rs. ${totalLoanDeductions.toLocaleString()}`, margin + 142, currentY + 9.5);

      // Box 5: Total Deductions
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL DEDUCTIONS', margin + 190, currentY + 4.5);
      doc.setTextColor(225, 29, 72); // Rose
      doc.setFontSize(9);
      doc.text(`Rs. ${totalDeductions.toLocaleString()}`, margin + 190, currentY + 9.5);

      // Box 6: Net Salary Payable (Highlight)
      doc.setFillColor(236, 253, 245); // Emerald 50
      doc.roundedRect(margin + 233, currentY + 1.2, 41, 10.5, 1, 1, 'F');
      doc.setDrawColor(16, 185, 129); // Emerald 500
      doc.setLineWidth(0.3);
      doc.roundedRect(margin + 233, currentY + 1.2, 41, 10.5, 1, 1, 'S');

      doc.setFontSize(7);
      doc.setTextColor(5, 150, 105);
      doc.text('NET SALARY PAYABLE', margin + 235, currentY + 4.5);
      doc.setFontSize(9.5);
      doc.setTextColor(4, 120, 87);
      doc.text(`Rs. ${totalNet.toLocaleString()}`, margin + 235, currentY + 9.5);

      currentY += 16;

      // 3. Table Column Layout (Total 277mm)
      const colIdx = 7;
      const colCode = 17;
      const colName = 34;
      const colDesig = 29;
      const colBranch = 21;
      const colAtt = 15;
      const colBasic = 18;
      const colAllow = 16;
      const colGross = 20;
      const colAbsLate = 17;
      const colLoan = 17;
      const colTax = 16;
      const colTotDed = 18;
      const colNet = 22;
      const colStatus = 16; // 7+17+34+29+21+15+18+16+20+17+17+16+18+22+16 = 277mm

      const renderTableHeader = (yPos: number) => {
        doc.setFillColor(241, 245, 249); // Slate 100
        doc.rect(margin, yPos, contentW, 7.5, 'F');
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.setLineWidth(0.2);
        doc.rect(margin, yPos, contentW, 7.5, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(30, 41, 59);

        let curX = margin;
        doc.text('#', curX + 2, yPos + 5);
        curX += colIdx;
        doc.text('CODE', curX + 1.5, yPos + 5);
        curX += colCode;
        doc.text('EMPLOYEE NAME', curX + 1.5, yPos + 5);
        curX += colName;
        doc.text('DESIGNATION / DEPT', curX + 1.5, yPos + 5);
        curX += colDesig;
        doc.text('BRANCH', curX + 1.5, yPos + 5);
        curX += colBranch;
        doc.text('ATT (P/A/L)', curX + 1, yPos + 5);
        curX += colAtt;
        doc.text('BASIC', curX + colBasic - 2, yPos + 5, { align: 'right' });
        curX += colBasic;
        doc.text('ALLOW/OT', curX + colAllow - 2, yPos + 5, { align: 'right' });
        curX += colAllow;
        doc.text('GROSS', curX + colGross - 2, yPos + 5, { align: 'right' });
        curX += colGross;
        doc.text('ABS/LATE', curX + colAbsLate - 2, yPos + 5, { align: 'right' });
        curX += colAbsLate;
        doc.text('LOAN CUT', curX + colLoan - 2, yPos + 5, { align: 'right' });
        curX += colLoan;
        doc.text('TAX/OTH', curX + colTax - 2, yPos + 5, { align: 'right' });
        curX += colTax;
        doc.text('TOT DED', curX + colTotDed - 2, yPos + 5, { align: 'right' });
        curX += colTotDed;
        doc.text('NET SALARY', curX + colNet - 2, yPos + 5, { align: 'right' });
        curX += colNet;
        doc.text('STATUS', curX + 2, yPos + 5);
      };

      renderTableHeader(currentY);
      currentY += 7.5;

      const rowH = 6.8;
      let pageNumber = 1;

      filteredSlips.forEach((slip, index) => {
        // Page overflow check (leaves 32mm for signatures on last page or footer)
        if (currentY + rowH > pageH - 25) {
          // Footer
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Page ${pageNumber} • HR Diagnostics Official Payroll Disbursement Summary • Confidential Accounting Report`,
            margin,
            pageH - 6
          );
          doc.text(`Printed: ${new Date().toLocaleString()}`, pageW - margin - 45, pageH - 6);

          doc.addPage('a4', 'landscape');
          pageNumber++;
          currentY = margin;

          renderHeaderBanner(true);
          renderTableHeader(currentY);
          currentY += 7.5;
        }

        // Alternating row background
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, currentY, contentW, rowH, 'F');
        }

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.12);
        doc.line(margin, currentY + rowH, margin + contentW, currentY + rowH);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(30, 41, 59);

        let curX = margin;
        // Index
        doc.text(String(index + 1), curX + 2, currentY + 4.5);
        curX += colIdx;

        // Code
        doc.setFont('courier', 'bold');
        doc.text(slip.employeeCode || '', curX + 1.5, currentY + 4.5);
        curX += colCode;

        // Name
        doc.setFont('helvetica', 'bold');
        const truncatedName =
          slip.employeeName.length > 22 ? slip.employeeName.slice(0, 20) + '..' : slip.employeeName;
        doc.text(truncatedName, curX + 1.5, currentY + 4.5);
        curX += colName;

        // Designation / Dept
        doc.setFont('helvetica', 'normal');
        const desigText = `${slip.designation || ''} (${slip.departmentName || ''})`;
        const truncatedDesig = desigText.length > 22 ? desigText.slice(0, 20) + '..' : desigText;
        doc.text(truncatedDesig, curX + 1.5, currentY + 4.5);
        curX += colDesig;

        // Branch
        const truncatedBranch =
          slip.branchName.length > 15 ? slip.branchName.slice(0, 13) + '..' : slip.branchName;
        doc.text(truncatedBranch, curX + 1.5, currentY + 4.5);
        curX += colBranch;

        // Att (P/A/L)
        doc.setFont('courier', 'normal');
        doc.text(`${slip.presentDays}P/${slip.absentDays}A/${slip.lateDays}L`, curX + 1, currentY + 4.5);
        curX += colAtt;

        // Basic
        doc.setFont('helvetica', 'normal');
        doc.text(slip.basicSalary.toLocaleString(), curX + colBasic - 2, currentY + 4.5, { align: 'right' });
        curX += colBasic;

        // Allowances & OT
        const allowOtVal = (slip.allowances || 0) + (slip.overtimePay || 0) + (slip.bonusAmount || 0);
        doc.text(allowOtVal.toLocaleString(), curX + colAllow - 2, currentY + 4.5, { align: 'right' });
        curX += colAllow;

        // Gross
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text(slip.grossEarnings.toLocaleString(), curX + colGross - 2, currentY + 4.5, { align: 'right' });
        curX += colGross;

        // Abs / Late Cut
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(225, 29, 72);
        const absLateCut = (slip.lateDeduction || 0) + (slip.absentDeduction || 0);
        doc.text(
          absLateCut > 0 ? `-${absLateCut.toLocaleString()}` : '0',
          curX + colAbsLate - 2,
          currentY + 4.5,
          { align: 'right' }
        );
        curX += colAbsLate;

        // Loan Cut
        doc.setTextColor(217, 119, 6);
        doc.text(
          slip.advanceLoanDeduction > 0 ? `-${slip.advanceLoanDeduction.toLocaleString()}` : '0',
          curX + colLoan - 2,
          currentY + 4.5,
          { align: 'right' }
        );
        curX += colLoan;

        // Tax / Other
        doc.setTextColor(100, 116, 139);
        const taxOther = (slip.taxDeduction || 0) + (slip.otherDeductions || 0);
        doc.text(
          taxOther > 0 ? `-${taxOther.toLocaleString()}` : '0',
          curX + colTax - 2,
          currentY + 4.5,
          { align: 'right' }
        );
        curX += colTax;

        // Total Deductions
        doc.setTextColor(225, 29, 72);
        doc.setFont('helvetica', 'bold');
        doc.text(
          slip.totalDeductions > 0 ? `-${slip.totalDeductions.toLocaleString()}` : '0',
          curX + colTotDed - 2,
          currentY + 4.5,
          { align: 'right' }
        );
        curX += colTotDed;

        // Net Salary
        doc.setTextColor(5, 150, 105);
        doc.setFont('helvetica', 'bold');
        doc.text(slip.netSalary.toLocaleString(), curX + colNet - 2, currentY + 4.5, { align: 'right' });
        curX += colNet;

        // Status
        doc.setFont('helvetica', 'normal');
        if (slip.paymentStatus === 'Paid') {
          doc.setTextColor(5, 150, 105);
          doc.text('Paid', curX + 2, currentY + 4.5);
        } else {
          doc.setTextColor(217, 119, 6);
          doc.text(slip.paymentStatus || 'Unpaid', curX + 2, currentY + 4.5);
        }

        currentY += rowH;
      });

      // 4. Totals Summary Row
      // Check if room for totals row
      if (currentY + 8 > pageH - 22) {
        doc.addPage('a4', 'landscape');
        pageNumber++;
        currentY = margin;
        renderHeaderBanner(true);
      }

      doc.setFillColor(226, 232, 240); // Slate 200
      doc.rect(margin, currentY, contentW, 7.5, 'F');
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.rect(margin, currentY, contentW, 7.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);

      let curTotX = margin;
      doc.text('TOTALS', curTotX + 2, currentY + 5);
      curTotX += colIdx + colCode;
      doc.text(`${filteredSlips.length} Employees Processed`, curTotX + 1.5, currentY + 5);
      curTotX += colName + colDesig + colBranch + colAtt;

      // Basic
      doc.text(totalBasic.toLocaleString(), curTotX + colBasic - 2, currentY + 5, { align: 'right' });
      curTotX += colBasic;

      // Allowances / OT
      doc.text(totalAllowancesAndOT.toLocaleString(), curTotX + colAllow - 2, currentY + 5, {
        align: 'right',
      });
      curTotX += colAllow;

      // Gross
      doc.setTextColor(37, 99, 235);
      doc.text(totalGross.toLocaleString(), curTotX + colGross - 2, currentY + 5, { align: 'right' });
      curTotX += colGross;

      // Abs / Late
      doc.setTextColor(225, 29, 72);
      doc.text(`-${totalAbsentLateCuts.toLocaleString()}`, curTotX + colAbsLate - 2, currentY + 5, {
        align: 'right',
      });
      curTotX += colAbsLate;

      // Loan Cut
      doc.setTextColor(217, 119, 6);
      doc.text(`-${totalLoanDeductions.toLocaleString()}`, curTotX + colLoan - 2, currentY + 5, {
        align: 'right',
      });
      curTotX += colLoan;

      // Tax / Other
      doc.setTextColor(100, 116, 139);
      doc.text(`-${totalTaxAndOther.toLocaleString()}`, curTotX + colTax - 2, currentY + 5, {
        align: 'right',
      });
      curTotX += colTax;

      // Total Deductions
      doc.setTextColor(225, 29, 72);
      doc.text(`-${totalDeductions.toLocaleString()}`, curTotX + colTotDed - 2, currentY + 5, {
        align: 'right',
      });
      curTotX += colTotDed;

      // Net Salary Total
      doc.setTextColor(4, 120, 87);
      doc.text(`Rs. ${totalNet.toLocaleString()}`, curTotX + colNet - 2, currentY + 5, {
        align: 'right',
      });

      currentY += 12;

      // 5. Sign-off Blocks (Check if space exists, otherwise new page)
      if (currentY + 20 > pageH - 12) {
        doc.addPage('a4', 'landscape');
        pageNumber++;
        currentY = margin + 10;
      }

      const signBoxW = 75;
      const signBoxH = 16;
      const signGap = (contentW - signBoxW * 3) / 2;

      // Box 1: Prepared By
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, currentY, signBoxW, signBoxH, 1, 1, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('PREPARED BY: HR & ACCOUNTS', margin + 3, currentY + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text('Signature & Date: ____________________', margin + 3, currentY + 12.5);

      // Box 2: Audited By
      doc.roundedRect(margin + signBoxW + signGap, currentY, signBoxW, signBoxH, 1, 1, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('VERIFIED BY: INTERNAL AUDIT', margin + signBoxW + signGap + 3, currentY + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text('Signature & Date: ____________________', margin + signBoxW + signGap + 3, currentY + 12.5);

      // Box 3: Approved By
      doc.roundedRect(margin + (signBoxW + signGap) * 2, currentY, signBoxW, signBoxH, 1, 1, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('APPROVED BY: CFO / SUPER ADMIN', margin + (signBoxW + signGap) * 2 + 3, currentY + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text('Signature & Date: ____________________', margin + (signBoxW + signGap) * 2 + 3, currentY + 12.5);

      // Final Footer
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${pageNumber} • HR Diagnostics Official Payroll Disbursement Summary • Confidential Accounting Report`,
        margin,
        pageH - 6
      );
      doc.text(`Printed: ${new Date().toLocaleString()}`, pageW - margin - 45, pageH - 6);

      doc.save(`HRD_Payroll_Accounting_Summary_${selectedMonth}_${Date.now().toString().slice(-4)}.pdf`);
      showToast('Accounting PDF Payroll report generated and downloaded.');
    } catch (err) {
      console.error('Failed to generate payroll PDF:', err);
      alert('Error generating PDF report. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 shadow-2xl border border-teal-500/30 text-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Monthly Hospital Payroll & Accounting Engine
              </h3>
              <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Accounting Ready
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Automated calculation with Biometric attendance, late penalties, overtime pay, and loan deductions.
            </p>
          </div>
        </div>

        {/* Action Buttons: Run Engine, Export CSV, Download PDF */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredSlips.length === 0}
            title="Download complete RFC-4180 CSV with bank accounts and deductions for Excel / accounting"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-xs transition disabled:opacity-50 cursor-pointer dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </button>

          {/* Download Accounting PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF || filteredSlips.length === 0}
            title="Download official landscape A4 accounting summary PDF with sign-off blocks and KPI summary"
            className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 text-sm font-bold text-blue-800 shadow-xs transition disabled:opacity-50 cursor-pointer dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
          >
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>{isGeneratingPDF ? 'Generating...' : 'Download PDF'}</span>
            <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </button>

          {/* Run Payroll Engine */}
          <button
            type="button"
            onClick={handleGeneratePayroll}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isGenerating ? 'Computing...' : 'Run Payroll Engine'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                reloadSlips(e.target.value, selectedBranchFilter);
              }}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            />
          </div>

          {/* Branch Filter */}
          {activeBranchId === 'all' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facility:</span>
              <select
                value={selectedBranchFilter}
                onChange={(e) => {
                  setSelectedBranchFilter(e.target.value);
                  reloadSlips(selectedMonth, e.target.value);
                }}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid Only</option>
              <option value="Unpaid">Unpaid Only</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px] sm:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff name, code, dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Financial Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Processed Staff</span>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {filteredSlips.length} employees
          </h4>
          <p className="text-xs text-slate-400 mt-1">{selectedMonth}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Base Pay</span>
          <h4 className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
            Rs. {totalBasic.toLocaleString()}
          </h4>
          <p className="text-xs text-slate-400 mt-1">Contract base</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Gross Earnings</span>
          <h4 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            Rs. {totalGross.toLocaleString()}
          </h4>
          <p className="text-xs text-slate-400 mt-1">With allowances & OT</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Loan Deductions</span>
          <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            Rs. {totalLoanDeductions.toLocaleString()}
          </h4>
          <p className="text-xs text-amber-500 mt-1">Advance recoveries</p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Deductions</span>
          <h4 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            Rs. {totalDeductions.toLocaleString()}
          </h4>
          <p className="text-xs text-rose-500 mt-1">Absents, lates, loans, tax</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4.5 dark:border-emerald-800/80 dark:bg-emerald-950/30 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
            Net Salary Payable
          </span>
          <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            Rs. {totalNet.toLocaleString()}
          </h4>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1 font-semibold">
            Bank transfer total
          </p>
        </div>
      </div>

      {/* Salary Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs">
        {filteredSlips.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <DollarSign className="h-12 w-12 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-500">
              {slips.length === 0 ? (
                <>
                  No salary slips generated yet for <strong>{selectedMonth}</strong>.
                </>
              ) : (
                <>No employee records matching your selected filter or search criteria.</>
              )}
            </p>
            {slips.length === 0 ? (
              <button
                type="button"
                onClick={handleGeneratePayroll}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-700 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" /> Run Payroll for this Month
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPaymentStatusFilter('all');
                  setSelectedBranchFilter(activeBranchId);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-xs tracking-wider dark:bg-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-4 px-4">Employee</th>
                  <th className="py-4 px-4 text-center">Attendance (P / A / L)</th>
                  <th className="py-4 px-4 text-right">Basic Pay</th>
                  <th className="py-4 px-4 text-right">Gross Pay</th>
                  <th className="py-4 px-4 text-right text-rose-600">Late / Absent</th>
                  <th className="py-4 px-4 text-right text-amber-600">Loan Cut</th>
                  <th className="py-4 px-4 text-right font-black">Net Salary</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-right">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
                {filteredSlips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{slip.employeeName}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {slip.employeeCode} · {slip.designation} · {slip.branchName}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-sm">
                      <span className="text-emerald-600 font-bold">{slip.presentDays}P</span> /{' '}
                      <span className="text-rose-600 font-bold">{slip.absentDays}A</span> /{' '}
                      <span className="text-amber-600 font-bold">{slip.lateDays}L</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">Rs. {slip.basicSalary.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                      Rs. {slip.grossEarnings.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                      -Rs. {(slip.lateDeduction + slip.absentDeduction).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-600 dark:text-amber-400">
                      {slip.advanceLoanDeduction > 0 ? `-Rs. ${slip.advanceLoanDeduction.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                      Rs. {slip.netSalary.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={slip.paymentStatus}
                        onChange={(e) => handleStatusChange(slip, e.target.value as any)}
                        className={`rounded-xl px-2.5 py-1 text-xs font-bold border cursor-pointer ${
                          slip.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                        }`}
                      >
                        <option value="Unpaid">Unpaid</option>
                        <option value="Paid">Paid & Cleared</option>
                        <option value="On Hold">On Hold</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedSlipForPrint(slip)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" /> View Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                <tr>
                  <td className="py-4 px-4">
                    <span className="uppercase text-xs tracking-wider text-slate-600 dark:text-slate-300">
                      Consolidated Totals
                    </span>
                    <span className="ml-2 font-mono text-xs text-blue-600 dark:text-blue-400">
                      ({filteredSlips.length} Staff)
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-slate-500 text-xs font-mono">—</td>
                  <td className="py-4 px-4 text-right font-mono">Rs. {totalBasic.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right font-mono text-blue-600 dark:text-blue-400">
                    Rs. {totalGross.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                    -Rs. {totalAbsentLateCuts.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-amber-600 dark:text-amber-400">
                    {totalLoanDeductions > 0 ? `-Rs. ${totalLoanDeductions.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                    Rs. {totalNet.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-center text-xs text-slate-600 dark:text-slate-300 font-semibold">
                    {filteredSlips.filter((s) => s.paymentStatus === 'Paid').length} Paid /{' '}
                    {filteredSlips.filter((s) => s.paymentStatus !== 'Paid').length} Unpaid
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-bold underline cursor-pointer"
                    >
                      Export PDF
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Printable Payslip Modal */}
      {selectedSlipForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-base font-black tracking-tight">HR DIAGNOSTICS</h3>
                <p className="text-xs text-slate-500">Official Monthly Salary Slip ({selectedSlipForPrint.payrollMonth})</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlipForPrint(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Employee Details Header */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-slate-400 text-[10px]">Employee Name</p>
                <p className="font-bold">{selectedSlipForPrint.employeeName}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Biometric ID / Code</p>
                <p className="font-mono font-bold">{selectedSlipForPrint.employeeCode}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Designation & Dept</p>
                <p>{selectedSlipForPrint.designation} ({selectedSlipForPrint.departmentName})</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Branch</p>
                <p>{selectedSlipForPrint.branchName}</p>
              </div>
            </div>

            {/* Attendance Snapshot */}
            <div className="flex justify-between items-center text-xs px-2 py-1.5 bg-teal-50/50 dark:bg-teal-950/20 rounded-lg border border-teal-100 dark:border-teal-900 font-mono">
              <span>Present: <strong>{selectedSlipForPrint.presentDays}</strong></span>
              <span>Absent: <strong>{selectedSlipForPrint.absentDays}</strong></span>
              <span>Late: <strong>{selectedSlipForPrint.lateDays}</strong></span>
              <span>OT Hours: <strong>{selectedSlipForPrint.overtimeHours} hrs</strong></span>
            </div>

            {/* Earnings & Deductions Split */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 border-r pr-3 border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-500 uppercase text-[10px]">Earnings (PKR)</p>
                <div className="flex justify-between">
                  <span>Basic Salary:</span>
                  <span className="font-mono">Rs. {selectedSlipForPrint.basicSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Allowances:</span>
                  <span className="font-mono">Rs. {selectedSlipForPrint.allowances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overtime Pay:</span>
                  <span className="font-mono">Rs. {selectedSlipForPrint.overtimePay.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold text-blue-600">
                  <span>Gross:</span>
                  <span className="font-mono">Rs. {selectedSlipForPrint.grossEarnings.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="font-bold text-slate-500 uppercase text-[10px]">Deductions (PKR)</p>
                <div className="flex justify-between">
                  <span>Absent Cut:</span>
                  <span className="font-mono text-rose-500">Rs. {selectedSlipForPrint.absentDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Late Fine:</span>
                  <span className="font-mono text-rose-500">Rs. {selectedSlipForPrint.lateDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Advance Loan:</span>
                  <span className="font-mono text-amber-500">Rs. {selectedSlipForPrint.advanceLoanDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span className="font-mono">Rs. {selectedSlipForPrint.taxDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold text-rose-600">
                  <span>Total Deductions:</span>
                  <span className="font-mono">Rs. {selectedSlipForPrint.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Net Salary Highlight */}
            <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl">
              <span className="font-black text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Net Salary Payable</span>
              <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                Rs. {selectedSlipForPrint.netSalary.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Salary Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
