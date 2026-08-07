CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  applicant_id uuid REFERENCES public.applicants(id) ON DELETE SET NULL,
  grade_id uuid REFERENCES public.grades(id) ON DELETE SET NULL,
  target_user_id uuid,
  description text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);

-- Secure status transition with seat accounting + audit trail
CREATE OR REPLACE FUNCTION public.admin_set_application_status(_applicant_id uuid, _status text)
RETURNS public.applicants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a public.applicants;
  _old text;
  _grade_id uuid;
  _seat_ok boolean;
  _actor uuid := auth.uid();
  _email text;
BEGIN
  IF NOT (public.has_role(_actor, 'admin') OR public.has_role(_actor, 'admissions_officer')) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _status NOT IN ('pending', 'accepted', 'declined', 'waitlist') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT * INTO a FROM public.applicants WHERE id = _applicant_id FOR UPDATE;
  IF a.id IS NULL THEN
    RAISE EXCEPTION 'APPLICATION_NOT_FOUND';
  END IF;

  _old := a.application_status;
  _grade_id := a.applying_grade_id;

  IF _old <> _status THEN
    -- 'declined' is the only state that does not hold a seat.
    IF _status = 'declined' AND _old <> 'declined' THEN
      UPDATE public.grades SET occupied = GREATEST(occupied - 1, 0) WHERE id = _grade_id;
    ELSIF _old = 'declined' AND _status <> 'declined' THEN
      UPDATE public.grades SET occupied = occupied + 1
      WHERE id = _grade_id AND occupied < capacity
      RETURNING true INTO _seat_ok;
      IF _seat_ok IS NOT TRUE THEN
        RAISE EXCEPTION 'GRADE_FULL';
      END IF;
    END IF;

    UPDATE public.applicants SET application_status = _status WHERE id = _applicant_id RETURNING * INTO a;

    SELECT u.email INTO _email FROM auth.users u WHERE u.id = _actor;

    INSERT INTO public.audit_logs (actor_id, actor_email, action, applicant_id, grade_id, description, details)
    VALUES (
      _actor, _email,
      CASE _status WHEN 'accepted' THEN 'application_accepted'
                   WHEN 'declined' THEN 'application_declined'
                   ELSE 'application_status_changed' END,
      _applicant_id, _grade_id,
      'Application ' || a.application_number || ' changed from ' || _old || ' to ' || _status,
      jsonb_build_object('from', _old, 'to', _status, 'application_number', a.application_number)
    );
  END IF;

  RETURN a;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_application_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_application_status(uuid, text) TO authenticated, service_role;

-- Add audit logging to the existing capacity RPC (behaviour otherwise unchanged)
CREATE OR REPLACE FUNCTION public.admin_set_grade_capacity(_grade_id uuid, _capacity integer)
RETURNS public.grades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  g public.grades;
  _old integer;
  _actor uuid := auth.uid();
  _email text;
BEGIN
  IF NOT (public.has_role(_actor, 'admin') OR public.has_role(_actor, 'admissions_officer')) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _capacity IS NULL OR _capacity < 0 THEN
    RAISE EXCEPTION 'INVALID_CAPACITY';
  END IF;

  SELECT * INTO g FROM public.grades WHERE id = _grade_id;
  IF g.id IS NULL THEN
    RAISE EXCEPTION 'GRADE_NOT_FOUND';
  END IF;
  IF _capacity < g.occupied THEN
    RAISE EXCEPTION 'CAPACITY_BELOW_OCCUPIED';
  END IF;

  _old := g.capacity;
  UPDATE public.grades SET capacity = _capacity WHERE id = _grade_id RETURNING * INTO g;

  SELECT u.email INTO _email FROM auth.users u WHERE u.id = _actor;
  INSERT INTO public.audit_logs (actor_id, actor_email, action, grade_id, description, details)
  VALUES (_actor, _email, 'grade_capacity_changed', _grade_id,
          g.name || ' capacity changed from ' || _old || ' to ' || _capacity,
          jsonb_build_object('from', _old, 'to', _capacity, 'grade', g.name));

  RETURN g;
END;
$$;