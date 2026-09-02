import { ExpiryStatus } from '../types';

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatDate(dateString: string): string {
  try {
    if (!dateString) return '-';
    const [y, m, d] = dateString.split('-');
    if (!y || !m || !d) return dateString;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getDaysUntilExpiry(expDateString: string, referenceDate = new Date()): number {
  if (!expDateString) return 999;
  const [y, m, d] = expDateString.split('-').map(Number);
  const exp = new Date(y, m - 1, d);
  
  // Set both to midnight for exact day delta
  exp.setHours(0, 0, 0, 0);
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  
  const diffTime = exp.getTime() - ref.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getExpiryStatus(expDateString: string): {
  status: ExpiryStatus;
  daysRemaining: number;
  label: string;
  badgeClass: string;
  dotColor: string;
} {
  const days = getDaysUntilExpiry(expDateString);

  if (days < 0) {
    return {
      status: 'expired',
      daysRemaining: days,
      label: `Expired ${Math.abs(days)}d ago`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      dotColor: 'bg-rose-500',
    };
  }
  if (days <= 30) {
    return {
      status: 'critical',
      daysRemaining: days,
      label: days === 0 ? 'Expires Today' : `Expires in ${days}d`,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      dotColor: 'bg-amber-500',
    };
  }
  if (days <= 90) {
    return {
      status: 'warning',
      daysRemaining: days,
      label: `Expires in ${days}d`,
      badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      dotColor: 'bg-yellow-500',
    };
  }
  return {
    status: 'safe',
    daysRemaining: days,
    label: `Good (${days}d)`,
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotColor: 'bg-emerald-500',
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
