// Cash Transaction Types
export type CashTransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'dividend'
  | 'interest'
  | 'fee'
  | 'wire_in'
  | 'wire_out'
  | 'ach_in'
  | 'ach_out'
  | 'transfer_in'
  | 'transfer_out'
  | 'other';

export interface CashTransaction {
  id: string;
  userId: string;
  transactionType: CashTransactionType;
  amount: number;
  description: string;
  symbol?: string; // For dividends/interest from specific securities
  activityDate: string;
  processDate: string;
  settleDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashBalance {
  id: string;
  userId: string;
  availableCash: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  marginUsed: number;
  buyingPower: number;
  totalCash: number;
  updatedAt: string;
}

// Summary for cash transactions page
export interface CashTransactionSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  totalDividends: number;
  totalInterest: number;
  totalFees: number;
  netCashFlow: number;
  currentBalance: number;
}
