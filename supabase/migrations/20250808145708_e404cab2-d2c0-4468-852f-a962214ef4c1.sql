-- Fix critical admin privilege escalation vulnerability
-- Drop the existing policy that allows users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policy that prevents non-admins from modifying is_admin
CREATE POLICY "Users can update their own profile except admin status" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Only admins can modify is_admin field - check if is_admin field is being changed
    is_admin IS NOT DISTINCT FROM (SELECT p.is_admin FROM profiles p WHERE p.user_id = auth.uid())
    OR is_admin()
  )
);

-- Create separate admin-only policy for managing all user profiles
CREATE POLICY "Admins can manage all user profiles" 
ON public.profiles 
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Add URL validation function for GeoJSON templates (allow relative paths for existing data)
CREATE OR REPLACE FUNCTION public.validate_geojson_url(url text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Basic URL validation
  IF url IS NULL OR url = '' THEN
    RETURN false;
  END IF;
  
  -- Allow relative paths starting with /
  IF url ~ '^/' THEN
    RETURN true;
  END IF;
  
  -- For absolute URLs, must be HTTP/HTTPS and not internal IPs
  IF NOT (url ~* '^https?://') THEN
    RETURN false;
  END IF;
  
  -- Block localhost, private IPs, and internal networks for absolute URLs
  IF url ~* '(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)' THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;