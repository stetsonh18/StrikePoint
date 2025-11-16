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
}
