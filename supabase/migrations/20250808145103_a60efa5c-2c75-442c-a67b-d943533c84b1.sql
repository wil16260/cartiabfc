-- Fix critical admin privilege escalation vulnerability
-- Drop the existing policy that allows users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policies with proper admin protection
CREATE POLICY "Users can update their own non-admin profile fields" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Prevent users from modifying is_admin unless they are already admin
    CASE 
      WHEN OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN is_admin()
      ELSE true
    END
  )
);

-- Create admin-only policy for managing user roles
CREATE POLICY "Admins can manage all user profiles" 
ON public.profiles 
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());

-- Add constraint to prevent direct is_admin modification
ALTER TABLE public.profiles 
ADD CONSTRAINT prevent_self_admin_escalation 
CHECK (
  -- Allow the constraint during migrations and admin operations
  current_setting('role', true) = 'postgres' 
  OR current_setting('role', true) = 'service_role'
  OR is_admin()
);