-- Fix security issues by setting search_path for all functions
-- Update is_admin function with proper search_path
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = is_admin.user_id 
    AND is_admin = true
  );
$function$;

-- Update get_active_ai_config function with proper search_path
CREATE OR REPLACE FUNCTION public.get_active_ai_config()
 RETURNS TABLE(id uuid, model_name text, has_api_key boolean, is_active boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    ac.id,
    ac.model_name,
    (ac.api_key_name IS NOT NULL AND ac.api_key_name != '') as has_api_key,
    ac.is_active,
    ac.created_at
  FROM public.ai_config ac
  WHERE ac.is_active = true
  AND is_admin(); -- Only admins can call this function
$function$;

-- Update audit function with proper search_path
CREATE OR REPLACE FUNCTION public.audit_ai_config_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log any access attempts to ai_config for security monitoring
  INSERT INTO public.ai_generation_logs (
    user_prompt,
    ai_response,
    success,
    created_by,
    system_prompt,
    model_name,
    raw_ai_response
  ) VALUES (
    'ADMIN_ACCESS_AI_CONFIG',
    jsonb_build_object('action', TG_OP, 'table', 'ai_config', 'timestamp', now()),
    true,
    auth.uid(),
    'Security audit log',
    'system',
    'Admin accessed AI configuration table'
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

-- Add trigger to audit ai_config modifications only (not SELECT)
DROP TRIGGER IF EXISTS audit_ai_config_trigger ON public.ai_config;
CREATE TRIGGER audit_ai_config_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_ai_config_access();

-- Ensure RLS is enabled on ai_config
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

-- Tighten the RLS policy by dropping and recreating
DROP POLICY IF EXISTS "Only admins can manage AI config" ON public.ai_config;
CREATE POLICY "Only admins can manage AI config" 
ON public.ai_config 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- Revoke all default permissions and grant only to authenticated users via RLS
REVOKE ALL ON public.ai_config FROM public;
REVOKE ALL ON public.ai_config FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_config TO authenticated;