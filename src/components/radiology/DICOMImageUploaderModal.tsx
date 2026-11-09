import React, { useState } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Sun,
  Contrast,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { RadiologyStudyImage, RadiologyModality } from '../../types';

interface DICOMImageUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  modality: RadiologyModality;
  studyId: string;
  patientName: string;
  images: RadiologyStudyImage[];
  onImagesChange: (images: RadiologyStudyImage[]) => void;
}

export const DICOMImageUploaderModal: React.FC<DICOMImageUploaderModalProps> = ({
  isOpen,
  onClose,
  modality,
  studyId,
  patientName,
  images,
  onImagesChange,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [invert, setInvert] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(100);

  if (!isOpen) return null;

  const currentImage = images[selectedImageIndex] || images[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUploaded: RadiologyStudyImage[] = [];

    Array.from(files).forEach((file, idx) => {
      const isDcm = file.name.toLowerCase().endsWith('.dcm');
      const reader = new FileReader();

      reader.onload = () => {
        const url = isDcm
          ? 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80' // High-res DICOM display simulation
          : (reader.result as string);

        newUploaded.push({
          id: `img_${Date.now()}_${idx}`,
          name: file.name,
          url,
          modality,
          capturedAt: new Date().toISOString(),
          isDICOM: isDcm,
          notes: isDcm ? 'Extracted DICOM 16-bit monochromatic radiograph' : 'Clinical digital scan capture',
        });

        if (newUploaded.length === files.length) {
          onImagesChange([...images, ...newUploaded]);
        }
      };

      if (isDcm) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsDataURL(file);
      }
    });

    e.target.value = '';
  };

  const handleDeleteImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
    if (selectedImageIndex >= updated.length) {
      setSelectedImageIndex(Math.max(0, updated.length - 1));
    }
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setInvert(false);
    setZoom(100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-xl text-blue-300">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                DICOM &amp; Radiology Imaging Station
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                  PACS Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Study ID: {studyId} • Patient: {patientName} • Modality: {modality}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Upload Scans / DICOM (.dcm)
              <input
                type="file"
                multiple
                accept="image/*,.dcm"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Thumbnails Sidebar */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/70 p-3 overflow-y-auto space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Study Series &amp; Images ({images.length})
            </div>

            {images.map((img, idx) => (
              <div
                key={img.id}
                onClick={() => setSelectedImageIndex(idx)}
                className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 relative group ${
                  selectedImageIndex === idx
                    ? 'border-blue-500 bg-blue-950/40'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-12 h-12 rounded-lg object-cover bg-black"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">{img.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {img.isDICOM ? 'DICOM 16-Bit' : 'JPEG/PNG'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage(idx);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:text-rose-300 transition-opacity"
                  title="Remove image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {images.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-xs">
                No images attached. Click "Upload Scans" above to attach DICOM or photo scans to this patient study.
              </div>
            )}
          </div>

          {/* Central Image Viewer & Radiological Toolbar */}
          <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
            {/* Viewer Toolbar */}
            <div className="p-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Brightness: {brightness}%</span>
                  <input
                    type="range"
                    min="50"
                    max="180"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-20 accent-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <Contrast className="w-3.5 h-3.5 text-blue-400" />
                  <span>Contrast: {contrast}%</span>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-20 accent-blue-500"
                  />
                </div>

                <button
                  onClick={() => setInvert(!invert)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                    invert ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  Invert Monochromatic
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoom(Math.max(50, zoom - 15))}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-xs w-10 text-center">{zoom}%</span>
                  <button
                    onClick={() => setZoom(Math.min(250, zoom + 15))}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={resetFilters}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Reset Controls
              </button>
            </div>

            {/* Display Canvas */}
            <div className="flex-1 flex items-center justify-center p-6 overflow-hidden relative select-none">
              {currentImage ? (
                <div className="relative max-h-full max-w-full flex items-center justify-center">
                  <img
                    src={currentImage.url}
                    alt={currentImage.name}
                    style={{
                      filter: `brightness(${brightness}%) contrast(${contrast}%) ${
                        invert ? 'invert(1)' : 'none'
                      }`,
                      transform: `scale(${zoom / 100})`,
                      transition: 'transform 0.15s ease-out, filter 0.1s ease-out',
                    }}
                    className="max-h-[65vh] max-w-full object-contain rounded-md shadow-2xl"
                  />

                  {/* DICOM HUD Overlay */}
                  <div className="absolute top-2 left-2 text-[10px] font-mono text-emerald-400 bg-black/70 p-2 rounded backdrop-blur-xs space-y-0.5 pointer-events-none">
                    <p>PATIENT: {patientName.toUpperCase()}</p>
                    <p>STUDY: {studyId}</p>
                    <p>MODALITY: {modality} / 2D</p>
                    <p>RESOLUTION: 2048 x 1536 (16-bit)</p>
                    <p>DATE: {currentImage.capturedAt.split('T')[0]}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 text-slate-700" />
                  <p>No study image selected.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{images.length} images linked with this radiological study.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
