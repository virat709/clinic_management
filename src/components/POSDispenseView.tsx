import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Check, 
  AlertTriangle, 
  User, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Building,
  Layers,
  Clock,
  Pill,
  ArrowRight,
  Printer,
  Scan,
  Coins,
  Receipt,
  Sparkles
} from 'lucide-react';
import { Medicine, Batch, CartItem, Sale, SaleItem } from '../types';
import { formatCurrency, formatDate, getDaysUntilExpiry, getExpiryStatus, getTodayDateString } from '../utils/dateUtils';
import { ClinicSettings } from '../utils/storage';
import { UIPreferences } from '../utils/theme';

interface POSDispenseViewProps {
  medicines: Medicine[];
  settings: ClinicSettings;
  onCompleteSale: (sale: Sale) => void;
  uiPrefs?: UIPreferences;
}

export const POSDispenseView: React.FC<POSDispenseViewProps> = ({
  medicines,
  settings,
  onCompleteSale,
  uiPrefs,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeMobileView, setActiveMobileView] = useState<'catalog' | 'cart'>('catalog');

  // Prescription / Patient Info
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [prescriptionRef, setPrescriptionRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('Cash');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<string>('');

  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const isCompact = uiPrefs?.density === 'compact';

  // Available medicines for dispensing (with active non-expired stock)
  const filteredCatalog = useMemo(() => {
    return medicines.filter((med) => {
      const search = searchTerm.toLowerCase();
      const matchSearch =
        searchTerm === '' ||
        med.name.toLowerCase().includes(search) ||
        med.genericName.toLowerCase().includes(search) ||
        med.barcode.toLowerCase().includes(search) ||
        med.storageLocation.toLowerCase().includes(search) ||
        med.batches.some((b) => b.batchNumber.toLowerCase().includes(search));

      const matchCategory = selectedCategory === 'all' || med.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [medicines, searchTerm, selectedCategory]);

  // Add medicine to bill using FEFO (First Expiry, First Out)
  const addToCart = (med: Medicine, specifiedBatch?: Batch) => {
    setCheckoutError(null);

    // Pick specified batch or auto-select earliest non-expired active batch with qty > 0
    let targetBatch = specifiedBatch;
    if (!targetBatch) {
      const validBatches = med.batches
        .filter((b) => b.status === 'active' && b.quantity > 0 && getDaysUntilExpiry(b.expDate) >= 0)
        .sort((a, b) => getDaysUntilExpiry(a.expDate) - getDaysUntilExpiry(b.expDate));

      if (validBatches.length === 0) {
        setCheckoutError(`Cannot sell "${med.name}" — Stock is empty or batches have expired.`);
        return;
      }
      targetBatch = validBatches[0];
    }

    // Check if already in bill
    const existingIndex = cart.findIndex(
      (c) => c.medicine.id === med.id && c.selectedBatch.id === targetBatch!.id
    );

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > targetBatch.quantity) {
        setCheckoutError(`Cannot add more. Batch #${targetBatch.batchNumber} only has ${targetBatch.quantity} units left in stock.`);
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      updatedCart[existingIndex].total = updatedCart[existingIndex].quantity * targetBatch.sellingPrice;
      setCart(updatedCart);
    } else {
      setCart((prev) => [
        ...prev,
        {
          medicine: med,
          selectedBatch: targetBatch!,
          quantity: 1,
          unitPrice: targetBatch!.sellingPrice,
          total: targetBatch!.sellingPrice,
        },
      ]);
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    setCheckoutError(null);
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const item = cart[index];
    if (newQty > item.selectedBatch.quantity) {
      setCheckoutError(`Only ${item.selectedBatch.quantity} units available in Batch #${item.selectedBatch.batchNumber}.`);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    updated[index].total = newQty * updated[index].unitPrice;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setPatientName('');
    setPatientPhone('');
    setDoctorName('');
    setPrescriptionRef('');
    setDiscountPercent(0);
    setCashTendered('');
    setCheckoutError(null);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * settings.taxPercent) / 100;
  const grandTotal = taxableAmount + taxAmount;

  // Change Return Calculation
  const tenderedNum = parseFloat(cashTendered);
  const changeReturn = !isNaN(tenderedNum) && tenderedNum >= grandTotal ? tenderedNum - grandTotal : 0;

  const handleCheckout = () => {
    if (cart.length === 0) {
      setCheckoutError('Please add at least one medicine to the bill first.');
      return;
    }

    const todayStr = getTodayDateString();
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const saleItems: SaleItem[] = cart.map((c) => ({
      medicineId: c.medicine.id,
      medicineName: c.medicine.name,
      genericName: c.medicine.genericName,
      dosage: c.medicine.dosage,
      batchId: c.selectedBatch.id,
      batchNumber: c.selectedBatch.batchNumber,
      expDate: c.selectedBatch.expDate,
      costPrice: c.selectedBatch.costPrice,
      unitPrice: c.unitPrice,
      quantity: c.quantity,
      total: c.total,
    }));

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNumber: `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: now.toISOString(),
      date: todayStr,
      time: `${hours}:${minutes}`,
      patientName: patientName.trim() || 'Counter Customer',
      patientPhone: patientPhone.trim(),
      doctorName: doctorName.trim(),
      prescriptionRef: prescriptionRef.trim(),
      items: saleItems,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discountAmount * 100) / 100,
      tax: Math.round(taxAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      paymentMethod,
      cashierName: settings.defaultCashier,
    };

    onCompleteSale(newSale);
    clearCart();
    setActiveMobileView('catalog');
  };

  const handleSimulateScan = () => {
    // Pick a random in-stock medicine
    const inStock = medicines.filter((m) => m.batches.some((b) => b.status === 'active' && b.quantity > 0));
    if (inStock.length > 0) {
      const randomMed = inStock[Math.floor(Math.random() * inStock.length)];
      addToCart(randomMed);
      setSearchTerm('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Mobile Tab Switcher (Catalog vs Cart) */}
      <div className="lg:hidden flex items-center bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <button
          onClick={() => setActiveMobileView('catalog')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMobileView === 'catalog'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>1. Medicines Catalog ({filteredCatalog.length})</span>
        </button>
        <button
          onClick={() => setActiveMobileView('cart')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
            activeMobileView === 'cart'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>2. Bill Slip ({cart.length})</span>
          {cart.length > 0 && (
            <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-mono text-[10px] font-black">
              {formatCurrency(grandTotal)}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Easy Search & Medicine Selector (7 Cols) */}
        <div className={`lg:col-span-7 space-y-4 ${activeMobileView === 'cart' ? 'hidden lg:block' : 'block'}`}>
          {/* Search Header */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xl">💊</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Dispense Medicine Catalog</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSimulateScan}
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Simulate Barcode / SKU Scan"
                >
                  <Scan className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Scan SKU</span>
                </button>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                  FEFO Auto-Select
                </span>
              </div>
            </div>

            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="pos-search-input"
                type="text"
                placeholder="🔍 Search medicine name, formula, rack, or batch #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:outline-hidden transition-all"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`shrink-0 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Medicines ({medicines.length})
              </button>
              {['Antibiotics', 'Analgesics & Pain', 'Diabetes & Metabolic', 'Cardiovascular', 'Respiratory', 'Gastrointestinal', 'Injectables & IV Fluids'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Medicine List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
            {filteredCatalog.map((med) => {
              // Find active non-expired batches
              const activeBatches = med.batches
                .filter((b) => b.status === 'active' && b.quantity > 0 && getDaysUntilExpiry(b.expDate) >= 0)
                .sort((a, b) => getDaysUntilExpiry(a.expDate) - getDaysUntilExpiry(b.expDate));

              const totalAvailableStock = activeBatches.reduce((acc, b) => acc + b.quantity, 0);
              const nearestBatch = activeBatches[0];
              const isOutOfStock = totalAvailableStock === 0;

              return (
                <div
                  key={med.id}
                  onClick={() => !isOutOfStock && addToCart(med)}
                  className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between group ${
                    isOutOfStock
                      ? 'border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-sm cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {med.name}
                      </h4>
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {med.dosage}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5 line-clamp-1">{med.genericName}</p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between">
                    <div>
                      {isOutOfStock ? (
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900">
                          Out of Stock
                        </span>
                      ) : (
                        <div>
                          <div className="flex items-baseline space-x-1.5">
                            <span className="text-sm font-black text-emerald-800 dark:text-emerald-400 font-mono">
                              {formatCurrency(nearestBatch.sellingPrice)}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                              ({totalAvailableStock} in stock)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Exp: {formatDate(nearestBatch.expDate)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isOutOfStock && (
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white dark:group-hover:bg-emerald-600 font-bold text-xs flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Billing Register / Receipt Counter (5 Cols) */}
        <div className={`lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden flex flex-col transition-colors ${activeMobileView === 'catalog' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Bill Counter Header */}
          <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🧾</span>
              <div>
                <h3 className="font-extrabold text-sm text-white">Current Dispensing Bill</h3>
                <p className="text-[11px] text-slate-300">{cart.length} item{cart.length !== 1 ? 's' : ''} added</p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-300 hover:text-rose-100 font-bold bg-rose-950/80 hover:bg-rose-900 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
              >
                Clear Bill
              </button>
            )}
          </div>

          {/* Customer / Patient Details */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Customer Name</label>
                <input
                  type="text"
                  placeholder="Walk-in Customer"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Mobile Phone</label>
                <input
                  type="text"
                  placeholder="Phone number"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Doctor Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Roberts"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">Prescription / Rx Ref</label>
                <input
                  type="text"
                  placeholder="e.g. RX-402"
                  value={prescriptionRef}
                  onChange={(e) => setPrescriptionRef(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Error notice */}
          {checkoutError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{checkoutError}</span>
            </div>
          )}

          {/* Bill Items List */}
          <div className="p-3.5 space-y-2.5 max-h-64 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500">
                <Pill className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Bill is empty</p>
                <p className="text-[11px] mt-0.5">Click medicines from the catalog to add to bill</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={`${item.medicine.id}-${item.selectedBatch.id}`} className="pt-2.5 first:pt-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">{item.medicine.name}</span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-1 font-mono">({item.medicine.dosage})</span>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        Batch: {item.selectedBatch.batchNumber} • Exp: {formatDate(item.selectedBatch.expDate)}
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(index)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 cursor-pointer transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity Stepper (Large & Clickable) */}
                    <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center font-bold text-sm shadow-xs cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                      <span className="w-10 text-center text-sm font-mono font-black text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center font-bold text-sm shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right font-mono">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(item.total)}</span>
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">@{formatCurrency(item.unitPrice)} each</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Calculation & Payment Mode */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {/* Payment Method Selector (Big buttons) */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Select Payment Mode</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                {[
                  { id: 'Cash', label: '💵 Cash', icon: Banknote },
                  { id: 'UPI / Digital', label: '📱 UPI / QR', icon: QrCode },
                  { id: 'Card', label: '💳 Card', icon: CreditCard },
                  { id: 'Clinic Credit / Insurance', label: '🏥 Credit', icon: Building },
                ].map((m) => {
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as Sale['paymentMethod'])}
                      className={`py-2 px-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Discount Selector */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-700 dark:text-slate-300 font-bold">Discount:</span>
              <div className="flex items-center space-x-1">
                {[0, 5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(pct)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      discountPercent === pct
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Tendered & Change Return Helper */}
            {paymentMethod === 'Cash' && cart.length > 0 && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    <span>Cash Tendered:</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-slate-500">$</span>
                    <input
                      type="number"
                      placeholder={grandTotal.toFixed(2)}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-24 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-white text-right focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
                {changeReturn > 0 && (
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 pt-1 border-t border-emerald-200 dark:border-emerald-800 font-mono">
                    <span>Change to Return:</span>
                    <span className="text-sm font-black">{formatCurrency(changeReturn)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Totals Summary */}
            <div className="space-y-1 text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                <span>Items Subtotal:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-800 dark:text-emerald-400 font-bold">
                  <span>Discount ({discountPercent}%):</span>
                  <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              {settings.taxPercent > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tax ({settings.taxPercent}%):</span>
                  <span className="font-mono font-medium">{formatCurrency(taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline text-slate-900 dark:text-white pt-2 border-t-2 border-slate-300 dark:border-slate-700">
                <span className="text-base font-black">Total Payable:</span>
                <span className="font-mono text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Complete Dispense Button */}
            <button
              id="complete-dispense-btn"
              type="button"
              disabled={cart.length === 0}
              onClick={handleCheckout}
              className={`w-full py-3.5 rounded-xl font-black text-sm shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                cart.length === 0
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-700/30 hover:scale-[1.01]'
              }`}
            >
              <Printer className="w-5 h-5 stroke-[2.5]" />
              <span>Complete Sale & Print Receipt</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Sticky Mobile Cart Button when in Catalog tab and cart has items */}
      {cart.length > 0 && activeMobileView === 'catalog' && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-20">
          <button
            onClick={() => setActiveMobileView('cart')}
            className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-150 cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-300">{cart.length} item{cart.length !== 1 ? 's' : ''} in Bill Slip</p>
                <p className="text-base font-black text-emerald-400 font-mono">{formatCurrency(grandTotal)}</p>
              </div>
            </div>
            <div className="flex items-center text-xs font-bold text-emerald-400">
              <span>View Bill & Checkout &rarr;</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
