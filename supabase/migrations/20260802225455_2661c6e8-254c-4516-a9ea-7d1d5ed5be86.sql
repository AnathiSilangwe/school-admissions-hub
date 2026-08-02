DO $$
DECLARE _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = 'silangweanathi26@gmail.com';
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No account found for silangweanathi26@gmail.com — sign up at /auth first, then re-run this grant.';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;