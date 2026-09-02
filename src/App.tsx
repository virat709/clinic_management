import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { InventoryView } from './components/InventoryView';
import { ExpiryTrackerView } from './components/ExpiryTrackerView';
import { POSDispenseView } from './components/POSDispenseView';
import { DailyReportsView } from './components/DailyReportsView';
import { StockLedgerView } from './components/StockLedgerView';
import { SettingsView } from './components/SettingsView';
import { AddStockModal } from './components/AddStockModal';
import { ReceiptModal } from './components/ReceiptModal';
import { Medicine, Batch, Sale, StockMovement } from './types';
import { 
  loadMedicines, 
  saveMedicines, 
  loadSales, 
  saveSales, 
  loadMovements, 
  saveMovements, 
  loadSettings, 
  saveSettings,
  ClinicSettings,
  resetToDemo
} from './utils/storage';
import { 
  loadUIPreferences, 
  saveUIPreferences, 
  applyTheme, 
  UIPreferences 
} from './utils/theme';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [settings, setSettings] = useState<ClinicSettings>(loadSettings());
  const [uiPrefs, setUIPrefs] = useState<UIPreferences>(loadUIPreferences());

  const [activeTab, setActiveTab] = useState<'pos' | 'reports' | 'inventory' | 'expiry' | 'ledger' | 'settings'>('pos');
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [preselectedMedId, setPreselectedMedId] = useState<string | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Initialize data on mount
  useEffect(() => {
    setMedicines(loadMedicines());
    setSales(loadSales());
    setMovements(loadMovements());
    setSettings(loadSettings());
    const prefs = loadUIPreferences();
    setUIPrefs(prefs);
    applyTheme(prefs.theme);
  }, []);

  // Sync theme changes
  useEffect(() => {
    applyTheme(uiPrefs.theme);
    saveUIPreferences(uiPrefs);
  }, [uiPrefs]);

  const handleUpdateUIPrefs = (updater: Partial<UIPreferences> | ((prev: UIPreferences) => UIPreferences)) => {
    setUIPrefs((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return next;
    });
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Open add stock modal (optionally preselected)
  const handleOpenAddStock = (medId?: string) => {
    setPreselectedMedId(medId || null);
    setIsAddStockOpen(true);
  };

  // 1. Add Brand New Medicine & Initial Batch
  const handleAddMedicine = (newMed: Medicine, batch: Batch) => {
    const updated = [newMed, ...medicines];
    setMedicines(updated);
    saveMedicines(updated);

    // Record in stock movement ledger
    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      medicineId: newMed.id,
      medicineName: newMed.name,
      batchNumber: batch.batchNumber,
      type: 'stock_in',
      quantityChange: batch.quantity,
      previousQuantity: 0,
      newQuantity: batch.quantity,
      reason: `Initial stock registration (${batch.supplier})`,
      timestamp: new Date().toISOString(),
      performedBy: settings.defaultCashier,
    };
    const updatedMovements = [movement, ...movements];
    setMovements(updatedMovements);
    saveMovements(updatedMovements);

    showToast(`Added "${newMed.name}" (${batch.quantity} units, Batch #${batch.batchNumber}) to inventory.`);
  };

  // 2. Restock Existing Medicine (Add New Batch)
  const handleAddBatchToMedicine = (medicineId: string, newBatch: Batch) => {
    let targetMedName = '';
    let prevTotalStock = 0;

    const updated = medicines.map((med) => {
      if (med.id === medicineId) {
        targetMedName = med.name;
        prevTotalStock = med.batches
          .filter((b) => b.status === 'active')
          .reduce((sum, b) => sum + b.quantity, 0);

        return {
          ...med,
          batches: [...med.batches, newBatch],
        };
      }
      return med;
    });

    setMedicines(updated);
    saveMedicines(updated);

    // Record movement
    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      medicineId,
      medicineName: targetMedName || 'Medicine',
      batchNumber: newBatch.batchNumber,
      type: 'stock_in',
      quantityChange: newBatch.quantity,
      previousQuantity: prevTotalStock,
      newQuantity: prevTotalStock + newBatch.quantity,
      reason: `Inward stock replenishment (${newBatch.supplier})`,
      timestamp: new Date().toISOString(),
      performedBy: settings.defaultCashier,
    };
    const updatedMovements = [movement, ...movements];
    setMovements(updatedMovements);
    saveMovements(updatedMovements);

    showToast(`Restocked ${newBatch.quantity} units for "${targetMedName}" (Batch #${newBatch.batchNumber}).`);
  };

  // 3. Complete Sale / Dispense Prescription
  const handleCompleteSale = (newSale: Sale) => {
    // Deduct stock from specific batches
    const newMovements: StockMovement[] = [];

    const updatedMedicines = medicines.map((med) => {
      const itemsForThisMed = newSale.items.filter((item) => item.medicineId === med.id);
      if (itemsForThisMed.length === 0) return med;

      let medPreviousStock = med.batches
        .filter((b) => b.status === 'active')
        .reduce((sum, b) => sum + b.quantity, 0);

      const updatedBatches = med.batches.map((batch) => {
        const soldItem = itemsForThisMed.find((i) => i.batchId === batch.id);
        if (!soldItem) return batch;

        const newQty = Math.max(0, batch.quantity - soldItem.quantity);
        
        newMovements.push({
          id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          medicineId: med.id,
          medicineName: med.name,
          batchNumber: batch.batchNumber,
          type: 'sale_dispense',
          quantityChange: -soldItem.quantity,
          previousQuantity: batch.quantity,
          newQuantity: newQty,
          reason: `Dispensed on ${newSale.invoiceNumber} (Patient: ${newSale.patientName || 'Walk-in'})`,
          timestamp: newSale.timestamp,
          performedBy: newSale.cashierName,
        });

        return {
          ...batch,
          quantity: newQty,
          status: newQty === 0 ? ('depleted' as const) : batch.status,
        };
      });

      return {
        ...med,
        batches: updatedBatches,
      };
    });

    setMedicines(updatedMedicines);
    saveMedicines(updatedMedicines);

    const updatedSales = [newSale, ...sales];
    setSales(updatedSales);
    saveSales(updatedSales);

    const updatedMovements = [...newMovements, ...movements];
    setMovements(updatedMovements);
    saveMovements(updatedMovements);

    // Show receipt modal immediately
    setReceiptSale(newSale);
    showToast(`Invoice ${newSale.invoiceNumber} dispensed successfully.`);
  };

  // 4. Batch Action (Quarantine / Dispose)
  const handleBatchAction = (
    medicineId: string,
    batchId: string,
    action: 'quarantine' | 'dispose' | 'restore',
    reason?: string
  ) => {
    let medName = '';
    let batchNo = '';
    let batchQty = 0;

    const updated = medicines.map((med) => {
      if (med.id === medicineId) {
        medName = med.name;
        const updatedBatches = med.batches.map((b) => {
          if (b.id === batchId) {
            batchNo = b.batchNumber;
            batchQty = b.quantity;
            const newStatus: Batch['status'] =
              action === 'quarantine' ? 'quarantined' : action === 'dispose' ? 'disposed' : 'active';
            return {
              ...b,
              status: newStatus,
              disposalReason: reason || b.disposalReason,
            };
          }
          return b;
        });
        return { ...med, batches: updatedBatches };
      }
      return med;
    });

    setMedicines(updated);
    saveMedicines(updated);

    if (action === 'dispose' || action === 'quarantine') {
      const mov: StockMovement = {
        id: `mov-${Date.now()}`,
        medicineId,
        medicineName: medName,
        batchNumber: batchNo,
        type: 'expired_disposal',
        quantityChange: action === 'dispose' ? -batchQty : 0,
        previousQuantity: batchQty,
        newQuantity: action === 'dispose' ? 0 : batchQty,
        reason: reason || `${action === 'quarantine' ? 'Quarantined' : 'Disposed'} due to expiration date reached`,
        timestamp: new Date().toISOString(),
        performedBy: settings.defaultCashier,
      };
      const updatedMovs = [mov, ...movements];
      setMovements(updatedMovs);
      saveMovements(updatedMovs);
    }

    showToast(`Batch #${batchNo} of ${medName} marked as ${action}.`);
  };

  // 5. Settings update
  const handleSaveSettings = (newSettings: ClinicSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    showToast('Clinic dispensary settings saved.');
  };

  // 6. Reset to Demo
  const handleResetData = () => {
    resetToDemo();
    setMedicines(loadMedicines());
    setSales(loadSales());
    setMovements(loadMovements());
    setSettings(loadSettings());
    showToast('Reset to sample clinical inventory and sales dataset.');
  };

  // 7. Full Import
  const handleImportAllData = (data: {
    medicines: Medicine[];
    sales: Sale[];
    movements: StockMovement[];
    settings?: ClinicSettings;
  }) => {
    setMedicines(data.medicines);
    saveMedicines(data.medicines);
    setSales(data.sales || []);
    saveSales(data.sales || []);
    setMovements(data.movements || []);
    saveMovements(data.movements || []);
    if (data.settings) {
      setSettings(data.settings);
      saveSettings(data.settings);
    }
    showToast('Database imported successfully.');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-150">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="flex items-center space-x-2.5 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 dark:border-slate-600 text-xs font-semibold">
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        medicines={medicines}
        sales={sales}
        settings={settings}
        onOpenAddStock={() => handleOpenAddStock()}
        uiPrefs={uiPrefs}
        onUpdateUIPrefs={handleUpdateUIPrefs}
      />

      {/* Main Content Viewport */}
      <main className={`flex-1 w-full mx-auto py-6 transition-all duration-150 ${
        uiPrefs.pageWidth === 'full' ? 'max-w-none px-3 sm:px-6' : 'max-w-7xl px-4 sm:px-6 lg:px-8'
      }`}>
        {activeTab === 'pos' && (
          <POSDispenseView
            medicines={medicines}
            settings={settings}
            onCompleteSale={handleCompleteSale}
            uiPrefs={uiPrefs}
          />
        )}

        {activeTab === 'reports' && (
          <DailyReportsView
            sales={sales}
            medicines={medicines}
            settings={settings}
            onOpenSaleReceipt={(sale) => setReceiptSale(sale)}
            uiPrefs={uiPrefs}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            medicines={medicines}
            onOpenAddStock={handleOpenAddStock}
            onSelectForDispense={(med) => {
              setActiveTab('pos');
            }}
            uiPrefs={uiPrefs}
          />
        )}

        {activeTab === 'expiry' && (
          <ExpiryTrackerView
            medicines={medicines}
            onBatchAction={handleBatchAction}
            onOpenAddStock={handleOpenAddStock}
            uiPrefs={uiPrefs}
          />
        )}

        {activeTab === 'ledger' && (
          <StockLedgerView 
            movements={movements} 
            uiPrefs={uiPrefs}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onResetData={handleResetData}
            medicines={medicines}
            sales={sales}
            movements={movements}
            onImportAllData={handleImportAllData}
            uiPrefs={uiPrefs}
          />
        )}
      </main>

      {/* Add Stock & Inward Batch Modal */}
      <AddStockModal
        isOpen={isAddStockOpen}
        onClose={() => {
          setIsAddStockOpen(false);
          setPreselectedMedId(null);
        }}
        medicines={medicines}
        onAddMedicine={handleAddMedicine}
        onAddBatchToMedicine={handleAddBatchToMedicine}
        preselectedMedicineId={preselectedMedId}
      />

      {/* Printable Clinical Dispensing Invoice / Receipt Modal */}
      <ReceiptModal
        isOpen={!!receiptSale}
        onClose={() => setReceiptSale(null)}
        sale={receiptSale}
        settings={settings}
      />
    </div>
  );
}
