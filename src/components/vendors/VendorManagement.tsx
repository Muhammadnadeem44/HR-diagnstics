import React, { useState } from 'react';
import {
  Users2,
  Plus,
  Search,
  Star,
  Calendar,
  Phone,
  Mail,
  Building,
  FileText,
  AlertTriangle,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { Vendor, ContractRecord } from '../../types';

export const VendorManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [selectedVendorForContract, setSelectedVendorForContract] = useState<Vendor | null>(null);

  const vendors = StorageService.getVendors();

  // Filter vendors
  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Form State for Vendor
  const [formData, setFormData] = useState<{
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    ntnNumber: string;
    gstNumber: string;
    paymentTerms: Vendor['paymentTerms'];
    leadTimeDays: number;
    rating: number;
  }>({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: 'Lahore',
    ntnNumber: '',
    gstNumber: '',
    paymentTerms: 'Net 30',
    leadTimeDays: 7,
    rating: 5,
  });

  // Form State for New AMC Contract
  const [contractForm, setContractForm] = useState<{
    contractNumber: string;
    title: string;
    type: ContractRecord['type'];
    startDate: string;
    endDate: string;
    annualCost: number;
    slaResponseHours: number;
    termsSummary: string;
  }>({
    contractNumber: `AMC-${Date.now().toString().slice(-4)}`,
    title: 'Annual Comprehensive Equipment Maintenance (AMC)',
    type: 'AMC / Service Maintenance',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    annualCost: 350000,
    slaResponseHours: 4,
    termsSummary: '24/7 on-call biomedical engineer support, quarterly PM visits, spare parts included.',
  });

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      contactPerson: '',
      phone: '+92 300 ',
      email: '',
      address: '',
      city: 'Lahore',
      ntnNumber: `NTN-${Math.floor(1000000 + Math.random() * 9000000)}`,
      gstNumber: `GST-03-${Math.floor(100000 + Math.random() * 900000)}`,
      paymentTerms: 'Net 30',
      leadTimeDays: 7,
      rating: 5,
    });
    setIsAddingVendor(true);
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Please enter Vendor Name.');
      return;
    }

    const newVendor: Vendor = {
      id: editingVendor?.id || `v_${Date.now()}`,
      name: formData.name,
      contactPerson: formData.contactPerson,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      city: formData.city,
      ntnNumber: formData.ntnNumber,
      gstNumber: formData.gstNumber,
      paymentTerms: formData.paymentTerms,
      leadTimeDays: formData.leadTimeDays,
      rating: formData.rating,
      contracts: editingVendor?.contracts || [],
    };

    StorageService.saveVendor(newVendor);
    setIsAddingVendor(false);
    setEditingVendor(null);
  };

  const handleDeleteVendor = (id: string) => {
    if (confirm('Are you sure you want to delete this vendor record?')) {
      StorageService.deleteVendor(id);
    }
  };

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorForContract) return;

    const newContract: ContractRecord = {
      id: `cont_${Date.now()}`,
      vendorId: selectedVendorForContract.id,
      vendorName: selectedVendorForContract.name,
      contractNumber: contractForm.contractNumber,
      title: contractForm.title,
      type: contractForm.type,
      startDate: contractForm.startDate,
      endDate: contractForm.endDate,
      annualCost: contractForm.annualCost,
      status: 'Active',
      slaResponseHours: contractForm.slaResponseHours,
      termsSummary: contractForm.termsSummary,
    };

    selectedVendorForContract.contracts = [...(selectedVendorForContract.contracts || []), newContract];
    StorageService.saveVendor(selectedVendorForContract);
    setSelectedVendorForContract(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Vendor Directory & AMC Contracts
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Authorized suppliers, NTN/tax compliance, lead time metrics, and equipment service contract expiries.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Authorized Supplier</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="relative rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <Search className="absolute left-6 top-6 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by vendor name, contact person, city, or email..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
        />
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            <Users2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold text-slate-600 dark:text-slate-300">No vendors registered</p>
            <p className="text-xs mt-1">Add medical diagnostic suppliers and manufacturers.</p>
          </div>
        ) : (
          filteredVendors.map((vendor) => {
            const today = new Date();
            const activeContracts = vendor.contracts?.filter((c) => c.status === 'Active') || [];
            const expiringContract = activeContracts.find((c) => {
              const diffDays = Math.ceil((new Date(c.endDate).getTime() - today.getTime()) / (1000 * 3600 * 24));
              return diffDays <= 45;
            });

            return (
              <div
                key={vendor.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 hover:border-teal-500 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{vendor.name}</h4>
                      <p className="text-xs text-slate-500">{vendor.city} • {vendor.contactPerson}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>{vendor.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> {vendor.phone}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> {vendor.email}
                    </p>
                    <p className="font-mono text-[11px] text-slate-400">
                      NTN: {vendor.ntnNumber} • GST: {vendor.gstNumber}
                    </p>
                  </div>

                  {/* Commercial terms & Lead time */}
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Terms</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{vendor.paymentTerms}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Avg Lead Time</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{vendor.leadTimeDays} Days</p>
                    </div>
                  </div>

                  {/* Active Contracts & AMC */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        AMC / Service Contracts ({vendor.contracts?.length || 0})
                      </span>
                      <button
                        onClick={() => setSelectedVendorForContract(vendor)}
                        className="text-[11px] font-bold text-teal-600 hover:underline dark:text-teal-400"
                      >
                        + Add Contract
                      </button>
                    </div>

                    {vendor.contracts?.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No formal AMC attached.</p>
                    ) : (
                      vendor.contracts?.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-lg bg-slate-50 p-2 text-[11px] dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60"
                        >
                          <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                            <span>{c.title}</span>
                            <span className="text-teal-600 dark:text-teal-400">
                              PKR {c.annualCost?.toLocaleString()}/yr
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Valid until: {c.endDate} • SLA: {c.slaResponseHours}h response
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setEditingVendor(vendor);
                      setFormData({
                        name: vendor.name,
                        contactPerson: vendor.contactPerson,
                        phone: vendor.phone,
                        email: vendor.email,
                        address: vendor.address || '',
                        city: vendor.city || 'Lahore',
                        ntnNumber: vendor.ntnNumber || '',
                        gstNumber: vendor.gstNumber || '',
                        paymentTerms: vendor.paymentTerms,
                        leadTimeDays: vendor.leadTimeDays || 7,
                        rating: vendor.rating,
                      });
                      setIsAddingVendor(true);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteVendor(vendor.id)}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add or Edit Vendor */}
      {isAddingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 my-8">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {editingVendor ? 'Edit Supplier Details' : 'Register Authorized Diagnostic Supplier'}
              </h3>
              <button
                onClick={() => setIsAddingVendor(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company / Vendor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Siemens Healthineers Pakistan"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. Tariq Mehmood (Key Account Mgr)"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City / Region
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Commercial Payment Terms
                  </label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="Immediate">Immediate / Cash on Delivery</option>
                    <option value="Advance">100% Advance Payment</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days Credit</option>
                    <option value="Net 60">Net 60 Days Credit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    NTN Number
                  </label>
                  <input
                    type="text"
                    value={formData.ntnNumber}
                    onChange={(e) => setFormData({ ...formData, ntnNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    GST Registration #
                  </label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingVendor(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Contract / AMC */}
      {selectedVendorForContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Attach Maintenance Contract (AMC)</h3>
                <p className="text-xs text-teal-600 font-semibold">{selectedVendorForContract.name}</p>
              </div>
              <button
                onClick={() => setSelectedVendorForContract(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContract} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contract Title
                </label>
                <input
                  type="text"
                  required
                  value={contractForm.title}
                  onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={contractForm.startDate}
                    onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date (Expiry)
                  </label>
                  <input
                    type="date"
                    required
                    value={contractForm.endDate}
                    onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Annual Cost (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={contractForm.annualCost}
                    onChange={(e) => setContractForm({ ...contractForm, annualCost: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    SLA Max Response (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={contractForm.slaResponseHours}
                    onChange={(e) => setContractForm({ ...contractForm, slaResponseHours: parseInt(e.target.value) || 4 })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scope & Terms Summary
                </label>
                <textarea
                  rows={3}
                  value={contractForm.termsSummary}
                  onChange={(e) => setContractForm({ ...contractForm, termsSummary: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedVendorForContract(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
                >
                  Attach AMC Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
