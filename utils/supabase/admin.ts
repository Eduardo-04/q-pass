import { createClient } from '@supabase/supabase-js'

/**
 * Crea un cliente Supabase con la Service Role Key.
 * SOLO para uso en API routes del servidor (nunca en componentes client).
 * Bypasses RLS — usar con cuidado.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
