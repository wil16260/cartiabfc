-- Fix the is_admin function to handle authentication properly
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT profiles.is_admin 
     FROM public.profiles 
     WHERE profiles.user_id = COALESCE(is_admin.user_id, auth.uid())
     LIMIT 1), 
    false
  );
$function$;

-- Also create a function to check current user details for debugging
CREATE OR REPLACE FUNCTION public.debug_current_user()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'auth_uid', auth.uid(),
    'profile_exists', EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid()),
    'is_admin', (SELECT is_admin FROM profiles WHERE user_id = auth.uid()),
    'profile_data', (SELECT row_to_json(p) FROM profiles p WHERE user_id = auth.uid())
  );
$function$;