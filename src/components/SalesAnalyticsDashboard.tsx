import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  CreditCard,
  Building,
  QrCode,
  Calendar,
  Download,
  Printer,
  ChevronDown,
  Clock,
  Sparkles,
  ArrowUpRight,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  PieChart as PieIcon,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Medicine, Sale } from '../types';
import { formatCurrency, formatDate, getTodayDateString } from '../utils/dateUtils';
import { ClinicSettings } from '../utils/storage';
import { UIPreferences } from '../utils/theme';
import {
  TimeRangePreset,
  DateRange,
  SalesAnalyticsData,
  getDateRangeForPreset,
  computeSalesAnalytics,
  downloadSalesAnalyticsCSV,
} from '../utils/analyticsUtils';

interface SalesAnalyticsDashboardProps {
  sales: Sale[];
  medicines: Medicine[];
  settings: ClinicSettings;
  onOpenSaleReceipt?: (sale: Sale) => void;
  uiPrefs?: UIPreferences;
}

const CATEGORY_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
  '#84cc16', // lime
  '#64748b', // slate
];

const PAYMENT_COLORS: Record<string, string> = {
  'Cash': '#10b981', // emerald
  'UPI / Digital': '#3b82f6', // blue
  'Card': '#8b5cf6', // violet
  'Clinic Credit / Insurance': '#f59e0b', // amber
};

export const SalesAnalyticsDashboard: React.FC<SalesAnalyticsDashboardProps> = ({
  sales,
  medicines,
  settings,
  onOpenSaleReceipt,
  uiPrefs,
}) => {
  const todayStr = getTodayDateString();
  const [selectedPreset, setSelectedPreset] = useState<TimeRangePreset>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>(
    () => getDateRangeForPreset('30days').startDate
  );
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Table filter state
  const [tableSearch, setTableSearch] = useState('');
  const [tableCategory, setTableCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity' | 'profit' | 'margin'>('revenue');
  const [topMedicinesMetric, setTopMedicinesMetric] = useState<'revenue' | 'units'>('revenue');
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'orders'>('revenue');

  // Compute date range
  const dateRange: DateRange = useMemo(() => {
    return getDateRangeForPreset(selectedPreset, customStartDate, customEndDate);
  }, [selectedPreset, customStartDate, customEndDate]);

  // Compute analytics
  const analytics: SalesAnalyticsData = useMemo(() => {
    return computeSalesAnalytics(dateRange, sales, medicines);
  }, [dateRange, sales, medicines]);

  // Unique categories in medicines
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    medicines.forEach((m) => {
      if (m.category) cats.add(m.category);
    });
    return Array.from(cats).sort();
  }, [medicines]);

  // Filtered & sorted table data
  const filteredMedicines = useMemo(() => {
    return analytics.topMedicines.filter((m) => {
      const matchSearch =
        m.medicineName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        m.genericName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        m.category.toLowerCase().includes(tableSearch.toLowerCase());
      const matchCat = tableCategory === 'all' || m.category === tableCategory;
      return matchSearch && matchCat;
    }).sort((a, b) => {
      if (sortBy === 'quantity') return b.quantitySold - a.quantitySold;
      if (sortBy === 'profit') return b.grossProfit - a.grossProfit;
      if (sortBy === 'margin') return b.profitMarginPercent - a.profitMarginPercent;
      return b.totalRevenue - a.totalRevenue;
    });
  }, [analytics.topMedicines, tableSearch, tableCategory, sortBy]);

  // Top 8 medicines formatted for bar chart
  const topBarChartData = useMemo(() => {
    const sorted = [...analytics.topMedicines].sort((a, b) => {
      return topMedicinesMetric === 'revenue'
        ? b.totalRevenue - a.totalRevenue
        : b.quantitySold - a.quantitySold;
    }).slice(0, 8);

    return sorted.map((m) => ({
      name: m.medicineName.length > 18 ? m.medicineName.substring(0, 16) + '…' : m.medicineName,
      fullName: m.medicineName,
      dosage: m.dosage,
      revenue: m.totalRevenue,
      units: m.quantitySold,
      profit: m.grossProfit,
      category: m.category,
    }));
  }, [analytics.topMedicines, topMedicinesMetric]);

  // Categories formatted for pie chart
  const categoryPieData = useMemo(() => {
    return analytics.categoryBreakdown.slice(0, 7).map((c, i) => ({
      name: c.category,
      value: c.revenue,
      units: c.units,
      percentage: c.percentage,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [analytics.categoryBreakdown]);

  // Payment methods formatted for pie chart
  const paymentPieData = useMemo(() => {
    return analytics.paymentStats
      .filter((p) => p.amount > 0)
      .map((p) => ({
        name: p.method,
        value: p.amount,
        percentage: p.percentage,
        count: p.transactions,
        color: PAYMENT_COLORS[p.method] || '#64748b',
      }));
  }, [analytics.paymentStats]);

  const handleExportCSV = () => {
    downloadSalesAnalyticsCSV(analytics);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Analytics Timeframe Selector & Actions Bar */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  Sales & Financial Analytics
                  <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    {dateRange.label}
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Track gross revenue, profit margins, dispensing volumes, payment channels, and top-selling medicines.
                </p>
              </div>
            </div>
          </div>

          {/* Actions & Export */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            <button
              onClick={handleExportCSV}
              className="flex items-center px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Download detailed Excel / CSV report"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span>Export Analytics (CSV)</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Print analytics report"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Preset Selector Tabs */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Timeframe:
          </span>

          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'This Month (30D)' },
            { id: '90days', label: 'Last 90 Days' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom Range' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset.id as TimeRangePreset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedPreset === preset.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              {preset.label}
            </button>
          ))}

          {/* Custom Date Pickers */}
          {selectedPreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700 ml-auto">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-semibold">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-900 text-white rounded-md px-2 py-1 text-xs border border-slate-700 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-semibold">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-900 text-white rounded-md px-2 py-1 text-xs border border-slate-700 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Executive KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {formatCurrency(analytics.totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            Avg {formatCurrency(analytics.averageOrderValue)} / bill
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Est. Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(analytics.totalProfit)}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold mt-1">
            {analytics.profitMarginPercent}% profit margin
          </div>
        </div>

        {/* Total Invoices */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Bills & Dispenses</span>
            <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {analytics.totalOrders}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            {analytics.uniquePatientsCount} unique patients
          </div>
        </div>

        {/* Units Sold */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Units Dispensed</span>
            <Package className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {analytics.totalUnitsSold}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            Across {analytics.topMedicines.length} medicines
          </div>
        </div>

        {/* Cash Collected */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Cash Drawer</span>
            <span className="text-xs">💵</span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {formatCurrency(analytics.paymentBreakdown.cash)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            {analytics.paymentBreakdown.cashPercentage}% of revenue
          </div>
        </div>

        {/* UPI / Digital / Cards */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Digital / Bank</span>
            <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {formatCurrency(
              analytics.paymentBreakdown.digital +
              analytics.paymentBreakdown.card +
              analytics.paymentBreakdown.insurance
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            UPI, Cards & Insurance
          </div>
        </div>
      </div>

      {/* 3. Primary Charts Section: Revenue Timeline & Top Selling Medicines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Sales Trend Chart (Span 2) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Revenue & Sales Trend Timeline
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Daily sales performance over the selected timeframe ({analytics.dailyTrends.length} days recorded)
              </p>
            </div>

            {/* Metric Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setTrendMetric('revenue')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  trendMetric === 'revenue'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Revenue ($)
              </button>
              <button
                onClick={() => setTrendMetric('orders')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  trendMetric === 'orders'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Invoices / Bills
              </button>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            {analytics.dailyTrends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No sales data recorded in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {trendMetric === 'revenue' ? (
                  <AreaChart data={analytics.dailyTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis
                      dataKey="formattedDate"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: any) => [
                        formatCurrency(Number(value) || 0),
                        name === 'revenue' ? 'Gross Revenue' : 'Est. Profit',
                      ]}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]?.payload) {
                          const item = payload[0].payload;
                          return `${item.formattedDate} (${item.dayName}) • ${item.orders} bills`;
                        }
                        return label;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="revenue"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="profit"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={analytics.dailyTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis
                      dataKey="formattedDate"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(value: any) => [`${value} bills`, 'Invoices Dispensed']}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]?.payload) {
                          const item = payload[0].payload;
                          return `${item.formattedDate} (${item.dayName}) • Rev: ${formatCurrency(item.revenue)}`;
                        }
                        return label;
                      }}
                    />
                    <Bar dataKey="orders" name="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Gross Revenue
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Gross Profit
              </span>
            </div>
            <span>Peak Day Revenue: {formatCurrency(Math.max(0, ...analytics.dailyTrends.map(d => d.revenue)))}</span>
          </div>
        </div>

        {/* Top 8 Selling Medicines Bar Chart (Span 1) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Top Sold Medicines
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Highest contributors to pharmacy sales
              </p>
            </div>

            {/* Metric Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setTopMedicinesMetric('revenue')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  topMedicinesMetric === 'revenue'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setTopMedicinesMetric('units')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  topMedicinesMetric === 'units'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Units
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            {topBarChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No medicine sales recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topBarChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => (topMedicinesMetric === 'revenue' ? `$${v}` : `${v}`)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      topMedicinesMetric === 'revenue' ? formatCurrency(Number(val)) : `${val} units`,
                      topMedicinesMetric === 'revenue' ? 'Total Revenue' : 'Units Sold',
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]?.payload) {
                        const m = payload[0].payload;
                        return `${m.fullName} (${m.dosage}) • ${m.category}`;
                      }
                      return label;
                    }}
                  />
                  <Bar
                    dataKey={topMedicinesMetric === 'revenue' ? 'revenue' : 'units'}
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>#1 Top Product:</span>
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
              {analytics.bestSellingMedicine}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Secondary Breakdown Grid: Categories, Payment Channels & Rush Hours */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Category Revenue Distribution */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Category Revenue Share
            </h3>
            <span className="text-[11px] font-mono font-bold text-slate-500">
              {categoryPieData.length} Categories
            </span>
          </div>

          <div className="h-52 w-full">
            {categoryPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No category data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      `${formatCurrency(Number(val))} (${item.payload.percentage}%)`,
                      item.payload.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1 max-h-28 overflow-y-auto pr-1 no-scrollbar text-xs">
            {categoryPieData.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between py-0.5">
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="truncate text-slate-700 dark:text-slate-300 font-medium">{cat.name}</span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 font-mono">
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(cat.value)}</span>
                  <span className="text-slate-400 text-[11px]">({cat.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Channels Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Payment Mode Distribution
            </h3>
            <span className="text-[11px] font-mono font-bold text-slate-500">
              {analytics.totalOrders} Invoices
            </span>
          </div>

          <div className="h-52 w-full">
            {paymentPieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No payment data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentPieData.map((entry, index) => (
                      <Cell key={`cell-pm-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      `${formatCurrency(Number(val))} (${item.payload.percentage}%)`,
                      item.payload.name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            {analytics.paymentStats.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PAYMENT_COLORS[p.method] || '#64748b' }}
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{p.method}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono">
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(p.amount)}</span>
                  <span className="text-slate-400 text-[11px]">({p.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Dispensing Rush Hours */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              Peak Dispensing Rush Hours
            </h3>
            <span className="text-[11px] font-mono font-bold text-slate-500">
              08:00 - 21:00
            </span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.hourlyDistribution}
                margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis
                  dataKey="hourLabel"
                  stroke="#94a3b8"
                  fontSize={9}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={9}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any, name: any, item: any) => [
                    `${formatCurrency(Number(val))} (${item.payload.transactions} bills, ${item.payload.units} units)`,
                    'Hourly Sales',
                  ]}
                  labelFormatter={(label) => `Time Window: ${label}`}
                />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900/60 text-xs flex items-center justify-between">
            <span className="text-violet-900 dark:text-violet-300 font-semibold">Busiest Pharmacy Window:</span>
            <span className="font-bold font-mono text-violet-950 dark:text-violet-200">{analytics.peakHour}</span>
          </div>
        </div>
      </div>

      {/* 5. Comprehensive Product Sales & Profitability Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Medicine Sales & Profitability Matrix
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked breakdown of individual medicine sales, purchase costs, gross margins, and live inventory balance.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search medicine..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={tableCategory}
              onChange={(e) => setTableCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">All Categories</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-emerald-500"
            >
              <option value="revenue">Sort: Highest Revenue</option>
              <option value="quantity">Sort: Highest Quantity Sold</option>
              <option value="profit">Sort: Highest Profit ($)</option>
              <option value="margin">Sort: Highest Margin (%)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-900 dark:bg-slate-950 text-slate-200 uppercase text-[11px] font-bold border-b border-slate-800">
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Medicine & Formula</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Units Sold</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
                <th className="py-3 px-4 text-right">Est. Cost</th>
                <th className="py-3 px-4 text-right">Gross Profit</th>
                <th className="py-3 px-4 text-right">Margin %</th>
                <th className="py-3 px-4 text-right">In-Stock Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                    No medicine sales match the current filters in this date range.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((m, idx) => (
                  <tr
                    key={m.medicineId}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {m.medicineName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {m.genericName} • <span className="font-semibold">{m.dosage}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                        {m.category}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-center font-mono font-black text-slate-900 dark:text-white">
                      {m.quantitySold}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(m.totalRevenue)}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono text-slate-500 dark:text-slate-400">
                      {formatCurrency(m.totalCost)}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(m.grossProfit)}
                    </td>

                    <td className="py-2.5 px-4 text-right font-mono">
                      <span
                        className={`font-bold ${
                          m.profitMarginPercent >= 40
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : m.profitMarginPercent >= 20
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {m.profitMarginPercent}%
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-right">
                      {m.currentStock === 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                          Out of Stock
                        </span>
                      ) : m.stockStatus === 'low' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                          Low ({m.currentStock} left)
                        </span>
                      ) : (
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {m.currentStock} units
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
