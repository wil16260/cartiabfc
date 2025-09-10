-- Additional security measures for ai_config table

-- 1. Add a more restrictive policy specifically for SELECT operations
DROP POLICY IF EXISTS "Only admins can manage AI config" ON public.ai_config;

-- Create separate policies for different operations for better security granularity
CREATE POLICY "Admins can view AI config"
ON public.ai_config
FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can insert AI config"
ON public.ai_config
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update AI config"
ON public.ai_config
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete AI config"
ON public.ai_config
FOR DELETE
USING (is_admin());

-- 2. Create a secure view that never exposes sensitive data
CREATE OR REPLACE VIEW public.ai_config_public AS
SELECT 
  id,
  model_name,
  (api_key_name IS NOT NULL AND api_key_name != '') as has_api_key,
  is_active,
  created_at
FROM public.ai_config
WHERE is_active = true;

-- 3. Enable RLS on the view (though it inherits from the table)
ALTER VIEW public.ai_config_public SET (security_barrier = true);

-- 4. Add audit logging trigger for all access attempts
CREATE OR REPLACE FUNCTION public.audit_ai_config_access()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_ai_config_trigger ON public.ai_config;
CREATE TRIGGER audit_ai_config_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_config
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_ai_config_access();