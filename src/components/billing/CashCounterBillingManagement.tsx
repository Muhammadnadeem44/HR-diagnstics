import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  DollarSign,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sliders,
  X,
  Check,
  RotateCcw,
  Phone,
  Coins,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  UserPlus,
  Edit2,
  Download,
  Activity,
  Stethoscope,
  Heart,
  Eye,
  AlertTriangle,
  FileCode,
  Tag,
  Hash,
  Share2,
  Volume2,
  Tv,
  Power,
  Bell,
  Home,
  Users,
  Settings as SettingsIcon,
  HelpCircle,
  Lock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  ClinicPatient,
  ClinicDoctor,
  ClinicServiceItem,
  ClinicInvoice,
  ClinicVisit,
  InvoiceServiceLine,
  PaymentSplitEntry,
  PaymentMethod,
  InvoicePaymentStatus,
  CashShiftSession,
  CashExpenseRecord,
  ClinicServiceCategory,
  RadiologyStudyReport,
  ClinicToken,
  TokenStatus,
} from '../../types';
import { StorageService } from '../../services/storage';
import { BillingReceiptModal } from './BillingReceiptModal';
import { TokenSlipPrintModal } from './TokenSlipPrintModal';
import { PatientQueueDisplayModal } from './PatientQueueDisplayModal';

export const CashCounterBillingManagement: React.FC = () => {
  // Navigation Sidebar Views
  const [sidebarView, setSidebarView] = useState<
    | 'pos'
    | 'new_patient'
    | 'existing_patient'
    | 'services'
    | 'ultrasound'
    | 'xray'
    | 'lab'
    | 'pending_bills'
    | 'reports'
    | 'typist_queue'
    | 'doctor_queue'
    | 'settings'
  >('pos');

  // Master Data
  const [invoices, setInvoices] = useState<ClinicInvoice[]>([]);
  const [patients, setPatients] = useState<ClinicPatient[]>([]);
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [services, setServices] = useState<ClinicServiceItem[]>([]);
  const [visits, setVisits] = useState<ClinicVisit[]>([]);
  const [shifts, setShifts] = useState<CashShiftSession[]>([]);
  const [expenses, setExpenses] = useState<CashExpenseRecord[]>([]);
  const [tokens, setTokens] = useState<ClinicToken[]>([]);
  const [activeShift, setActiveShift] = useState<CashShiftSession | null>(null);

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // POS State & Cart matching Reference Image
  const [selectedCategory, setSelectedCategory] = useState<string>('Ultrasound');
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>('');
  const [invoiceLines, setInvoiceLines] = useState<InvoiceServiceLine[]>([
    {
      serviceId: 'SRV-US-01',
      serviceCode: 'US-ABD',
      serviceName: 'Whole Abdomen Ultrasound',
      category: 'Ultrasound',
      quantity: 1,
      unitPrice: 2500,
      discountType: 'fixed',
      discountValue: 0,
      discountAmount: 0,
      taxPercentage: 0,
      taxAmount: 0,
      netAmount: 2500,
    },
    {
      serviceId: 'SRV-XR-01',
      serviceCode: 'XR-CHEST-PA',
      serviceName: 'Chest X-Ray PA',
      category: 'X-Ray',
      quantity: 1,
      unitPrice: 1200,
      discountType: 'fixed',
      discountValue: 0,
      discountAmount: 0,
      taxPercentage: 0,
      taxAmount: 0,
      netAmount: 1200,
    },
    {
      serviceId: 'SRV-LAB-01',
      serviceCode: 'LAB-CBC',
      serviceName: 'CBC',
      category: 'Laboratory Tests',
      quantity: 1,
      unitPrice: 800,
      discountType: 'fixed',
      discountValue: 0,
      discountAmount: 0,
      taxPercentage: 0,
      taxAmount: 0,
      netAmount: 800,
    },
  ]);

  // Payment & Tender State
  const [paidAmountInput, setPaidAmountInput] = useState<string>('4500');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentSuccessReceipt, setPaymentSuccessReceipt] = useState<string | null>('RCP-2026-1105-018');
  const [lastGeneratedInvoice, setLastGeneratedInvoice] = useState<ClinicInvoice | null>(null);
  const [lastGeneratedToken, setLastGeneratedToken] = useState<ClinicToken | null>(null);

  // New Patient Form (Left Column matching image)
  const [newPatientForm, setNewPatientForm] = useState({
    name: 'Ayesha Khan',
    phone: '0300-1234567',
    cnic: '35201-9876543-2',
    gender: 'Female',
    age: 28,
    dob: '1998-05-12',
    address: 'Gulberg III, Lahore',
    fatherHusbandName: 'Tariq Khan',
  });

  // Active Selected / Registered Patient for Real-Time Linking
  const [selectedPatient, setSelectedPatient] = useState<ClinicPatient | null>(null);

  // Current Active Token in Queue
  const [currentQueueToken, setCurrentQueueToken] = useState<ClinicToken>({
    id: 'tok_seed_023',
    tokenNumber: 'T-023',
    tokenDate: '2026-11-05',
    sequenceNumber: 23,
    department: 'Ultrasound',
    serviceName: 'Whole Abdomen Ultrasound',
    patientId: 'P-10452',
    patientMRN: 'MR-5712298',
    patientName: 'Ayesha Khan',
    patientGender: 'Female',
    patientAge: 28,
    patientPhone: '0300-1234567',
    invoiceId: 'inv_seed_023',
    invoiceNumber: 'INV-2026-1105-023',
    counterNumber: 'Counter 1',
    status: 'Called',
    calledAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    estimatedWaitMinutes: 5,
    waitingPosition: 1,
  });

  // Modals
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [isTokenPrintModalOpen, setIsTokenPrintModalOpen] = useState<boolean>(false);
  const [isTvDisplayModalOpen, setIsTvDisplayModalOpen] = useState<boolean>(false);
  const [isDailyClosingModalOpen, setIsDailyClosingModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Voice Announcement Chime
  const announceTokenAudio = (tokenNumber: string, counter: string) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const text = `Token ${tokenNumber}, please proceed to ${counter}`;
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.9;
        window.speechSynthesis.speak(utter);
        showToast(`Announcing: ${tokenNumber} to ${counter}`);
      } catch {}
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Live Clock Interval
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 1. Initial Load from Local Registries
  useEffect(() => {
    setPatients(StorageService.getClinicPatients());
    setDoctors(StorageService.getClinicDoctors());
    setServices(StorageService.getClinicServices());
    setVisits(StorageService.getClinicVisits());
    setInvoices(StorageService.getClinicInvoices());
    setTokens(StorageService.getClinicTokens());
    setShifts(StorageService.getCashShifts());
    setExpenses(StorageService.getCashExpenses());

    // Active shift
    const openShift = StorageService.getActiveCashShift('br_lhr_gulberg');
    if (openShift) {
      setActiveShift(openShift);
    } else {
      const allShifts = StorageService.getCashShifts();
      if (allShifts.length > 0) setActiveShift(allShifts[0]);
    }
  }, []);

  // 2. Real-time Firestore Sync for Invoices, Tokens, and Patients
  useEffect(() => {
    const invoicesRef = collection(db, 'clinic_invoices');
    const unsubInvoices = onSnapshot(
      query(invoicesRef, orderBy('createdAt', 'desc')),
      (snapshot) => {
        if (!snapshot.empty) {
          const remote: ClinicInvoice[] = [];
          snapshot.forEach((docSnap) => remote.push(docSnap.data() as ClinicInvoice));
          setInvoices(remote);
        }
      },
      (err) => console.warn('Invoices firestore sync fallback:', err)
    );

    const tokensRef = collection(db, 'clinic_tokens');
    const unsubTokens = onSnapshot(
      query(tokensRef, orderBy('createdAt', 'desc')),
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteTokens: ClinicToken[] = [];
          snapshot.forEach((docSnap) => remoteTokens.push(docSnap.data() as ClinicToken));
          setTokens(remoteTokens);
          if (remoteTokens.length > 0) {
            const called = remoteTokens.find((t) => t.status === 'Called') || remoteTokens[0];
            setCurrentQueueToken(called);
          }
        }
      },
      (err) => console.warn('Tokens firestore sync fallback:', err)
    );

    const patientsRef = collection(db, 'clinic_patients');
    const unsubPatients = onSnapshot(
      patientsRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const remotePatients: ClinicPatient[] = [];
          snapshot.forEach((docSnap) => remotePatients.push(docSnap.data() as ClinicPatient));
          setPatients(remotePatients);
        }
      },
      (err) => console.warn('Patients firestore sync fallback:', err)
    );

    // Cross-Tab & Broadcast Real-Time Sync
    const handleSync = () => {
      setInvoices(StorageService.getClinicInvoices());
      setTokens(StorageService.getClinicTokens());
      setPatients(StorageService.getClinicPatients());
      setShifts(StorageService.getCashShifts());
      setExpenses(StorageService.getCashExpenses());
      setVisits(StorageService.getClinicVisits());
    };
    window.addEventListener('hr-cloud-sync-update', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      unsubInvoices();
      unsubTokens();
      unsubPatients();
      window.removeEventListener('hr-cloud-sync-update', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Financial Calculations
  const grossSubtotal = useMemo(
    () => invoiceLines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0),
    [invoiceLines]
  );

  const grandTotal = grossSubtotal;
  const amountPaidNum = Number(paidAmountInput) || 0;
  const balanceRemaining = Math.max(0, grandTotal - amountPaidNum);

  // Services Catalog Filter
  const filteredCatalogServices = useMemo(() => {
    return services.filter((srv) => {
      const matchCat =
        selectedCategory === 'All' ||
        srv.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        (selectedCategory === 'Ultrasound' && srv.category === 'Ultrasound') ||
        (selectedCategory === 'X-Ray' && srv.category === 'X-Ray') ||
        (selectedCategory === 'Laboratory' && srv.category === 'Laboratory Tests') ||
        (selectedCategory === 'Consultation' && srv.category === 'Doctor Consultation');
      const q = serviceSearchQuery.toLowerCase();
      const matchSearch =
        !serviceSearchQuery ||
        srv.name.toLowerCase().includes(q) ||
        srv.code.toLowerCase().includes(q);
      return matchCat && matchSearch && srv.isActive;
    });
  }, [services, selectedCategory, serviceSearchQuery]);

  // Cart operations
  const handleAddServiceToCart = (srv: ClinicServiceItem) => {
    const itemPrice = srv.pricePKR ?? srv.standardFee ?? 0;
    setInvoiceLines((prev) => {
      const existing = prev.find((l) => l.serviceId === srv.id);
      if (existing) {
        return prev.map((l) =>
          l.serviceId === srv.id
            ? { ...l, quantity: l.quantity + 1, netAmount: (l.quantity + 1) * l.unitPrice }
            : l
        );
      }
      return [
        ...prev,
        {
          serviceId: srv.id,
          serviceCode: srv.code,
          serviceName: srv.name,
          category: srv.category,
          quantity: 1,
          unitPrice: itemPrice,
          discountType: 'fixed',
          discountValue: 0,
          discountAmount: 0,
          taxPercentage: 0,
          taxAmount: 0,
          netAmount: itemPrice,
        },
      ];
    });
    setPaidAmountInput(String(grandTotal + itemPrice));
    showToast(`Added ${srv.name}`);
  };

  const handleRemoveLine = (idx: number) => {
    setInvoiceLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClearCart = () => {
    setInvoiceLines([]);
    setPaidAmountInput('0');
    setPaymentSuccessReceipt(null);
  };

  // 3. Register Patient & Quick Book Action
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientForm.name || !newPatientForm.phone) {
      alert('Patient name and phone are required.');
      return;
    }

    const newPat: ClinicPatient = {
      id: `P-${Math.floor(10000 + Math.random() * 90000)}`,
      mrNumber: `MR-${Math.floor(5000000 + Math.random() * 900000)}`,
      name: newPatientForm.name,
      phone: newPatientForm.phone,
      cnic: newPatientForm.cnic,
      gender: newPatientForm.gender as 'Male' | 'Female',
      age: Number(newPatientForm.age) || 28,
      dob: newPatientForm.dob,
      address: newPatientForm.address,
      fatherHusbandName: newPatientForm.fatherHusbandName,
      registrationDate: new Date().toISOString().split('T')[0],
      branchId: 'br_lhr_gulberg',
      branchName: 'Lahore Gulberg Diagnostic Hub',
      totalVisits: 1,
      totalSpentPKR: 0,
    };

    StorageService.saveClinicPatient(newPat);
    setPatients((prev) => [newPat, ...prev.filter((p) => p.id !== newPat.id)]);
    setSelectedPatient(newPat);
    try {
      await setDoc(doc(db, 'clinic_patients', newPat.id), {
        ...newPat,
        _updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Firestore patient write warning:', e);
    }
    showToast(`Registered Patient: ${newPat.name} (MRN: ${newPat.mrNumber})`);
  };

  // 4. Save Invoice & Automatically Generate Sequential Token
  const handleSaveInvoiceAndToken = async () => {
    if (invoiceLines.length === 0) {
      alert('Invoice cart is empty. Please add services.');
      return;
    }

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0];
    const invNum = `INV-${dateStr.replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`;
    const recNum = `RCP-${dateStr.replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`;

    // Determine primary department for token
    const primaryDept = invoiceLines.some((l) => l.category === 'Ultrasound')
      ? 'Ultrasound'
      : invoiceLines.some((l) => l.category === 'X-Ray')
      ? 'X-Ray'
      : invoiceLines.some((l) => l.category === 'Laboratory Tests')
      ? 'Laboratory'
      : 'Consultation';

    // Generate Token
    const nextTokenMeta = StorageService.getNextTokenNumber(primaryDept, dateStr);

    let activePatient = selectedPatient;
    if (!activePatient) {
      activePatient = {
        id: `P-${Math.floor(10000 + Math.random() * 90000)}`,
        mrNumber: `MR-${Math.floor(5000000 + Math.random() * 900000)}`,
        name: newPatientForm.name || 'Walk-in Patient',
        phone: newPatientForm.phone || '0300-1234567',
        cnic: newPatientForm.cnic || '',
        gender: (newPatientForm.gender as 'Male' | 'Female') || 'Female',
        age: Number(newPatientForm.age) || 28,
        dob: newPatientForm.dob || '1998-05-12',
        address: newPatientForm.address || 'Lahore',
        fatherHusbandName: newPatientForm.fatherHusbandName || '',
        registrationDate: dateStr,
        branchId: 'br_lhr_gulberg',
        branchName: 'Lahore Gulberg Diagnostic Hub',
        totalVisits: 1,
        totalSpentPKR: 0,
      };
      StorageService.saveClinicPatient(activePatient);
      setPatients((prev) => [activePatient!, ...prev.filter((p) => p.id !== activePatient!.id)]);
      setSelectedPatient(activePatient);
      try {
        await setDoc(doc(db, 'clinic_patients', activePatient.id), {
          ...activePatient,
          _updatedAt: Date.now(),
        });
      } catch {}
    }

    const patientDisplayName = activePatient.name || activePatient.fullName || 'Walk-in Patient';

    const newToken: ClinicToken = {
      id: `tok_${Date.now()}`,
      tokenNumber: nextTokenMeta.tokenNumber,
      tokenDate: dateStr,
      sequenceNumber: nextTokenMeta.sequenceNumber,
      department: primaryDept as any,
      serviceName: invoiceLines[0]?.serviceName || 'Diagnostic Investigation',
      patientId: activePatient.id,
      patientMRN: activePatient.mrNumber,
      patientName: patientDisplayName,
      patientGender: activePatient.gender,
      patientAge: activePatient.age,
      patientPhone: activePatient.phone,
      invoiceId: `inv_${Date.now()}`,
      invoiceNumber: invNum,
      counterNumber: primaryDept === 'Ultrasound' ? 'Counter 1' : primaryDept === 'X-Ray' ? 'Counter 2' : 'Counter 3',
      status: 'Waiting',
      createdAt: timestamp,
      estimatedWaitMinutes: 10,
      waitingPosition: tokens.filter((t) => t.status === 'Waiting').length + 1,
    };

    StorageService.saveClinicToken(newToken);
    setTokens((prev) => [newToken, ...prev]);
    setLastGeneratedToken(newToken);
    setCurrentQueueToken(newToken);

    // Save Invoice
    const newInvoice: ClinicInvoice = {
      id: newToken.invoiceId,
      invoiceNumber: invNum,
      receiptNumber: recNum,
      branchId: 'br_lhr_gulberg',
      branchName: 'Lahore Gulberg Diagnostic Hub',
      counterName: 'Counter 1',
      patientId: activePatient.id,
      patientMRN: activePatient.mrNumber,
      patientName: patientDisplayName,
      patientPhone: activePatient.phone || '0300-1234567',
      patientAge: activePatient.age || 28,
      patientGender: activePatient.gender || 'Female',
      patientCnic: activePatient.cnic || newPatientForm.cnic,
      items: invoiceLines,
      subtotal: grossSubtotal,
      totalDiscount: 0,
      totalTax: 0,
      grossTotal: grandTotal,
      netPayable: grandTotal,
      paidAmount: amountPaidNum,
      balanceDue: balanceRemaining,
      paymentStatus: amountPaidNum >= grandTotal ? 'Fully Paid' : 'Partially Paid',
      payments: [
        {
          method: selectedPaymentMethod,
          amount: amountPaidNum,
          timestamp,
        },
      ],
      cashierId: 'usr_nadeem',
      cashierName: 'Mr. Nadeem Sikandar',
      createdAt: timestamp,
      reprintCount: 0,
      isCancelled: false,
      tokenId: newToken.id,
      tokenNumber: newToken.tokenNumber,
    };

    StorageService.saveClinicInvoice(newInvoice);
    setInvoices((prev) => [newInvoice, ...prev]);
    setLastGeneratedInvoice(newInvoice);
    setPaymentSuccessReceipt(recNum);

    // Save Clinic Visit record to link patient history
    const newVisit: ClinicVisit = {
      id: `vis_${Date.now()}`,
      visitNumber: `VIS-${dateStr.replace(/-/g, '')}-${nextTokenMeta.sequenceNumber}`,
      visitDate: dateStr,
      patientId: activePatient.id,
      patientMRN: activePatient.mrNumber,
      patientName: patientDisplayName,
      doctorId: 'DOC-101',
      doctorName: 'Dr. Tariq Mahmood',
      invoiceId: newInvoice.id,
      invoiceNumber: invNum,
      services: invoiceLines,
      netAmount: grandTotal,
      paidAmount: amountPaidNum,
      reportStatus: 'In Progress',
      clinicalNotes: `Token ${newToken.tokenNumber} issued at Cash Counter.`,
      createdAt: timestamp,
    };
    StorageService.saveClinicVisit(newVisit);

    // Save to Firestore
    try {
      await setDoc(doc(db, 'clinic_invoices', newInvoice.id), {
        ...newInvoice,
        _updatedAt: Date.now(),
      });
      await setDoc(doc(db, 'clinic_tokens', newToken.id), {
        ...newToken,
        _updatedAt: Date.now(),
      });
      await setDoc(doc(db, 'clinic_visits', newVisit.id), {
        ...newVisit,
        _updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Firestore write warning:', e);
    }

    // Auto-create study in Radiology if Ultrasound/X-Ray is present
    if (primaryDept === 'Ultrasound' || primaryDept === 'X-Ray') {
      const newStudy: RadiologyStudyReport = {
        id: `rad_std_${Date.now()}`,
        studyId: `RAD-${dateStr.replace(/-/g, '')}-${nextTokenMeta.sequenceNumber}`,
        invoiceId: newInvoice.id,
        invoiceNumber: invNum,
        patientId: activePatient.id,
        patientMRN: activePatient.mrNumber,
        patientName: patientDisplayName,
        age: activePatient.age || 28,
        gender: (activePatient.gender as any) || 'Female',
        contactNumber: activePatient.phone || '0300-1234567',
        examinationDate: dateStr,
        modality: primaryDept as any,
        examinationType: invoiceLines[0]?.serviceName || 'Whole Abdomen Ultrasound',
        referringDoctor: 'Dr. Tariq Mahmood',
        reportingDoctorId: 'DOC-AHSAN-RAZA',
        reportingDoctorName: 'Dr. Ahsan Raza',
        reportingDoctorQualification: 'MBBS, FCPS (Radiology)',
        reportingDoctorRegNo: '74231-PMC',
        status: 'Requested',
        reportingMode: 'template',
        clinicalHistory: 'Routine diagnostic evaluation.',
        impression: 'Normal Study.',
        structuredFindings: {},
        freeFormContent: '',
        attachedImages: [],
        version: 1,
        versionHistory: [],
        isDelivered: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      StorageService.saveRadiologyStudy(newStudy);
      try {
        await setDoc(doc(db, 'radiology_studies', newStudy.id), {
          ...newStudy,
          _updatedAt: Date.now(),
        });
      } catch {}
    }

    // Auto-execute laboratory tests if included
    const labLines = invoiceLines.filter((l) => l.category === 'Laboratory Tests');
    if (labLines.length > 0) {
      const protocols = StorageService.getLabTestProtocols();
      labLines.forEach((line) => {
        const proto = protocols.find(
          (p) =>
            p.testName.toLowerCase().includes(line.serviceName.toLowerCase()) ||
            line.serviceName.toLowerCase().includes(p.testName.toLowerCase())
        );
        if (proto) {
          try {
            StorageService.executeLabTestRun({
              protocolId: proto.id,
              testCount: line.quantity,
              branchId: 'br_lhr_gulberg',
              branchName: 'Lahore Gulberg Diagnostic Hub',
              executedByUserId: 'usr_nadeem',
              executedByUserName: 'Mr. Nadeem Sikandar',
              remarks: `POS Invoice: ${invNum} for ${patientDisplayName}`,
            });
          } catch (e) {
            console.warn('Auto FEFO lab deduction note:', e);
          }
        }
      });
    }

    showToast(`Invoice ${invNum} Generated! Token Assigned: ${newToken.tokenNumber}`);
    announceTokenAudio(newToken.tokenNumber, newToken.counterNumber);
  };

  // Next Token Call
  const handleCallNextToken = async () => {
    const nextWaiting = tokens.find((t) => t.status === 'Waiting');
    if (nextWaiting) {
      const updated: ClinicToken = {
        ...nextWaiting,
        status: 'Called',
        calledAt: new Date().toISOString(),
      };
      StorageService.saveClinicToken(updated);
      setTokens((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setCurrentQueueToken(updated);
      announceTokenAudio(updated.tokenNumber, updated.counterNumber);
      try {
        await setDoc(doc(db, 'clinic_tokens', updated.id), {
          ...updated,
          _updatedAt: Date.now(),
        });
      } catch {}
    } else {
      announceTokenAudio(currentQueueToken.tokenNumber, currentQueueToken.counterNumber);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#f1f5f9] text-slate-800 font-sans select-none overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0c2340] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-cyan-400 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER: Dark Navy Blue Header (#0c2340) Matching Reference Image   */}
      {/* ========================================================================= */}
      <header className="h-[72px] bg-[#0c2340] text-white px-5 flex items-center justify-between shrink-0 shadow-md border-b border-[#1b3a5b] z-20">
        {/* Left: Brand & Pill */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-wider text-white">
                HR DIAGNOSTICS
              </h1>
              <p className="text-[11px] text-cyan-300 font-medium tracking-wide">
                Diagnostic & Imaging Center
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-700/60 mx-1 hidden sm:block" />

          {/* Active Navigation Pill */}
          <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#142d4a] border border-[#234b75] text-white shadow-inner">
            <Receipt className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="text-xs font-bold leading-tight">Clinic POS Dashboard</p>
              <p className="text-[9px] text-cyan-300 font-mono leading-tight">Fast • Accurate • Professional</p>
            </div>
          </div>
        </div>

        {/* Center / Right: Date, Cashier, Notifications, TV */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Waiting Room TV Display Launcher */}
          <button
            onClick={() => setIsTvDisplayModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md active:scale-95"
            title="Launch Waiting Room TV Screen Display"
          >
            <Tv className="w-4 h-4" />
            <span className="hidden md:inline">Patient Queue (TV Display)</span>
          </button>

          {/* Date & Time Widget */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-200">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="font-bold leading-tight">{currentDate || 'Wed, 05 Nov 2026'}</p>
              <p className="text-[10px] text-slate-400 font-mono leading-tight">{currentTime || '12:45:32 PM'}</p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700/60 hidden lg:block" />

          {/* Cashier Profile */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full ring-2 ring-cyan-400/60 overflow-hidden bg-slate-800 flex items-center justify-center shrink-0">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                alt="Cashier Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <User className="w-5 h-5 text-slate-300" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold text-white leading-tight">Mr. Nadeem Sikandar</p>
              <p className="text-[10px] text-cyan-300 font-medium leading-tight">Cashier</p>
            </div>
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-[#142d4a] flex items-center justify-center text-slate-300 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center">
                3
              </span>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={() => window.location.reload()}
            className="w-8 h-8 rounded-full bg-[#142d4a] hover:bg-rose-900/60 flex items-center justify-center text-slate-300 transition-colors"
            title="Lock Session"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main POS Container (Left Sidebar + Center Content) */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================================= */}
        {/* 2. LEFT SIDEBAR: Dark Navy Navigation Matching Reference Image           */}
        {/* ========================================================================= */}
        <aside className="w-60 bg-[#0c2340] text-slate-300 flex flex-col justify-between shrink-0 border-r border-[#1a3a60] p-3 overflow-y-auto">
          {/* Menu Items */}
          <div className="space-y-1">
            <button
              onClick={() => setSidebarView('pos')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                sidebarView === 'pos'
                  ? 'bg-[#1d4ed8] text-white shadow-md'
                  : 'hover:bg-[#142d4a] text-slate-300'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>POS Dashboard</span>
            </button>

            <button
              onClick={() => {
                setSidebarView('pos');
                showToast('Focusing New Patient registration');
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#142d4a] text-slate-300 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-cyan-400" />
              <span>New Patient</span>
            </button>

            <button
              onClick={() => {
                setSidebarView('existing_patient');
                showToast('Showing Registered Patients list');
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                sidebarView === 'existing_patient' ? 'bg-blue-600 text-white' : 'hover:bg-[#142d4a]'
              }`}
            >
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Existing Patient</span>
            </button>

            <button
              onClick={() => setSelectedCategory('Ultrasound')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#142d4a] text-slate-300 transition-colors"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Add Service</span>
            </button>

            <button
              onClick={() => {
                setSidebarView('pos');
                setSelectedCategory('Ultrasound');
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                selectedCategory === 'Ultrasound' && sidebarView === 'pos'
                  ? 'bg-[#142d4a] text-cyan-300'
                  : 'hover:bg-[#142d4a]'
              }`}
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Ultrasound Booking</span>
            </button>

            <button
              onClick={() => {
                setSidebarView('pos');
                setSelectedCategory('X-Ray');
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                selectedCategory === 'X-Ray' && sidebarView === 'pos'
                  ? 'bg-[#142d4a] text-cyan-300'
                  : 'hover:bg-[#142d4a]'
              }`}
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>X-Ray Booking</span>
            </button>

            <button
              onClick={() => {
                setSidebarView('pos');
                setSelectedCategory('Laboratory');
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                selectedCategory === 'Laboratory' && sidebarView === 'pos'
                  ? 'bg-[#142d4a] text-cyan-300'
                  : 'hover:bg-[#142d4a]'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Laboratory Tests</span>
            </button>

            <button
              onClick={() => setSidebarView('pending_bills')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                sidebarView === 'pending_bills' ? 'bg-blue-600 text-white' : 'hover:bg-[#142d4a]'
              }`}
            >
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Pending Bills</span>
            </button>

            <button
              onClick={() => setSidebarView('typist_queue')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                sidebarView === 'typist_queue' ? 'bg-blue-600 text-white' : 'hover:bg-[#142d4a]'
              }`}
            >
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>Typist Live Queue</span>
            </button>

            <button
              onClick={() => setSidebarView('doctor_queue')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                sidebarView === 'doctor_queue' ? 'bg-blue-600 text-white' : 'hover:bg-[#142d4a]'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-cyan-400" />
              <span>Doctor Live Workload</span>
            </button>

            <button
              onClick={() => setSidebarView('reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                sidebarView === 'reports' ? 'bg-blue-600 text-white' : 'hover:bg-[#142d4a]'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <span>Daily Reports</span>
            </button>
          </div>

          {/* Bottom Branding Container Matching Reference Image */}
          <div className="p-3.5 rounded-2xl bg-[#142d4a]/70 border border-[#1e4168] text-center space-y-1 mt-4">
            <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-1">
              <Heart className="w-5 h-5 fill-cyan-400/40" />
            </div>
            <p className="font-bold text-xs text-white">Better Care</p>
            <p className="text-[10px] text-cyan-300">Brighter Tomorrow</p>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* 3. MAIN WORKSPACE: KPI Cards + 3 Columns Matching Reference Image         */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Top 6 Summary KPI Cards Matching Reference Image */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Card 1: Total Patients Today */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500">Total Patients Today</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">68</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    ↑ +5%
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2: Total Invoices */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500">Total Invoices</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">65</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    ↑ +4%
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: Total Revenue */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500">Total Revenue</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg font-black text-slate-900">Rs. 185,750</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    ↑ +8%
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: Cash Collection */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500">Cash Collection</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">Rs. 120,500</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
            </div>

            {/* Card 5: Card Payments */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500">Card Payments</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">Rs. 32,000</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>

            {/* Card 6: Online Payments */}
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-500">Online Payments</p>
                <p className="text-lg font-black text-slate-900 mt-0.5">Rs. 33,250</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* MAIN 3 COLUMNS WORKSPACE (Matching Reference Image) */}
          {sidebarView === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* ========================================================= */}
              {/* COLUMN 1 (LEFT 3 COLS): New Patient Card + Token Queue    */}
              {/* ========================================================= */}
              <div className="lg:col-span-3 space-y-4">
                {/* Card A: New Patient Registration */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      New Patient Registration
                    </h3>
                  </div>

                  <form onSubmit={handleRegisterPatient} className="space-y-2.5 text-xs">
                    <div>
                      <label className="block text-slate-600 font-bold mb-1">
                        Patient Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newPatientForm.name}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                        placeholder="e.g. Ayesha Khan"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        value={newPatientForm.phone}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                        placeholder="0300-1234567"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1">
                        CNIC
                      </label>
                      <input
                        type="text"
                        value={newPatientForm.cnic}
                        onChange={(e) => setNewPatientForm({ ...newPatientForm, cnic: e.target.value })}
                        placeholder="35201-XXXXXXX-X"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-bold mb-1">Gender</label>
                      <div className="flex items-center gap-4 pt-0.5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            checked={newPatientForm.gender === 'Male'}
                            onChange={() => setNewPatientForm({ ...newPatientForm, gender: 'Male' })}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-semibold text-slate-700">Male</span>
                        </label>

                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            checked={newPatientForm.gender === 'Female'}
                            onChange={() => setNewPatientForm({ ...newPatientForm, gender: 'Female' })}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-semibold text-slate-700">Female</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 mt-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Register Patient</span>
                    </button>
                  </form>
                </div>

                {/* Card B: Today's Token Queue Matching Reference Image */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-extrabold text-sm text-blue-700 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-blue-600" />
                      Today's Token Queue
                    </h3>
                    <button
                      onClick={() => setIsTvDisplayModalOpen(true)}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      TV Screen
                    </button>
                  </div>

                  <div className="text-center py-2 space-y-1">
                    <p className="text-xs font-bold text-slate-500">Current Token</p>
                    <div className="text-5xl font-black text-[#0c2340] tracking-widest py-1">
                      {currentQueueToken.tokenNumber}
                    </div>
                    <p className="text-[11px] text-slate-500 font-semibold">
                      Please Proceed to Counter
                    </p>
                  </div>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold">Waiting</p>
                      <p className="text-base font-black text-slate-800">
                        {String(tokens.filter((t) => t.status === 'Waiting').length || 2).padStart(2, '0')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold">In Progress</p>
                      <p className="text-base font-black text-blue-600">03</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold">Completed</p>
                      <p className="text-base font-black text-emerald-600">20</p>
                    </div>
                  </div>

                  {/* Green Announcement Banner Matching Reference Image */}
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1 shadow-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-emerald-600" />
                        <span>Token Announcement</span>
                      </span>
                      <button
                        onClick={() =>
                          announceTokenAudio(currentQueueToken.tokenNumber, currentQueueToken.counterNumber)
                        }
                        className="text-[10px] bg-emerald-200 hover:bg-emerald-300 text-emerald-900 px-2 py-0.5 rounded font-bold"
                      >
                        Announce
                      </button>
                    </div>
                    <p className="text-[11px] font-semibold text-emerald-800">
                      Token {currentQueueToken.tokenNumber}: Please come to Reception
                    </p>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* COLUMN 2 (CENTER 6 COLS): Services Tap Grid & Items Table */}
              {/* ========================================================= */}
              <div className="lg:col-span-6 space-y-4">
                {/* Search Bar & Quick Buttons */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Patient (ID, Name, Mobile, CNIC...)"
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs placeholder-slate-400 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                  <button
                    onClick={() => showToast('Patient search completed')}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                  >
                    Search
                  </button>
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick Services</span>
                  </button>
                </div>

                {/* Category Switcher Pills Matching Reference Image */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[
                    { id: 'Ultrasound', label: 'Ultrasound', icon: Activity },
                    { id: 'X-Ray', label: 'X-Ray', icon: FileText },
                    { id: 'Laboratory', label: 'Laboratory', icon: Layers },
                    { id: 'Consultation', label: 'Consultation', icon: Stethoscope },
                    { id: 'Other', label: 'Other', icon: Hash },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shadow-xs ${
                          isActive
                            ? 'bg-[#1d4ed8] text-white'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Service Cards Grid (Matching Reference Image) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {filteredCatalogServices.slice(0, 8).map((srv) => (
                    <div
                      key={srv.id}
                      onClick={() => handleAddServiceToCart(srv)}
                      className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex flex-col items-center text-center justify-between space-y-2 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Activity className="w-5 h-5" />
                      </div>
                      <p className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 leading-tight">
                        {srv.name}
                      </p>
                      <span className="text-[11px] font-bold text-slate-600 font-mono">
                        Rs. {(srv.pricePKR ?? srv.standardFee ?? 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Invoice Items Table Matching Reference Image */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="font-extrabold text-sm text-slate-900">Invoice Items</h4>
                    <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                      Invoice # : INV-2026-1105-023
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-200 font-bold uppercase text-[10px]">
                          <th className="py-2 text-left w-8">#</th>
                          <th className="py-2 text-left">Service / Test</th>
                          <th className="py-2 text-center w-12">Qty</th>
                          <th className="py-2 text-right">Unit Price</th>
                          <th className="py-2 text-right">Discount</th>
                          <th className="py-2 text-right">Total</th>
                          <th className="py-2 text-center w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoiceLines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 font-bold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 font-bold text-slate-800">{line.serviceName}</td>
                            <td className="py-2.5 text-center font-bold text-slate-700">{line.quantity}</td>
                            <td className="py-2.5 text-right font-mono text-slate-700">
                              {line.unitPrice.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right font-mono text-slate-400">0</td>
                            <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                              {(line.quantity * line.unitPrice).toLocaleString()}
                            </td>
                            <td className="py-2.5 text-center">
                              <button
                                onClick={() => handleRemoveLine(idx)}
                                className="text-slate-300 hover:text-rose-600"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Subtotal & Grand Total Rows */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex gap-4 text-slate-600">
                      <span>Sub Total: <strong>Rs. {grossSubtotal.toLocaleString()}</strong></span>
                      <span>Discount: <strong>0</strong></span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900">
                        Grand Total: Rs. {grandTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row: Clear, Hold, Save Bill, Next Patient */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleClearCart}
                      className="py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Clear</span>
                    </button>

                    <button
                      onClick={() => showToast('Invoice put on hold')}
                      className="py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Hold</span>
                    </button>

                    <button
                      onClick={handleSaveInvoiceAndToken}
                      className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Bill</span>
                    </button>

                    <button
                      onClick={handleCallNextToken}
                      className="py-2.5 rounded-xl bg-[#0c2340] hover:bg-[#15345a] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                    >
                      <span>Next Patient</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* COLUMN 3 (RIGHT 3 COLS): Summary, Payment, Counter Info   */}
              {/* ========================================================= */}
              <div className="lg:col-span-3 space-y-4">
                {/* Invoice Summary Card Matching Reference Image */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Receipt className="w-4 h-4 text-blue-600" />
                    <h4 className="font-extrabold text-sm text-slate-900">Invoice Summary</h4>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Amount:</span>
                      <strong className="text-slate-900 font-mono">Rs. {grossSubtotal.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Discount:</span>
                      <strong className="text-slate-900 font-mono">Rs. 0</strong>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-100">
                      <span>Grand Total:</span>
                      <span className="text-blue-700 font-mono">Rs. {grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Paid Amount Input & Quick Tender Pills */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">Paid Amount:</label>
                    <input
                      type="number"
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="grid grid-cols-3 gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setPaidAmountInput(String(grandTotal))}
                        className="py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs"
                      >
                        Full
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaidAmountInput(String(Math.round(grandTotal / 2)))}
                        className="py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      >
                        Half
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaidAmountInput('0')}
                        className="py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                      >
                        Custom
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Payment Method:</label>
                    <select
                      value={selectedPaymentMethod}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    >
                      <option value="Cash">💵 Cash</option>
                      <option value="Debit/Credit Card">💳 Card</option>
                      <option value="Online / Bank Transfer">🏦 Bank Transfer</option>
                      <option value="JazzCash / EasyPaisa">📱 Mobile / Online</option>
                      <option value="Split Payment">⚖ Split Payment</option>
                    </select>
                  </div>

                  {/* Green Success Banner Matching Reference Image */}
                  {paymentSuccessReceipt && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 shadow-xs">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-xs text-emerald-950">Payment Successful!</p>
                        <p className="text-[10px] text-emerald-700 font-mono truncate">
                          Receipt No: {paymentSuccessReceipt}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Buttons: Print Receipt & Generate Token */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setIsReceiptModalOpen(true)}
                      className="py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Receipt</span>
                    </button>

                    <button
                      onClick={() => setIsTokenPrintModalOpen(true)}
                      className="py-2.5 px-2 rounded-xl bg-[#0c2340] hover:bg-[#15345a] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                    >
                      <Tag className="w-4 h-4 text-cyan-400" />
                      <span>Generate Token</span>
                    </button>
                  </div>
                </div>

                {/* Daily Counter Info Card Matching Reference Image */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <h4 className="font-extrabold text-sm text-slate-900">Daily Counter Info</h4>
                  </div>

                  <p className="font-bold text-slate-800">
                    Counter: 1 | Cashier: Nadeem
                  </p>
                  <p className="text-slate-500 font-mono text-[11px]">
                    Shift: 09:00 AM - 09:00 PM
                  </p>

                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Opening Cash:</span>
                      <strong className="text-slate-900 font-mono">Rs. 10,000</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Cash:</span>
                      <strong className="text-slate-900 font-mono">Rs. 25,500</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Difference:</span>
                      <strong className="text-emerald-600 font-mono">Rs. 0</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: TYPIST LIVE QUEUE DASHBOARD                                         */}
          {/* ========================================================================= */}
          {sidebarView === 'typist_queue' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Typist Live Workload Queue
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time synchronization with Cash Counter bookings and Radiology Reporting
                  </p>
                </div>
                <button
                  onClick={() => setSidebarView('pos')}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Back to POS
                </button>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-5 gap-3 text-center">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-[10px] text-blue-600 font-bold uppercase">Total Booked</p>
                  <p className="text-2xl font-black text-blue-900">68</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <p className="text-[10px] text-amber-600 font-bold uppercase">Waiting</p>
                  <p className="text-2xl font-black text-amber-900">12</p>
                </div>
                <div className="p-3 bg-sky-50 rounded-xl">
                  <p className="text-[10px] text-sky-600 font-bold uppercase">In Progress</p>
                  <p className="text-2xl font-black text-sky-900">03</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">Completed</p>
                  <p className="text-2xl font-black text-emerald-900">45</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <p className="text-[10px] text-purple-600 font-bold uppercase">Awaiting Verification</p>
                  <p className="text-2xl font-black text-purple-900">08</p>
                </div>
              </div>

              {/* Live Queue Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <th className="py-2.5 text-left">Token</th>
                      <th className="py-2.5 text-left">Patient Name</th>
                      <th className="py-2.5 text-left">Examination</th>
                      <th className="py-2.5 text-left">Booking Time</th>
                      <th className="py-2.5 text-center">Status</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tokens.map((tok) => (
                      <tr key={tok.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono font-black text-blue-700 text-sm">{tok.tokenNumber}</td>
                        <td className="py-3 font-bold text-slate-900">{tok.patientName}</td>
                        <td className="py-3 text-slate-700">{tok.serviceName}</td>
                        <td className="py-3 font-mono text-slate-500">{tok.createdAt.split('T')[1]?.slice(0, 5) || '12:45'}</td>
                        <td className="py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            {tok.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => {
                              showToast(`Opening Reporting Workspace for Token ${tok.tokenNumber}`);
                              window.location.hash = '#radiology';
                            }}
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px]"
                          >
                            Open Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: DOCTOR LIVE WORKLOAD DASHBOARD                                      */}
          {/* ========================================================================= */}
          {sidebarView === 'doctor_queue' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Doctor Clinical Workload & Verification Center
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review findings, approve diagnostic reports, and endorse digital signatures
                  </p>
                </div>
                <button
                  onClick={() => setSidebarView('pos')}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Back to POS
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Total Patients Today</p>
                  <p className="text-2xl font-black text-slate-900">68</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">Completed</p>
                  <p className="text-2xl font-black text-emerald-700">45</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl">
                  <p className="text-[10px] text-amber-600 font-bold uppercase">Remaining</p>
                  <p className="text-2xl font-black text-amber-700">23</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <p className="text-[10px] text-purple-600 font-bold uppercase">Awaiting Verification</p>
                  <p className="text-2xl font-black text-purple-700">08</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <th className="py-2 text-left">Token</th>
                      <th className="py-2 text-left">Patient</th>
                      <th className="py-2 text-left">Age / Gender</th>
                      <th className="py-2 text-left">Examination</th>
                      <th className="py-2 text-center">Report Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 font-mono font-black text-blue-700">US-023</td>
                      <td className="py-3 font-bold text-slate-900">Muhammad Ali</td>
                      <td className="py-3 text-slate-600">32 Y / Male</td>
                      <td className="py-3 text-slate-800 font-semibold">Whole Abdomen Ultrasound</td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Awaiting Verification
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => showToast('Opening Doctor Verification Modal')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                        >
                          Review & Sign
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: EXISTING PATIENTS DIRECTORY                                         */}
          {/* ========================================================================= */}
          {sidebarView === 'existing_patient' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-extrabold text-base text-slate-900">
                  Registered Patients Directory ({patients.length})
                </h3>
                <button
                  onClick={() => setSidebarView('pos')}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Back to POS
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <th className="py-2 text-left">Patient ID</th>
                      <th className="py-2 text-left">MR Number</th>
                      <th className="py-2 text-left">Name</th>
                      <th className="py-2 text-left">Mobile</th>
                      <th className="py-2 text-left">Age / Gender</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patients.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-bold text-blue-700">{p.id}</td>
                        <td className="py-2.5 font-mono">{p.mrNumber}</td>
                        <td className="py-2.5 font-bold text-slate-900">{p.name || p.fullName}</td>
                        <td className="py-2.5 font-mono">{p.phone}</td>
                        <td className="py-2.5">{p.age} Y / {p.gender}</td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedPatient(p);
                              setNewPatientForm({
                                name: p.name || p.fullName || '',
                                phone: p.phone || '',
                                cnic: p.cnic || '',
                                gender: p.gender,
                                age: p.age,
                                dob: p.dob || '1994-06-15',
                                address: p.address || '',
                                fatherHusbandName: p.fatherHusbandName || '',
                              });
                              setSidebarView('pos');
                              showToast(`Loaded ${p.name || p.fullName} into POS`);
                            }}
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px]"
                          >
                            Create Bill
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM ACTION BAR: Billing Summary & Actions Matching Reference Image  */}
      {/* ========================================================================= */}
      <footer className="h-[72px] bg-white border-t border-slate-300 px-6 flex items-center justify-between shrink-0 shadow-lg z-20 overflow-x-auto gap-4">
        {/* Left Side: Summary Cards */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <Activity className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-[10px] text-slate-500 leading-tight">Total Services</p>
              <p className="font-extrabold text-sm text-slate-900 leading-tight">{invoiceLines.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/60 border border-amber-200">
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
              ₹
            </div>
            <div>
              <p className="text-[10px] text-slate-500 leading-tight">Total Amount</p>
              <p className="font-extrabold text-sm text-slate-900 leading-tight">
                Rs. {grandTotal.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
            <div>
              <p className="text-[10px] text-slate-500 leading-tight">Paid Amount</p>
              <p className="font-extrabold text-sm text-emerald-700 leading-tight">
                Rs. {amountPaidNum.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-50/60 border border-purple-200">
            <Clock className="w-4 h-4 text-purple-600" />
            <div>
              <p className="text-[10px] text-slate-500 leading-tight">Remaining</p>
              <p className="font-extrabold text-sm text-slate-900 leading-tight">
                Rs. {balanceRemaining.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Action Buttons Matching Reference Image */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsDailyClosingModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Coins className="w-4 h-4" />
            <span>Daily Closing</span>
          </button>

          <button
            onClick={() => {
              const ws = XLSX.utils.json_to_sheet(invoices);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
              XLSX.writeFile(wb, `Daily_Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
              showToast('Exported Daily Sales Excel Report');
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0c2340] hover:bg-[#15345a] text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Reports ⌄</span>
          </button>

          <button
            onClick={handleClearCart}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Cancel Invoice</span>
          </button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 5. MODAL DIALOGS: Token Print, Patient Queue TV Display, Receipt Modal    */}
      {/* ========================================================================= */}

      {/* Token Thermal Print Slip Modal */}
      <TokenSlipPrintModal
        isOpen={isTokenPrintModalOpen}
        token={lastGeneratedToken || currentQueueToken}
        onClose={() => setIsTokenPrintModalOpen(false)}
      />

      {/* Waiting Room TV Patient Queue Display Modal Matching image.png */}
      <PatientQueueDisplayModal
        isOpen={isTvDisplayModalOpen}
        tokens={tokens}
        onClose={() => setIsTvDisplayModalOpen(false)}
      />

      {/* Cashier Billing Receipt Modal */}
      <BillingReceiptModal
        isOpen={isReceiptModalOpen}
        invoice={
          lastGeneratedInvoice ||
          invoices[0] || {
            id: 'inv_preview',
            invoiceNumber: 'INV-2026-1105-023',
            receiptNumber: 'RCP-2026-1105-018',
            branchId: 'br_lhr_gulberg',
            branchName: 'Lahore Gulberg Diagnostic Hub',
            counterName: 'Counter 1',
            patientId: 'P-10452',
            patientMRN: 'MR-5712298',
            patientName: 'Ayesha Khan',
            patientPhone: '0300-1234567',
            patientAge: 28,
            patientGender: 'Female',
            items: invoiceLines,
            subtotal: grossSubtotal,
            totalDiscount: 0,
            totalTax: 0,
            grossTotal: grandTotal,
            netPayable: grandTotal,
            paidAmount: amountPaidNum,
            balanceDue: balanceRemaining,
            paymentStatus: 'Fully Paid',
            payments: [{ method: selectedPaymentMethod, amount: amountPaidNum, timestamp: new Date().toISOString() }],
            cashierId: 'usr_nadeem',
            cashierName: 'Mr. Nadeem Sikandar',
            createdAt: new Date().toISOString(),
            reprintCount: 0,
            isCancelled: false,
          }
        }
        onClose={() => setIsReceiptModalOpen(false)}
      />

      {/* Daily Closing & Z-Report Modal */}
      {isDailyClosingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-300 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-blue-600" />
                Cashier Shift Daily Closing & Z-Report
              </h3>
              <button
                onClick={() => setIsDailyClosingModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Counter / Terminal:</span>
                <strong className="text-slate-900">Counter 1 (Main POS)</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Cashier:</span>
                <strong className="text-slate-900">Mr. Nadeem Sikandar</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Opening Cash Float:</span>
                <strong className="text-slate-900">Rs. 10,000</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Cash Invoiced:</span>
                <strong className="text-slate-900">Rs. 120,500</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Card & Digital Collections:</span>
                <strong className="text-slate-900">Rs. 65,250</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-base font-bold text-emerald-700">
                <span>Expected Drawer Total:</span>
                <span>Rs. 130,500</span>
              </div>
            </div>

            <div className="pt-2">
              <label className="block font-bold text-slate-700 mb-1">Physical Cash Count (PKR):</label>
              <input
                type="number"
                defaultValue={130500}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setIsDailyClosingModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast('Shift closed and Z-Report printed successfully');
                  setIsDailyClosingModalOpen(false);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md"
              >
                Reconcile & Print Z-Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashCounterBillingManagement;
