import React, { useState } from 'react';
import {
  Boxes,
  Cpu,
  ArrowRightLeft,
  ShoppingCart,
  ClipboardCheck,
  Users2,
  FileCheck2,
  BarChart3,
  Settings,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

interface ModulesShowcaseProps {
  onNavigate: (module: string) => void;
}

export const ModulesShowcase: React.FC<ModulesShowcaseProps> = ({ onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const modules = [
    {
      id: 'inventory',
      title: '1. Inventory & Batch Management',
      subtitle: 'Stock, reagents and batch tracking',
      desc: 'Cold-chain storage (2-8°C, -20°C), batch lot expiry alerts, FIFO / FEFO automated dispensation, barcode sticker printing, and min/max safety limits.',
      icon: Boxes,
      color: 'from-teal-500 to-emerald-600',
      tag: 'Core Stock',
    },
    {
      id: 'assets',
      title: '2. Equipment & CMMS Maintenance',
      subtitle: 'Biomedical assets & maintenance logs',
      desc: 'Biomedical asset registry, preventative maintenance schedules, breakdown tickets, calibration certificates, vendor warranty, and depreciation calculator.',
      icon: Cpu,
      color: 'from-blue-500 to-indigo-600',
      tag: 'CMMS',
    },
    {
      id: 'transfers',
      title: '3. Inter-Branch Stock Transfers',
      subtitle: 'Inter-branch dispatch & transit tracking',
      desc: 'Transfer dispatch challans, in-transit cold-chain tracking, vehicle verification, barcode scanning at receiving branch, and automatic inventory reconciliation.',
      icon: ArrowRightLeft,
      color: 'from-cyan-500 to-blue-600',
      tag: 'Logistics',
    },
    {
      id: 'procurement',
      title: '4. Procurement & GRN Receiving',
      subtitle: 'Purchase orders (PO) and goods receipt (GRN)',
      desc: 'Doctor & Head of Department requisition, multi-tier PO approvals, Good Receipt Note (GRN) with lot inspection, batch assignment, and vendor invoices.',
      icon: ShoppingCart,
      color: 'from-amber-500 to-orange-600',
      tag: 'Supply Chain',
    },
    {
      id: 'audits',
      title: '5. Physical Stock Audits',
      subtitle: 'Physical count and variance inspection',
      desc: 'Blind physical cycle counts, barcode scan reconciliation, variance detection (shortage/surplus), wastage write-offs, and auditor sign-offs.',
      icon: ClipboardCheck,
      color: 'from-purple-500 to-violet-600',
      tag: 'Auditing',
    },
    {
      id: 'vendors',
      title: '6. Vendor & Supplier Directory',
      subtitle: 'Supplier directory & performance ratings',
      desc: 'Supplier contact records, ISO certification validity, on-time delivery ratings, price catalog contracts, and authorized diagnostic dealership records.',
      icon: Users2,
      color: 'from-pink-500 to-rose-600',
      tag: 'Suppliers',
    },
    {
      id: 'compliance',
      title: '7. ISO 15189 & Compliance Quality',
      subtitle: 'Quality control, expiry protocols & MSDS',
      desc: 'Temperature logs (cold room & deep freezers), batch recall quarantine, Material Safety Data Sheets (MSDS), hazardous disposal logs, and CAPA corrective actions.',
      icon: FileCheck2,
      color: 'from-emerald-500 to-teal-600',
      tag: 'Quality',
    },
    {
      id: 'analytics',
      title: '8. Financial & Consumption Analytics',
      subtitle: 'Cost analysis, ABC valuation & consumption',
      desc: 'ABC Analysis (High value vs fast moving), daily test-cost calculator, batch expiration forecast, monthly departmental consumption, and automated PDF export.',
      icon: BarChart3,
      color: 'from-indigo-500 to-purple-600',
      tag: 'Reports',
    },
    {
      id: 'settings',
      title: '9. Hierarchy & System Branding',
      subtitle: 'Company logo, branch network & admin settings',
      desc: 'Admin logo change (upload image or preset), lab name customization, multi-branch network hierarchy, RBAC user permissions, and encrypted database backup.',
      icon: Settings,
      color: 'from-slate-700 to-slate-900',
      tag: 'Admin & Logo',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
              <Boxes className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Enterprise Clinical Modules
            </h3>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Operational Suite
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Diagnostic inventory, asset tracking, transfers, and compliance modules — Select to access:
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct shortcut to change logo */}
          <button
            onClick={() => onNavigate('settings')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300 transition"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Change Logo</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800"
          >
            {isExpanded ? 'Collapse' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Grid of Modules */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 hover:border-teal-400 hover:bg-white dark:border-slate-800 dark:bg-slate-950/30 dark:hover:border-teal-500 dark:hover:bg-slate-850 cursor-pointer transition shadow-2xs hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${mod.color} text-white shadow-xs`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition">
                          {mod.title}
                        </h4>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {mod.subtitle}
                        </span>
                      </div>
                    </div>
                    <span className="rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[9px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                      {mod.tag}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {mod.desc}
                  </p>
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t border-slate-200/60 pt-2.5 text-xs font-bold text-teal-600 dark:border-slate-800/80 dark:text-teal-400 group-hover:translate-x-0.5 transition-transform">
                  <span className="text-[11px]">Open Module</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
