import React, { useState } from 'react';
import {
  LayoutDashboard,
  Boxes,
  Cpu,
  ArrowLeftRight,
  ShoppingCart,
  ClipboardCheck,
  Users2,
  FileCheck2,
  BarChart3,
  Settings,
  X,
  Search,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Shield,
  Layers,
  Fingerprint,
  Receipt,
  FileText,
} from 'lucide-react';

interface ModulesDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const MODULES_CATALOG = [
  {
    id: 'dashboard',
    title: 'Overview Dashboard',
    shortTag: 'Executive KPIs',
    category: 'Core Operations',
    icon: LayoutDashboard,
    badge: 'Real-time KPIs',
    color: 'from-blue-500 to-indigo-600',
    description:
      'Executive dashboard displaying total inventory valuation in PKR, critical stock alerts, batch expiries, active equipment count, and consolidated multi-branch metrics.',
    features: ['Consolidated PKR Valuation', 'Low Stock & Expiry Alerts', 'Branch Filtering', 'Quick Scan'],
  },
  {
    id: 'inventory',
    title: 'Inventory & Batches',
    shortTag: 'Reagents & Stock',
    category: 'Core Operations',
    icon: Boxes,
    badge: 'FIFO / FEFO',
    color: 'from-teal-500 to-emerald-600',
    description:
      'Manage diagnostic reagents, lab consumables, and test kits with full lot/batch tracking, cold chain temperature controls, reorder triggers, and thermal QR label generation.',
    features: ['Batch & Expiry Management', 'Thermal Adhesive QR Generator', 'Cold Chain (2-8°C / -20°C)', 'Stock In/Out Ledger'],
  },
  {
    id: 'attendance',
    title: 'Attendance & Payroll (ZKTeco)',
    shortTag: 'Biometric & Pay',
    category: 'Core Operations',
    icon: Fingerprint,
    badge: 'ZKTeco & Advances',
    color: 'from-emerald-500 to-teal-700',
    description:
      'Complete hospital staff attendance and automated payroll engine: ZKTeco biometric IP machines & USB .dat imports, shift timing & late deductions, advance salary and loan ledger, and automated salary slip generator.',
    features: ['ZKTeco Biometric Machine Sync', 'TCP/IP LAN & USB Log Import', 'Advance Salary & Loan Repayments', 'Automated Monthly Payslips (PKR)'],
  },
  {
    id: 'billing',
    title: 'Cash Counter & Clinic POS',
    shortTag: 'Cashier & POS',
    category: 'Core Operations',
    icon: Receipt,
    badge: 'Cashier POS & Shifts',
    color: 'from-amber-500 to-orange-600',
    description:
      'Enterprise Clinic Point of Sale (POS) and cashier workstation: Fast touch billing, new patient registration, service catalog management, split/partial payments, shift management with Z-reports, and thermal receipts.',
    features: ['Fast POS Terminal & Cart Grid', 'New Patient Registration & Visits', 'Service Management & Tests', 'Cash Shifts & Z-Report Reconcile'],
  },
  {
    id: 'radiology',
    title: 'Ultrasound & X-Ray Reporting',
    shortTag: 'Radiology Reporting',
    category: 'Core Operations',
    icon: FileText,
    badge: 'AI & Voice Ready',
    color: 'from-blue-600 to-indigo-700',
    description:
      'Diagnostic radiology reporting workstation: Template-based, Microsoft Word-style and hybrid reporting, medical shortcut expansion, voice dictation, DICOM/PACS preview, and digital doctor signature sign-offs.',
    features: ['Dual Mode & Hybrid Workstation', 'Medical Typing Shortcut Engine', 'Voice Dictation (Speech to Text)', 'Native Word (.docx) & PDF Export'],
  },
  {
    id: 'assets',
    title: 'Asset Management (CMMS)',
    shortTag: 'Assets & Machinery',
    category: 'Core Operations',
    icon: Cpu,
    badge: 'CMMS & Calibration',
    color: 'from-cyan-500 to-blue-600',
    description:
      'Complete biomedical asset lifecycle management system: Register hospital analyzers and machinery, track straight-line depreciation, schedule preventive maintenance, monitor calibration due dates, and manage vendor AMC/CMC contracts.',
    features: ['Biomedical Equipment Register', 'Calibration & AMC Schedules', 'Downtime & Repair Logs', 'Depreciation & Thermal QR Tags'],
  },
  {
    id: 'transfers',
    title: 'Warehouse Transfers',
    shortTag: 'Inter-Branch Transit',
    category: 'Logistics & Supply',
    icon: ArrowLeftRight,
    badge: 'In-Transit Verification',
    color: 'from-amber-500 to-orange-600',
    description:
      'Transfer supplies and reagents between Central Warehouse and regional branches. Tracks in-transit status, dispatch manifests, delivery verification, and receiving discrepancies.',
    features: ['Inter-Branch Dispatch', 'Transit Status Tracking', 'Discrepancy Resolution', 'Digital Receiving Signatures'],
  },
  {
    id: 'procurement',
    title: 'Procurement & GRN',
    shortTag: 'PO & Receiving',
    category: 'Logistics & Supply',
    icon: ShoppingCart,
    badge: '3-Tier PO Approval',
    color: 'from-violet-500 to-purple-600',
    description:
      'End-to-end purchasing cycle: Purchase Requisitions, Purchase Orders (PO) with multi-level approval workflows, Goods Receiving Notes (GRN), invoice matching, and return of damaged goods.',
    features: ['3-Tier PO Approval Matrix', 'Goods Receiving Notes (GRN)', 'Delivery Challan Verification', 'Vendor Bill Matching'],
  },
  {
    id: 'audits',
    title: 'Audits & Cycle Counts',
    shortTag: 'Physical Verification',
    category: 'Logistics & Supply',
    icon: ClipboardCheck,
    badge: 'Variance in PKR',
    color: 'from-rose-500 to-red-600',
    description:
      'Conduct scheduled or surprise physical stock inventory audits using optical barcode scanners. Computes physical vs. system variance, financial variance in PKR, and requires Super Admin sign-off.',
    features: ['Optical Scanner Verification', 'Automatic PKR Variance Math', 'Discrepancy Reporting', 'Super Admin Adjustments'],
  },
  {
    id: 'vendors',
    title: 'Vendor Directory',
    shortTag: 'Suppliers & AMC',
    category: 'Logistics & Supply',
    icon: Users2,
    badge: 'DRAP Compliant',
    color: 'from-sky-500 to-indigo-600',
    description:
      'Directory of certified clinical diagnostic suppliers and manufacturers (Roche, Abbott, Sysmex, Siemens). Tracks drug regulatory authority (DRAP) licenses, payment terms, and lead times.',
    features: ['Supplier DRAP Licensing', 'Rating & Performance Matrix', 'Active Supply Contracts', 'Direct Purchase Order Linking'],
  },
  {
    id: 'compliance',
    title: 'Compliance & ISO 15189',
    shortTag: 'Quality Assurance',
    category: 'Governance & Intelligence',
    icon: FileCheck2,
    badge: 'ISO 15189 Standard',
    color: 'from-emerald-500 to-teal-700',
    description:
      'Clinical lab quality assurance: Emergency batch recall and quarantine management, strict Narcotic & Controlled Drug Register with patient MRN logging, and daily refrigerator cold chain logs.',
    features: ['Lot Recall & Quarantine', 'Narcotics Controlled Register', 'Cold Chain Temperature Logs', 'Audit Trail Readiness'],
  },
  {
    id: 'analytics',
    title: 'Analytics & ABC Matrix',
    shortTag: 'Consumption & Costing',
    category: 'Governance & Intelligence',
    icon: BarChart3,
    badge: 'ABC / VED Analysis',
    color: 'from-fuchsia-500 to-pink-600',
    description:
      'Inventory intelligence reports: ABC Value Classification (Pareto 80/20), VED Clinical Matrix (Vital, Essential, Desirable), fast/slow moving stock, and multi-branch consumption trends.',
    features: ['ABC Valuation Matrix', 'Fast vs Slow Moving Stock', 'Consumption Forecasting', 'Multi-Branch Comparison'],
  },
  {
    id: 'settings',
    title: 'Hierarchy, Security & Branding',
    shortTag: 'Admin & Configuration',
    category: 'Governance & Intelligence',
    icon: Settings,
    badge: 'Admin Branding',
    color: 'from-slate-600 to-slate-800',
    description:
      'Configure company logo, corporate name, branch/warehouse/department tree, user accounts with RBAC roles, 2FA security, session controls, and full JSON database backup and restore.',
    features: ['Admin Custom Logo Upload', 'Multi-Branch & Warehouses', 'User Accounts & Roles', 'JSON Disaster Recovery Backup'],
  },
];

export const ModulesDirectoryModal: React.FC<ModulesDirectoryModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = ['all', 'Core Operations', 'Logistics & Supply', 'Governance & Intelligence'];

  const filteredModules = MODULES_CATALOG.filter((m) => {
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.shortTag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.features.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                ClinicERP Enterprise Suite
              </h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                Healthcare Solutions
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Clinical diagnostic workflow & inventory operations — Select a module to switch active workspace
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search features (e.g., logo, transfer, audit, PO)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                  selectedCategory === cat
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'all' ? 'All Modules (10)' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Modules Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModules.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-5 cursor-pointer transition duration-150 ${
                    isActive
                      ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500/20 dark:border-teal-500 dark:bg-teal-950/20'
                      : 'border-slate-200 bg-white hover:border-teal-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-850 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-sm`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 dark:text-white dark:group-hover:text-teal-400 transition">
                              {item.title}
                            </h3>
                            {isActive && (
                              <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            {item.shortTag}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {item.badge}
                      </span>
                    </div>

                    <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {item.description}
                    </p>

                    {/* Feature tags */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.features.map((feat, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded bg-slate-100/90 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        >
                          <CheckCircle2 className="h-3 w-3 text-teal-500" />
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80 text-xs font-semibold text-teal-600 dark:text-teal-400">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      Category: {item.category}
                    </span>
                    <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition">
                      Open Module →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredModules.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm font-semibold text-slate-500">No modules match your search query.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-2 text-xs font-bold text-teal-600 underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-xs text-slate-500">
          <span>Enterprise Inventory & CMMS • 10 Integrated Operational Modules</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-4 py-1.5 font-bold text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
