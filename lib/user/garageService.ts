export interface Vehicle {
  id: string;
  plate: string;
  type: 'Car' | 'Bike' | 'SUV' | 'EV';
  nickname?: string;
  default: boolean;
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
}

const STORAGE_KEY_VEHICLES = 'idam_user_vehicles';
const STORAGE_KEY_WALLET = 'idam_wallet_balance';
const STORAGE_KEY_WALLET_TXNS = 'idam_wallet_transactions';

const DEFAULT_VEHICLES: Vehicle[] = [
  { id: 'v1', plate: 'TN 59 AB 1234', type: 'Car', nickname: 'City Honda', default: true },
  { id: 'v2', plate: 'TN 59 C 5678', type: 'Bike', nickname: 'Yamaha Commuter', default: false }
];

const DEFAULT_TXNS: WalletTransaction[] = [
  { id: 'tx-1', type: 'credit', amount: 500, description: 'Welcome Bonus Top-up', date: 'Today, 10:00 AM' }
];

export function getUserVehicles(): Vehicle[] {
  if (typeof window === 'undefined') return DEFAULT_VEHICLES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VEHICLES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(DEFAULT_VEHICLES));
      return DEFAULT_VEHICLES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_VEHICLES;
  } catch {
    return DEFAULT_VEHICLES;
  }
}

export function saveUserVehicles(vehicles: Vehicle[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_VEHICLES, JSON.stringify(vehicles));
  } catch (e) {
    console.error('Failed to save vehicles to storage:', e);
  }
}

export function addVehicle(data: { plate: string; type: 'Car' | 'Bike' | 'SUV' | 'EV'; nickname?: string; makeDefault?: boolean }): Vehicle[] {
  const current = getUserVehicles();
  const shouldBeDefault = data.makeDefault || current.length === 0;

  const updatedCurrent = shouldBeDefault
    ? current.map(v => ({ ...v, default: false }))
    : current;

  const newVehicle: Vehicle = {
    id: `veh-${Date.now()}`,
    plate: data.plate.trim().toUpperCase(),
    type: data.type,
    nickname: data.nickname?.trim() || undefined,
    default: shouldBeDefault
  };

  const nextList = [...updatedCurrent, newVehicle];
  saveUserVehicles(nextList);
  return nextList;
}

export function deleteVehicle(id: string): Vehicle[] {
  const current = getUserVehicles();
  const filtered = current.filter(v => v.id !== id);

  // If we deleted the default vehicle, make the first remaining vehicle the default
  if (filtered.length > 0 && !filtered.some(v => v.default)) {
    filtered[0].default = true;
  }

  saveUserVehicles(filtered);
  return filtered;
}

export function setDefaultVehicle(id: string): Vehicle[] {
  const current = getUserVehicles();
  const updated = current.map(v => ({
    ...v,
    default: v.id === id
  }));
  saveUserVehicles(updated);
  return updated;
}

export function getDefaultVehicle(): Vehicle | null {
  const current = getUserVehicles();
  return current.find(v => v.default) || current[0] || null;
}

// Wallet Operations
export function getWalletBalance(): number {
  if (typeof window === 'undefined') return 500;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WALLET);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_WALLET, '500');
      return 500;
    }
    const val = parseFloat(raw);
    return isNaN(val) ? 500 : val;
  } catch {
    return 500;
  }
}

export function getWalletTransactions(): WalletTransaction[] {
  if (typeof window === 'undefined') return DEFAULT_TXNS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WALLET_TXNS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_WALLET_TXNS, JSON.stringify(DEFAULT_TXNS));
      return DEFAULT_TXNS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_TXNS;
  }
}

export function topUpWallet(amount: number): { newBalance: number; transactions: WalletTransaction[] } {
  const current = getWalletBalance();
  const nextBalance = current + amount;
  const currentTxns = getWalletTransactions();

  const newTxn: WalletTransaction = {
    id: `tx-${Date.now()}`,
    type: 'credit',
    amount,
    description: `Fast Top-up (Instant UPI)`,
    date: 'Just now'
  };

  const updatedTxns = [newTxn, ...currentTxns];

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_WALLET, nextBalance.toString());
      localStorage.setItem(STORAGE_KEY_WALLET_TXNS, JSON.stringify(updatedTxns));
    } catch (e) {
      console.error('Failed to update wallet in storage:', e);
    }
  }

  return { newBalance: nextBalance, transactions: updatedTxns };
}
