import { z } from 'zod';

export const tradeSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  symbol: z.string().min(1, 'Symbol is required'),
  direction: z.enum(['long', 'short']),
  entryPrice: z.number().positive('Entry price must be positive'),
  exitPrice: z.number().positive().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  entryDate: z.string(),
  exitDate: z.string().optional(),
  status: z.enum(['open', 'closed']),
  outcome: z.enum(['win', 'loss', 'breakeven']).optional(),
  profitLoss: z.number().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type TradeFormData = z.infer<typeof tradeSchema>;
