-- Remove email column from profiles table to reduce security risk
-- Email data is already available through Supabase Auth when needed
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;