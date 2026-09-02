import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Trash2, 
  RotateCcw, 
  Sliders, 
  Filter,
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react';
import { StockMovement } from '../types';
import { formatDateTime } from '../utils/dateUtils';
import { UIPreferences } from '../utils/theme';

interface StockLedgerViewProps {
  movements: StockMovement[];
  uiPrefs?: UIPreferences;
}

export const StockLedgerView: React.FC<StockLedgerViewProps> = ({ movements, uiPrefs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const isCompact = uiPrefs?.density === 'compact';
  const cellPadding = isCompact ? 'py-2 px-3' : 'py-3 px-4';

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const search = searchTerm.toLowerCase();
      const matchSearch =
        searchTerm === '' ||
        m.medicineName.toLowerCase().includes(search) ||
        m.batchNumber.toLowerCase().includes(search) ||
        m.reason.toLowerCase().includes(search) ||
        m.performedBy.toLowerCase().includes(search);

      const matchType = filterType === 'all' || m.type === filterType;
      return matchSearch && matchType;
    });
  }, [movements, searchTerm, filterType]);

  const getTypeBadge = (type: StockMovement['type']) => {
    switch (type) {
      case 'stock_in':
        return {
          label: 'Stock In / Inward',
          badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          icon: ArrowDownLeft,
        };
      case 'sale_dispense':
        return {
          label: 'Dispensed',
          badgeClass: 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800',
          icon: ArrowUpRight,
        };
      case 'expired_disposal':
        return {
          label: 'Expired Write-Off',
          badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          icon: Trash2,
        };
      case 'return':
        return {
          label: 'Patient Return',
          badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          icon: RotateCcw,
        };
      default:
        return {
          label: 'Adjustment',
          badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          icon: Sliders,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold">Clinical Stock Movement & Audit Ledger</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Immutable log of all stock arrivals, dispensing deductions, expiration write-offs, and batch adjustments for medical regulatory compliance.
          </p>
        </div>

        <div className="text-xs bg-slate-800 dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-700 font-mono text-slate-300">
          Total Logged Events: <span className="text-emerald-400 font-bold">{movements.length}</span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Medicine, Batch #, Reason, or Staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Event Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Event Types</option>
            <option value="stock_in">Stock Inward / Restock</option>
            <option value="sale_dispense">Prescription Dispensed</option>
            <option value="expired_disposal">Expired Stock Disposal</option>
            <option value="stock_adjustment">Stock Adjustment</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-900 dark:bg-slate-950 text-slate-200 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-800">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Medicine & Batch</th>
                <th className="py-3 px-4 text-center">Qty Change</th>
                <th className="py-3 px-4">Previous &rarr; New Stock</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    No movement events found matching filter.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  const meta = getTypeBadge(mov.type);
                  const Icon = meta.icon;
                  const isPositive = mov.quantityChange > 0;

                  return (
                    <tr key={mov.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className={`${cellPadding} text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap`}>
                        {formatDateTime(mov.timestamp)}
                      </td>
                      <td className={cellPadding}>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${meta.badgeClass}`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {meta.label}
                        </span>
                      </td>
                      <td className={cellPadding}>
                        <div className="font-bold text-slate-900 dark:text-white">{mov.medicineName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Lot: {mov.batchNumber}</div>
                      </td>
                      <td className={`${cellPadding} text-center font-mono font-bold`}>
                        <span className={isPositive ? 'text-emerald-700 dark:text-emerald-400' : mov.quantityChange < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}>
                          {isPositive ? `+${mov.quantityChange}` : mov.quantityChange}
                        </span>
                      </td>
                      <td className={`${cellPadding} font-mono text-slate-700 dark:text-slate-300`}>
                        {mov.previousQuantity} &rarr; <span className="font-bold text-slate-900 dark:text-white">{mov.newQuantity}</span> units
                      </td>
                      <td className={`${cellPadding} text-slate-600 dark:text-slate-400 max-w-xs truncate`} title={mov.reason}>
                        {mov.reason}
                      </td>
                      <td className={`${cellPadding} text-slate-500 dark:text-slate-400 font-medium`}>
                        {mov.performedBy}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
