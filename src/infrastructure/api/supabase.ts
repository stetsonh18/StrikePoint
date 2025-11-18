import { createClient } from '@supabase/supabase-js';
import { getEnvConfig } from '@/shared/utils/envValidation';

// Validate and get environment variables
const envConfig = getEnvConfig();
const supabaseUrl = envConfig.supabaseUrl;
const supabaseAnonKey = envConfig.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce', // Use PKCE flow for enhanced security
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Limit events per second
    },
  },
  global: {
    headers: {
      'x-client-info': 'strikepoint-v4',
    },
  },
});
