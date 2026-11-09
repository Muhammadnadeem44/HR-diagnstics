// Comprehensive TypeScript Type Definitions for HR Diagnostics Enterprise Inventory & Asset Management

export interface CloudSyncMetadata {
  _updatedAt?: number;
  _deviceId?: string;
  _deleted?: boolean;
}

export type UserRole =
  | 'super_admin'
  | 'branch_manager'
  | 'doctor_lab_incharge'
  | 'pathologist_doctor'
  | 'procurement_officer'
  | 'warehouse_staff'
  | 'storekeeper'
  | 'department_staff'
  | 'lab_technician'
  | 'biomedical_engineer'
  | 'auditor';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Stored securely for demonstration auth
  role: UserRole;
  branchId?: string; // Optional if super_admin
  branchName?: string;
  departmentId?: string;
  is2FAEnabled: boolean;
  twoFactorEnabled?: boolean;
  isActive?: boolean;
  phone?: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  // Granular admin-controlled permissions
  allowedModules?: string[]; // e.g. ['dashboard', 'inventory', 'purchases', 'suppliers', 'assets', 'transfers', 'audits', 'compliance', 'finance']
  canAddInventory?: boolean;
  canEditInventory?: boolean;
  canDeleteInventory?: boolean; // Requires HO approval if not super_admin
  canAddAssets?: boolean;
  canEditAssets?: boolean;
  canDeleteAssets?: boolean; // Requires HO approval if not super_admin
  canCreateTransfers?: boolean; // Requires HO approval if not super_admin
  canCreateRequisitions?: boolean; // Requires HO approval if not super_admin
  canAddPO?: boolean;
  canApprovePO?: boolean;
  canPerformAudits?: boolean;
  canViewReports?: boolean;
}

export type ApprovalRequestType =
  | 'inventory_deletion'
  | 'asset_deletion'
  | 'stock_transfer'
  | 'new_stock'
  | 'po_approval'
  | 'batch_writeoff';

export interface HeadOfficeApprovalRequest {
  id: string;
  type: ApprovalRequestType;
  title: string;
  description: string;
  branchId: string;
  branchName: string;
  requestedByUserId: string;
  requestedByUserName: string;
  requestedByUserRole: string;
  targetEntityId: string; // ID of inventory item, asset, transfer, or PO
  targetEntityCode?: string; // SKU, Asset Tag, Transfer Number, or PO Number
  details: Record<string, any>;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface DocumentAttachment {
  id: string;
  title: string;
  fileName: string;
  fileType: 'image' | 'pdf' | 'document' | 'other';
  fileSize?: string | number;
  category?: string;
  dataUrl: string; // Base64 data URL
  uploadedAt: string;
  uploadedBy?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string; // e.g. BR-LHR-01
  city: string;
  address: string;
  contactPerson: string;
  phone: string;
  email?: string;
  type?: string;
  monthlyBudget: number; // in PKR / USD
  currentMonthSpend: number;
  isHeadOffice?: boolean;
  isActive?: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  branchId: string;
  isCentral: boolean; // Central Warehouse vs Branch Warehouse
  managerName: string;
  locations: string[]; // Shelf/Rack/Bin codes e.g. ["Rack A-1", "Rack A-2", "Cold Room B"]
}

export interface Department {
  id: string;
  name: string; // Lab, Radiology, Pharmacy, Reception, Phlebotomy, Emergency
  code: string;
  branchId: string;
  headName?: string;
  monthlySpend?: number;
}

export interface ItemBatch {
  id: string;
  batchNumber: string;
  lotNumber?: string;
  manufacturingDate?: string;
  expiryDate: string;
  receivedDate: string;
  initialQuantity: number;
  currentQuantity: number;
  unitCost: number;
  storageCondition: 'Room Temp' | '2-8°C Refrigerated' | '-20°C Frozen' | 'Dark / Light Sensitive';
  supplierId?: string;
  qrCode: string;
}

export interface SerializedUnit {
  id: string;
  serialNumber: string;
  status: 'In Stock' | 'Assigned' | 'In Maintenance' | 'Decommissioned';
  assignedAssetId?: string;
  branchId: string;
  warehouseId: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string; // e.g. Reagents, Rapid Test Kits, Glassware, Radiology Consumables, Narcotics, PPE
  subCategory?: string;
  uom: string; // Box, Vial, Kit, Pack, Litre, Pcs, Test
  description?: string;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;
  leadTimeDays: number; // For Auto-Reorder suggestion calculation
  batches: ItemBatch[];
  totalQuantity: number;
  reservedQuantity: number; // Department booking
  branchId: string;
  warehouseId: string;
  departmentId?: string;
  locationBin?: string;
  isNarcoticOrControlled?: boolean;
  barcode?: string;
  costPrice: number;
  sellingPrice?: number;
  photo?: string;
  photoUrl?: string;
  attachments?: DocumentAttachment[];
  createdAt: string;
  updatedAt: string;
  _updatedAt?: number;
  _deviceId?: string;
  _deleted?: boolean;
}

export interface AssetRecord {
  id: string;
  assetTag: string; // e.g. ASSET-RAD-0091
  name: string;
  category: 'Diagnostic Analyzer' | 'Radiology Machine' | 'Cold Storage' | 'IT / Computer' | 'Laboratory Furniture' | 'Emergency Equipment';
  brandModel: string;
  serialNumber: string;
  branchId: string;
  departmentId: string;
  assignedEmployeeName?: string;
  purchaseDate: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeYears: number; // Straight-line depreciation
  currentBookValue: number;
  accumulatedDepreciation: number;
  status: 'Active / Operational' | 'Under Maintenance' | 'Calibration Due' | 'Idle / Standby' | 'Disposed / Scrapped';
  warrantyExpiryDate: string;
  warrantyProvider: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDue: string;
  maintenanceFrequencyDays: number; // e.g. 90 days for quarterly
  calibrationDueDate?: string;
  calibrationAgency?: string;
  calibrationCertificateNumber?: string;
  totalDowntimeHours: number;
  qrCode: string;
  attachments?: DocumentAttachment[];
  documents: {
    id?: string;
    title: string;
    url?: string;
    dataUrl?: string;
    fileName?: string;
    fileType?: 'image' | 'pdf' | 'document';
    fileSize?: string;
    date: string;
  }[];
}

export interface MaintenanceLog {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  serviceDate: string;
  serviceType: 'Preventive' | 'Corrective / Breakdown' | 'Calibration' | 'Routine Inspection';
  serviceProvider: string;
  technicianName: string;
  cost: number;
  downtimeHours: number;
  notes: string;
  checklistPassed: boolean;
  sparePartsConsumed: { itemId: string; itemName: string; quantity: number }[];
  certificateUrl?: string;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  type?: 'Warehouse to Branch' | 'Inter-Branch' | 'Inter-Department' | string;
  sourceType?: 'Warehouse' | 'Branch';
  sourceId?: string; // warehouseId or branchId
  sourceName?: string;
  sourceBranchId?: string;
  sourceBranchName?: string;
  sourceDepartmentId?: string;
  destType?: 'Branch' | 'Department';
  destId?: string;
  destName?: string;
  targetBranchId?: string;
  targetBranchName?: string;
  targetDepartmentId?: string;
  status:
    | 'Draft'
    | 'Pending Approval'
    | 'In Transit'
    | 'Received & Verified'
    | 'Delivered / Received'
    | 'Discrepancy'
    | 'Rejected';
  requestedBy?: string;
  approvedBy?: string;
  dispatchDate?: string;
  dispatchedAt?: string;
  receivedDate?: string;
  receivedAt?: string;
  courierName?: string;
  trackingNumber?: string;
  notes?: string;
  trackingNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  items: {
    itemId: string;
    sku?: string;
    itemName: string;
    batchNumber: string;
    quantity?: number;
    quantitySent: number;
    quantityReceived?: number;
    discrepancyNotes?: string;
    uom: string;
  }[];
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  branchId: string;
  branchName: string;
  orderDate: string;
  expectedDeliveryDate: string;
  createdAt?: string;
  totalAmount?: number;
  status:
    | 'Draft'
    | 'Doctor Pending'
    | 'Branch Manager Pending'
    | 'Super Admin Pending'
    | 'Approved'
    | 'Partially Received'
    | 'Completed'
    | 'Received'
    | 'Cancelled';
  doctorApproval?: { approvedBy: string; timestamp: string; digitalSignature?: string };
  managerApproval?: { approvedBy: string; timestamp: string; digitalSignature?: string };
  superAdminApproval?: { approvedBy: string; timestamp: string; digitalSignature?: string };
  approvals?: {
    role: string;
    userName: string;
    approvedAt?: string;
    timestamp?: string;
    status: 'Approved' | 'Rejected' | 'Pending';
    notes?: string;
    signatureUrl?: string;
  }[];
  items: {
    itemId: string;
    sku?: string;
    itemName: string;
    unitPrice: number;
    orderedQty?: number;
    quantityOrdered?: number;
    receivedQty?: number;
    uom?: string;
    totalPrice?: number;
    totalAmount: number;
  }[];
  taxRatePercent: number; // GST
  taxAmount: number;
  subtotal: number;
  grandTotal: number;
  notes?: string;
  attachments?: DocumentAttachment[];
}

export interface GoodsReceivingNote {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  receivedDate: string;
  receivedBy?: string;
  receivedByUserId?: string;
  receivedByUserName?: string;
  deliveryChallanNumber?: string;
  vendorId?: string;
  vendorName: string;
  branchId: string;
  branchName?: string;
  warehouseId?: string;
  status?: string;
  items: {
    itemId: string;
    sku?: string;
    itemName: string;
    orderedQty?: number;
    receivedQty?: number;
    quantityReceived?: number;
    acceptedQty: number;
    rejectedQty?: number;
    quantityRejected?: number;
    batchNumber: string;
    expiryDate: string;
    rejectionReason?: string;
    uom?: string;
  }[];
  invoiceNumber?: string;
  isPartial?: boolean;
  notes?: string;
  attachments?: DocumentAttachment[];
}

export type GoodsReceiptNote = GoodsReceivingNote;

export interface VendorInvoiceRecord {
  id: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  poId: string;
  poNumber: string;
  grnId: string;
  grnNumber: string;
  branchId: string;
  branchName: string;
  invoiceDate: string;
  dueDate: string;
  poAmount: number;
  grnAcceptedAmount: number;
  invoiceBilledAmount: number;
  varianceAmount: number; // invoiceBilledAmount - grnAcceptedAmount
  threeWayMatchStatus: 'Exact Match' | 'Variance Detected' | 'Under Review';
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid & Released';
  paidAmount: number;
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export interface ContractRecord {
  id: string;
  vendorId?: string;
  vendorName?: string;
  contractNumber: string;
  title: string;
  type: 'AMC / Service Maintenance' | 'Reagent Rental Agreement' | 'Consumables Supply' | 'Calibration SLA' | string;
  startDate: string;
  endDate: string;
  annualCost: number;
  slaResponseHours?: number;
  termsSummary?: string;
  status?: 'Active' | 'Expiring Soon' | 'Expired';
}

export interface Vendor {
  id: string;
  name: string;
  code?: string;
  category?: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  ntn?: string;
  strn?: string;
  ntnNumber?: string;
  gstNumber?: string;
  ntnTaxId?: string;
  drugLicenseNumber?: string;
  drugLicenseExpiry?: string;
  paymentTerms: string; // e.g. Net 30 Days
  leadTimeDays?: number;
  onTimeDeliveryRate?: number; // percentage
  qualityComplianceRate?: number; // percentage
  rating: number; // 1-5
  contractStartDate?: string;
  contractEndDate?: string;
  status?: 'Active' | 'Under Review' | 'Blacklisted';
  contracts?: ContractRecord[];
}

export interface QuoteComparison {
  id: string;
  rfqNumber: string;
  itemName: string;
  requiredQuantity: number;
  date: string;
  quotes: {
    vendorId: string;
    vendorName: string;
    unitPrice: number;
    deliveryDays: number;
    warrantyTerms: string;
    paymentTerms: string;
    isRecommended?: boolean;
  }[];
  selectedVendorId?: string;
  decisionNotes?: string;
}

export interface StockAudit {
  id: string;
  auditNumber: string;
  title?: string;
  type?: string;
  branchId: string;
  branchName?: string;
  warehouseId?: string;
  scheduleType?: 'Weekly Cycle Count' | 'Monthly Physical Inventory' | 'Surprise Audit' | 'Year-End Verification' | string;
  auditDate: string;
  auditorName?: string;
  conductedByUserId?: string;
  conductedByUserName?: string;
  status: 'Scheduled' | 'In Progress' | 'Pending Super Admin Approval' | 'Approved & Adjusted' | 'Rejected' | 'Pending Approval' | string;
  approvedBy?: string;
  approvedByUserId?: string;
  approvedByUserName?: string;
  approvedAt?: string;
  approvalSignatureUrl?: string;
  items: {
    itemId: string;
    sku?: string;
    itemName: string;
    batchNumber?: string;
    systemQuantity: number;
    physicalQuantity: number;
    varianceQuantity?: number;
    variance?: number;
    unitCost?: number;
    varianceValue?: number;
    varianceValuePKR?: number;
    varianceReason?: string;
    notes?: string;
  }[];
  totalVarianceValue?: number;
  totalVarianceValuePKR?: number;
}

export type PhysicalAudit = StockAudit;

export interface BatchRecall {
  id: string;
  recallNumber: string;
  batchNumber: string;
  itemId?: string;
  itemName: string;
  initiatedByUserId?: string;
  initiatedByUserName?: string;
  initiatedDate: string;
  reason: string;
  actionRequired: string;
  status: string;
  affectedUnitsCount: number;
}

export interface NarcoticLog {
  id: string;
  date: string;
  drugName: string;
  batchNumber: string;
  quantityDispensed: number;
  balanceRemaining: number;
  patientMRN: string;
  prescribingDoctor: string;
  dispensedToNurse: string;
  authorizedByUserName: string;
  signatureUrl: string;
}

export interface TemperatureLog {
  id: string;
  branchId: string;
  chamberName: string;
  readingCelsius: number;
  humidityPercentage: number;
  loggedAt: string;
  loggedByUserName: string;
  isExcursion: boolean;
  excursionAlertNotes?: string;
}

export interface NarcoticsLog {
  id: string;
  itemId?: string;
  itemName?: string;
  drugName?: string;
  batchNumber: string;
  dispenseDate?: string;
  date?: string;
  patientIdOrMRN?: string;
  patientMRN?: string;
  doctorName?: string;
  prescribingDoctor?: string;
  dispensedBy?: string;
  dispensedToNurse?: string;
  witnessName?: string;
  authorizedByUserName?: string;
  quantityDispensed: number;
  remainingBalance?: number;
  balanceRemaining?: number;
  reason?: string;
  doctorSignature?: string;
  signatureUrl?: string;
  witnessSignature?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module:
    | 'Inventory'
    | 'Assets'
    | 'Transfers'
    | 'Procurement'
    | 'Security'
    | 'Audits'
    | 'Vendors'
    | 'Maintenance'
    | 'Compliance'
    | 'Attendance'
    | 'Payroll'
    | 'Staff'
    | 'Billing'
    | 'Radiology'
    | 'System';
  details: string;
  branchId?: string;
  ipAddress?: string;
}

export interface AlertNotification {
  id: string;
  type: 'low_stock' | 'expiry' | 'maintenance' | 'po_approval' | 'budget_limit' | 'audit_variance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  isEscalated?: boolean;
  relatedEntityId?: string;
  actionRequired?: boolean;
  branchId?: string;
}

export interface SyncQueueItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  payload: any;
  timestamp: number;
  synced: boolean;
}

export interface SystemBranding {
  companyName: string;
  tagline: string;
  shortCode: string;
  badgeText: string;
  logoType: 'image' | 'preset' | 'text';
  logoUrl?: string;
  presetIcon?: 'dna' | 'microscope' | 'flask' | 'activity' | 'shield' | 'building' | 'heart';
  primaryColor?: string;
  updatedAt?: string;
}

export interface LabTestReagentRequirement {
  itemId?: string; // Optional linkage to an inventory SKU/Item ID
  itemSku?: string;
  itemName: string;
  requiredQtyPerTest: number;
  uom: string; // e.g. 'ml', 'tests', 'vials', 'reactions'
}

export interface LabTestProtocol {
  id: string;
  testCode: string; // e.g. 'CBC-01', 'LFT-02', 'HBA1C-01'
  testName: string; // e.g. 'Complete Blood Count (CBC / CP)'
  category: 'Hematology' | 'Clinical Biochemistry' | 'Microbiology' | 'Immunology & Serology' | 'Molecular / PCR' | 'Special Chemistry';
  departmentName?: string;
  targetAnalyzer?: string; // e.g. 'Sysmex XN-1000' or 'Roche Cobas c311'
  reagents: LabTestReagentRequirement[];
  active: boolean;
  costEstimatePKR?: number;
  notes?: string;
}

export interface LabTestExecutionLog {
  id: string;
  runNumber: string; // e.g. 'RUN-2026-0042'
  protocolId: string;
  testCode: string;
  testName: string;
  branchId: string;
  branchName: string;
  testCount: number; // e.g. 50 CBC tests run
  executedDate: string;
  executedByUserId: string;
  executedByUserName: string;
  analyzerUsed?: string;
  deductions: {
    itemId: string;
    itemName: string;
    uom: string;
    quantityDeducted: number;
    batchesAffected: {
      batchNumber: string;
      deductedFromBatch: number;
      expiryDate: string;
    }[];
  }[];
  remarks?: string;
}

export interface InventoryUsageRecord {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  category: string;
  uom: string;
  batchId?: string;
  batchNumber: string;
  expiryDate?: string;
  branchId: string;
  branchName: string;
  warehouseId?: string;
  warehouseName?: string;
  departmentId?: string;
  departmentName: string;
  quantityUsed: number;
  stockBefore: number;
  stockAfter: number;
  usedByEmployeeName: string;
  usedByEmployeeId?: string;
  usedByUserRole?: string;
  purpose: string;
  referenceNote?: string;
  patientIdOrSampleNo?: string;
  costPrice?: number;
  totalCostValue?: number;
  batchesAffected?: {
    batchNumber: string;
    deductedFromBatch: number;
    expiryDate: string;
  }[];
  timestamp: string;
}

export type SuperAdminLogCategory = 'LOGIN_ATTEMPT' | 'CONFIG_CHANGE';

export type SuperAdminLogActionType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_LOCKED'
  | 'LOGOUT'
  | 'BRANCH_CREATED'
  | 'BRANCH_UPDATED'
  | 'BRANCH_DELETED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'RBAC_PERMISSION_CHANGE'
  | 'SECURITY_POLICY_CHANGE'
  | 'BRANDING_CONFIG_CHANGE'
  | 'HIERARCHY_CONFIG_CHANGE'
  | 'DATABASE_BACKUP_EXPORT'
  | 'DATABASE_RESTORE'
  | 'DATABASE_CLEAN_RESET'
  | 'FORMULARY_INITIALIZE'
  | 'SYSTEM_OVERRIDE';

export interface SuperAdminActivityLog {
  id: string;
  sequenceNumber: number;
  timestamp: string;
  category: SuperAdminLogCategory;
  actionType: SuperAdminLogActionType;
  actorEmail: string;
  actorName: string;
  actorRole: string;
  targetEntity?: string;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'FLAGGED';
  details: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    clientPlatform?: string;
    changesSummary?: { field: string; previousValue?: any; newValue?: any }[];
    failureReason?: string;
    attemptNumber?: number;
    inputIdentifier?: string;
    sessionToken?: string;
    [key: string]: any;
  };
  previousHash: string;
  currentHash: string;
  isVerifiedTamperProof?: boolean;
  _updatedAt?: number;
}

// ==========================================
// ATTENDANCE & BIOMETRIC MACHINE (ZKTeco etc.) TYPES
// ==========================================

export type AttendanceStatus = 'Present' | 'Late' | 'Half Day' | 'Absent' | 'On Leave' | 'Holiday' | 'Weekly Off';
export type PunchMethod = 'ZKTeco Biometric' | 'RFID Card' | 'Face Recognition' | 'Fingerprint Scanner' | 'Manual Log' | 'Mobile GPS / App';

export interface BiometricDevice {
  id: string;
  name: string; // e.g. "ZKTeco uFace 800 - Main Gate"
  brand: 'ZKTeco' | 'Hikvision' | 'Realtime' | 'Suprema' | 'Anviz' | 'Generic IP Device';
  model: string;
  ipAddress: string;
  port: number; // default 4370 for ZK
  serialNumber?: string;
  branchId: string;
  branchName: string;
  location: string; // e.g. "Main Lab Entrance"
  connectionStatus: 'Online' | 'Offline' | 'Connecting';
  lastSyncTime?: string;
  totalSyncedLogs?: number;
  commKey?: number; // default 0
  isEnabled: boolean;
}

export interface ShiftTiming {
  id: string;
  name: string; // e.g. "Morning Diagnostic Shift"
  branchId?: string;
  startTime: string; // "08:00"
  endTime: string; // "16:00"
  gracePeriodMinutes: number; // e.g. 15 mins
  halfDayThresholdHours: number; // e.g. 4.5 hrs
  fullDayRequiredHours: number; // e.g. 8 hrs
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string; // Biometric ID (e.g. "EMP-101" or ZK Enroll ID "1")
  branchId: string;
  branchName: string;
  departmentId?: string;
  departmentName?: string;
  date: string; // "YYYY-MM-DD"
  checkInTime?: string; // "08:04:15"
  checkOutTime?: string; // "16:15:30"
  punchMethod: PunchMethod;
  deviceId?: string;
  deviceName?: string;
  status: AttendanceStatus;
  workHours: number;
  overtimeHours: number;
  lateMinutes: number;
  earlyLeavingMinutes: number;
  notes?: string;
  shiftName?: string;
}

// ==========================================
// PAYROLL, ADVANCE SALARY & LOAN MANAGEMENT TYPES
// ==========================================

export interface EmployeeProfile {
  id: string;
  userAccountId?: string; // Linked system user if exists
  employeeCode: string; // Biometric enroll ID
  name: string;
  fatherOrHusbandName?: string;
  cnic?: string; // Pakistan National ID
  email?: string;
  phone: string;
  designation: string; // Pathologist, Lab Tech, Phlebotomist, etc.
  departmentId: string;
  departmentName: string;
  branchId: string;
  branchName: string;
  joiningDate: string;
  employmentType: 'Permanent' | 'Contract' | 'Probation' | 'Daily Wages';
  salaryType: 'Monthly Fixed' | 'Per Test Commission' | 'Hourly';
  
  // Salary Structure (PKR)
  basicSalary: number;
  medicalAllowance: number;
  transportAllowance: number;
  housingAllowance: number;
  specialAllowance: number;
  grossSalary: number;

  // Bank & Payment Details
  bankName?: string;
  accountTitle?: string;
  accountNumberOrIBAN?: string;
  paymentMode: 'Bank Transfer' | 'Cash' | 'Cheque';

  shiftId?: string;
  isActive: boolean;
}

export type LoanType = 'Advance Salary' | 'Personal Loan' | 'Emergency Medical Loan' | 'Bike / Vehicle Loan';
export type LoanStatus = 'Active' | 'Paid in Full' | 'Pending Approval' | 'Rejected';

export interface AdvanceLoanRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  branchId: string;
  branchName: string;
  loanType: LoanType;
  totalAmount: number;
  disbursedDate: string;
  monthlyDeductionAmount: number;
  remainingBalance: number;
  installmentsCount: number;
  installmentsPaid: number;
  reason: string;
  approvedBy: string;
  status: LoanStatus;
  repaymentHistory: Array<{
    date: string;
    amount: number;
    payrollSlipId?: string;
    receiptNumber?: string;
  }>;
}

export interface PayrollSlip {
  id: string;
  payrollMonth: string; // "YYYY-MM" e.g. "2026-10"
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  departmentName: string;
  branchId: string;
  branchName: string;
  
  // Attendance metrics for month
  totalDaysInMonth: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  paidLeaves: number;
  overtimeHours: number;

  // Earnings Breakdown
  basicSalary: number;
  allowances: number;
  overtimePay: number;
  bonusAmount: number;
  grossEarnings: number;

  // Deductions Breakdown
  lateDeduction: number;
  absentDeduction: number;
  advanceLoanDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  totalDeductions: number;

  // Net Pay
  netSalary: number;

  paymentStatus: 'Paid' | 'Unpaid' | 'On Hold';
  paymentDate?: string;
  paymentMethod?: 'Bank Transfer' | 'Cash' | 'Cheque';
  paymentReference?: string;
  generatedAt: string;
  generatedBy: string;
  notes?: string;
}

// ==========================================
// CLINIC CASH COUNTER & BILLING MANAGEMENT TYPES
// ==========================================

export interface ClinicPatient {
  id: string; // e.g. "PAT-2026-001"
  mrNumber: string; // e.g. "MR-100421"
  name: string;
  fullName?: string; // Alias for name
  fatherHusbandName?: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  dob?: string;
  phone: string;
  contactNumber?: string; // Alias for phone
  cnic: string; // e.g. "35201-1234567-1"
  address?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  guardianName?: string;
  registrationDate: string;
  registrationType?: string; // 'Walk-in' | 'Appointment' | 'Emergency' | 'Corporate' | 'Referral'
  referredDoctorId?: string;
  referredDoctorName?: string;
  patientNotes?: string;
  branchId?: string;
  branchName?: string;
  totalVisits?: number;
  totalSpentPKR?: number;
}

export interface ClinicVisit {
  id: string;
  visitNumber: string; // e.g. "VIS-2026-00421"
  visitDate: string;
  patientId: string;
  patientMRN: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  services: InvoiceServiceLine[];
  netAmount: number;
  paidAmount: number;
  reportStatus?: string;
  clinicalNotes?: string;
  createdAt: string;
}

export interface ClinicDoctor {
  id: string; // e.g. "DOC-101"
  name: string; // e.g. "Dr. Asim Raza (Consultant Pathologist)"
  specialization: string; // e.g. "Histopathology & Hematology"
  departmentId?: string;
  departmentName?: string;
  department?: string; // Department name alias
  consultationFee?: number;
  consultationFeePKR?: number; // Alias for consultationFee
  phone?: string;
  contactNumber?: string; // Alias for phone
  pmdcNumber?: string;
  regNumber?: string; // PMDC/GMC Registration number
  roomNumber?: string;
  digitalSignatureUrl?: string; // Digital signature image URL or data URI
  isActive: boolean;
}

export type ClinicServiceCategory =
  | 'Doctor Consultation'
  | 'Ultrasound'
  | 'X-Ray'
  | 'Laboratory Tests'
  | 'ECG'
  | 'Other Medical Services';

export interface ClinicServiceItem {
  id: string;
  code: string; // e.g. "SRV-US-01", "SRV-XR-02", "SRV-LAB-05"
  name: string;
  category: ClinicServiceCategory;
  standardFee: number;
  pricePKR?: number; // Alias for standardFee
  departmentId?: string;
  departmentName?: string;
  department?: string; // Department alias
  requiresDoctor: boolean;
  durationMinutes?: number;
  doctorFee?: number;
  referralCommission?: number;
  defaultReportType?: string;
  taxPercentage: number; // e.g. 0% or 5%
  taxPercent?: number; // Alias for taxPercentage
  description?: string;
  isActive: boolean;
  priceHistory?: { oldPrice: number; newPrice: number; changedAt: string; changedBy: string }[];
}

export interface InvoiceServiceLine {
  id?: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  category: ClinicServiceCategory;
  doctorId?: string;
  doctorName?: string;
  quantity: number;
  unitPrice: number;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  grossAmount?: number;
  netAmount: number;
}

export type PaymentMethod =
  | 'Cash'
  | 'Debit/Credit Card'
  | 'Bank Transfer'
  | 'Online Payment'
  | 'Credit';

export interface PaymentSplitEntry {
  id?: string;
  method: PaymentMethod;
  amount: number;
  referenceNumber?: string; // Card auth code, online transaction ID, bank reference
  bankName?: string;
  timestamp: string;
}

export type InvoicePaymentStatus =
  | 'Fully Paid'
  | 'Partially Paid'
  | 'Partial Payment'
  | 'Unpaid / Credit'
  | 'Credit / Unpaid'
  | 'Cancelled'
  | 'Refunded';

export interface ClinicInvoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-0042"
  receiptNumber: string; // e.g. "REC-2026-0042"
  branchId: string;
  branchName: string;
  counterName: string; // e.g. "Cash Counter 01 (OPD)"
  visitId?: string;
  visitNumber?: string; // e.g. "VIS-2026-0042"
  patientId: string;
  patientMRN: string;
  patientName: string;
  patientPhone: string;
  patientAge: number;
  patientGender: string;
  patientCnic?: string;
  referredDoctorId?: string;
  referredDoctorName?: string;
  departmentName?: string;
  items: InvoiceServiceLine[];
  services?: InvoiceServiceLine[];
  subtotal: number;
  totalDiscount: number;
  discountReason?: string;
  discountApprovedBy?: string;
  totalTax: number;
  grossTotal: number;
  netPayable: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: InvoicePaymentStatus;
  payments: PaymentSplitEntry[];
  cashierId: string;
  cashierName: string;
  shiftId?: string;
  createdAt: string;
  reprintCount: number;
  isCancelled: boolean;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  refundAmount?: number;
  refundReason?: string;
  refundApprovedBy?: string;
  refundedAt?: string;
  tokenId?: string;
  tokenNumber?: string;
  notes?: string;
}

export type TokenStatus = 'Waiting' | 'Called' | 'In Progress' | 'Completed' | 'Skipped' | 'Cancelled';

export interface ClinicToken {
  id: string;
  tokenNumber: string; // e.g. "T-023", "US-023", "XR-012", "LAB-005"
  tokenDate: string; // e.g. "2026-11-05"
  sequenceNumber: number; // e.g. 23
  department: 'Ultrasound' | 'X-Ray' | 'Laboratory' | 'Consultation' | 'General';
  serviceName: string; // e.g. "Whole Abdomen Ultrasound"
  serviceId?: string;
  patientId: string;
  patientMRN: string;
  patientName: string;
  patientGender?: string;
  patientAge?: number;
  patientPhone?: string;
  invoiceId: string;
  invoiceNumber: string;
  visitId?: string;
  counterNumber: string; // e.g. "Counter 1", "Counter 3", "Ultrasound Room 1"
  status: TokenStatus;
  calledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  estimatedWaitMinutes?: number;
  waitingPosition?: number;
}

export interface CashShiftSession {
  id: string;
  shiftNumber: string; // e.g. "SHIFT-2026-012"
  cashierId: string;
  cashierName: string;
  branchId: string;
  branchName: string;
  counterName: string;
  openedAt: string;
  openingBalance: number; // Initial cash float in drawer
  closedAt?: string;
  status: 'Open' | 'Closed';
  // Automated live calculated collections
  cashCollections: number;
  cardCollections: number;
  bankCollections: number;
  onlineCollections: number;
  creditInvoiced: number;
  // Outflows
  cashExpensesOut: number;
  cashRefunds: number;
  // Reconciliation figures
  cashInHandExpected: number; // opening + cashCollections - cashExpensesOut - cashRefunds
  cashInHandCounted?: number;
  cashDifference?: number; // counted - expected (shortage is negative, excess is positive)
  totalInvoicesCount: number;
  closingNotes?: string;
  closedBy?: string;
}

export interface CashExpenseRecord {
  id: string;
  shiftId: string;
  cashierId: string;
  cashierName: string;
  branchId: string;
  branchName: string;
  amount: number;
  type: 'Cash Out / Expense' | 'Cash In / Float Addition';
  category: string; // e.g. "Stationery & Thermal Rolls", "Emergency Generator Fuel", "Lab Courier", "Drawer Float"
  description: string;
  authorizedBy: string;
  voucherNumber?: string;
  timestamp: string;
}

export type RadiologyModality = 'Ultrasound' | 'X-Ray';

export type ReportStatus =
  | 'Requested'
  | 'Pending'
  | 'Assigned to Typist'
  | 'In Progress'
  | 'Draft'
  | 'Awaiting Doctor Verification'
  | 'Approved'
  | 'Completed'
  | 'Delivered'
  | 'Amended';

export interface RadiologyTemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'measurements';
  defaultValue: string;
  options?: string[];
  required?: boolean;
  unit?: string;
}

export interface RadiologyTemplateSection {
  id: string;
  title: string; // e.g. "LIVER", "GALL BLADDER", "CHEST CAGE & LUNGS"
  fields: RadiologyTemplateField[];
  defaultNormalText: string;
  order: number;
}

export interface RadiologyTemplate {
  id: string;
  title: string; // e.g. "Whole Abdomen Ultrasound", "Chest X-Ray PA View"
  modality: RadiologyModality;
  examinationType: string;
  description: string;
  isDefault: boolean;
  sections: RadiologyTemplateSection[];
  defaultImpression: string;
  defaultAdvice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalShortcut {
  id: string;
  code: string; // e.g. "LIVN", "GBN", "KIDN", "NFX"
  title: string;
  expandedText: string;
  category: string; // e.g. "Abdomen", "Pelvis", "Chest", "Spine", "Extremity", "General"
  modality: 'Ultrasound' | 'X-Ray' | 'All';
  isShared: boolean;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
}

export interface RadiologyStudyImage {
  id: string;
  name: string;
  url: string;
  modality: RadiologyModality;
  capturedAt: string;
  notes?: string;
  isDICOM?: boolean;
}

export interface ReportVersionEntry {
  version: number;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  status: ReportStatus;
  changeSummary: string;
  contentSnapshot: string;
  structuredFindingsSnapshot?: Record<string, string>;
  impressionSnapshot: string;
  amendmentReason?: string;
}

export interface RadiologyStudyReport {
  id: string;
  studyId: string; // e.g. "RAD-2026-0891"
  invoiceId?: string; // Linked cash counter invoice ID
  invoiceNumber?: string;
  patientId: string;
  patientMRN: string;
  patientName: string;
  age: number | string;
  gender: 'Male' | 'Female' | 'Other';
  contactNumber: string;
  examinationDate: string;
  modality: RadiologyModality;
  examinationType: string;
  referringDoctor: string;
  reportingDoctorId: string;
  reportingDoctorName: string;
  reportingDoctorQualification?: string;
  reportingDoctorRegNo?: string;
  digitalSignatureUrl?: string;
  typistId?: string;
  typistName?: string;
  clinicalHistory: string;
  status: ReportStatus;
  reportingMode: 'template' | 'word' | 'hybrid';
  templateId?: string;
  templateTitle?: string;
  structuredFindings: Record<string, string>; // sectionId -> findings text
  freeFormContent: string; // Rich HTML for Word / Hybrid mode
  impression: string;
  recommendations?: string;
  attachedImages: RadiologyStudyImage[];
  version: number;
  versionHistory: ReportVersionEntry[];
  approvedAt?: string;
  approvedByDoctor?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  deliveredTo?: string;
  createdAt: string;
  updatedAt: string;
}



