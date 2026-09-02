import { Medicine, Sale, StockMovement, DailyReportSummary, Batch } from '../types';
import { INITIAL_MEDICINES, INITIAL_SALES, INITIAL_MOVEMENTS } from '../data/initialData';
import { getDaysUntilExpiry, getTodayDateString } from './dateUtils';

const STORAGE_KEYS = {
  MEDICINES: 'clinical_shop_medicines_v1',
  SALES: 'clinical_shop_sales_v1',
  MOVEMENTS: 'clinical_shop_movements_v1',
  SETTINGS: 'clinical_shop_settings_v1',
};

export interface ClinicSettings {
  shopName: string;
  tagline: string;
  licenseNumber: string;
  address: string;
  phone: string;
  taxPercent: number;
  currencySymbol: string;
  defaultCashier: string;
  autoReportHour: number; // e.g., 21 (9 PM closing)
}

export const DEFAULT_SETTINGS: ClinicSettings = {
  shopName: 'Apex Health Clinical Dispensary',
  tagline: 'Licensed Clinical Pharmacy & Medical Supplies',
  licenseNumber: 'RX-CLINIC-78902-A',
  address: '450 Medical Arts Pavilion, Suite 102',
  phone: '+1 (555) 019-2834',
  taxPercent: 5,
  currencySymbol: '$',
  defaultCashier: 'Pharm. Alex Mercer',
  autoReportHour: 21,
};

export function loadSettings(): ClinicSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: ClinicSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function loadMedicines(): Medicine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEDICINES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load medicines from storage', e);
  }
  // Initialize with default
  saveMedicines(INITIAL_MEDICINES);
  return INITIAL_MEDICINES;
}

export function saveMedicines(medicines: Medicine[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
  } catch (e) {
    console.error('Failed to save medicines to storage', e);
  }
}

export function loadSales(): Sale[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load sales from storage', e);
  }
  saveSales(INITIAL_SALES);
  return INITIAL_SALES;
}

export function saveSales(sales: Sale[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  } catch (e) {
    console.error('Failed to save sales to storage', e);
  }
}

export function loadMovements(): StockMovement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load movements from storage', e);
  }
  saveMovements(INITIAL_MOVEMENTS);
  return INITIAL_MOVEMENTS;
}

export function saveMovements(movements: StockMovement[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
  } catch (e) {
    console.error('Failed to save movements to storage', e);
  }
}

export function resetToDemo(): void {
  localStorage.removeItem(STORAGE_KEYS.MEDICINES);
  localStorage.removeItem(STORAGE_KEYS.SALES);
  localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
  saveMedicines(INITIAL_MEDICINES);
  saveSales(INITIAL_SALES);
  saveMovements(INITIAL_MOVEMENTS);
}

// Automatic Daily Report Calculation
export function generateDailyReportSummary(
  targetDate: string,
  sales: Sale[],
  medicines: Medicine[]
): DailyReportSummary {
  const daySales = sales.filter((s) => s.date === targetDate);

  let totalSales = 0;
  let totalCost = 0;
  let totalItemsDispensed = 0;
  const paymentBreakdown = {
    cash: 0,
    card: 0,
    digital: 0,
    insurance: 0,
  };

  const medicineSalesMap: Record<
    string,
    { medicineName: string; dosage: string; quantity: number; revenue: number; profit: number }
  > = {};

  const categoryMap: Record<string, { revenue: number; units: number }> = {};

  // Build medicine category lookup
  const medCategoryMap: Record<string, string> = {};
  medicines.forEach((m) => {
    medCategoryMap[m.id] = m.category;
  });

  // Hourly buckets
  const hourlyBuckets: Record<string, { revenue: number; transactions: number }> = {};
  for (let h = 8; h <= 21; h++) {
    const label = `${String(h).padStart(2, '0')}:00`;
    hourlyBuckets[label] = { revenue: 0, transactions: 0 };
  }

  daySales.forEach((sale) => {
    totalSales += sale.grandTotal;

    // Payment method breakdown
    if (sale.paymentMethod === 'Cash') paymentBreakdown.cash += sale.grandTotal;
    else if (sale.paymentMethod === 'Card') paymentBreakdown.card += sale.grandTotal;
    else if (sale.paymentMethod === 'UPI / Digital') paymentBreakdown.digital += sale.grandTotal;
    else paymentBreakdown.insurance += sale.grandTotal;

    // Hourly
    if (sale.time) {
      const hourNum = parseInt(sale.time.split(':')[0], 10);
      const hourKey = `${String(hourNum).padStart(2, '0')}:00`;
      if (hourlyBuckets[hourKey]) {
        hourlyBuckets[hourKey].revenue += sale.grandTotal;
        hourlyBuckets[hourKey].transactions += 1;
      }
    }

    // Process line items
    sale.items.forEach((item) => {
      totalItemsDispensed += item.quantity;
      const itemCost = (item.costPrice || 0) * item.quantity;
      const itemRevenue = item.total;
      const itemProfit = itemRevenue - itemCost;
      totalCost += itemCost;

      const medKey = `${item.medicineName} (${item.dosage})`;
      if (!medicineSalesMap[medKey]) {
        medicineSalesMap[medKey] = {
          medicineName: item.medicineName,
          dosage: item.dosage,
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
      }
      medicineSalesMap[medKey].quantity += item.quantity;
      medicineSalesMap[medKey].revenue += itemRevenue;
      medicineSalesMap[medKey].profit += itemProfit;

      const cat = medCategoryMap[item.medicineId] || 'General';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { revenue: 0, units: 0 };
      }
      categoryMap[cat].revenue += itemRevenue;
      categoryMap[cat].units += item.quantity;
    });
  });

  const totalProfit = Math.max(0, totalSales - totalCost);
  const profitMarginPercent = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  const topSellingMedicines = Object.values(medicineSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const salesByCategory = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    revenue: Math.round(data.revenue * 100) / 100,
    units: data.units,
  }));

  const hourlyDistribution = Object.entries(hourlyBuckets).map(([hour, data]) => ({
    hour,
    revenue: Math.round(data.revenue * 100) / 100,
    transactions: data.transactions,
  }));

  // Expiration & Stock alerts
  let expiringBatchesCount = 0;
  let lowStockItemsCount = 0;

  medicines.forEach((med) => {
    let totalStock = 0;
    med.batches.forEach((b) => {
      if (b.status === 'active' && b.quantity > 0) {
        totalStock += b.quantity;
        const days = getDaysUntilExpiry(b.expDate);
        if (days <= 30) {
          expiringBatchesCount++;
        }
      }
    });
    if (totalStock <= med.minStockThreshold) {
      lowStockItemsCount++;
    }
  });

  return {
    date: targetDate,
    totalSales: Math.round(totalSales * 100) / 100,
    totalOrders: daySales.length,
    totalProfit: Math.round(totalProfit * 100) / 100,
    profitMarginPercent: Math.round(profitMarginPercent * 10) / 10,
    totalItemsDispensed,
    paymentBreakdown: {
      cash: Math.round(paymentBreakdown.cash * 100) / 100,
      card: Math.round(paymentBreakdown.card * 100) / 100,
      digital: Math.round(paymentBreakdown.digital * 100) / 100,
      insurance: Math.round(paymentBreakdown.insurance * 100) / 100,
    },
    topSellingMedicines,
    salesByCategory,
    hourlyDistribution,
    expiringBatchesCount,
    lowStockItemsCount,
  };
}

// Download CSV for daily report
export function downloadDailyReportCSV(summary: DailyReportSummary, daySales: Sale[]): void {
  const lines: string[] = [];
  lines.push(`DAILY CLINICAL SALES REPORT - ${summary.date}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push('--- EXECUTIVE SUMMARY ---');
  lines.push(`Total Revenue,$${summary.totalSales.toFixed(2)}`);
  lines.push(`Total Transactions,${summary.totalOrders}`);
  lines.push(`Total Estimated Profit,$${summary.totalProfit.toFixed(2)} (${summary.profitMarginPercent}%)`);
  lines.push(`Total Units Dispensed,${summary.totalItemsDispensed}`);
  lines.push('');
  lines.push('--- PAYMENT METHOD BREAKDOWN ---');
  lines.push(`Cash,$${summary.paymentBreakdown.cash.toFixed(2)}`);
  lines.push(`Card,$${summary.paymentBreakdown.card.toFixed(2)}`);
  lines.push(`UPI / Digital,$${summary.paymentBreakdown.digital.toFixed(2)}`);
  lines.push(`Clinic Credit / Insurance,$${summary.paymentBreakdown.insurance.toFixed(2)}`);
  lines.push('');
  lines.push('--- TOP DISPENSED MEDICINES ---');
  lines.push('Medicine Name,Dosage,Units Dispensed,Revenue,Gross Profit');
  summary.topSellingMedicines.forEach((m) => {
    lines.push(`"${m.medicineName}","${m.dosage}",${m.quantity},$${m.revenue.toFixed(2)},$${m.profit.toFixed(2)}`);
  });
  lines.push('');
  lines.push('--- TRANSACTION LOG ---');
  lines.push('Invoice #,Time,Patient Name,Prescription Ref,Items,Grand Total,Payment Method,Cashier');
  daySales.forEach((s) => {
    const itemsSummary = s.items.map((i) => `${i.medicineName} (${i.quantity})`).join('; ');
    lines.push(
      `"${s.invoiceNumber}","${s.time}","${s.patientName || 'Walk-in'}","${s.prescriptionRef || '-'}","${itemsSummary}",$${s.grandTotal.toFixed(2)},"${s.paymentMethod}","${s.cashierName}"`
    );
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Daily_Sales_Report_${summary.date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Download Complete Inventory Stock & Expiry CSV
export function downloadInventoryCSV(medicines: Medicine[]): void {
  const lines: string[] = [];
  lines.push('CLINICAL INVENTORY & EXPIRY STATUS REPORT');
  lines.push(`Exported: ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push(
    'Medicine Name,Generic Name,Dosage,Form,Category,Storage Location,Min Stock Threshold,Batch #,Mfg Date,Exp Date,Days to Expiry,Status,Cost Price,Selling Price,Quantity,Total Value'
  );

  medicines.forEach((m) => {
    m.batches.forEach((b) => {
      const days = getDaysUntilExpiry(b.expDate);
      const totalVal = (b.sellingPrice * b.quantity).toFixed(2);
      lines.push(
        `"${m.name}","${m.genericName}","${m.dosage}","${m.form}","${m.category}","${m.storageLocation}",${m.minStockThreshold},"${b.batchNumber}","${b.mfgDate}","${b.expDate}",${days},"${b.status}",$${b.costPrice.toFixed(2)},$${b.sellingPrice.toFixed(2)},${b.quantity},$${totalVal}`
      );
    });
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Clinical_Inventory_Batches_${getTodayDateString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
