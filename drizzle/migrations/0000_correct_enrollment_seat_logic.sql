-- 1. Re-sync occupied to the real number of accepted learners (seed data was not real enrolment)
UPDATE public.grades g
   SET occupied = COALESCE((
     SELECT count(*) FROM public.applicants a
      WHERE a.applying_grade_id = g.id AND a.application_status = 'accepted'
   ), 0);

-- 2. submit_application: validate seats but do NOT claim one (pending != enrolled)
CREATE OR REPLACE FUNCTION public.submit_application(_first_name text, _last_name text, _id_number text, _date_of_birth date, _age integer, _gender text, _email text, _phone text, _address text, _parent_name text, _parent_relationship text, _parent_phone text, _parent_email text, _previous_school text, _current_grade text, _applying_grade_id uuid, _academic_average numeric, _id_copy_path text, _previous_results_path text, _proof_residence_path text, _birth_certificate_path text DEFAULT NULL::text)
 RETURNS TABLE(application_number text, appointment_date date, appointment_time time without time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _app_number text;
  _applicant_id uuid;
  _grade_name text;
  _grade_active boolean;
  _capacity integer;
  _occupied integer;
  _appt_date date := (now() AT TIME ZONE 'Africa/Johannesburg')::date + 7;
  _appt_time time := '09:00:00';
BEGIN
  IF _academic_average < 40 THEN
    RAISE EXCEPTION 'BELOW_MINIMUM_AVERAGE';
  END IF;

  SELECT is_active, name, capacity, occupied
    INTO _grade_active, _grade_name, _capacity, _occupied
    FROM public.grades WHERE id = _applying_grade_id FOR UPDATE;

  IF _grade_active IS NULL THEN
    RAISE EXCEPTION 'GRADE_NOT_FOUND';
  END IF;
  IF _grade_active IS NOT TRUE THEN
    RAISE EXCEPTION 'GRADE_NOT_ACCEPTING';
  END IF;
  IF _occupied >= _capacity THEN
    RAISE EXCEPTION 'GRADE_FULL';
  END IF;

  _app_number := public.next_application_number();

  INSERT INTO public.applicants (
    application_number, first_name, last_name, id_number, date_of_birth, age, gender,
    email, phone, address, parent_name, parent_relationship, parent_phone, parent_email,
    previous_school, current_grade, applying_grade_id, academic_average
  ) VALUES (
    _app_number, _first_name, _last_name, _id_number, _date_of_birth, _age, _gender,
    _email, _phone, _address, _parent_name, _parent_relationship, _parent_phone, _parent_email,
    _previous_school, _current_grade, _applying_grade_id, _academic_average
  )
  RETURNING id INTO _applicant_id;

  INSERT INTO public.documents (
    applicant_id, id_copy_path, previous_results_path, proof_residence_path, birth_certificate_path
  ) VALUES (
    _applicant_id, _id_copy_path, _previous_results_path, _proof_residence_path, _birth_certificate_path
  );

  INSERT INTO public.appointments (applicant_id, appointment_date, appointment_time)
  VALUES (_applicant_id, _appt_date, _appt_time);

  INSERT INTO public.email_outbox (applicant_id, to_email, subject, body_text)
  VALUES (
    _applicant_id,
    _parent_email,
    'Thabazi Secondary School - Application Confirmation',
    'Dear ' || _parent_name || E',\n\n' ||
    E'Your application to Thabazi Secondary School has been successfully submitted.\n\n' ||
    'Application Number: ' || _app_number || E'\n' ||
    'Applicant: ' || _first_name || ' ' || _last_name || E'\n' ||
    'Grade Applied For: ' || COALESCE(_grade_name, '') || E'\n\n' ||
    E'Appointment Details:\n' ||
    'Date: ' || to_char(_appt_date, 'DD Mon YYYY') || E'\n' ||
    'Time: ' || to_char(_appt_time, 'HH12:MI AM') || E'\n' ||
    E'Venue: Thabazi Secondary School Admissions Office\n' ||
    E'Application Fee: R100\n\n' ||
    E'Please bring the required original documents and application fee to your appointment.\n\n' ||
    E'Regards,\nThabazi Secondary School Admissions Office'
  );

  RETURN QUERY SELECT _app_number, _appt_date, _appt_time;
END;
$function$;

-- 3. Only 'accepted' holds a seat
CREATE OR REPLACE FUNCTION public.admin_set_application_status(_applicant_id uuid, _status text)
 RETURNS applicants
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF _old IS DISTINCT FROM _status THEN
    -- 'accepted' is the only state that holds a seat.
    IF _status = 'accepted' THEN
      UPDATE public.grades SET occupied = occupied + 1
      WHERE id = _grade_id AND occupied < capacity
      RETURNING true INTO _seat_ok;
      IF _seat_ok IS NOT TRUE THEN
        RAISE EXCEPTION 'GRADE_FULL';
      END IF;
    ELSIF _old = 'accepted' THEN
      UPDATE public.grades SET occupied = GREATEST(occupied - 1, 0) WHERE id = _grade_id;
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
$function$;

-- 4. Admin-only manual enrolment correction
CREATE OR REPLACE FUNCTION public.admin_adjust_grade_enrollment(_grade_id uuid, _occupied integer)
 RETURNS grades
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  g public.grades;
  _old integer;
  _actor uuid := auth.uid();
  _email text;
BEGIN
  IF NOT public.has_role(_actor, 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF _occupied IS NULL OR _occupied < 0 THEN
    RAISE EXCEPTION 'INVALID_ENROLLMENT';
  END IF;

  SELECT * INTO g FROM public.grades WHERE id = _grade_id FOR UPDATE;
  IF g.id IS NULL THEN
    RAISE EXCEPTION 'GRADE_NOT_FOUND';
  END IF;
  IF _occupied > g.capacity THEN
    RAISE EXCEPTION 'ENROLLMENT_ABOVE_CAPACITY';
  END IF;

  _old := g.occupied;
  UPDATE public.grades SET occupied = _occupied WHERE id = _grade_id RETURNING * INTO g;

  SELECT u.email INTO _email FROM auth.users u WHERE u.id = _actor;

  INSERT INTO public.audit_logs (actor_id, actor_email, action, grade_id, description, details)
  VALUES (
    _actor, _email, 'grade_enrollment_adjusted', _grade_id,
    g.name || ' enrolled count changed from ' || _old || ' to ' || _occupied,
    jsonb_build_object('grade', g.name, 'from', _old, 'to', _occupied, 'capacity', g.capacity)
  );

  RETURN g;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_adjust_grade_enrollment(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_grade_enrollment(uuid, integer) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.claim_grade_seat(uuid);