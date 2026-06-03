import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClerkSupabaseClient(clerkToken: string | null) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : undefined,
      },
    }
  )
}
