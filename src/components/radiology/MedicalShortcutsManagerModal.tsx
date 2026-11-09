import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Search,
  Plus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Copy,
} from 'lucide-react';
import { MedicalShortcut } from '../../types';
import { StorageService } from '../../services/storage';

interface MedicalShortcutsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShortcutsUpdated?: () => void;
}

export const MedicalShortcutsManagerModal: React.FC<MedicalShortcutsManagerModalProps> = ({
  isOpen,
  onClose,
  onShortcutsUpdated,
}) => {
  const [shortcuts, setShortcuts] = useState<MedicalShortcut[]>(() =>
    StorageService.getMedicalShortcuts()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedModality, setSelectedModality] = useState<string>('All');

  // Edit / Create Form Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<MedicalShortcut>>({
    code: '',
    title: '',
    expandedText: '',
    category: 'Abdomen',
    modality: 'All',
    isShared: true,
    isActive: true,
  });

  // Excel Import State
  const [importPreview, setImportPreview] = useState<{
    newShortcuts: MedicalShortcut[];
    duplicates: string[];
    invalidRows: number;
  } | null>(null);
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refreshList = () => {
    const list = StorageService.getMedicalShortcuts();
    setShortcuts(list);
    if (onShortcutsUpdated) onShortcutsUpdated();
  };

  const handleOpenCreate = () => {
    setEditForm({
      code: '',
      title: '',
      expandedText: '',
      category: 'Abdomen',
      modality: 'All',
      isShared: true,
      isActive: true,
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (sc: MedicalShortcut) => {
    setEditForm({ ...sc });
    setIsEditing(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.code || !editForm.expandedText) {
      alert('Shortcut code and expanded text are required.');
      return;
    }

    const cleanedCode = editForm.code.toUpperCase().trim();
    const newRecord: MedicalShortcut = {
      id: editForm.id || `sc_${Date.now()}`,
      code: cleanedCode,
      title: editForm.title?.trim() || `${cleanedCode} Phrase`,
      expandedText: editForm.expandedText.trim(),
      category: editForm.category || 'General',
      modality: (editForm.modality as any) || 'All',
      isShared: editForm.isShared ?? true,
      createdBy: editForm.createdBy || 'Authorized Medical Staff',
      isActive: editForm.isActive ?? true,
      createdAt: editForm.createdAt || new Date().toISOString(),
    };

    StorageService.saveMedicalShortcut(newRecord);
    refreshList();
    setIsEditing(false);
    showToast(`Saved shortcut [${cleanedCode}] successfully.`);
  };

  const handleDelete = (id: string, code: string) => {
    if (confirm(`Are you sure you want to delete medical shortcut [${code}]?`)) {
      StorageService.deleteMedicalShortcut(id);
      refreshList();
      showToast(`Deleted shortcut [${code}].`);
    }
  };

  // Excel Template Download
  const handleDownloadTemplate = () => {
    const templateRows = [
      ['Shortcut Code', 'Expanded Text', 'Category', 'Modality', 'Description', 'Status'],
      ['LIVN', 'Liver is normal in size and homogeneous in echotexture. No focal lesion.', 'Abdomen', 'Ultrasound', 'Normal Liver', 'Active'],
      ['CHESTN', 'Trachea is central. Both lung fields are clear. No consolidation or effusion.', 'Chest', 'X-Ray', 'Normal Chest X-Ray', 'Active'],
      ['NFX', 'No obvious bone fracture or dislocation is identified.', 'Orthopedic', 'X-Ray', 'No Fracture', 'Active'],
      ['URNORM', 'الٹراساؤنڈ معائنے میں تمام اندرونی اعضاء کی ساخت اور سائز بالکل معمول کے مطابق ہے۔', 'General', 'All', 'Urdu Normal Scan', 'Active'],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Medical Shortcuts Template');
    XLSX.writeFile(wb, 'Medical_Shortcuts_Import_Template.xlsx');
  };

  // Excel Export
  const handleExportExcel = () => {
    const rows = [
      ['Shortcut Code', 'Title', 'Expanded Text', 'Category', 'Modality', 'Created By', 'Status'],
      ...shortcuts.map((s) => [
        s.code,
        s.title,
        s.expandedText,
        s.category,
        s.modality,
        s.createdBy,
        s.isActive ? 'Active' : 'Inactive',
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Medical Shortcuts Library');
    XLSX.writeFile(wb, `HR_Medical_Shortcuts_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Excel Import File Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) {
          alert('Excel file is empty or missing headers.');
          return;
        }

        const currentShortcuts = StorageService.getMedicalShortcuts();
        const currentCodes = new Set(currentShortcuts.map((c) => c.code.toUpperCase()));

        const parsedShortcuts: MedicalShortcut[] = [];
        const duplicatesFound: string[] = [];
        let invalidCount = 0;

        // Skip header row
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0] || !row[1]) {
            if (row && (row[0] || row[1])) invalidCount++;
            continue;
          }

          const code = String(row[0]).trim().toUpperCase();
          const expandedText = String(row[1]).trim();
          const category = row[2] ? String(row[2]).trim() : 'General';
          const modality = row[3] ? String(row[3]).trim() : 'All';
          const title = row[4] ? String(row[4]).trim() : `${code} Phrase`;

          if (currentCodes.has(code)) {
            duplicatesFound.push(code);
          }

          parsedShortcuts.push({
            id: `sc_imp_${Date.now()}_${i}`,
            code,
            title,
            expandedText,
            category,
            modality: (['Ultrasound', 'X-Ray', 'All'].includes(modality) ? modality : 'All') as any,
            isShared: true,
            createdBy: 'Excel Import',
            isActive: true,
            createdAt: new Date().toISOString(),
          });
        }

        setImportPreview({
          newShortcuts: parsedShortcuts,
          duplicates: duplicatesFound,
          invalidRows: invalidCount,
        });
      } catch (err) {
        console.error('Failed to parse Excel file', err);
        alert('Failed to parse file. Please ensure it is a valid .xlsx or .csv file.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    const res = StorageService.bulkImportMedicalShortcuts(
      importPreview.newShortcuts,
      overwriteDuplicates
    );
    refreshList();
    setImportPreview(null);
    showToast(
      `Imported ${res.added} new shortcut(s). Updated ${res.updated} existing. Skipped ${res.skipped}.`
    );
  };

  // Filtered List
  const filteredShortcuts = shortcuts.filter((sc) => {
    const matchesSearch =
      sc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sc.expandedText.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'All' || sc.category === selectedCategory;
    const matchesModality =
      selectedModality === 'All' || sc.modality === selectedModality || sc.modality === 'All';

    return matchesSearch && matchesCategory && matchesModality;
  });

  const categories = ['All', 'Abdomen', 'Pelvis', 'Chest', 'Spine', 'Orthopedic', 'General'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Medical Text Expansion &amp; Shortcut Manager</h2>
              <p className="text-xs text-slate-400">
                Type shortcut code followed by Space/Tab in reporting workspace for instant phrase expansion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              title="Download Excel Template"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Template (.xlsx)
            </button>

            <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              Import Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              Export
            </button>

            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Shortcut
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-semibold flex items-center justify-between">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Excel Import Preview Modal / Banner */}
        {importPreview && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Excel Import Preview ({importPreview.newShortcuts.length} Total Rows Detected)
                </h4>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  Found {importPreview.newShortcuts.length - importPreview.duplicates.length} new codes,{' '}
                  <span className="font-semibold text-amber-600">{importPreview.duplicates.length} duplicate codes</span>
                  {importPreview.invalidRows > 0 && ` (${importPreview.invalidRows} skipped empty rows)`}.
                </p>
                {importPreview.duplicates.length > 0 && (
                  <label className="flex items-center gap-2 mt-2 font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overwriteDuplicates}
                      onChange={(e) => setOverwriteDuplicates(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    Overwrite existing matching shortcut codes with new content from Excel
                  </label>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setImportPreview(null)}
                  className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow"
                >
                  Confirm &amp; Import
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code (e.g. LIVN, GBN), phrase title, or expanded clinical text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Category:</span>
            <div className="flex items-center gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Modality:</span>
            <select
              value={selectedModality}
              onChange={(e) => setSelectedModality(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:ring-0"
            >
              <option value="All">All Modalities</option>
              <option value="Ultrasound">Ultrasound Only</option>
              <option value="X-Ray">X-Ray Only</option>
            </select>
          </div>
        </div>

        {/* Shortcuts Table / Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredShortcuts.map((sc) => (
              <div
                key={sc.id}
                className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 hover:shadow-md transition-shadow relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 font-mono font-black text-sm bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800">
                        {sc.code}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {sc.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => handleOpenEdit(sc)}
                        title="Edit shortcut"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(sc.id, sc.code)}
                        title="Delete shortcut"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p
                    className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 mb-3"
                    dir={/[\u0600-\u06FF]/.test(sc.expandedText) ? 'rtl' : 'ltr'}
                  >
                    {sc.expandedText}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-medium">
                      {sc.category}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-medium text-slate-600 dark:text-slate-300">
                      {sc.modality}
                    </span>
                  </div>
                  <span className="italic">{sc.createdBy}</span>
                </div>
              </div>
            ))}

            {filteredShortcuts.length === 0 && (
              <div className="col-span-2 py-16 text-center text-slate-400">
                <Sparkles className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-semibold">No medical shortcuts found matching your criteria</p>
                <p className="text-xs mt-1">Click "New Shortcut" or import your Excel library above</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredShortcuts.length} of {shortcuts.length} shortcuts in library</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>

        {/* Modal: Add / Edit Shortcut */}
        {isEditing && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {editForm.id ? `Edit Shortcut [${editForm.code}]` : 'Create New Medical Shortcut'}
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shortcut Code (Uppercase, letters/numbers, e.g. LIVN, GBN, CHESTN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.code || ''}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. LIVN"
                    className="w-full font-mono font-bold tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phrase Title / Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.title || ''}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="e.g. Normal Liver Ultrasound Findings"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Organ / Category
                    </label>
                    <select
                      value={editForm.category || 'Abdomen'}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="Abdomen">Abdomen</option>
                      <option value="Pelvis">Pelvis</option>
                      <option value="Chest">Chest</option>
                      <option value="Spine">Spine</option>
                      <option value="Orthopedic">Orthopedic</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Modality
                    </label>
                    <select
                      value={editForm.modality || 'All'}
                      onChange={(e) => setEditForm({ ...editForm, modality: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="All">All Modalities</option>
                      <option value="Ultrasound">Ultrasound</option>
                      <option value="X-Ray">X-Ray</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expanded Clinical Paragraph / Observation (English or Urdu) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={editForm.expandedText || ''}
                    onChange={(e) => setEditForm({ ...editForm, expandedText: e.target.value })}
                    placeholder="Type the full medical paragraph that will replace the code upon typing Space or Tab..."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
                    dir={/[\u0600-\u06FF]/.test(editForm.expandedText || '') ? 'rtl' : 'ltr'}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow"
                  >
                    Save Shortcut
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
