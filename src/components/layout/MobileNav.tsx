import React from 'react';
import { LayoutDashboard, Boxes, Camera, Cpu, Menu } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  onSelectTab?: (tab: string) => void;
  setActiveTab?: (tab: string) => void;
  onOpenScanner?: () => void;
  onToggleDrawer?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  setActiveTab,
  onOpenScanner = () => {},
  onToggleDrawer = () => {},
}) => {
  const handleSelect = (tab: string) => {
    if (onSelectTab) onSelectTab(tab);
    if (setActiveTab) setActiveTab(tab);
  };
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
      <button
        onClick={() => handleSelect('dashboard')}
        className={`flex flex-col items-center justify-center gap-1 p-1 text-[10px] font-semibold transition ${
          activeTab === 'dashboard' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        <LayoutDashboard className="h-5 w-5" />
        <span>Overview</span>
      </button>

      <button
        onClick={() => handleSelect('inventory')}
        className={`flex flex-col items-center justify-center gap-1 p-1 text-[10px] font-semibold transition ${
          activeTab === 'inventory' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        <Boxes className="h-5 w-5" />
        <span>Inventory</span>
      </button>

      {/* Floating Center Scan Button */}
      <div className="-mt-6 flex flex-col items-center">
        <button
          onClick={onOpenScanner}
          className="flex h-13 w-13 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-600/40 active:scale-95 transition"
          title="Scan QR / Barcode"
        >
          <Camera className="h-6 w-6" />
        </button>
        <span className="mt-1 text-[9px] font-bold text-slate-600 dark:text-slate-300">Scan</span>
      </div>

      <button
        onClick={() => handleSelect('assets')}
        className={`flex flex-col items-center justify-center gap-1 p-1 text-[10px] font-semibold transition ${
          activeTab === 'assets' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        <Cpu className="h-5 w-5" />
        <span>Asset Mgmt</span>
      </button>

      <button
        onClick={onToggleDrawer}
        className="flex flex-col items-center justify-center gap-1 p-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
      >
        <Menu className="h-5 w-5" />
        <span>More</span>
      </button>
    </nav>
  );
};
