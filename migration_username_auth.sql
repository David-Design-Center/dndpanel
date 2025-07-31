-- FIXED Migration: Add Admin Role and Username Support
-- Run this in your Supabase SQL Editor to fix the RLS issues

-- 1. Drop existing restrictive policies (safe approach)
DROP POLICY IF EXISTS "Admin or profile selection access" ON public.profiles;
DROP POLICY IF EXISTS "Admin or self update" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own credentials" ON public.user_credentials;
DROP POLICY IF EXISTS "Allow authenticated users to read user_credentials" ON public.user_credentials;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow anonymous login lookup" ON public.user_credentials;

-- 2. Add simpler, more permissive policies for profiles
CREATE POLICY "Allow authenticated users to read profiles" ON public.profiles 
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update profiles" ON public.profiles 
FOR UPDATE USING (auth.role() = 'authenticated');

-- 3. CRITICAL: Allow anonymous users to read user_credentials for login lookup
-- This is needed because the username->email lookup happens BEFORE authentication
CREATE POLICY "Allow anonymous login lookup" ON public.user_credentials
FOR SELECT USING (true);

-- Also allow authenticated users to read their own credentials
CREATE POLICY "Allow authenticated users to read user_credentials" ON public.user_credentials
FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Make sure the admin flag is set correctly
UPDATE public.profiles SET is_admin = true WHERE name = 'David';
UPDATE public.profiles SET is_admin = false WHERE name != 'David';

-- 5. Verify user_credentials data exists
INSERT INTO public.user_credentials (email, username, profile_id) VALUES
('david.v@dnddesigncenter.com', 'david', (SELECT id FROM public.profiles WHERE name = 'David')),
('info@effidigi.com', 'marti', (SELECT id FROM public.profiles WHERE name = 'Marti')),
('natalia@dnddesigncenter.com', 'natalia', (SELECT id FROM public.profiles WHERE name = 'Natalia')),
('info@dnddesigncenter.com', 'dimitry', (SELECT id FROM public.profiles WHERE name = 'Dimitry'))
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  profile_id = EXCLUDED.profile_id;

-- 6. Grant permissions explicitly
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_credentials TO authenticated;
GRANT SELECT ON public.user_credentials TO anon;  -- Allow anonymous SELECT for login
