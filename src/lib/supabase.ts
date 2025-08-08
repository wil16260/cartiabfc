import { supabase } from '@/integrations/supabase/client'

// Re-export the Supabase client from the integration
export { supabase }

// Check if user is admin based on profile
export const checkAdminAuth = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()
  
  return profile?.is_admin || false
}