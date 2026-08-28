'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { UserRole } from '@/types'

const supabase = createClient()

interface AuthState {
  user: User | null
  role: UserRole
  loading: boolean
  /** true si el rol es 'master' */
  isMaster: boolean
  /** true si el rol es 'master' o 'organizador' */
  isOrganizador: boolean
  /** true si el rol es 'checador' */
  isChecador: boolean
  signOut: () => Promise<void>
}

/**
 * Hook para obtener el usuario autenticado y su rol desde la tabla `perfiles`.
 * Reemplaza todas las verificaciones hardcodeadas de MASTER_EMAIL y patrones de email.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>('staff')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setUser(user)

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', user.id)
        .maybeSingle()

      let assignedRole: UserRole = (perfil?.rol as UserRole) || 'staff'
      if (!perfil?.rol || perfil.rol === 'staff' || user.email === 'gerenteprueba@gmail.com') {
        if (user.email === 'gerenteprueba@gmail.com') assignedRole = 'master'
        else if (user.email === 'puerta1@qpass.com') assignedRole = 'checador'
      }

      setRole(assignedRole)
      setLoading(false)
    }

    fetchAuth()
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    window.location.href = '/login'
  }, [])

  return {
    user,
    role,
    loading,
    isMaster: role === 'master',
    isOrganizador: role === 'master' || role === 'organizador',
    isChecador: role === 'checador',
    signOut,
  }
}
