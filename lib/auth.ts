import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/utils/supabase/admin'
import type { UserRole } from '@/types'
import type { User } from '@supabase/supabase-js'

/**
 * Obtiene el usuario autenticado desde las cookies de la request.
 * Para uso exclusivo en API routes (server-side).
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Silenciar en contextos de solo lectura
          }
        },
      },
    }
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}

/**
 * Obtiene el rol de un usuario desde la tabla `perfiles`.
 * Usa el admin client (bypasses RLS) para garantizar acceso.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', userId)
    .single()

  if (data?.rol && data.rol !== 'staff') {
    return data.rol as UserRole
  }

  // Verificar email de la cuenta si el perfil devuelve staff o es nulo
  const { data: userData } = await supabase.auth.admin.getUserById(userId)
  const email = userData?.user?.email

  if (email === 'gerenteprueba@gmail.com') return 'master'
  if (email === 'puerta1@qpass.com') return 'checador'

  return (data?.rol as UserRole) || 'staff'
}

/**
 * Verifica autenticación y opcionalmente roles permitidos.
 * Retorna el usuario y su rol, o un error descriptivo.
 */
export async function requireAuth(allowedRoles?: UserRole[]) {
  const user = await getAuthenticatedUser()

  if (!user) {
    return { user: null, role: null as UserRole | null, error: 'No autenticado' }
  }

  const role = await getUserRole(user.id)

  if (allowedRoles && !allowedRoles.includes(role)) {
    return { user, role, error: 'Sin permisos para esta acción' }
  }

  return { user, role, error: null }
}
