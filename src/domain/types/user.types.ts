export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  currency: string;
  timezone: string;
  notifications: {
    email: boolean;
    desktop: boolean;
  };
  isEarlyAdopter?: boolean;
  subscriptionPrice?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  discountCode?: string;
  isFreeForever?: boolean;
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid' | 'paused';
}
