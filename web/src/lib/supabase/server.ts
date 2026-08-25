import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

export async function createClient() {
  const { getToken } = await auth()
  
  // The template name must match the one you create in Clerk Dashboard -> Integrations -> Supabase
  const supabaseAccessToken = await getToken({ template: 'supabase' })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  return createSupabaseClient(
    url,
    anonKey,
    {
      global: {
        headers: supabaseAccessToken ? { Authorization: `Bearer ${supabaseAccessToken}` } : undefined,
      },
    }
  )
}
