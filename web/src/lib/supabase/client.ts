import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Token-keyed singleton cache.
 * Reuses the same SupabaseClient instance for the same Clerk JWT token,
 * which prevents multiple GoTrueClient instances from being created in
 * the same browser context when multiple components mount simultaneously.
 *
 * The cache is intentionally module-level (not component-level) so it
 * persists across re-renders. It is keyed by token so a new client is
 * created automatically when the user's session rotates.
 */
let _cachedToken: string | null = undefined as unknown as string | null
let _cachedClient: SupabaseClient | null = null

export function createClerkSupabaseClient(clerkToken: string | null): SupabaseClient {
  // Return the cached instance if the token hasn't changed
  if (_cachedClient && clerkToken === _cachedToken) {
    return _cachedClient
  }

  _cachedToken = clerkToken
  _cachedClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : undefined,
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )

  return _cachedClient
}
