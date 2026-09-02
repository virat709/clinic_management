import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  AlertOctagon, 
  ShieldCheck, 
  CheckCircle2, 
  Trash2, 
  Archive, 
  Search, 
  Layers,
  Plus,
  ArrowRight,
  Filter
} from 'lucide-react';
import { Medicine, Batch } from '../types';
import { formatCurrency, formatDate, getDaysUntilExpiry, getExpiryStatus } from '../utils/dateUtils';
import { UIPreferences } from '../utils/theme';

interface ExpiryTrackerViewProps {
  medicines: Medicine[];
  onBatchAction: (
    medicineId: string,
    batchId: string,
    action: 'quarantine' | 'dispose' | 'restore',
    reason?: string
  ) => void;
  onOpenAddStock: (medicineId?: string) => void;
  uiPrefs?: UIPreferences;
}

export const ExpiryTrackerView: React.FC<ExpiryTrackerViewProps> = ({
  medicines,
  onBatchAction,
  onOpenAddStock,
  uiPrefs,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'expired' | 'critical' | 'safe'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionBatch, setActionBatch] = useState<{
    med: Medicine;
    batch: Batch;
    action: 'quarantine' | 'dispose';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');

  const isCompact = uiPrefs?.density === 'compact';
  const cellPadding = isCompact ? 'py-2 px-3' : 'py-3 px-4';

  // Extract all batches
  const allBatches = useMemo(() => {
    const list: {
      med: Medicine;
      batch: Batch;
      daysRemaining: number;
      expiryStatus: ReturnType<typeof getExpiryStatus>;
      costValue: number;
    }[] = [];

    medicines.forEach((med) => {
      med.batches.forEach((batch) => {
        const days = getDaysUntilExpiry(batch.expDate);
        const expiryStatus = getExpiryStatus(batch.expDate);
        const costValue = batch.quantity * batch.costPrice;

        list.push({
          med,
          batch,
          daysRemaining: days,
          expiryStatus,
          costValue,
        });
      });
    });

    // Sort: Expired first, then closest to expiry (FEFO ascending)
    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [medicines]);

  // Counts
  const stats = useMemo(() => {
    let expiredCount = 0;
    let expiredUnits = 0;
    let expiredCost = 0;

    let criticalCount = 0;
    let criticalUnits = 0;

    let safeCount = 0;

    allBatches.forEach((item) => {
      if (item.batch.status === 'disposed') return;

      if (item.batch.status === 'quarantined' || item.daysRemaining < 0) {
        expiredCount++;
        expiredUnits += item.batch.quantity;
        expiredCost += item.costValue;
      } else if (item.daysRemaining <= 30) {
        criticalCount++;
        criticalUnits += item.batch.quantity;
      } else {
        safeCount++;
      }
    });

    return {
      expiredCount,
      expiredUnits,
      expiredCost,
      criticalCount,
      criticalUnits,
      safeCount,
    };
  }, [allBatches]);

  // Filtered list
  const filteredBatches = useMemo(() => {
    return allBatches.filter((item) => {
      if (item.batch.status === 'disposed') return false;

      if (selectedFilter === 'expired') {
        if (item.batch.status !== 'quarantined' && item.daysRemaining >= 0) return false;
      } else if (selectedFilter === 'critical') {
        if (item.daysRemaining < 0 || item.daysRemaining > 30 || item.batch.status === 'quarantined') return false;
      } else if (selectedFilter === 'safe') {
        if (item.daysRemaining <= 30 || item.batch.status === 'quarantined') return false;
      }

      const q = searchTerm.toLowerCase();
      return (
        q === '' ||
        item.med.name.toLowerCase().includes(q) ||
        item.med.genericName.toLowerCase().includes(q) ||
        item.batch.batchNumber.toLowerCase().includes(q) ||
        item.batch.supplier.toLowerCase().includes(q)
      );
    });
  }, [allBatches, selectedFilter, searchTerm]);

  const handleConfirmAction = () => {
    if (!actionBatch) return;
    const note = actionReason.trim() || (actionBatch.action === 'quarantine' ? 'Marked expired and removed from sale shelf' : 'Disposed / Incinerated');
    onBatchAction(
      actionBatch.med.id,
      actionBatch.batch.id,
      actionBatch.action,
      note
    );
    setActionBatch(null);
    setActionReason('');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Quick Filter Cards */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⏳</span>
            <div>
              <h2 className="text-lg font-black text-white">Expiration Date Register</h2>
              <p className="text-xs text-slate-300">
                Track which medicine batches are expiring so you sell them first (FEFO) or remove expired stock.
              </p>
            </div>
          </div>

          <div className="bg-slate-800 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-700 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Expired Stock Loss</span>
            <span className="text-lg font-black text-rose-400 font-mono">{formatCurrency(stats.expiredCost)}</span>
          </div>
        </div>

        {/* 3 Simple Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {/* Expired */}
          <button
            onClick={() => setSelectedFilter(selectedFilter === 'expired' ? 'all' : 'expired')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedFilter === 'expired'
                ? 'bg-rose-950 border-rose-500 ring-2 ring-rose-400'
                : 'bg-slate-800/80 dark:bg-slate-900 border-rose-900/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" /> 🔴 Expired Stock
              </span>
              <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                Do Not Sell
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white font-mono">{stats.expiredCount}</span>
              <span className="text-xs font-bold text-rose-300">{stats.expiredUnits} units</span>
            </div>
          </button>

          {/* Expiring in 30 Days */}
          <button
            onClick={() => setSelectedFilter(selectedFilter === 'critical' ? 'all' : 'critical')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedFilter === 'critical'
                ? 'bg-amber-950 border-amber-500 ring-2 ring-amber-400'
                : 'bg-slate-800/80 dark:bg-slate-900 border-amber-900/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> 🟠 Expiring in &le; 30 Days
              </span>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                Sell First
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white font-mono">{stats.criticalCount}</span>
              <span className="text-xs font-bold text-amber-300">{stats.criticalUnits} units</span>
            </div>
          </button>

          {/* Safe Stock */}
          <button
            onClick={() => setSelectedFilter(selectedFilter === 'safe' ? 'all' : 'safe')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedFilter === 'safe'
                ? 'bg-emerald-950 border-emerald-500 ring-2 ring-emerald-400'
                : 'bg-slate-800/80 dark:bg-slate-900 border-emerald-900/60 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> 🟢 Good & Safe Stock
              </span>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Safe
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white font-mono">{stats.safeCount}</span>
              <span className="text-xs font-bold text-emerald-300">Batches safe</span>
            </div>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="🔍 Search medicine, batch number, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Show:</span>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="all">Show All Batches ({allBatches.length})</option>
            <option value="expired">🔴 Expired Stock Only ({stats.expiredCount})</option>
            <option value="critical">🟠 Expiring Soon &le; 30 Days ({stats.criticalCount})</option>
            <option value="safe">🟢 Safe Batches ({stats.safeCount})</option>
          </select>
        </div>
      </div>

      {/* Expiry Ledger Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
            Batch Expiration Register ({filteredBatches.length} items)
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Sorted by nearest expiry first
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-slate-900 dark:bg-slate-950 text-slate-200 uppercase text-[11px] font-bold border-b border-slate-800">
                <th className="py-3 px-4 w-12 text-center">S.No</th>
                <th className="py-3 px-4">Medicine Name & Strength</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Expiration Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Stock on Hand</th>
                <th className="py-3 px-4 text-right">Cost Value</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No batches match this filter</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">All stock items are in good standing</p>
                  </td>
                </tr>
              ) : (
                filteredBatches.map(({ med, batch, daysRemaining, expiryStatus, costValue }, idx) => {
                  const isExpired = batch.status === 'quarantined' || daysRemaining < 0;
                  const isCritical = !isExpired && daysRemaining <= 30;

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isExpired 
                          ? 'bg-rose-50/50 dark:bg-rose-950/20' 
                          : isCritical 
                          ? 'bg-amber-50/40 dark:bg-amber-950/20' 
                          : ''
                      }`}
                    >
                      {/* S.No */}
                      <td className={`${cellPadding} text-center font-mono font-bold text-slate-500 dark:text-slate-400`}>
                        {idx + 1}
                      </td>

                      {/* Medicine */}
                      <td className={cellPadding}>
                        <div className="font-black text-slate-900 dark:text-white text-sm">{med.name}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-xs italic">{med.genericName} • <span className="font-bold text-slate-700 dark:text-slate-300">{med.dosage}</span></div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Location: {med.storageLocation}</div>
                      </td>

                      {/* Batch # */}
                      <td className={`${cellPadding} font-mono font-bold text-slate-900 dark:text-white`}>
                        {batch.batchNumber}
                      </td>

                      {/* Expiry Date */}
                      <td className={cellPadding}>
                        <div className={`font-black text-sm ${isExpired ? 'text-rose-700 dark:text-rose-400' : isCritical ? 'text-amber-800 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                          {formatDate(batch.expDate)}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {isExpired ? 'Expired' : `${daysRemaining} days left`}
                        </div>
                      </td>

                      {/* Status */}
                      <td className={cellPadding}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md border font-bold text-xs ${expiryStatus.badgeClass}`}>
                          {batch.status === 'quarantined' ? '🔴 Quarantined' : expiryStatus.label}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className={`${cellPadding} text-center font-mono`}>
                        <span className="font-black text-slate-900 dark:text-white text-sm">{batch.quantity}</span>
                        <span className="text-slate-400 dark:text-slate-500 text-xs"> units</span>
                      </td>

                      {/* Cost value */}
                      <td className={`${cellPadding} text-right font-mono font-bold`}>
                        <span className={isExpired ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}>
                          {formatCurrency(costValue)}
                        </span>
                      </td>

                      {/* Action */}
                      <td className={`${cellPadding} text-right`}>
                        <div className="flex items-center justify-end space-x-1.5">
                          {batch.status === 'quarantined' ? (
                            <button
                              onClick={() => setActionBatch({ med, batch, action: 'dispose' })}
                              className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Permanently Dispose</span>
                            </button>
                          ) : isExpired ? (
                            <button
                              onClick={() => setActionBatch({ med, batch, action: 'quarantine' })}
                              className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              <span>Quarantine (Remove)</span>
                            </button>
                          ) : isCritical ? (
                            <button
                              onClick={() => onOpenAddStock(med.id)}
                              className="px-3 py-1.5 text-xs font-bold bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Order Stock</span>
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
                              ✓ Good Stock
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Dialog */}
      {actionBatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {actionBatch.action === 'quarantine' ? 'Quarantine Expired Stock' : 'Dispose & Write-Off Stock'}
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {actionBatch.action === 'quarantine'
                ? `You are moving ${actionBatch.batch.quantity} units of "${actionBatch.med.name}" (Batch #${actionBatch.batch.batchNumber}) to the Quarantine shelf. This prevents it from being sold to patients.`
                : `You are permanently writing off ${actionBatch.batch.quantity} units of "${actionBatch.med.name}" worth ${formatCurrency(actionBatch.batch.quantity * actionBatch.batch.costPrice)}.`}
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason / Remarks
              </label>
              <input
                type="text"
                placeholder="e.g. Expired batch removed from dispensing rack"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="mt-5 flex items-center justify-end space-x-3">
              <button
                onClick={() => setActionBatch(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Confirm {actionBatch.action === 'quarantine' ? 'Quarantine' : 'Disposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
