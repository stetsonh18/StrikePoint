import { create } from 'zustand';
import { supabase } from '../../infrastructure/api/supabase';
import { RealtimeService } from '../../infrastructure/services/realtimeService';
import { EarlyAdopterService } from '../../infrastructure/services/earlyAdopterService';
import { logger } from '../../shared/utils/logger';
import { setSentryUser, clearSentryUser } from '../../infrastructure/monitoring/sentry';
import { trackUserAction, trackConversion, identifyUser } from '../../infrastructure/analytics/analytics';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { AuthStore } from '../../domain/types/auth.types';
import type { User } from '../../domain/types/user.types';

// Helper function to map Supabase user to our User type
const mapSupabaseUser = (supabaseUser: SupabaseUser): User => ({
  id: supabaseUser.id,
  email: supabaseUser.email!,
  fullName: supabaseUser.user_metadata.full_name,
  avatarUrl: supabaseUser.user_metadata.avatar_url,
  createdAt: supabaseUser.created_at,
  updatedAt: supabaseUser.updated_at || supabaseUser.created_at,
});

export const useAuthStore = create<AuthStore>()((set) => {
  // Set up auth state change listener once when store is created
  let authSubscription: { unsubscribe: () => void } | null = null;

  const setupAuthListener = () => {
    // Clean up existing listener if present
    if (authSubscription) {
      authSubscription.unsubscribe();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const mappedUser = mapSupabaseUser(session.user);
        set({
          user: mappedUser,
          session,
          isAuthenticated: true,
        });
        
        // Set Sentry user context
        setSentryUser({
          id: mappedUser.id,
          email: mappedUser.email,
          username: mappedUser.fullName || undefined,
        });
        
        // Identify user for analytics
        identifyUser(mappedUser.id, {
          email: mappedUser.email,
          fullName: mappedUser.fullName,
        });
        
        // Set up realtime subscriptions on sign in
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          RealtimeService.setupSubscriptions(mappedUser.id);
        }
      } else {
        // Clean up subscriptions on sign out
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          RealtimeService.cleanupSubscriptions(currentUser.id);
        }
        
        // Clear Sentry user context
        clearSentryUser();
        
        set({
          user: null,
          session: null,
          isAuthenticated: false,
        });
      }
    });

    authSubscription = subscription;
  };

  // Cleanup function for when store is destroyed (if needed)
  const cleanup = () => {
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }
  };

  return {
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,

    initialize: async () => {
      try {
        set({ isLoading: true });

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          logger.error('Error getting session', error);
          throw error;
        }

        if (session?.user) {
          const mappedUser = mapSupabaseUser(session.user);
          set({
            user: mappedUser,
            session,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Set Sentry user context
          setSentryUser({
            id: mappedUser.id,
            email: mappedUser.email,
            username: mappedUser.fullName || undefined,
          });
          
          // Set up realtime subscriptions for this user
          RealtimeService.setupSubscriptions(mappedUser.id);
        } else {
          // Clear Sentry user context
          clearSentryUser();
          
          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }

        // Set up listener after initial session check
        setupAuthListener();
      } catch (error) {
        logger.error('Error initializing auth', error);
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        trackUserAction('sign_in_failed', 'authentication', { error: error.message });
        throw error;
      }

      trackUserAction('sign_in_success', 'authentication');
      
      // Auth state change listener will handle the state update
      if (!authSubscription) {
        setupAuthListener();
      }
    },

    signUp: async (email: string, password: string, fullName?: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        trackUserAction('sign_up_failed', 'authentication', { error: error.message });
        throw error;
      }

      // Track successful signup conversion
      trackConversion('signup', undefined, { hasFullName: !!fullName });

      // Check and set early adopter status after successful signup
      if (data.user) {
        try {
          await EarlyAdopterService.checkAndSetEarlyAdopter(data.user.id);
        } catch (earlyAdopterError) {
          // Log error but don't fail signup if early adopter check fails
          logger.error('Error setting early adopter status', earlyAdopterError, { userId: data.user.id });
        }
      }

      // Auth state change listener will handle the state update
      if (!authSubscription) {
        setupAuthListener();
      }

      return data;
    },

    signOut: async () => {
      // Clean up realtime subscriptions before signing out
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        RealtimeService.cleanupSubscriptions(currentUser.id);
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear Sentry user context
      clearSentryUser();

      set({
        user: null,
        session: null,
        isAuthenticated: false,
      });
    },

    resetPassword: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    },

    setUser: (user: User | null) => {
      set({ user, isAuthenticated: !!user });
    },

    setSession: (session: Session | null) => {
      set({ session, isAuthenticated: !!session });
    },
  };
});
