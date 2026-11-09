import React, { useState } from 'react';
import {
  Image,
  Upload,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Dna,
  Microscope,
  FlaskConical,
  Activity,
  Shield,
  Building2,
  HeartPulse,
  Eye,
  Check,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { SystemBranding } from '../../types';
import { BrandLogo } from '../common/BrandLogo';

interface BrandingSettingsProps {
  onBrandingChange?: (branding: SystemBranding) => void;
}

export const BrandingSettings: React.FC<BrandingSettingsProps> = ({ onBrandingChange }) => {
  const [branding, setBranding] = useState<SystemBranding>(() => StorageService.getSystemBranding());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState(branding.logoUrl || '');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image file size is too large (max 2MB recommended for optimal performance).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const updated: SystemBranding = {
          ...branding,
          logoType: 'image',
          logoUrl: dataUrl,
        };
        setBranding(updated);
        setImageUrlInput(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!imageUrlInput.trim()) return;
    const updated: SystemBranding = {
      ...branding,
      logoType: 'image',
      logoUrl: imageUrlInput.trim(),
    };
    setBranding(updated);
  };

  const handleSelectPreset = (presetIcon: SystemBranding['presetIcon']) => {
    const updated: SystemBranding = {
      ...branding,
      logoType: 'preset',
      presetIcon,
    };
    setBranding(updated);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    StorageService.saveSystemBranding(branding);
    if (onBrandingChange) onBrandingChange(branding);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handleReset = () => {
    if (confirm('Reset logo and branding back to system default (HR DIAGNOSTICS)?')) {
      StorageService.resetSystemBranding();
      const def = StorageService.getSystemBranding();
      setBranding(def);
      setImageUrlInput('');
      if (onBrandingChange) onBrandingChange(def);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const presets = [
    { id: 'dna', label: 'DNA Helix', icon: Dna },
    { id: 'microscope', label: 'Microscope', icon: Microscope },
    { id: 'flask', label: 'Reagent Flask', icon: FlaskConical },
    { id: 'heart', label: 'Cardiology', icon: HeartPulse },
    { id: 'shield', label: 'Diagnostic Shield', icon: Shield },
    { id: 'building', label: 'Hospital / Lab', icon: Building2 },
    { id: 'activity', label: 'Clinical Activity', icon: Activity },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Save banner feedback */}
      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Branding and Logo saved successfully! System header and reports have been updated.</span>
        </div>
      )}

      {/* Main Form Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Company Logo & System Branding Customization
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Administrators can configure the company or laboratory logo, organization name, and official tagline
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset Default
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-700 transition"
            >
              <Check className="h-4 w-4" />
              Save Logo & Branding
            </button>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/60 dark:bg-teal-950/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Live Header & Report Preview
            </span>
            <span className="text-[10px] text-teal-700 dark:text-teal-400 font-mono">
              Mode: {branding.logoType.toUpperCase()}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-4 shadow-xs dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
            {/* Logo in preview */}
            <BrandLogo branding={branding} size="md" showText={true} />

            <div className="text-right text-[10px] text-slate-400 font-mono">
              <span>Will appear on: Navbar, Sidebar, Challans & Stickers</span>
            </div>
          </div>
        </div>

        {/* Logo Selection Mode Tabs */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Choose Logo Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setBranding({ ...branding, logoType: 'image' })}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition ${
                branding.logoType === 'image'
                  ? 'border-teal-600 bg-teal-50/70 text-teal-700 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-300 ring-2 ring-teal-500/20'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400'
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>Custom Image / File</span>
              <span className="text-[10px] font-normal opacity-80">PNG, JPG, SVG</span>
            </button>

            <button
              type="button"
              onClick={() => setBranding({ ...branding, logoType: 'preset', presetIcon: branding.presetIcon || 'dna' })}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition ${
                branding.logoType === 'preset'
                  ? 'border-teal-600 bg-teal-50/70 text-teal-700 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-300 ring-2 ring-teal-500/20'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Medical Preset Icons</span>
              <span className="text-[10px] font-normal opacity-80">Microscope, DNA, etc.</span>
            </button>

            <button
              type="button"
              onClick={() => setBranding({ ...branding, logoType: 'text' })}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition ${
                branding.logoType === 'text'
                  ? 'border-teal-600 bg-teal-50/70 text-teal-700 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-300 ring-2 ring-teal-500/20'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400'
              }`}
            >
              <span className="text-sm font-black uppercase tracking-tight">{branding.shortCode || 'HR'}</span>
              <span>Monogram / Initials</span>
              <span className="text-[10px] font-normal opacity-80">Gradient Short Code</span>
            </button>
          </div>
        </div>

        {/* Option 1: Custom Image Upload */}
        {branding.logoType === 'image' && (
          <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="h-4 w-4 text-teal-600" />
              Upload Company Logo
            </h4>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Image Preview Box */}
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center border-2 border-dashed border-slate-300 bg-transparent p-2 dark:border-slate-700 overflow-hidden">
                {branding.logoUrl ? (
                  <>
                    <img
                      src={branding.logoUrl}
                      alt="Uploaded Logo"
                      className="h-full w-full"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                        borderRadius: 0,
                        objectFit: 'contain',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setBranding({ ...branding, logoUrl: '' })}
                      className="absolute top-1 right-1 rounded-full bg-red-600 p-1 text-white shadow hover:bg-red-700"
                      title="Remove Logo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-center text-slate-400">
                    <Image className="mx-auto h-6 w-6" />
                    <span className="text-[9px]">No Logo</span>
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="flex-1 space-y-2 w-full">
                <label className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-700 cursor-pointer transition">
                  <Upload className="h-4 w-4" />
                  <span>Choose Image File (PNG, JPG, SVG, WebP)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-500">
                  Recommended: Transparent PNG or SVG, square or horizontal aspect ratio, up to 2MB.
                </p>

                {/* Direct Image URL input */}
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Or Enter Image Web URL:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Option 2: Medical Preset Icons */}
        {branding.logoType === 'preset' && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Select Preset Medical & Diagnostic Icon
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {presets.map((preset) => {
                const Icon = preset.icon;
                const isSelected = (branding.presetIcon || 'dna') === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id as any)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center transition ${
                      isSelected
                        ? 'border-teal-600 bg-teal-600 text-white shadow-md'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-teal-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-[11px] font-bold">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Company & Software Information Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Organization / Lab Name *
            </label>
            <input
              type="text"
              required
              value={branding.companyName}
              onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
              placeholder="e.g. HR DIAGNOSTICS"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Short Initials / Monogram
            </label>
            <input
              type="text"
              maxLength={4}
              value={branding.shortCode}
              onChange={(e) => setBranding({ ...branding, shortCode: e.target.value.toUpperCase() })}
              placeholder="HR"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-mono font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white uppercase focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tagline / Subtitle
            </label>
            <input
              type="text"
              value={branding.tagline}
              onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
              placeholder="e.g. Enterprise Inventory & CMMS System"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              System Version Badge
            </label>
            <input
              type="text"
              value={branding.badgeText}
              onChange={(e) => setBranding({ ...branding, badgeText: e.target.value })}
              placeholder="PRO 2.5"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Save footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition"
          >
            <Check className="h-4 w-4" />
            Save Logo & Branding Changes
          </button>
        </div>
      </div>
    </div>
  );
};
