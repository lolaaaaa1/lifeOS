export type Currency = 'GHS' | 'USD' | 'GBP' | 'EUR';
export type TxnType = 'income' | 'expense' | 'saving' | 'transfer';
export type BudgetType = 'obligations' | 'savings' | 'living';
export type AccountType = 'bank' | 'mobile_money' | 'cash' | 'savings';
export type LoanDir = 'owed_to_me' | 'i_owe';

export interface FinanceSettings {
  income: number;
  incomeCurrency: Currency;
  defaultCurrency: Currency;
  currentMonth: string;
}

export interface BudgetItem {
  id: string;
  cat: string;
  type: BudgetType;
  amount: number;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
  currency: Currency;
  type: AccountType;
  color: string;
}

export interface Transaction {
  id: string;
  date: string;
  desc: string;
  cat: string;
  accountId: string;
  currency: Currency;
  type: TxnType;
  amount: number;
  charges: number;
  note: string;
  month: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  monthlyAmount: number;
  color: string;
  notes: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  person: string;
  amount: number;
  paid: number;
  direction: LoanDir;
  date: string;
  dueDate: string | null;
  notes: string;
  status: 'outstanding' | 'settled';
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  GHS: 'GH₵',
  USD: '$',
  GBP: '£',
  EUR: '€',
};

export const CURRENCIES: Currency[] = ['GHS', 'USD', 'GBP', 'EUR'];

export const TXN_CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Electricity', 'Tithe',
  'Savings', 'Emergency', 'Education', 'Gifts', 'Health',
  'Entertainment', 'Misc', 'Other',
];

export function fmt(amount: number, currency: Currency | string = 'GHS'): string {
  const sym = CURRENCY_SYMBOLS[currency as Currency] ?? currency;
  return `${sym}${Math.abs(amount).toLocaleString('en', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function monthKey(date?: Date): string {
  return (date ?? new Date()).toLocaleString('en', { month: 'long' }).toUpperCase();
}
