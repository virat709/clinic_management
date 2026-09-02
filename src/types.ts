export type MedicineCategory = 
  | 'Antibiotics'
  | 'Analgesics & Pain'
  | 'Cardiovascular'
  | 'Diabetes & Metabolic'
  | 'Respiratory'
  | 'Gastrointestinal'
  | 'Dermatology & Topicals'
  | 'Vitamins & Supplements'
  | 'Injectables & IV Fluids'
  | 'Medical & Surgical Supplies'
  | 'Cold Chain / Biologics';

export type StorageLocation = 'Main Shelf' | 'Cold Storage (2-8°C)' | 'Controlled Drugs Safe' | 'Top Shelf' | 'Rack A' | 'Rack B' | 'Rack C' | 'Dispensary Counter';

export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'safe';

export interface Batch {
  id: string;
  medicineId: string;
  batchNumber: string;
  mfgDate: string; // YYYY-MM-DD
  expDate: string; // YYYY-MM-DD
  costPrice: number; // Purchase cost per unit
  sellingPrice: number; // Retail price per unit
  quantity: number; // Available units in this batch
  initialQuantity: number;
  supplier: string;
  receivedDate: string;
  status: 'active' | 'quarantined' | 'disposed' | 'depleted';
  disposalReason?: string;
}

export interface Medicine {
  id: string;
  name: string; // Brand name (e.g. Augmentin)
  genericName: string; // Generic formula (e.g. Amoxicillin + Clavulanic Acid)
  dosage: string; // e.g. 625mg, 100ml, 500IU
  form: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Ointment' | 'Drops' | 'Inhaler' | 'Surgical Consumable' | 'Infusion';
  category: MedicineCategory;
  barcode: string;
  minStockThreshold: number; // Low stock alert threshold
  storageLocation: StorageLocation;
  requiresPrescription: boolean;
  notes?: string;
  createdAt: string;
  batches: Batch[];
}

export interface CartItem {
  medicine: Medicine;
  selectedBatch: Batch;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SaleItem {
  medicineId: string;
  medicineName: string;
  genericName: string;
  dosage: string;
  batchId: string;
  batchNumber: string;
  expDate: string;
  costPrice: number;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD for fast grouping
  time: string; // HH:mm
  patientName?: string;
  patientPhone?: string;
  doctorName?: string;
  prescriptionRef?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paymentMethod: 'Cash' | 'Card' | 'UPI / Digital' | 'Clinic Credit / Insurance';
  cashierName: string;
  notes?: string;
}

export interface StockMovement {
  id: string;
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  type: 'stock_in' | 'sale_dispense' | 'expired_disposal' | 'stock_adjustment' | 'return';
  quantityChange: number; // positive or negative
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  timestamp: string;
  performedBy: string;
}

export interface DailyReportSummary {
  date: string;
  totalSales: number;
  totalOrders: number;
  totalProfit: number;
  profitMarginPercent: number;
  totalItemsDispensed: number;
  paymentBreakdown: {
    cash: number;
    card: number;
    digital: number;
    insurance: number;
  };
  topSellingMedicines: {
    medicineName: string;
    dosage: string;
    quantity: number;
    revenue: number;
    profit: number;
  }[];
  salesByCategory: {
    category: string;
    revenue: number;
    units: number;
  }[];
  hourlyDistribution: {
    hour: string;
    revenue: number;
    transactions: number;
  }[];
  expiringBatchesCount: number;
  lowStockItemsCount: number;
}
