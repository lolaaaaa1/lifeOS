import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FinanceSettings, BudgetItem, Account,
  Transaction, SavingsGoal, Loan, monthKey,
} from '@/constants/financeTypes';
import { uid } from './store';

export { uid };

const K = {
  settings:     'lifeos:finance:settings',
  budget:       'lifeos:finance:budget',
  accounts:     'lifeos:finance:accounts',
  transactions: 'lifeos:finance:transactions',
  goals:        'lifeos:finance:goals',
  loans:        'lifeos:finance:loans',
};

async function load<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

async function save(key: string, data: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

const DEFAULT_SETTINGS: FinanceSettings = {
  income: 0,
  incomeCurrency: 'GHS',
  defaultCurrency: 'GHS',
  currentMonth: monthKey(),
};

export const finSettings = {
  get: () => load<FinanceSettings>(K.settings, DEFAULT_SETTINGS),
  set: (s: FinanceSettings) => save(K.settings, s),
};

export const budget = {
  getAll: () => load<BudgetItem[]>(K.budget, []),
  add: async (item: BudgetItem) => {
    const all = await budget.getAll();
    await save(K.budget, [...all, item]);
  },
  update: async (id: string, patch: Partial<BudgetItem>) => {
    const all = await budget.getAll();
    await save(K.budget, all.map(b => b.id === id ? { ...b, ...patch } : b));
  },
  remove: async (id: string) => {
    const all = await budget.getAll();
    await save(K.budget, all.filter(b => b.id !== id));
  },
};

export const accounts = {
  getAll: () => load<Account[]>(K.accounts, []),
  add: async (a: Account) => {
    const all = await accounts.getAll();
    await save(K.accounts, [...all, a]);
  },
  update: async (id: string, patch: Partial<Account>) => {
    const all = await accounts.getAll();
    await save(K.accounts, all.map(a => a.id === id ? { ...a, ...patch } : a));
  },
  remove: async (id: string) => {
    const all = await accounts.getAll();
    await save(K.accounts, all.filter(a => a.id !== id));
  },
};

export const transactions = {
  getAll: () => load<Transaction[]>(K.transactions, []),
  add: async (t: Transaction) => {
    const all = await transactions.getAll();
    await save(K.transactions, [t, ...all]);
  },
  update: async (id: string, patch: Partial<Transaction>) => {
    const all = await transactions.getAll();
    await save(K.transactions, all.map(t => t.id === id ? { ...t, ...patch } : t));
  },
  remove: async (id: string) => {
    const all = await transactions.getAll();
    await save(K.transactions, all.filter(t => t.id !== id));
  },
};

export const finGoals = {
  getAll: () => load<SavingsGoal[]>(K.goals, []),
  add: async (g: SavingsGoal) => {
    const all = await finGoals.getAll();
    await save(K.goals, [...all, g]);
  },
  update: async (id: string, patch: Partial<SavingsGoal>) => {
    const all = await finGoals.getAll();
    await save(K.goals, all.map(g => g.id === id ? { ...g, ...patch } : g));
  },
  remove: async (id: string) => {
    const all = await finGoals.getAll();
    await save(K.goals, all.filter(g => g.id !== id));
  },
};

export const loans = {
  getAll: () => load<Loan[]>(K.loans, []),
  add: async (l: Loan) => {
    const all = await loans.getAll();
    await save(K.loans, [l, ...all]);
  },
  update: async (id: string, patch: Partial<Loan>) => {
    const all = await loans.getAll();
    await save(K.loans, all.map(l => l.id === id ? { ...l, ...patch } : l));
  },
  remove: async (id: string) => {
    const all = await loans.getAll();
    await save(K.loans, all.filter(l => l.id !== id));
  },
};
