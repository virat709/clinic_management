import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  AlertTriangle, 
  Layers, 
  MapPin, 
  Clock, 
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  BookOpen,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  ShoppingCart,
  Filter,
  Tag,
  X,
  RotateCcw
} from 'lucide-react';
import { Medicine, MedicineCategory, StorageLocation } from '../types';
import { formatCurrency, formatDate, getExpiryStatus, getDaysUntilExpiry } from '../utils/dateUtils';
import { downloadInventoryCSV } from '../utils/storage';
import { UIPreferences } from '../utils/theme';

interface InventoryViewProps {
  medicines: Medicine[];
  onOpenAddStock: (preselectedMedId?: string) => void;
  onSelectForDispense?: (medicine: Medicine) => void;
  onBatchStatusChange?: (medicineId: string, batchId: string, status: 'active' | 'quarantined' | 'disposed') => void;
  uiPrefs?: UIPreferences;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  medicines,
  onOpenAddStock,
  onSelectForDispense,
  onBatchStatusChange,
  uiPrefs,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low_stock' | 'expiring_soon' | 'out_of_stock'>('all');
  const [expandedMedIds, setExpandedMedIds] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'register' | 'cards'>('register');

  const isCompact = uiPrefs?.density === 'compact';

  const toggleExpand = (id: string) => {
    setExpandedMedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    medicines.forEach((m) => {
      allExpanded[m.id] = true;
    });
    setExpandedMedIds(allExpanded);
  };

  const collapseAll = () => {
    setExpandedMedIds({});
  };

  // Categories list
  const categories: (MedicineCategory | 'all')[] = [
    'all',
    'Antibiotics',
    'Analgesics & Pain',
    'Cardiovascular',
    'Diabetes & Metabolic',
    'Respiratory',
    'Gastrointestinal',
    'Dermatology & Topicals',
    'Vitamins & Supplements',
    'Injectables & IV Fluids',
    'Medical & Surgical Supplies',
    'Cold Chain / Biologics',
  ];

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: medicines.length };
    medicines.forEach((med) => {
      counts[med.category] = (counts[med.category] || 0) + 1;
    });
    return counts;
  }, [medicines]);

  // Filtered medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch =
        search === '' ||
        med.name.toLowerCase().includes(search) ||
        med.genericName.toLowerCase().includes(search) ||
        med.category.toLowerCase().includes(search) ||
        med.dosage.toLowerCase().includes(search) ||
        med.barcode.toLowerCase().includes(search) ||
        med.storageLocation.toLowerCase().includes(search) ||
        med.batches.some((b) => 
          b.batchNumber.toLowerCase().includes(search) ||
          (b.supplier && b.supplier.toLowerCase().includes(search))
        );

      const matchesCategory = selectedCategory === 'all' || med.category === selectedCategory;

      // Calculate totals
      const totalStock = med.batches
        .filter((b) => b.status === 'active')
        .reduce((sum, b) => sum + b.quantity, 0);

      const hasExpiringBatches = med.batches.some((b) => {
        if (b.status !== 'active' || b.quantity === 0) return false;
        const days = getDaysUntilExpiry(b.expDate);
        return days <= 30;
      });

      let matchesStatus = true;
      if (statusFilter === 'low_stock') {
        matchesStatus = totalStock > 0 && totalStock <= med.minStockThreshold;
      } else if (statusFilter === 'out_of_stock') {
        matchesStatus = totalStock === 0;
      } else if (statusFilter === 'expiring_soon') {
        matchesStatus = hasExpiringBatches;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [medicines, searchTerm, selectedCategory, statusFilter]);

  // Global inventory stats
  const inventoryStats = useMemo(() => {
    let totalItems = medicines.length;
    let totalStockUnits = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let expiringBatchCount = 0;

    medicines.forEach((m) => {
      let activeUnits = 0;
      m.batches.forEach((b) => {
        if (b.status === 'active') {
          activeUnits += b.quantity;
          totalStockUnits += b.quantity;
          totalStockValue += b.quantity * b.sellingPrice;
          const days = getDaysUntilExpiry(b.expDate);
          if (days <= 30 && b.quantity > 0) expiringBatchCount++;
        }
      });
      if (activeUnits <= m.minStockThreshold) lowStockCount++;
    });

    return { totalItems, totalStockUnits, totalStockValue, lowStockCount, expiringBatchCount };
  }, [medicines]);

  const cellPadding = isCompact ? 'py-2 px-3' : 'py-3.5 px-4';
  const hasActiveFilters = searchTerm !== '' || selectedCategory !== 'all' || statusFilter !== 'all';

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner: Clear Register Explanation & Big Summary Cards */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl">📖</span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                Medicine Stock Register
              </h2>
              <span className="text-xs bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Live Stock Book
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Keep track of all medicines, remaining stock quantities, batch details, and shelf locations in one clean digital register.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => downloadInventoryCSV(medicines)}
              className="flex-1 sm:flex-none flex items-center justify-center px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Download full register as Excel / CSV sheet"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              <span>Download CSV</span>
            </button>

            <button
              onClick={() => onOpenAddStock()}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1 stroke-[3]" />
              <span>+ Add New Stock</span>
            </button>
          </div>
        </div>

        {/* 4 Easy Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Medicines</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{inventoryStats.totalItems}</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                {inventoryStats.totalStockUnits} units
              </span>
            </div>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Total Stock Value</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                {formatCurrency(inventoryStats.totalStockValue)}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Retail</span>
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter(statusFilter === 'low_stock' ? 'all' : 'low_stock')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'low_stock' 
                ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 ring-2 ring-amber-400' 
                : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100/70 dark:hover:bg-amber-950/50'
            }`}
          >
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide flex items-center justify-between">
              <span>Low Stock Alert</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-amber-900 dark:text-amber-300">{inventoryStats.lowStockCount}</span>
              <span className="text-[11px] text-amber-800 dark:text-amber-400 font-bold">Needs Order</span>
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter(statusFilter === 'expiring_soon' ? 'all' : 'expiring_soon')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              statusFilter === 'expiring_soon'
                ? 'bg-rose-100 dark:bg-rose-950 border-rose-400 ring-2 ring-rose-400' 
                : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100/70 dark:hover:bg-rose-950/50'
            }`}
          >
            <p className="text-[11px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wide flex items-center justify-between">
              <span>Expiring Soon</span>
              <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-rose-900 dark:text-rose-300">{inventoryStats.expiringBatchCount}</span>
              <span className="text-[11px] text-rose-800 dark:text-rose-400 font-bold">&le; 30 Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Register Search & Category Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              id="inventory-search-input"
              type="text"
              placeholder="Search by brand name, generic formula, category, barcode, shelf..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Category Dropdown Selector */}
            <div className="relative flex-1 sm:flex-none">
              <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mr-2 shrink-0" />
                <select
                  id="inventory-category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden pr-2 cursor-pointer w-full sm:w-auto"
                >
                  <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    All Categories ({medicines.length})
                  </option>
                  {categories.filter((c) => c !== 'all').map((cat) => (
                    <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {cat} ({categoryCounts[cat] || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* View Mode Toggle (Register Table vs Cards) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setViewMode('register')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'register'
                    ? 'bg-white dark:bg-emerald-600 text-emerald-800 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Register Table View"
              >
                <List className="w-3.5 h-3.5 mr-1" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-emerald-600 text-emerald-800 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5 mr-1" />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Category Chips with Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400 mr-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Category:</span>
          </span>
          {categories.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/60'
                }`}
              >
                <span>{cat === 'all' ? 'All' : cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Filter & Active Filters Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-500 dark:text-slate-400">Stock Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                statusFilter === 'all' 
                  ? 'bg-slate-900 dark:bg-slate-700 text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({medicines.length})
            </button>
            <button
              onClick={() => setStatusFilter('low_stock')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                statusFilter === 'low_stock' 
                  ? 'bg-amber-500 text-white' 
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900'
              }`}
            >
              ⚠️ Low Stock ({inventoryStats.lowStockCount})
            </button>
            <button
              onClick={() => setStatusFilter('expiring_soon')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                statusFilter === 'expiring_soon' 
                  ? 'bg-rose-600 text-white' 
                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900'
              }`}
            >
              ⏰ Expiring Soon ({inventoryStats.expiringBatchCount})
            </button>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Showing {filteredMedicines.length} of {medicines.length}
            </span>
            <span>•</span>
            <button onClick={expandAll} className="hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold cursor-pointer">
              Show All Batches
            </button>
            <span>•</span>
            <button onClick={collapseAll} className="hover:text-slate-800 dark:hover:text-white font-semibold cursor-pointer">
              Hide Batches
            </button>
          </div>
        </div>

        {/* Active Filters Pill Bar (when filters are applied) */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">
              Active Filters:
            </span>

            {searchTerm && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md font-semibold">
                <span>Keyword: &ldquo;{searchTerm}&rdquo;</span>
                <button 
                  onClick={() => setSearchTerm('')}
                  className="hover:text-emerald-950 dark:hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-md font-semibold">
                <span>Category: {selectedCategory}</span>
                <button 
                  onClick={() => setSelectedCategory('all')}
                  className="hover:text-sky-950 dark:hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md font-semibold">
                <span>Status: {statusFilter.replace('_', ' ')}</span>
                <button 
                  onClick={() => setStatusFilter('all')}
                  className="hover:text-amber-950 dark:hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline font-bold ml-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset all</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Stock Register List */}
      {filteredMedicines.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No medicines found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {searchTerm 
              ? `No matching medicines found for "${searchTerm}"${selectedCategory !== 'all' ? ` in "${selectedCategory}"` : ''}.`
              : `No medicines found with the currently applied category and status filters.`}
          </p>
          <button
            onClick={resetAllFilters}
            className="mt-4 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-200 cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Search & Category Filters</span>
          </button>
        </div>
      ) : viewMode === 'register' ? (
        /* REGISTER TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-900 dark:bg-slate-950 text-white text-xs font-bold tracking-wide border-b border-slate-800">
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-4">Medicine Name & Formula</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Shelf Location</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                  <th className="py-3 px-4">Nearest Expiry Date</th>
                  <th className="py-3 px-3">Price</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredMedicines.map((med, index) => {
                  const isExpanded = !!expandedMedIds[med.id];
                  
                  // Active batches total
                  const activeBatches = med.batches.filter((b) => b.status === 'active');
                  const totalStock = activeBatches.reduce((acc, b) => acc + b.quantity, 0);
                  const isLowStock = totalStock <= med.minStockThreshold;

                  // Find nearest expiry batch
                  const sortedActiveBatches = [...activeBatches].sort(
                    (a, b) => getDaysUntilExpiry(a.expDate) - getDaysUntilExpiry(b.expDate)
                  );
                  const nearestBatch = sortedActiveBatches[0];
                  const nearestExpiryStatus = nearestBatch ? getExpiryStatus(nearestBatch.expDate) : null;

                  return (
                    <React.Fragment key={med.id}>
                      <tr 
                        className={`hover:bg-emerald-50/40 dark:hover:bg-slate-800/40 transition-colors ${
                          totalStock === 0 
                            ? 'bg-slate-100/70 dark:bg-slate-950/40 text-slate-500 dark:text-slate-500' 
                            : isLowStock 
                            ? 'bg-amber-50/40 dark:bg-amber-950/20' 
                            : ''
                        }`}
                      >
                        {/* Serial Number */}
                        <td className={`${cellPadding} text-center font-mono font-bold text-xs text-slate-400 dark:text-slate-500`}>
                          {index + 1}
                        </td>

                        {/* Medicine Name & Strength */}
                        <td className={cellPadding}>
                          <div className="flex items-start gap-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-slate-900 dark:text-white text-sm">{med.name}</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono border border-slate-200 dark:border-slate-700">
                                  {med.dosage}
                                </span>
                                {med.requiresPrescription && (
                                  <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded">
                                    Rx Required
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">{med.genericName}</p>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                                <span>Form: {med.form}</span>
                                {med.barcode && <span>• SKU: {med.barcode}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className={cellPadding}>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 inline-block">
                            {med.category}
                          </span>
                        </td>

                        {/* Shelf Location */}
                        <td className={cellPadding}>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            {med.storageLocation}
                          </span>
                        </td>

                        {/* Available Stock */}
                        <td className={`${cellPadding} text-center`}>
                          <div className="inline-flex flex-col items-center">
                            <span className={`text-base font-black font-mono px-2.5 py-0.5 rounded-md ${
                              totalStock === 0
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                : isLowStock
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400'
                            }`}>
                              {totalStock} units
                            </span>
                            {isLowStock && (
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                                ⚠️ Low (Min {med.minStockThreshold})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Nearest Expiry */}
                        <td className={cellPadding}>
                          {nearestBatch && nearestExpiryStatus ? (
                            <div>
                              <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md border ${nearestExpiryStatus.badgeClass}`}>
                                <span className={`w-2 h-2 rounded-full mr-1.5 ${nearestExpiryStatus.dotColor}`} />
                                {formatDate(nearestBatch.expDate)}
                              </span>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                Batch: {nearestBatch.batchNumber} ({nearestExpiryStatus.label})
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No active batches</span>
                          )}
                        </td>

                        {/* Price */}
                        <td className={`${cellPadding} font-mono font-bold text-slate-900 dark:text-white text-sm`}>
                          {nearestBatch ? formatCurrency(nearestBatch.sellingPrice) : '-'}
                        </td>

                        {/* Action Buttons */}
                        <td className={`${cellPadding} text-right`}>
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => toggleExpand(med.id)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Show Batch Details"
                            >
                              <span>{med.batches.length} Batch{med.batches.length > 1 ? 'es' : ''}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            <button
                              onClick={() => onOpenAddStock(med.id)}
                              className="px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 border border-emerald-300 dark:border-emerald-700 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                              title="Add more stock for this medicine"
                            >
                              <Plus className="w-3 h-3 stroke-[3]" />
                              <span>Restock</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Batch Detail Page (Nested Ledger Table) */}
                      {isExpanded && (
                        <tr className="bg-slate-50 dark:bg-slate-950/60 border-t border-b border-slate-200 dark:border-slate-800">
                          <td colSpan={8} className="p-4 sm:px-6">
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-700 p-4 shadow-xs">
                              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center space-x-2">
                                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                  <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-900 dark:text-white">
                                    All Inward Batches Registered for: {med.name} ({med.dosage})
                                  </h4>
                                </div>
                                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                  FEFO Rule: Sell Earliest First
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                                  <thead>
                                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
                                      <th className="py-2.5 px-3">Batch Number</th>
                                      <th className="py-2.5 px-3">Expiry Date</th>
                                      <th className="py-2.5 px-3">Status</th>
                                      <th className="py-2.5 px-3">Buy Cost Price</th>
                                      <th className="py-2.5 px-3">Sell Rate</th>
                                      <th className="py-2.5 px-3">Remaining Units</th>
                                      <th className="py-2.5 px-3">Supplier / Distributor</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {med.batches.map((batch, idx) => {
                                      const expiry = getExpiryStatus(batch.expDate);
                                      const isFirst = idx === 0 && batch.status === 'active';

                                      return (
                                        <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                            <div className="flex items-center space-x-1.5">
                                              <span>{batch.batchNumber}</span>
                                              {isFirst && (
                                                <span className="text-[9px] font-extrabold bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                                                  Sell First
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                                            {formatDate(batch.expDate)}
                                          </td>
                                          <td className="py-2.5 px-3">
                                            <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md border ${expiry.badgeClass}`}>
                                              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${expiry.dotColor}`} />
                                              {batch.status === 'quarantined' ? 'Quarantined / Expired' : expiry.label}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 font-medium">
                                            {formatCurrency(batch.costPrice)}
                                          </td>
                                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                            {formatCurrency(batch.sellingPrice)}
                                          </td>
                                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                            {batch.quantity} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">/ {batch.initialQuantity}</span>
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                                            {batch.supplier}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMedicines.map((med) => {
            const activeBatches = med.batches.filter((b) => b.status === 'active');
            const totalStock = activeBatches.reduce((acc, b) => acc + b.quantity, 0);
            const isLowStock = totalStock <= med.minStockThreshold;

            const sortedBatches = [...activeBatches].sort(
              (a, b) => getDaysUntilExpiry(a.expDate) - getDaysUntilExpiry(b.expDate)
            );
            const nearest = sortedBatches[0];
            const expiryStatus = nearest ? getExpiryStatus(nearest.expDate) : null;

            return (
              <div key={med.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between hover:border-emerald-400 dark:hover:border-emerald-500 transition-all">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{med.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">{med.genericName}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded font-mono border border-slate-200 dark:border-slate-700">
                      {med.dosage}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Shelf Location</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center mt-0.5">
                        <MapPin className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                        {med.storageLocation}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Remaining Stock</span>
                      <span className={`font-black font-mono mt-0.5 block ${
                        totalStock === 0 ? 'text-rose-600 dark:text-rose-400' : isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                      }`}>
                        {totalStock} units
                      </span>
                    </div>
                  </div>

                  {nearest && expiryStatus && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Earliest Expiry:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${expiryStatus.badgeClass}`}>
                        {formatDate(nearest.expDate)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                    {nearest ? formatCurrency(nearest.sellingPrice) : '-'} / unit
                  </span>

                  <button
                    onClick={() => onOpenAddStock(med.id)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Restock</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
