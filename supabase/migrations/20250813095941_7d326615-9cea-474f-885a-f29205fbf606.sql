-- Fix security issue: Add comprehensive RLS policies for profiles table
-- to explicitly deny public access and ensure proper protection

-- Drop existing policies to recreate them with better security
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile except admin status" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all user profiles" ON public.profiles;

-- Create comprehensive RLS policies with explicit authentication checks

-- 1. Only authenticated users can view their own profile
CREATE POLICY "Authenticated users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 2. Only authenticated users can insert their own profile
CREATE POLICY "Authenticated users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Only authenticated users can update their own profile (except admin status)
CREATE POLICY "Authenticated users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Either the is_admin flag is not being changed
    NOT (is_admin IS DISTINCT FROM (SELECT p.is_admin FROM profiles p WHERE p.user_id = auth.uid()))
    -- Or the user is already an admin (admins can modify their own admin status)
    OR is_admin()
  )
);

-- 4. Only authenticated users can delete their own profile
CREATE POLICY "Authenticated users can delete own profile" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- 5. Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- 6. Explicitly deny all access to public/anonymous users
CREATE POLICY "Deny public access to profiles" 
ON public.profiles 
FOR ALL 
TO public
USING (false);