import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  PackagePlus, 
  Sparkles, 
  Calendar, 
  Layers, 
  MapPin, 
  AlertCircle,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { Medicine, MedicineCategory, StorageLocation, Batch } from '../types';
import { getTodayDateString } from '../utils/dateUtils';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicines: Medicine[];
  onAddMedicine: (newMedicine: Medicine, batch: Batch) => void;
  onAddBatchToMedicine: (medicineId: string, batch: Batch) => void;
  preselectedMedicineId?: string | null;
}

const CATEGORIES: MedicineCategory[] = [
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

const LOCATIONS: StorageLocation[] = [
  'Main Shelf',
  'Cold Storage (2-8°C)',
  'Controlled Drugs Safe',
  'Top Shelf',
  'Rack A',
  'Rack B',
  'Rack C',
  'Dispensary Counter',
];

const QUICK_TEMPLATES = [
  {
    name: 'Amoxicillin 500mg',
    genericName: 'Amoxicillin Trihydrate',
    dosage: '500mg',
    form: 'Capsule' as const,
    category: 'Antibiotics' as MedicineCategory,
    storageLocation: 'Rack A' as StorageLocation,
    costPrice: 2.20,
    sellingPrice: 5.00,
  },
  {
    name: 'Ibuprofen 400mg',
    genericName: 'Ibuprofen',
    dosage: '400mg',
    form: 'Tablet' as const,
    category: 'Analgesics & Pain' as MedicineCategory,
    storageLocation: 'Main Shelf' as StorageLocation,
    costPrice: 1.10,
    sellingPrice: 3.20,
  },
  {
    name: 'Paracetamol 650mg',
    genericName: 'Acetaminophen',
    dosage: '650mg',
    form: 'Tablet' as const,
    category: 'Analgesics & Pain' as MedicineCategory,
    storageLocation: 'Main Shelf' as StorageLocation,
    costPrice: 0.80,
    sellingPrice: 2.00,
  },
  {
    name: 'Omeprazole 20mg',
    genericName: 'Omeprazole Delayed-Release',
    dosage: '20mg',
    form: 'Capsule' as const,
    category: 'Gastrointestinal' as MedicineCategory,
    storageLocation: 'Rack C' as StorageLocation,
    costPrice: 2.50,
    sellingPrice: 6.80,
  },
  {
    name: 'Azithromycin 500mg',
    genericName: 'Azithromycin Monohydrate',
    dosage: '500mg',
    form: 'Tablet' as const,
    category: 'Antibiotics' as MedicineCategory,
    storageLocation: 'Rack A' as StorageLocation,
    costPrice: 3.60,
    sellingPrice: 9.00,
  },
];

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  medicines,
  onAddMedicine,
  onAddBatchToMedicine,
  preselectedMedicineId,
}) => {
  const [mode, setMode] = useState<'new_item' | 'restock_existing'>(
    preselectedMedicineId ? 'restock_existing' : 'new_item'
  );

  const [selectedMedId, setSelectedMedId] = useState<string>(preselectedMedicineId || '');

  // Medicine Details
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState<Medicine['form']>('Tablet');
  const [category, setCategory] = useState<MedicineCategory>('Antibiotics');
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('Main Shelf');
  const [requiresPrescription, setRequiresPrescription] = useState(false);

  // Batch Details
  const [batchNumber, setBatchNumber] = useState('');
  const [expDate, setExpDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [costPrice, setCostPrice] = useState('3.50');
  const [sellingPrice, setSellingPrice] = useState('7.00');
  const [quantity, setQuantity] = useState('50');
  const [supplier, setSupplier] = useState('Direct Clinical Supplier');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedMedicineId) {
      setMode('restock_existing');
      setSelectedMedId(preselectedMedicineId);
      const existing = medicines.find((m) => m.id === preselectedMedicineId);
      if (existing && existing.batches.length > 0) {
        const latestBatch = existing.batches[existing.batches.length - 1];
        setCostPrice(String(latestBatch.costPrice));
        setSellingPrice(String(latestBatch.sellingPrice));
        setSupplier(latestBatch.supplier);
      }
    }
  }, [preselectedMedicineId, medicines]);

  if (!isOpen) return null;

  const handleApplyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    setName(tpl.name);
    setGenericName(tpl.genericName);
    setDosage(tpl.dosage);
    setForm(tpl.form);
    setCategory(tpl.category);
    setStorageLocation(tpl.storageLocation);
    setCostPrice(String(tpl.costPrice));
    setSellingPrice(String(tpl.sellingPrice));
    setBatchNumber(`BCH-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qtyNum = parseInt(quantity, 10);
    const costNum = parseFloat(costPrice);
    const sellNum = parseFloat(sellingPrice);

    if (!batchNumber.trim()) {
      setError('Please enter a Batch Number.');
      return;
    }
    if (!expDate) {
      setError('Please choose an Expiration Date.');
      return;
    }
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Quantity received must be at least 1 unit.');
      return;
    }
    if (isNaN(costNum) || isNaN(sellNum) || costNum < 0 || sellNum < 0) {
      setError('Cost price and selling price must be valid amounts.');
      return;
    }

    const batchId = `b-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const receivedDate = getTodayDateString();

    if (mode === 'restock_existing') {
      if (!selectedMedId) {
        setError('Please select which medicine you are adding stock for.');
        return;
      }
      const newBatch: Batch = {
        id: batchId,
        medicineId: selectedMedId,
        batchNumber: batchNumber.trim().toUpperCase(),
        mfgDate: receivedDate,
        expDate,
        costPrice: costNum,
        sellingPrice: sellNum,
        quantity: qtyNum,
        initialQuantity: qtyNum,
        supplier: supplier.trim() || 'Direct Supplier',
        receivedDate,
        status: 'active',
      };
      onAddBatchToMedicine(selectedMedId, newBatch);
    } else {
      if (!name.trim()) {
        setError('Please enter the Medicine Name.');
        return;
      }
      const medId = `med-${Date.now()}`;
      const newBatch: Batch = {
        id: batchId,
        medicineId: medId,
        batchNumber: batchNumber.trim().toUpperCase(),
        mfgDate: receivedDate,
        expDate,
        costPrice: costNum,
        sellingPrice: sellNum,
        quantity: qtyNum,
        initialQuantity: qtyNum,
        supplier: supplier.trim() || 'Direct Supplier',
        receivedDate,
        status: 'active',
      };

      const newMed: Medicine = {
        id: medId,
        name: name.trim(),
        genericName: genericName.trim() || name.trim(),
        dosage: dosage.trim() || 'Standard Dose',
        form,
        category,
        barcode: `SKU-${Date.now().toString().slice(-6)}`,
        minStockThreshold: 15,
        storageLocation,
        requiresPrescription,
        notes: '',
        createdAt: receivedDate,
        batches: [newBatch],
      };

      onAddMedicine(newMed, newBatch);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="add-stock-modal"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col transition-colors"
      >
        {/* Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📥</span>
            <div>
              <h2 className="text-lg font-black text-white">Stock Inward Register Entry</h2>
              <p className="text-xs text-slate-300">Add new medicine stock or record a new inward shipment batch</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Simple & Clear) */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-start gap-2">
          <button
            type="button"
            onClick={() => setMode('new_item')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'new_item'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            ➕ 1. Add Brand New Medicine
          </button>
          <button
            type="button"
            onClick={() => setMode('restock_existing')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'restock_existing'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            📦 2. Add New Batch to Existing Medicine
          </button>
        </div>

        {/* Quick Sample Clickers */}
        {mode === 'new_item' && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 px-6 py-2 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
            <span className="font-bold text-emerald-900 dark:text-emerald-300 shrink-0">Quick Fill:</span>
            {QUICK_TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                type="button"
                onClick={() => handleApplyTemplate(tpl)}
                className="shrink-0 bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                + {tpl.name}
              </button>
            ))}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Clean Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {mode === 'restock_existing' ? (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-300 dark:border-slate-700">
              <label className="block text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide mb-1.5">
                Select Existing Medicine from Your Register *
              </label>
              <select
                id="restock-med-select"
                value={selectedMedId}
                onChange={(e) => {
                  setSelectedMedId(e.target.value);
                  const existing = medicines.find((m) => m.id === e.target.value);
                  if (existing && existing.batches.length > 0) {
                    const last = existing.batches[existing.batches.length - 1];
                    setCostPrice(String(last.costPrice));
                    setSellingPrice(String(last.sellingPrice));
                    setSupplier(last.supplier);
                  }
                }}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="">-- Choose Medicine --</option>
                {medicines.map((m) => {
                  const activeStock = m.batches
                    .filter((b) => b.status === 'active')
                    .reduce((acc, b) => acc + b.quantity, 0);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.dosage}) — Current Stock: {activeStock} units
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Medicine Trade / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol, Augmentin, Panadol"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Strength / Dosage *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500mg, 10ml, 1g"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Active Formula / Generic Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acetaminophen, Amoxicillin"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Dosage Form</label>
                    <select
                      value={form}
                      onChange={(e) => setForm(e.target.value as Medicine['form'])}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup</option>
                      <option value="Injection">Injection</option>
                      <option value="Infusion">Infusion / IV</option>
                      <option value="Ointment">Cream / Ointment</option>
                      <option value="Drops">Eye/Ear Drops</option>
                      <option value="Inhaler">Inhaler</option>
                      <option value="Surgical Consumable">Medical Supply</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Shelf / Rack</label>
                    <select
                      value={storageLocation}
                      onChange={(e) => setStorageLocation(e.target.value as StorageLocation)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inward Batch Details Box (Prominent & Easy) */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <span>🏷️ Inward Batch & Expiry Information</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Batch / Lot Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BCH-8821 or LOT-09"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono uppercase font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-rose-700 dark:text-rose-400 mb-1">
                  Expiration Date (MM/YYYY or DD/MM/YYYY) *
                </label>
                <input
                  type="date"
                  required
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-rose-300 dark:border-rose-700 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Quantity (Units) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Buying Cost ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                  Selling Rate ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border-2 border-emerald-400 dark:border-emerald-600 rounded-xl px-3 py-2 text-sm font-black text-emerald-950 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Supplier / Agency / Distributor
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Pharma, Direct Wholesale Agency"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-add-stock-btn"
              type="submit"
              className="px-6 py-2.5 text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all hover:scale-[1.01] cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Save & Add to Register</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
