// Broker Statement Types
export type BrokerType = 'robinhood' | 'td_ameritrade' | 'interactive_brokers' | 'etrade' | 'schwab' | 'fidelity' | 'webull' | 'other';

export interface BrokerStatementUpload {
  id: string;
  userId: string;
  broker: BrokerType;
  fileName: string;
  fileSize: number;
  uploadDate: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  transactionsImported: number;
  duplicatesSkipped: number;
  createdAt: string;
}

// Raw CSV row from Robinhood
export interface RobinhoodCSVRow {
  'Activity Date': string;
  'Process Date': string;
  'Settle Date': string;
  'Instrument': string;
  'Description': string;
  'Trans Code': string;
  'Quantity': string;
  'Price': string;
  'Amount': string;
}

// Parsed transaction from any broker
export interface ParsedTransaction {
  activityDate: string;
  processDate: string;
  settleDate: string;
  instrument: string;
  description: string;
  transactionCode: string;
  quantity?: number;
  price?: number;
  amount?: number;
  transactionType: 'stock' | 'option' | 'crypto' | 'futures' | 'cash' | 'unknown';
}

// Import results
export interface ImportResult {
  success: boolean;
  totalRows: number;
  transactionsImported: number;
  duplicatesSkipped: number;
  errors: string[];
  warnings: string[];
  importedTransactions: {
    stocks: number;
    options: number;
    crypto: number;
    futures: number;
    cash: number;
  };
}
