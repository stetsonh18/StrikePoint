import { createClient, type User, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Supabase environment variables are not fully configured');
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export interface AuthContext {
  user: User;
  adminClient: SupabaseClient;
}

export async function requireAuth(
  req: Request,
  options?: { requireActiveSubscription?: boolean }
): Promise<AuthContext | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  if (options?.requireActiveSubscription) {
    const { data: isActive, error: subError } = await adminClient.rpc('has_active_subscription', {
      p_user_id: data.user.id,
    });

    if (subError) {
      console.error('Subscription check failed:', subError);
      return new Response(JSON.stringify({ error: 'Subscription check failed' }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    if (!isActive) {
      return new Response(JSON.stringify({ error: 'Active subscription required' }), {
        status: 402,
        headers: jsonHeaders,
      });
    }
  }

  return { user: data.user, adminClient };
}

