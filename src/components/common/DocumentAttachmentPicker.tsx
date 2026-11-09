import React, { useState } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Eye,
  Trash2,
  X,
  FileCheck,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { DocumentAttachment } from '../../types';

interface DocumentAttachmentPickerProps {
  attachments: DocumentAttachment[];
  onChange: (attachments: DocumentAttachment[]) => void;
  title?: string;
  description?: string;
  readOnly?: boolean;
}

export const DocumentAttachmentPicker: React.FC<DocumentAttachmentPickerProps> = ({
  attachments,
  onChange,
  title = 'Attached Bills, Invoices & Documents',
  description = 'Attach purchase bills, warranty cards, delivery receipts, or equipment photos (Images or PDF up to 5MB).',
  readOnly = false,
}) => {
  const [previewDoc, setPreviewDoc] = useState<DocumentAttachment | null>(null);
  const [docCategory, setDocCategory] = useState<DocumentAttachment['category']>('Invoice / Bill');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Check size limit: max 6MB for localStorage base64 safety
      if (file.size > 6 * 1024 * 1024) {
        alert(`File "${file.name}" is larger than 6MB. Please upload a smaller compressed image or PDF.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImage = file.type.startsWith('image/');

        const newDoc: DocumentAttachment = {
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          fileType: isPdf ? 'pdf' : isImage ? 'image' : 'other',
          fileName: file.name,
          fileSize: file.size,
          dataUrl,
          uploadedAt: new Date().toISOString(),
          category: docCategory,
        };

        onChange([...attachments, newDoc]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  const handleDelete = (docId: string) => {
    onChange(attachments.filter((d) => d.id !== docId));
  };

  const formatFileSize = (bytes?: number | string) => {
    if (!bytes) return '';
    const num = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
    if (isNaN(num)) return typeof bytes === 'string' ? bytes : '';
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            {title}
          </label>
          <p className="text-[11px] text-slate-500">{description}</p>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">
          {attachments.length} Document{attachments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Upload Control */}
      {!readOnly && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={docCategory}
            onChange={(e) => setDocCategory(e.target.value as any)}
            className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 focus:outline-none"
          >
            <option value="Invoice / Bill">Tax Invoice / Bill</option>
            <option value="Warranty / Contract">Warranty Card / AMC</option>
            <option value="Delivery Challan">Delivery Challan / GRN</option>
            <option value="Calibration Certificate">Calibration Certificate</option>
            <option value="Photo">Equipment / Asset Photo</option>
            <option value="Other">Other Document</option>
          </select>

          <label className="relative flex-1 flex items-center justify-center gap-2 cursor-pointer rounded-xl border border-dashed border-teal-300 bg-teal-50/60 px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 transition">
            <Upload className="h-4 w-4" />
            <span>Upload Bill / Document (PDF, PNG, JPG)</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFileUpload}
              className="sr-only"
            />
          </label>
        </div>
      )}

      {/* Attached Documents List */}
      {attachments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {attachments.map((doc) => {
            const isPdf = doc.fileType === 'pdf';
            const isImage = doc.fileType === 'image';

            return (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isPdf
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                        : isImage
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {isPdf ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </div>

                  <div className="overflow-hidden">
                    <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                      {doc.fileName || doc.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        {doc.category || (isPdf ? 'PDF Bill' : 'Image')}
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    title="View Document"
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      title="Remove Attachment"
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400 dark:border-slate-800">
          No documents or bills attached yet.
        </div>
      )}

      {/* Full Document Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs">
          <div className="flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 font-bold">
                  {previewDoc.fileType === 'pdf' ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {previewDoc.fileName || previewDoc.title}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {previewDoc.category} • {formatFileSize(previewDoc.fileSize)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewDoc.dataUrl && (
                  <a
                    href={previewDoc.dataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open in Tab</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content Preview */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
              {previewDoc.fileType === 'image' && previewDoc.dataUrl ? (
                <img
                  src={previewDoc.dataUrl}
                  alt={previewDoc.title}
                  className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-md"
                />
              ) : previewDoc.fileType === 'pdf' && previewDoc.dataUrl ? (
                <iframe
                  src={previewDoc.dataUrl}
                  title={previewDoc.title}
                  className="w-full h-[70vh] rounded-xl border border-slate-200 dark:border-slate-800"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Preview not directly available in frame
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Use the "Open in Tab" button above to view or download.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
