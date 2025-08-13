import { useState, useEffect } from 'react'
import { supabase, checkAdminAuth } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true;

    // Vérifier la session actuelle
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!mounted) return;
        
        setUser(user)
        
        if (user) {
          const adminStatus = await checkAdminAuth()
          if (mounted) {
            setIsAdmin(adminStatus)
          }
        } else {
          if (mounted) {
            setIsAdmin(false)
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
        if (mounted) {
          setUser(null)
          setIsAdmin(false)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    checkUser()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setUser(session?.user ?? null)
        
        if (session?.user) {
          try {
            const adminStatus = await checkAdminAuth()
            if (mounted) {
              setIsAdmin(adminStatus)
            }
          } catch (error) {
            console.error('Admin check error:', error)
            if (mounted) {
              setIsAdmin(false)
            }
          }
        } else {
          if (mounted) {
            setIsAdmin(false)
          }
        }
        
        if (mounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false;
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }

  return {
    user,
    isAdmin,
    loading,
    signOut
  }
}