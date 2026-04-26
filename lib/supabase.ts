import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cliente para el Navegador (Dashboard y Home)
export const supabase = createClient(url, anon)

// Cliente para el Servidor (API de Checkout y Validación)
export const supabaseAdmin = typeof window === 'undefined' && service
  ? createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null as any;