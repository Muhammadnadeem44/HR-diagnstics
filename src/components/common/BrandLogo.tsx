import React from 'react';
import { SystemBranding } from '../../types';
import { StorageService } from '../../services/storage';
import { HR_DIAGNOSTICS_LOGO_DATA_URL } from '../../assets/hrLogo';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  branding?: SystemBranding;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  branding: propBranding,
  className = '',
  onClick,
}) => {
  const branding = propBranding || StorageService.getSystemBranding();
  const logoSrc = branding.logoUrl || HR_DIAGNOSTICS_LOGO_DATA_URL;

  const boxDimensions =
    size === 'sm'
      ? 'h-8 w-8'
      : size === 'lg'
      ? 'h-12 w-12'
      : 'h-10 w-10';

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 ${onClick ? 'cursor-pointer select-none' : ''} ${className}`}
    >
      {/* Visual Logo Mark - Official HR Diagnostics Transparent Emblem */}
      <div
        className={`relative ${boxDimensions} shrink-0 flex items-center justify-center bg-transparent`}
        style={{ background: 'transparent', border: 'none', boxShadow: 'none', borderRadius: 0 }}
      >
        <img
          src={logoSrc}
          alt={branding.companyName || 'HR Diagnostics Official Logo'}
          className="h-full w-full"
          style={{
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            borderRadius: 0,
            objectFit: 'contain',
          }}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.triedFallback) {
              target.dataset.triedFallback = 'true';
              target.src = '/hr-diagnostics-logo-transparent.png';
            }
          }}
        />
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1
              className={`font-black tracking-tight text-slate-900 dark:text-white truncate ${
                size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
              }`}
            >
              {branding.companyName || 'HR DIAGNOSTICS'}
            </h1>
            {branding.badgeText && (
              <span className="rounded bg-teal-50 px-1.5 py-0.2 text-[9px] font-bold text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                {branding.badgeText}
              </span>
            )}
          </div>
          {branding.tagline && (
            <p
              className={`truncate text-slate-500 dark:text-slate-400 ${
                size === 'sm' ? 'text-[9px]' : 'text-[11px]'
              }`}
            >
              {branding.tagline}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
