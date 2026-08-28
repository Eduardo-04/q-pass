import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse, type NextRequest } from 'next/server'
import type { UserRole } from '@/types'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const path = request.nextUrl.pathname

    // Definir rutas protegidas
    const isAdminPath = path.startsWith('/admin') || path.startsWith('/dashboard')
    const isCheckInPath = path.startsWith('/check-in')
    const isProtectedPath = isAdminPath || isCheckInPath

    // 1. Si no está logueado y quiere entrar a cualquier ruta protegida -> Login
    if (isProtectedPath && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // 2. Solo consultar rol si es necesario (rutas protegidas o login)
    if (user && (isProtectedPath || path === '/login')) {
      let role: UserRole = 'staff'

      try {
        const adminSupabase = createAdminClient()
        const { data: perfil } = await adminSupabase
          .from('perfiles')
          .select('rol')
          .eq('id', user.id)
          .single()

        if (perfil?.rol && perfil.rol !== 'staff') {
          role = perfil.rol as UserRole
        } else {
          // Si el perfil no tiene rol o es staff, verificar cuentas de prueba conocidas
          if (user.email === 'gerenteprueba@gmail.com') role = 'organizador'
          else if (user.email === 'puerta1@qpass.com') role = 'checador'
          else if (perfil?.rol) role = perfil.rol as UserRole

          // Auto-crear/actualizar perfil en la base de datos para sanear la cuenta
          if (user.email === 'gerenteprueba@gmail.com' || user.email === 'puerta1@qpass.com') {
            await adminSupabase.from('perfiles').upsert({
              id: user.id,
              nombre: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
              rol: role
            })
          }
        }
      } catch (adminErr) {
        console.error("Middleware perfil fetch error:", adminErr)
      }

      // 3. Admin/Dashboard: solo 'master' y 'organizador'
      if (isAdminPath && !['master', 'organizador'].includes(role)) {
        const target = role === 'checador' ? '/check-in' : '/boletos'
        return NextResponse.redirect(new URL(target, request.url))
      }

      // 4. Check-in: 'master', 'organizador' y 'checador' (staff no tiene acceso a scanner)
      if (isCheckInPath && !['master', 'organizador', 'checador'].includes(role)) {
        return NextResponse.redirect(new URL('/boletos', request.url))
      }

      // 5. Si ya está logueado y va a login -> Redirigir según rol (nunca a login de nuevo)
      if (path === '/login') {
        const target = ['master', 'organizador'].includes(role)
          ? '/admin'
          : role === 'checador'
          ? '/check-in'
          : '/boletos'
        return NextResponse.redirect(new URL(target, request.url))
      }
    }

  } catch (e) {
    console.error("Auth Middleware Error:", e)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
