-- Enhanced security for AI configuration table
-- Add additional restrictions and audit logging

-- First, let's add an audit trigger to track who accesses ai_config
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_ai_config_trigger ON public.ai_config;
CREATE TRIGGER audit_ai_config_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.ai_config
FOR EACH ROW EXECUTE FUNCTION public.audit_ai_config_access();

-- Add a function to safely get API key names without exposing them
CREATE OR REPLACE FUNCTION public.get_active_ai_config()
RETURNS TABLE(
  id uuid,
  model_name text,
  has_api_key boolean,
  is_active boolean,
  created_at timestamptz
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
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

-- Add constraint to ensure api_key_name doesn't contain actual keys
ALTER TABLE public.ai_config 
ADD CONSTRAINT check_api_key_name_format 
CHECK (
  api_key_name ~ '^[A-Z][A-Z0-9_]*_KEY$' 
  AND length(api_key_name) < 50
  AND api_key_name NOT LIKE '%secret%'
  AND api_key_name NOT LIKE '%token%'
  AND api_key_name NOT LIKE '%pass%'
);

-- Add comment for documentation
COMMENT ON TABLE public.ai_config IS 'AI Configuration table - ADMIN ONLY. api_key_name stores environment variable names, not actual keys.';
COMMENT ON COLUMN public.ai_config.api_key_name IS 'Name of environment variable containing API key (e.g. MISTRAL_API_KEY), not the actual key value.';