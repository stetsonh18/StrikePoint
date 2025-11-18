import { UserPreferencesRepository } from '../repositories/userPreferences.repository';

export interface EarlyAdopterStatus {
  count: number;
  isAvailable: boolean;
  spotsRemaining: number;
  currentPrice: number;
  earlyAdopterPrice: number;
  regularPrice: number;
}

export class EarlyAdopterService {
  private static readonly EARLY_ADOPTER_LIMIT = 100;
  private static readonly EARLY_ADOPTER_PRICE = 9.99;
  private static readonly REGULAR_PRICE = 19.99;

  /**
   * Get current early adopter status and pricing information
   */
  static async getEarlyAdopterStatus(): Promise<EarlyAdopterStatus> {
    const count = await UserPreferencesRepository.getEarlyAdopterCount();
    const spotsRemaining = Math.max(0, this.EARLY_ADOPTER_LIMIT - count);
    const isAvailable = spotsRemaining > 0;

    return {
      count,
      isAvailable,
      spotsRemaining,
      currentPrice: isAvailable ? this.EARLY_ADOPTER_PRICE : this.REGULAR_PRICE,
      earlyAdopterPrice: this.EARLY_ADOPTER_PRICE,
      regularPrice: this.REGULAR_PRICE,
    };
  }

  /**
   * Check and set early adopter status for a user
   */
  static async checkAndSetEarlyAdopter(userId: string): Promise<{
    isEarlyAdopter: boolean;
    subscriptionPrice: number;
    spotsRemaining: number;
  }> {
    return await UserPreferencesRepository.checkAndSetEarlyAdopter(userId);
  }
}

