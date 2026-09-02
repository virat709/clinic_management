import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Printer, 
  FileSpreadsheet, 
  ChevronLeft, 
  ChevronRight, 
  DollarSign, 
  ShoppingBag, 
  Receipt, 
  QrCode, 
  Banknote, 
  CreditCard,
  Building,
  Clock,
  Pill,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { Medicine, Sale } from '../types';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/dateUtils';
import { ClinicSettings, generateDailyReportSummary, downloadDailyReportCSV } from '../utils/storage';
import { UIPreferences } from '../utils/theme';
import { SalesAnalyticsDashboard } from './SalesAnalyticsDashboard';

interface DailyReportsViewProps {
  sales: Sale[];
  medicines: Medicine[];
  settings: ClinicSettings;
  onOpenSaleReceipt: (sale: Sale) => void;
  uiPrefs?: UIPreferences;
}

export const DailyReportsView: React.FC<DailyReportsViewProps> = ({
  sales,
  medicines,
  settings,
  onOpenSaleReceipt,
  uiPrefs,
}) => {
  const [reportSubTab, setReportSubTab] = useState<'analytics' | 'daybook'>('analytics');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const todayStr = getTodayDateString();

  const isCompact = uiPrefs?.density === 'compact';
  const cellPadding = isCompact ? 'py-2 px-3' : 'py-3 px-4';

  // Helper for date navigation
  const shiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    const newD = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${newY}-${newM}-${newD}`);
  };

  // Generate automated report summary for selected date
  const summary = useMemo(() => {
    return generateDailyReportSummary(selectedDate, sales, medicines);
  }, [selectedDate, sales, medicines]);

  // Sales matching current date
  const daySales = useMemo(() => {
    return sales
      .filter((s) => s.date === selectedDate)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [sales, selectedDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Mode Selector Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-1 w-full sm:w-auto">
          <button
            onClick={() => setReportSubTab('analytics')}
            className={`flex-1 sm:flex-initial flex items-center justify-center px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              reportSubTab === 'analytics'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            <span>Sales Analytics & Visual Trends</span>
          </button>

          <button
            onClick={() => setReportSubTab('daybook')}
            className={`flex-1 sm:flex-initial flex items-center justify-center px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              reportSubTab === 'daybook'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            <span>Daily Day-Book & Invoices</span>
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              reportSubTab === 'daybook' ? 'bg-emerald-800 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {daySales.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 px-2 font-medium hidden md:block">
          {reportSubTab === 'analytics' ? '📈 Comprehensive financial metrics & charts' : `📖 Daily ledger for ${formatDate(selectedDate)}`}
        </div>
      </div>

      {/* Main Sub-view */}
      {reportSubTab === 'analytics' ? (
        <SalesAnalyticsDashboard
          sales={sales}
          medicines={medicines}
          settings={settings}
          onOpenSaleReceipt={onOpenSaleReceipt}
          uiPrefs={uiPrefs}
        />
      ) : (
        <div className="space-y-5">
          {/* Date Header & Action Bar */}
          <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-md transition-colors">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📖</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-black text-white">Daily Sales & Cash Register (Day-Book)</h2>
                    {selectedDate === todayStr && (
                      <span className="text-[11px] font-extrabold bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
                        <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" /> TODAY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    Automated daily closing register, cash drawer balance, and itemized bill ledger.
                  </p>
                </div>
              </div>

              {/* Date Navigator Bar */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-800 dark:bg-slate-900 p-2 rounded-xl border border-slate-700">
                <button
                  onClick={() => shiftDate(-1)}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-2 px-1">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <input
                    id="report-date-picker"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-900 dark:bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <button
                  onClick={() => shiftDate(1)}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    selectedDate === todayStr
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Today
                </button>

                <div className="border-l border-slate-700 pl-2 flex items-center space-x-1.5">
                  <button
                    onClick={() => downloadDailyReportCSV(summary, daySales)}
                    className="flex items-center px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                    title="Download Excel / CSV format"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden sm:inline">Download Excel (CSV)</span>
                    <span className="sm:hidden">Excel</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center px-3 py-1 text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors cursor-pointer"
                    title="Print day book"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Big Cash & Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {/* Total Sales */}
              <div className="bg-slate-800/90 dark:bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-slate-400 block uppercase">💵 Total Sales Today</span>
                <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
                  {formatCurrency(summary.totalSales)}
                </p>
                <span className="text-xs text-slate-300 font-semibold mt-0.5 block">
                  {summary.totalOrders} Bills • {summary.totalItemsDispensed} units
                </span>
              </div>

              {/* Cash in Drawer */}
              <div className="bg-slate-800/90 dark:bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-slate-400 block uppercase">💰 Cash in Drawer</span>
                <p className="text-2xl font-black text-white font-mono mt-1">
                  {formatCurrency(summary.paymentBreakdown.cash)}
                </p>
                <span className="text-xs text-slate-300 font-semibold mt-0.5 block">
                  Physical cash collected
                </span>
              </div>

              {/* Digital & UPI */}
              <div className="bg-slate-800/90 dark:bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-slate-400 block uppercase">📱 UPI / QR Code</span>
                <p className="text-2xl font-black text-white font-mono mt-1">
                  {formatCurrency(summary.paymentBreakdown.digital)}
                </p>
                <span className="text-xs text-slate-300 font-semibold mt-0.5 block">
                  Bank / QR collections
                </span>
              </div>

              {/* Gross Profit Margin */}
              <div className="bg-slate-800/90 dark:bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-slate-400 block uppercase">📈 Day's Gross Profit</span>
                <p className="text-2xl font-black text-emerald-300 font-mono mt-1">
                  {formatCurrency(summary.totalProfit)}
                </p>
                <span className="text-xs text-emerald-400 font-bold mt-0.5 block">
                  {summary.profitMarginPercent}% profit margin
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Day Book Register Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
            <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Daily Sales Ledger Book for {formatDate(selectedDate)} ({daySales.length} Invoices)
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Recorded chronologically
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-slate-900 dark:bg-slate-950 text-slate-200 uppercase text-[11px] font-bold border-b border-slate-800">
                    <th className="py-3 px-4 w-12 text-center">S.No</th>
                    <th className="py-3 px-4">Bill / Invoice #</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Customer / Patient Name</th>
                    <th className="py-3 px-4">Medicines Sold</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4 text-right">Bill Amount</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {daySales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <CheckCircle2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No sales recorded on {formatDate(selectedDate)}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Use "Billing / Sell Medicine" to create new bills</p>
                      </td>
                    </tr>
                  ) : (
                    daySales.map((sale, idx) => (
                      <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        {/* S.No */}
                        <td className={`${cellPadding} text-center font-mono font-bold text-slate-500 dark:text-slate-400`}>
                          {idx + 1}
                        </td>

                        {/* Invoice */}
                        <td className={`${cellPadding} font-mono font-black text-slate-900 dark:text-white`}>
                          {sale.invoiceNumber}
                        </td>

                        {/* Time */}
                        <td className={`${cellPadding} font-mono text-slate-600 dark:text-slate-400 font-semibold`}>
                          {sale.time}
                        </td>

                        {/* Customer */}
                        <td className={cellPadding}>
                          <div className="font-black text-slate-900 dark:text-white">{sale.patientName || 'Counter Customer'}</div>
                          {sale.patientPhone && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Ph: {sale.patientPhone}</div>
                          )}
                          {sale.doctorName && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">Dr: {sale.doctorName}</div>
                          )}
                        </td>

                        {/* Medicines */}
                        <td className={cellPadding}>
                          <div className="space-y-1">
                            {sale.items.map((item, i) => (
                              <div key={i} className="text-slate-800 dark:text-slate-200">
                                <span className="font-bold">{item.medicineName}</span>
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono text-xs"> x{item.quantity}</span>
                                <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]"> (Lot: {item.batchNumber})</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Payment Mode */}
                        <td className={cellPadding}>
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700">
                            {sale.paymentMethod}
                          </span>
                        </td>

                        {/* Grand Total */}
                        <td className={`${cellPadding} text-right font-mono font-black text-emerald-800 dark:text-emerald-400 text-sm`}>
                          {formatCurrency(sale.grandTotal)}
                        </td>

                        {/* Action */}
                        <td className={`${cellPadding} text-right`}>
                          <button
                            onClick={() => onOpenSaleReceipt(sale)}
                            className="px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 rounded-lg transition-colors cursor-pointer"
                          >
                            View Bill
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Selling Medicines of the Day Summary */}
          {summary.topSellingMedicines.length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Top Sold Medicines on {formatDate(selectedDate)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {summary.topSellingMedicines.map((m, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">{m.medicineName}</span>
                      <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">{m.quantity} units</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex justify-between">
                      <span>{m.dosage}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">Revenue: {formatCurrency(m.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

