import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

export async function createClient() {
  const { getToken } = await auth()
  
  // The template name must match the one you create in Clerk Dashboard -> Integrations -> Supabase
  const supabaseAccessToken = await getToken({ template: 'supabase' })

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: supabaseAccessToken ? { Authorization: `Bearer ${supabaseAccessToken}` } : undefined,
      },
    }
  )
}
