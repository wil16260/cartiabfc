import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// Cache admin status to avoid repeated database calls
let adminCache: { userId: string; isAdmin: boolean; timestamp: number } | null = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const checkAdminAuthCached = async (userId: string) => {
  const now = Date.now()
  
  // Return cached result if valid
  if (adminCache && adminCache.userId === userId && (now - adminCache.timestamp) < CACHE_DURATION) {
    return adminCache.isAdmin
  }
  
  // Fetch from database
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', userId)
    .single()
  
  const isAdmin = profile?.is_admin || false
  
  // Update cache
  adminCache = {
    userId,
    isAdmin,
    timestamp: now
  }
  
  return isAdmin
}

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
          const adminStatus = await checkAdminAuthCached(user.id)
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
        
        const newUser = session?.user ?? null
        setUser(newUser)
        
        if (newUser) {
          try {
            const adminStatus = await checkAdminAuthCached(newUser.id)
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
          // Clear cache when user logs out
          adminCache = null
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
    adminCache = null // Clear cache on logout
  }

  return {
    user,
    isAdmin,
    loading,
    signOut
  }
}