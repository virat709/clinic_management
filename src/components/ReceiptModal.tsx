import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Phone, MapPin, Receipt, Share2 } from 'lucide-react';
import { Sale } from '../types';
import { formatCurrency, formatDateTime, formatDate } from '../utils/dateUtils';
import { ClinicSettings } from '../utils/storage';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  settings: ClinicSettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  settings,
}) => {
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] transition-colors">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between no-print border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold">Clinical Dispensing Invoice</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-6 overflow-y-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans print:p-0 print:m-0 print:text-black print:bg-white transition-colors">
          {/* Clinic Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300 dark:border-slate-700 print:border-slate-400">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 text-white mb-2 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white uppercase print:text-black">
              {settings.shopName}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium print:text-slate-600">{settings.tagline}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 print:text-slate-600">{settings.address} • Tel: {settings.phone}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 print:text-slate-600">Drug License: {settings.licenseNumber}</p>
          </div>

          {/* Invoice Meta */}
          <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 print:border-slate-400 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium print:text-slate-600">Invoice No:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white print:text-black">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium print:text-slate-600">Date & Time:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 print:text-black">{formatDateTime(sale.timestamp)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium print:text-slate-600">Dispensing Pharmacist:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 print:text-black">{sale.cashierName}</span>
            </div>

            {sale.patientName && (
              <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 print:border-slate-200">
                <span className="text-slate-500 dark:text-slate-400 font-medium print:text-slate-600">Patient:</span>
                <span className="font-bold text-slate-900 dark:text-white print:text-black">
                  {sale.patientName} {sale.patientPhone ? `(${sale.patientPhone})` : ''}
                </span>
              </div>
            )}

            {sale.doctorName && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium print:text-slate-600">Prescribing Doctor:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 print:text-black">{sale.doctorName}</span>
              </div>
            )}

            {sale.prescriptionRef && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 font-medium print:text-slate-600">Rx Reference:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 print:text-black">{sale.prescriptionRef}</span>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 print:border-slate-400">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800 print:border-slate-300 print:text-slate-600">
                  <th className="pb-1.5">Item / Batch</th>
                  <th className="pb-1.5 text-center">Qty</th>
                  <th className="pb-1.5 text-right">Price</th>
                  <th className="pb-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="py-2">
                    <td className="py-2 pr-2">
                      <div className="font-bold text-slate-900 dark:text-white print:text-black">{item.medicineName}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 italic print:text-slate-600">{item.genericName} ({item.dosage})</div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono print:text-slate-600">
                        Batch: {item.batchNumber} • Exp: {formatDate(item.expDate)}
                      </div>
                    </td>
                    <td className="py-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200 print:text-black">
                      {item.quantity}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-600 dark:text-slate-400 print:text-slate-700">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-2 text-right font-mono font-bold text-slate-900 dark:text-white print:text-black">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 print:border-slate-400 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-slate-700">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(sale.subtotal)}</span>
            </div>

            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 print:text-emerald-700">
                <span>Discount:</span>
                <span className="font-mono">-{formatCurrency(sale.discount)}</span>
              </div>
            )}

            {sale.tax > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400 print:text-slate-700">
                <span>Clinical Sales Tax ({settings.taxPercent}%):</span>
                <span className="font-mono">{formatCurrency(sale.tax)}</span>
              </div>
            )}

            <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white print:text-black pt-2 border-t border-slate-200 dark:border-slate-800 print:border-slate-300">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400 print:text-emerald-700">{formatCurrency(sale.grandTotal)}</span>
            </div>

            <div className="flex justify-between text-xs pt-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium print:text-slate-600">Payment Mode:</span>
              <span className="font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 print:bg-slate-100 print:text-black rounded">
                {sale.paymentMethod}
              </span>
            </div>
          </div>

          {/* Footer & Compliance Note */}
          <div className="text-center pt-4 text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300 print:text-slate-800">Thank you for trusting {settings.shopName}</p>
            <p>Please consult your physician if symptoms persist. Keep medications out of reach of children.</p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono print:text-slate-600">FEFO Audited • Registered Dispensary Copy</p>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 no-print transition-colors">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
};
