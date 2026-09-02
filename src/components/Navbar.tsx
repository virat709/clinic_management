import React, { useState } from 'react';
import { 
  BookOpen, 
  PackagePlus, 
  Clock, 
  ReceiptText, 
  BarChart3, 
  FileText, 
  Settings, 
  AlertTriangle,
  ShieldCheck,
  Plus,
  Sun,
  Moon,
  Laptop,
  Menu,
  X,
  Maximize2,
  Minimize2,
  Rows,
  AlignJustify
} from 'lucide-react';
import { Medicine, Sale } from '../types';
import { formatCurrency, getDaysUntilExpiry, getTodayDateString } from '../utils/dateUtils';
import { ClinicSettings } from '../utils/storage';
import { UIPreferences, ThemeMode, DensityMode, WidthMode } from '../utils/theme';

interface NavbarProps {
  activeTab: 'inventory' | 'expiry' | 'pos' | 'reports' | 'ledger' | 'settings';
  setActiveTab: (tab: 'inventory' | 'expiry' | 'pos' | 'reports' | 'ledger' | 'settings') => void;
  medicines: Medicine[];
  sales: Sale[];
  settings: ClinicSettings;
  onOpenAddStock: () => void;
  uiPrefs: UIPreferences;
  onUpdateUIPrefs: (newPrefs: Partial<UIPreferences>) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  medicines,
  sales,
  settings,
  onOpenAddStock,
  uiPrefs,
  onUpdateUIPrefs,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  const today = getTodayDateString();
  const todaySales = sales.filter((s) => s.date === today);
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.grandTotal, 0);

  // Expiry counts
  let expiredCount = 0;
  let criticalCount = 0;
  let lowStockCount = 0;
  let totalUnits = 0;

  medicines.forEach((med) => {
    let medStock = 0;
    med.batches.forEach((b) => {
      if (b.status === 'active' && b.quantity > 0) {
        medStock += b.quantity;
        totalUnits += b.quantity;
        const days = getDaysUntilExpiry(b.expDate);
        if (days < 0) expiredCount++;
        else if (days <= 30) criticalCount++;
      } else if (b.status === 'quarantined') {
        expiredCount++;
      }
    });
    if (medStock <= med.minStockThreshold) {
      lowStockCount++;
    }
  });

  const totalExpiryAlerts = expiredCount + criticalCount;

  const handleTabClick = (tab: 'inventory' | 'expiry' | 'pos' | 'reports' | 'ledger' | 'settings') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const cycleTheme = () => {
    const nextTheme: ThemeMode = uiPrefs.theme === 'system' ? 'light' : uiPrefs.theme === 'light' ? 'dark' : 'system';
    onUpdateUIPrefs({ theme: nextTheme });
  };

  const toggleDensity = () => {
    const nextDensity: DensityMode = uiPrefs.density === 'comfortable' ? 'compact' : 'comfortable';
    onUpdateUIPrefs({ density: nextDensity });
  };

  const toggleWidth = () => {
    const nextWidth: WidthMode = uiPrefs.width === 'standard' ? 'wide' : 'standard';
    onUpdateUIPrefs({ width: nextWidth });
  };

  return (
    <header className="bg-slate-900 dark:bg-slate-950 text-white sticky top-0 z-30 shadow-md border-b border-slate-800 dark:border-slate-800 transition-colors">
      {/* Top Header */}
      <div className={`${uiPrefs.width === 'wide' ? 'w-full px-4 sm:px-6' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8'}`}>
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Shop Branding */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md text-white font-black text-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 truncate">
                <span className="font-extrabold text-sm sm:text-base lg:text-lg tracking-tight text-white truncate">
                  {settings.shopName}
                </span>
                <span className="hidden sm:flex text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3" /> Digital Register
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block truncate">
                Lic: {settings.licenseNumber} • Multi-Mode Pharmacy Register
              </p>
            </div>
          </div>

          {/* Quick Real-Time Action & Mode Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            {/* Live Today's Cash Box */}
            <button 
              onClick={() => handleTabClick('reports')}
              className="flex items-center bg-slate-800 hover:bg-slate-700/90 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700 text-left transition-colors cursor-pointer"
              title="Click to view full Daily Sales Register"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse mr-1.5 sm:mr-2 shrink-0" />
              <div>
                <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider leading-none">Today's Sales</p>
                <p className="text-xs sm:text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  {formatCurrency(todayRevenue)} <span className="hidden sm:inline text-xs font-normal text-slate-300">({todaySales.length})</span>
                </p>
              </div>
            </button>

            {/* Expiry Warning Badge */}
            {totalExpiryAlerts > 0 && (
              <button
                onClick={() => handleTabClick('expiry')}
                className={`flex items-center px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  expiredCount > 0
                    ? 'bg-rose-950/90 border-rose-600 text-rose-300 hover:bg-rose-900 animate-pulse'
                    : 'bg-amber-950/90 border-amber-600 text-amber-300 hover:bg-amber-900'
                }`}
                title="Medicines expired or expiring soon"
              >
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" />
                <span className="hidden sm:inline">{totalExpiryAlerts} Expiry Alert{totalExpiryAlerts > 1 ? 's' : ''}</span>
                <span className="sm:hidden">{totalExpiryAlerts}</span>
              </button>
            )}

            {/* Flexible Theme Toggle (Light / Dark / Auto) */}
            <button
              onClick={cycleTheme}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title={`Theme: ${uiPrefs.theme.toUpperCase()} (Click to toggle Light/Dark/Auto)`}
            >
              {uiPrefs.theme === 'dark' ? (
                <Moon className="w-4 h-4 text-sky-400" />
              ) : uiPrefs.theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Laptop className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {/* Layout Density Switcher (Comfortable vs Compact) */}
            <button
              onClick={toggleDensity}
              className="hidden md:flex p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title={`Layout Density: ${uiPrefs.density === 'compact' ? 'Compact' : 'Comfortable'} (Click to toggle)`}
            >
              {uiPrefs.density === 'compact' ? (
                <AlignJustify className="w-4 h-4 text-emerald-400" />
              ) : (
                <Rows className="w-4 h-4 text-slate-300" />
              )}
            </button>

            {/* Full Width Mode Switcher */}
            <button
              onClick={toggleWidth}
              className="hidden lg:flex p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title={`Width: ${uiPrefs.width === 'wide' ? 'Full Width' : 'Standard'} (Click to toggle)`}
            >
              {uiPrefs.width === 'wide' ? (
                <Minimize2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-slate-300" />
              )}
            </button>

            {/* Big Easy Add Stock Button */}
            <button
              id="nav-add-stock-btn"
              onClick={onOpenAddStock}
              className="flex items-center bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm px-3 sm:px-3.5 py-2 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1 stroke-[3]" />
              <span className="hidden sm:inline">Add Stock</span>
              <span className="sm:hidden">Stock</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Horizontal Navigation Bar */}
      <div className="hidden lg:block bg-slate-950 border-t border-slate-800 dark:border-slate-800/80 px-3 sm:px-6 lg:px-8">
        <div className={`${uiPrefs.width === 'wide' ? 'w-full' : 'max-w-7xl mx-auto'} flex items-center space-x-1 py-1.5 overflow-x-auto no-scrollbar`}>
          {/* 1. Billing / Sell Medicine (Primary Priority) */}
          <button
            id="tab-btn-pos"
            onClick={() => handleTabClick('pos')}
            className={`flex items-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'pos'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ReceiptText className="w-4 h-4 mr-1.5" />
            <span>🛒 Billing / Sell Medicine</span>
          </button>

          {/* 2. Daily Sales & Revenue Reports (Second Priority) */}
          <button
            id="tab-btn-reports"
            onClick={() => handleTabClick('reports')}
            className={`flex items-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-1.5" />
            <span>📊 Daily Sales Report</span>
            <span className={`ml-2 text-xs px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'reports' ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              Auto
            </span>
          </button>

          {/* 3. Stock Register */}
          <button
            id="tab-btn-inventory"
            onClick={() => handleTabClick('inventory')}
            className={`flex items-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'inventory'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4 mr-1.5" />
            <span>📖 Stock Register</span>
            <span className={`ml-2 text-xs px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'inventory' ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-300'
            }`}>
              {medicines.length}
            </span>
          </button>

          {/* 4. Expiry Alerts */}
          <button
            id="tab-btn-expiry"
            onClick={() => handleTabClick('expiry')}
            className={`flex items-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'expiry'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 mr-1.5" />
            <span>⏰ Expiry Alerts</span>
            {totalExpiryAlerts > 0 && (
              <span className={`ml-2 text-xs px-2 py-0.2 rounded-full font-mono font-bold ${
                expiredCount > 0 ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
              }`}>
                {totalExpiryAlerts}
              </span>
            )}
          </button>

          {/* 5. Audit Log / In-Out Ledger */}
          <button
            id="tab-btn-ledger"
            onClick={() => handleTabClick('ledger')}
            className={`flex items-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            <span>📜 Stock In/Out Log</span>
          </button>

          {/* 6. Settings */}
          <button
            id="tab-btn-settings"
            onClick={() => handleTabClick('settings')}
            className={`flex items-center px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ml-auto cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 mr-1.5" />
            <span>⚙️ Settings & Modes</span>
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Responsive Menu Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-t border-slate-800 p-4 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-800">
            {/* 1. Billing */}
            <button
              onClick={() => handleTabClick('pos')}
              className={`p-3 rounded-xl text-left text-xs font-bold flex items-center gap-2 ${
                activeTab === 'pos' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <ReceiptText className="w-4 h-4" />
              <span>🛒 Billing / Sell</span>
            </button>

            {/* 2. Daily Sales */}
            <button
              onClick={() => handleTabClick('reports')}
              className={`p-3 rounded-xl text-left text-xs font-bold flex items-center gap-2 ${
                activeTab === 'reports' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>📊 Daily Sales</span>
            </button>

            {/* 3. Stock Register */}
            <button
              onClick={() => handleTabClick('inventory')}
              className={`p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between ${
                activeTab === 'inventory' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Stock Register</span>
              </div>
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-black/30">{medicines.length}</span>
            </button>

            {/* 4. Expiry Alerts */}
            <button
              onClick={() => handleTabClick('expiry')}
              className={`p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between ${
                activeTab === 'expiry' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Expiry Alerts</span>
              </div>
              {totalExpiryAlerts > 0 && (
                <span className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                  expiredCount > 0 ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {totalExpiryAlerts}
                </span>
              )}
            </button>

            {/* 5. Stock In/Out */}
            <button
              onClick={() => handleTabClick('ledger')}
              className={`p-3 rounded-xl text-left text-xs font-bold flex items-center gap-2 ${
                activeTab === 'ledger' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Stock In/Out</span>
            </button>

            {/* 6. Settings */}
            <button
              onClick={() => handleTabClick('settings')}
              className={`p-3 rounded-xl text-left text-xs font-bold flex items-center gap-2 ${
                activeTab === 'settings' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-300'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>

          {/* Quick UI preferences toggles in mobile drawer */}
          <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
            <span>Theme Mode:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(['light', 'dark', 'system'] as ThemeMode[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onUpdateUIPrefs({ theme: t })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                    uiPrefs.theme === t ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'light' ? '☀️ Light' : t === 'dark' ? '🌙 Dark' : '💻 Auto'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

