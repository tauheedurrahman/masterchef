-- Let a signed-in customer change their own password.
--
-- The SDK has no way to do this. auth.resetPassword() needs an OTP from
-- sendResetPasswordEmail, which cannot work here: SMTP is disabled and the
-- account's email is a derived internal identifier ({digits}@masterchef.local)
-- that is not deliverable by design. There is no admin user-update endpoint
-- either — PATCH/PUT on /api/auth/users/{id} both 404. Reported upstream as
-- InsForge feedback 8f2084b9.
--
-- So the update has to touch auth.users. Doing it through a SECURITY DEFINER
-- function keyed on auth.uid() is the narrowest form available: the caller can
-- only ever rewrite their OWN password, the app never gets blanket write access
-- to the auth schema, and anon cannot execute it at all. The alternative —
-- updating auth.users with the project admin key from a route handler — would
-- mean any bug in that handler could rewrite anybody's credentials.
--
-- The current password is verified in the route handler first, by attempting a
-- real sign-in with it. This function trusts that check, so it must never be
-- granted to anon.

CREATE OR REPLACE FUNCTION public.set_my_password(new_hash TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Only ever accept something already bcrypt-hashed by the caller. This
  -- function must not be a way to set a plaintext password.
  IF new_hash IS NULL OR new_hash !~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$' THEN
    RAISE EXCEPTION 'password must be a bcrypt hash';
  END IF;

  UPDATE auth.users
  SET password = new_hash,
      updated_at = now()
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_password(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_password(TEXT) TO authenticated;
