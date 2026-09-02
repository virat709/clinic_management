import { Medicine, Sale } from '../types';
import { getDaysUntilExpiry, getTodayDateString } from './dateUtils';

export type TimeRangePreset = 'today' | 'yesterday' | '7days' | '30days' | '90days' | 'all' | 'custom';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  preset: TimeRangePreset;
  label: string;
}

export interface MedicineSalesStat {
  medicineId: string;
  medicineName: string;
  genericName: string;
  dosage: string;
  category: string;
  quantitySold: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMarginPercent: number;
  currentStock: number;
  stockStatus: 'adequate' | 'low' | 'out_of_stock';
}

export interface CategorySalesStat {
  category: string;
  revenue: number;
  units: number;
  profit: number;
  percentage: number;
}

export interface PaymentMethodStat {
  method: string;
  amount: number;
  percentage: number;
  transactions: number;
}

export interface DailySalesTrendPoint {
  date: string; // YYYY-MM-DD
  formattedDate: string; // "Sep 2"
  dayName: string; // "Mon"
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
  units: number;
}

export interface HourlySalesPoint {
  hour: string; // "09:00"
  hourLabel: string; // "9 AM"
  revenue: number;
  transactions: number;
  units: number;
}

export interface SalesAnalyticsData {
  range: DateRange;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMarginPercent: number;
  totalOrders: number;
  totalUnitsSold: number;
  averageOrderValue: number;
  uniquePatientsCount: number;
  
  paymentBreakdown: {
    cash: number;
    card: number;
    digital: number;
    insurance: number;
    cashPercentage: number;
    cardPercentage: number;
    digitalPercentage: number;
    insurancePercentage: number;
  };
  
  paymentStats: PaymentMethodStat[];
  dailyTrends: DailySalesTrendPoint[];
  hourlyDistribution: HourlySalesPoint[];
  topMedicines: MedicineSalesStat[];
  categoryBreakdown: CategorySalesStat[];
  salesList: Sale[];
  
  peakHour: string;
  topCategory: string;
  bestSellingMedicine: string;
}

// Preset range calculator
export function getDateRangeForPreset(preset: TimeRangePreset, customStart?: string, customEnd?: string): DateRange {
  const today = new Date();
  const formatDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatDateStr(today);

  if (preset === 'today') {
    return {
      startDate: todayStr,
      endDate: todayStr,
      preset: 'today',
      label: 'Today',
    };
  }

  if (preset === 'yesterday') {
    const yest = new Date(today);
    yest.setDate(yest.getDate() - 1);
    const yestStr = formatDateStr(yest);
    return {
      startDate: yestStr,
      endDate: yestStr,
      preset: 'yesterday',
      label: 'Yesterday',
    };
  }

  if (preset === '7days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return {
      startDate: formatDateStr(start),
      endDate: todayStr,
      preset: '7days',
      label: 'Last 7 Days',
    };
  }

  if (preset === '30days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return {
      startDate: formatDateStr(start),
      endDate: todayStr,
      preset: '30days',
      label: 'This Month (Last 30 Days)',
    };
  }

  if (preset === '90days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 89);
    return {
      startDate: formatDateStr(start),
      endDate: todayStr,
      preset: '90days',
      label: 'Last 90 Days (Quarter)',
    };
  }

  if (preset === 'all') {
    return {
      startDate: '2020-01-01',
      endDate: todayStr,
      preset: 'all',
      label: 'All Time History',
    };
  }

  return {
    startDate: customStart || todayStr,
    endDate: customEnd || todayStr,
    preset: 'custom',
    label: `${customStart || todayStr} to ${customEnd || todayStr}`,
  };
}

// Compute full analytics report for any given range
export function computeSalesAnalytics(
  range: DateRange,
  sales: Sale[],
  medicines: Medicine[]
): SalesAnalyticsData {
  // Filter sales within date bounds [startDate, endDate]
  const filteredSales = sales.filter((s) => {
    if (!s.date) return false;
    return s.date >= range.startDate && s.date <= range.endDate;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  // Build medicine lookup for current stocks and metadata
  const medMap = new Map<string, Medicine>();
  medicines.forEach((m) => medMap.set(m.id, m));

  let totalRevenue = 0;
  let totalCost = 0;
  let totalUnitsSold = 0;
  const uniquePatients = new Set<string>();

  const paymentAmounts: Record<string, { amount: number; count: number }> = {
    'Cash': { amount: 0, count: 0 },
    'UPI / Digital': { amount: 0, count: 0 },
    'Card': { amount: 0, count: 0 },
    'Clinic Credit / Insurance': { amount: 0, count: 0 },
  };

  const medicineSalesMap = new Map<string, {
    medicineId: string;
    medicineName: string;
    genericName: string;
    dosage: string;
    category: string;
    quantitySold: number;
    totalRevenue: number;
    totalCost: number;
  }>();

  const categoryMap = new Map<string, { revenue: number; units: number; profit: number }>();

  // Hourly buckets 08:00 to 22:00
  const hourlyMap = new Map<number, { revenue: number; transactions: number; units: number }>();
  for (let h = 8; h <= 21; h++) {
    hourlyMap.set(h, { revenue: 0, transactions: 0, units: 0 });
  }

  // Daily map
  const dailyMap = new Map<string, { revenue: number; cost: number; profit: number; orders: number; units: number }>();

  // If range spans ≤ 30 days, fill all days in between with 0 to make smooth chart
  if (range.startDate && range.endDate && range.preset !== 'all') {
    const startD = new Date(range.startDate + 'T00:00:00');
    const endD = new Date(range.endDate + 'T00:00:00');
    const deltaDays = Math.round((endD.getTime() - startD.getTime()) / (1000 * 3600 * 24));
    
    if (deltaDays >= 0 && deltaDays <= 60) {
      const cur = new Date(startD);
      while (cur <= endD) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${d}`;
        dailyMap.set(dStr, { revenue: 0, cost: 0, profit: 0, orders: 0, units: 0 });
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  // Iterate sales
  filteredSales.forEach((sale) => {
    totalRevenue += sale.grandTotal;
    if (sale.patientName) uniquePatients.add(sale.patientName.trim().toLowerCase());

    // Payment method
    const pm = sale.paymentMethod || 'Cash';
    if (!paymentAmounts[pm]) {
      paymentAmounts[pm] = { amount: 0, count: 0 };
    }
    paymentAmounts[pm].amount += sale.grandTotal;
    paymentAmounts[pm].count += 1;

    // Hourly
    if (sale.time) {
      const hourNum = parseInt(sale.time.split(':')[0], 10);
      if (!isNaN(hourNum)) {
        const current = hourlyMap.get(hourNum) || { revenue: 0, transactions: 0, units: 0 };
        current.revenue += sale.grandTotal;
        current.transactions += 1;
        hourlyMap.set(hourNum, current);
      }
    }

    // Daily
    const dayKey = sale.date;
    const dayEntry = dailyMap.get(dayKey) || { revenue: 0, cost: 0, profit: 0, orders: 0, units: 0 };
    dayEntry.revenue += sale.grandTotal;
    dayEntry.orders += 1;

    // Items
    sale.items.forEach((item) => {
      totalUnitsSold += item.quantity;
      const itemCost = (item.costPrice || 0) * item.quantity;
      const itemRevenue = item.total;
      const itemProfit = itemRevenue - itemCost;
      totalCost += itemCost;

      dayEntry.cost += itemCost;
      dayEntry.units += item.quantity;

      // Hourly units
      if (sale.time) {
        const hourNum = parseInt(sale.time.split(':')[0], 10);
        if (!isNaN(hourNum)) {
          const hEntry = hourlyMap.get(hourNum);
          if (hEntry) hEntry.units += item.quantity;
        }
      }

      // Medicine stat
      const medKey = `${item.medicineId}_${item.medicineName}`;
      const medData = medicineSalesMap.get(medKey) || {
        medicineId: item.medicineId,
        medicineName: item.medicineName,
        genericName: item.genericName,
        dosage: item.dosage,
        category: medMap.get(item.medicineId)?.category || 'General',
        quantitySold: 0,
        totalRevenue: 0,
        totalCost: 0,
      };
      medData.quantitySold += item.quantity;
      medData.totalRevenue += itemRevenue;
      medData.totalCost += itemCost;
      medicineSalesMap.set(medKey, medData);

      // Category
      const cat = medMap.get(item.medicineId)?.category || 'General';
      const catData = categoryMap.get(cat) || { revenue: 0, units: 0, profit: 0 };
      catData.revenue += itemRevenue;
      catData.units += item.quantity;
      catData.profit += itemProfit;
      categoryMap.set(cat, catData);
    });

    dayEntry.profit = Math.max(0, dayEntry.revenue - dayEntry.cost);
    dailyMap.set(dayKey, dayEntry);
  });

  const totalProfit = Math.max(0, totalRevenue - totalCost);
  const profitMarginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const averageOrderValue = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  // Format Payment Stats
  const paymentStats: PaymentMethodStat[] = Object.entries(paymentAmounts).map(([method, data]) => ({
    method,
    amount: Math.round(data.amount * 100) / 100,
    transactions: data.count,
    percentage: totalRevenue > 0 ? Math.round((data.amount / totalRevenue) * 1000) / 10 : 0,
  }));

  const cashAmt = paymentAmounts['Cash']?.amount || 0;
  const cardAmt = paymentAmounts['Card']?.amount || 0;
  const digitalAmt = paymentAmounts['UPI / Digital']?.amount || 0;
  const insAmt = paymentAmounts['Clinic Credit / Insurance']?.amount || 0;

  // Format Top Medicines
  const topMedicines: MedicineSalesStat[] = Array.from(medicineSalesMap.values()).map((m) => {
    const medObj = medMap.get(m.medicineId);
    let currentStock = 0;
    if (medObj) {
      currentStock = medObj.batches
        .filter((b) => b.status === 'active')
        .reduce((sum, b) => sum + b.quantity, 0);
    }
    const profit = Math.max(0, m.totalRevenue - m.totalCost);
    const margin = m.totalRevenue > 0 ? (profit / m.totalRevenue) * 100 : 0;

    let stockStatus: 'adequate' | 'low' | 'out_of_stock' = 'adequate';
    if (currentStock === 0) stockStatus = 'out_of_stock';
    else if (medObj && currentStock <= medObj.minStockThreshold) stockStatus = 'low';

    return {
      medicineId: m.medicineId,
      medicineName: m.medicineName,
      genericName: m.genericName,
      dosage: m.dosage,
      category: m.category,
      quantitySold: m.quantitySold,
      totalRevenue: Math.round(m.totalRevenue * 100) / 100,
      totalCost: Math.round(m.totalCost * 100) / 100,
      grossProfit: Math.round(profit * 100) / 100,
      profitMarginPercent: Math.round(margin * 10) / 10,
      currentStock,
      stockStatus,
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Format Categories
  const categoryBreakdown: CategorySalesStat[] = Array.from(categoryMap.entries()).map(([cat, data]) => ({
    category: cat,
    revenue: Math.round(data.revenue * 100) / 100,
    units: data.units,
    profit: Math.round(data.profit * 100) / 100,
    percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 1000) / 10 : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  // Format Daily Trends
  const dailyTrends: DailySalesTrendPoint[] = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateStr, data]) => {
      const parts = dateStr.split('-');
      let formattedDate = dateStr;
      let dayName = '';
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      }
      return {
        date: dateStr,
        formattedDate,
        dayName,
        revenue: Math.round(data.revenue * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
        profit: Math.round(data.profit * 100) / 100,
        orders: data.orders,
        units: data.units,
      };
    });

  // Format Hourly
  const hourlyDistribution: HourlySalesPoint[] = Array.from(hourlyMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hourNum, data]) => {
      const hourStr = `${String(hourNum).padStart(2, '0')}:00`;
      const period = hourNum >= 12 ? 'PM' : 'AM';
      const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
      return {
        hour: hourStr,
        hourLabel: `${displayHour} ${period}`,
        revenue: Math.round(data.revenue * 100) / 100,
        transactions: data.transactions,
        units: data.units,
      };
    });

  // Find Peak Hour
  let peakHour = 'N/A';
  let maxHourlyRev = 0;
  hourlyDistribution.forEach((h) => {
    if (h.revenue > maxHourlyRev) {
      maxHourlyRev = h.revenue;
      peakHour = `${h.hourLabel} (${formatCurrencySimple(h.revenue)})`;
    }
  });

  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0].category : 'N/A';
  const bestSellingMedicine = topMedicines.length > 0 ? `${topMedicines[0].medicineName} (${topMedicines[0].quantitySold} units)` : 'N/A';

  return {
    range,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    profitMarginPercent: Math.round(profitMarginPercent * 10) / 10,
    totalOrders: filteredSales.length,
    totalUnitsSold,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    uniquePatientsCount: uniquePatients.size,
    paymentBreakdown: {
      cash: Math.round(cashAmt * 100) / 100,
      card: Math.round(cardAmt * 100) / 100,
      digital: Math.round(digitalAmt * 100) / 100,
      insurance: Math.round(insAmt * 100) / 100,
      cashPercentage: totalRevenue > 0 ? Math.round((cashAmt / totalRevenue) * 1000) / 10 : 0,
      cardPercentage: totalRevenue > 0 ? Math.round((cardAmt / totalRevenue) * 1000) / 10 : 0,
      digitalPercentage: totalRevenue > 0 ? Math.round((digitalAmt / totalRevenue) * 1000) / 10 : 0,
      insurancePercentage: totalRevenue > 0 ? Math.round((insAmt / totalRevenue) * 1000) / 10 : 0,
    },
    paymentStats,
    dailyTrends,
    hourlyDistribution,
    topMedicines,
    categoryBreakdown,
    salesList: filteredSales,
    peakHour,
    topCategory,
    bestSellingMedicine,
  };
}

function formatCurrencySimple(val: number): string {
  return `$${val.toFixed(2)}`;
}

// Download Comprehensive Analytics CSV
export function downloadSalesAnalyticsCSV(data: SalesAnalyticsData): void {
  const lines: string[] = [];
  lines.push(`SALES ANALYTICS & REVENUE REPORT`);
  lines.push(`Period: ${data.range.label} (${data.range.startDate} to ${data.range.endDate})`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');

  lines.push('--- FINANCIAL PERFORMANCE OVERVIEW ---');
  lines.push(`Total Gross Revenue,$${data.totalRevenue.toFixed(2)}`);
  lines.push(`Total Cost of Goods Sold (COGS),$${data.totalCost.toFixed(2)}`);
  lines.push(`Net Gross Profit,$${data.totalProfit.toFixed(2)}`);
  lines.push(`Profit Margin,${data.profitMarginPercent}%`);
  lines.push(`Total Invoices / Transactions,${data.totalOrders}`);
  lines.push(`Total Medicine Units Sold,${data.totalUnitsSold}`);
  lines.push(`Average Basket / Ticket Size,$${data.averageOrderValue.toFixed(2)}`);
  lines.push(`Unique Patients Serviced,${data.uniquePatientsCount}`);
  lines.push('');

  lines.push('--- PAYMENT CHANNEL BREAKDOWN ---');
  lines.push('Payment Method,Amount,Share (%),Invoices');
  data.paymentStats.forEach((p) => {
    lines.push(`"${p.method}",$${p.amount.toFixed(2)},${p.percentage}%,${p.transactions}`);
  });
  lines.push('');

  lines.push('--- TOP SELLING MEDICINES & PROFITABILITY ---');
  lines.push('Rank,Medicine Name,Generic Formula,Dosage,Category,Units Sold,Revenue,Cost,Gross Profit,Margin %,In Stock,Stock Status');
  data.topMedicines.forEach((m, idx) => {
    lines.push(
      `${idx + 1},"${m.medicineName}","${m.genericName}","${m.dosage}","${m.category}",${m.quantitySold},$${m.totalRevenue.toFixed(2)},$${m.totalCost.toFixed(2)},$${m.grossProfit.toFixed(2)},${m.profitMarginPercent}%,${m.currentStock},"${m.stockStatus}"`
    );
  });
  lines.push('');

  lines.push('--- SALES BY MEDICAL CATEGORY ---');
  lines.push('Category,Revenue,Units Sold,Gross Profit,Revenue Share (%)');
  data.categoryBreakdown.forEach((c) => {
    lines.push(`"${c.category}",$${c.revenue.toFixed(2)},${c.units},$${c.profit.toFixed(2)},${c.percentage}%`);
  });
  lines.push('');

  lines.push('--- DAILY REVENUE TIMELINE ---');
  lines.push('Date,Day,Revenue,COGS,Profit,Invoices,Units');
  data.dailyTrends.forEach((d) => {
    lines.push(`"${d.date}","${d.dayName}",$${d.revenue.toFixed(2)},$${d.cost.toFixed(2)},$${d.profit.toFixed(2)},${d.orders},${d.units}`);
  });
  lines.push('');

  lines.push('--- ITEM TRANSACTION LOG ---');
  lines.push('Invoice #,Date,Time,Patient Name,Phone,Doctor,Items Summary,Payment Mode,Grand Total,Cashier');
  data.salesList.forEach((s) => {
    const itemsStr = s.items.map((i) => `${i.medicineName} x${i.quantity}`).join('; ');
    lines.push(
      `"${s.invoiceNumber}","${s.date}","${s.time}","${s.patientName || 'Walk-in'}","${s.patientPhone || '-'}","${s.doctorName || '-'}","${itemsStr}","${s.paymentMethod}",$${s.grandTotal.toFixed(2)},"${s.cashierName}"`
    );
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Pharmacy_Sales_Analytics_${data.range.startDate}_to_${data.range.endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
