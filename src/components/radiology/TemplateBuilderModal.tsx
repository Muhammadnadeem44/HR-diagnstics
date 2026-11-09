import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Lock,
  Unlock,
  CheckCircle2,
  Layers,
  FileText,
  Save,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from 'lucide-react';
import { RadiologyTemplate, RadiologyTemplateSection } from '../../types';
import { StorageService } from '../../services/storage';

interface TemplateBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplatesUpdated?: () => void;
}

export const TemplateBuilderModal: React.FC<TemplateBuilderModalProps> = ({
  isOpen,
  onClose,
  onTemplatesUpdated,
}) => {
  const [templates, setTemplates] = useState<RadiologyTemplate[]>(() =>
    StorageService.getRadiologyTemplates()
  );
  const [selectedTemplate, setSelectedTemplate] = useState<RadiologyTemplate | null>(
    () => StorageService.getRadiologyTemplates()[0] || null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editTemplate, setEditTemplate] = useState<RadiologyTemplate | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshTemplates = () => {
    const list = StorageService.getRadiologyTemplates();
    setTemplates(list);
    if (onTemplatesUpdated) onTemplatesUpdated();
  };

  const handleSelectTemplate = (tpl: RadiologyTemplate) => {
    setSelectedTemplate(tpl);
    setIsEditing(false);
    setEditTemplate(null);
  };

  const handleStartEdit = () => {
    if (!selectedTemplate) return;
    setEditTemplate(JSON.parse(JSON.stringify(selectedTemplate)));
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    const newTpl: RadiologyTemplate = {
      id: `tpl_${Date.now()}`,
      title: 'New Clinical Examination Template',
      modality: 'Ultrasound',
      examinationType: 'Ultrasound Examination',
      description: 'Custom diagnostic reporting template.',
      isDefault: false,
      sections: [
        {
          id: `sec_${Date.now()}_1`,
          title: 'PRIMARY OBSERVATION / ORGAN',
          order: 1,
          defaultNormalText: 'Examined anatomical region appears normal in morphology and structure. No acute focal lesion seen.',
          fields: [
            { id: `f_1`, label: 'Size / Dimension', type: 'text', defaultValue: 'Normal' },
            { id: `f_2`, label: 'Echotexture / Density', type: 'text', defaultValue: 'Homogeneous' },
          ],
        },
      ],
      defaultImpression: 'Diagnostic examination within normal physiological limits.',
      defaultAdvice: 'Correlate clinically.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditTemplate(newTpl);
    setIsEditing(true);
  };

  const handleDuplicate = () => {
    if (!selectedTemplate) return;
    const duplicated: RadiologyTemplate = {
      ...JSON.parse(JSON.stringify(selectedTemplate)),
      id: `tpl_dup_${Date.now()}`,
      title: `${selectedTemplate.title} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    StorageService.saveRadiologyTemplate(duplicated);
    refreshTemplates();
    setSelectedTemplate(duplicated);
    showToast(`Template duplicated as "${duplicated.title}".`);
  };

  const handleDelete = () => {
    if (!selectedTemplate) return;
    if (confirm(`Are you sure you want to permanently delete template "${selectedTemplate.title}"?`)) {
      StorageService.deleteRadiologyTemplate(selectedTemplate.id);
      refreshTemplates();
      const remaining = StorageService.getRadiologyTemplates();
      setSelectedTemplate(remaining[0] || null);
      showToast('Template deleted.');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTemplate) return;
    StorageService.saveRadiologyTemplate(editTemplate);
    refreshTemplates();
    setSelectedTemplate(editTemplate);
    setIsEditing(false);
    setEditTemplate(null);
    showToast(`Saved template "${editTemplate.title}" successfully.`);
  };

  // Section Management in Edit Mode
  const handleAddSection = () => {
    if (!editTemplate) return;
    const newSection: RadiologyTemplateSection = {
      id: `sec_${Date.now()}`,
      title: 'NEW ORGAN / SECTION',
      order: (editTemplate.sections.length || 0) + 1,
      defaultNormalText: 'Findings are normal. No abnormality identified.',
      fields: [{ id: `f_${Date.now()}`, label: 'Characteristics', type: 'text', defaultValue: 'Normal' }],
    };
    setEditTemplate({
      ...editTemplate,
      sections: [...editTemplate.sections, newSection],
    });
  };

  const handleRemoveSection = (secIndex: number) => {
    if (!editTemplate) return;
    const updated = editTemplate.sections.filter((_, i) => i !== secIndex);
    setEditTemplate({ ...editTemplate, sections: updated });
  };

  const handleMoveSection = (secIndex: number, direction: 'up' | 'down') => {
    if (!editTemplate) return;
    const sections = [...editTemplate.sections];
    const targetIdx = direction === 'up' ? secIndex - 1 : secIndex + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const temp = sections[secIndex];
    sections[secIndex] = sections[targetIdx];
    sections[targetIdx] = temp;
    setEditTemplate({ ...editTemplate, sections });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Radiology Report Template Builder &amp; Security</h2>
              <p className="text-xs text-slate-400">
                Configure standardized organ sections, normal findings presets, and examination mappings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLocked(!isLocked)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                isLocked
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/80 hover:bg-amber-900/50'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/50'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              {isLocked ? 'Approved (Locked)' : 'Unlocked for Edit'}
            </button>

            <button
              onClick={handleCreateNew}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-semibold flex items-center justify-between">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Template List */}
          <div className="w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex flex-col">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Clinical Templates ({templates.length})
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`p-3 rounded-xl cursor-pointer text-xs transition-all border ${
                    selectedTemplate?.id === tpl.id
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-bold shadow-xs'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold truncate">{tpl.title}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                        tpl.modality === 'Ultrasound'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                          : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
                      }`}
                    >
                      {tpl.modality}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {tpl.sections?.length || 0} Sections • {tpl.examinationType}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Main Panel: View or Edit Template */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto p-6">
            {isEditing && editTemplate ? (
              /* Edit Form */
              <form onSubmit={handleSaveEdit} className="space-y-6 text-xs max-w-4xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-blue-500" />
                    Editing Template: {editTemplate.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save Template
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Template Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={editTemplate.title}
                      onChange={(e) => setEditTemplate({ ...editTemplate, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Modality
                    </label>
                    <select
                      value={editTemplate.modality}
                      onChange={(e) => setEditTemplate({ ...editTemplate, modality: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="Ultrasound">Ultrasound</option>
                      <option value="X-Ray">X-Ray</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mapped Examination Type *
                    </label>
                    <input
                      type="text"
                      required
                      value={editTemplate.examinationType}
                      onChange={(e) => setEditTemplate({ ...editTemplate, examinationType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Default for Exam
                    </label>
                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={editTemplate.isDefault}
                          onChange={(e) => setEditTemplate({ ...editTemplate, isDefault: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-0"
                        />
                        Auto-load as default template
                      </label>
                    </div>
                  </div>
                </div>

                {/* Sections Editor */}
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Report Organ Sections ({editTemplate.sections.length})
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Organ Section
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editTemplate.sections.map((sec, secIdx) => (
                      <div
                        key={sec.id || secIdx}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-mono text-slate-400 font-bold">#{secIdx + 1}</span>
                            <input
                              type="text"
                              value={sec.title}
                              onChange={(e) => {
                                const updated = [...editTemplate.sections];
                                updated[secIdx].title = e.target.value.toUpperCase();
                                setEditTemplate({ ...editTemplate, sections: updated });
                              }}
                              placeholder="ORGAN / SECTION HEADING (e.g. LIVER)"
                              className="font-bold px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white flex-1"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveSection(secIdx, 'up')}
                              disabled={secIdx === 0}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSection(secIdx, 'down')}
                              disabled={secIdx === editTemplate.sections.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSection(secIdx)}
                              className="p-1 text-rose-500 hover:text-rose-600 ml-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                            Default Normal Finding Text for this Section:
                          </label>
                          <textarea
                            rows={2}
                            value={sec.defaultNormalText}
                            onChange={(e) => {
                              const updated = [...editTemplate.sections];
                              updated[secIdx].defaultNormalText = e.target.value;
                              setEditTemplate({ ...editTemplate, sections: updated });
                            }}
                            className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Default Impression */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Default Final Impression
                  </label>
                  <textarea
                    rows={3}
                    value={editTemplate.defaultImpression}
                    onChange={(e) => setEditTemplate({ ...editTemplate, defaultImpression: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </form>
            ) : selectedTemplate ? (
              /* View Mode */
              <div className="space-y-6 text-xs max-w-4xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {selectedTemplate.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          selectedTemplate.modality === 'Ultrasound'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
                        }`}
                      >
                        {selectedTemplate.modality}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1">
                      Mapped to examination: <strong className="text-slate-700 dark:text-slate-300">{selectedTemplate.examinationType}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDuplicate}
                      className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Duplicate
                    </button>
                    <button
                      onClick={handleStartEdit}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 shadow"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Template
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Configured Organ Sections ({selectedTemplate.sections?.length || 0})
                  </h4>

                  <div className="space-y-3">
                    {selectedTemplate.sections?.map((sec, idx) => (
                      <div
                        key={sec.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {idx + 1}. {sec.title}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700/60 leading-relaxed">
                          {sec.defaultNormalText}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
                  <span className="font-bold text-blue-900 dark:text-blue-300 block mb-1">
                    DEFAULT IMPRESSION:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 font-medium">
                    {selectedTemplate.defaultImpression}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
