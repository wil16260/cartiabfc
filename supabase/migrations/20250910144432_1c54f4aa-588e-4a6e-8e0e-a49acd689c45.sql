-- Fix the security definer view issue
DROP VIEW IF EXISTS public.ai_config_public;

-- Create a secure function instead of a view to avoid security definer issues
CREATE OR REPLACE FUNCTION public.get_active_ai_config()
RETURNS TABLE(
  id uuid,
  model_name text,
  has_api_key boolean,
  is_active boolean,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ac.id,
    ac.model_name,
    (ac.api_key_name IS NOT NULL AND ac.api_key_name != '') as has_api_key,
    ac.is_active,
    ac.created_at
  FROM public.ai_config ac
  WHERE ac.is_active = true
  AND is_admin(); -- Only admins can call this function
$$;