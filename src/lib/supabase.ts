import { createClient } from '@supabase/supabase-js'

// Placeholder for Supabase connection - will be replaced by native integration
const supabaseUrl = 'https://placeholder.supabase.co'
const supabaseAnonKey = 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Email administrateur autorisé - modifiez cette valeur avec votre email
export const ADMIN_EMAIL = "votre_email@exemple.com"

export const checkAdminAuth = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}