ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.grades SET is_active = false WHERE grade_number IN (11, 12);

CREATE OR REPLACE FUNCTION public.submit_application(_first_name text, _last_name text, _id_number text, _date_of_birth date, _age integer, _gender text, _email text, _phone text, _address text, _parent_name text, _parent_relationship text, _parent_phone text, _parent_email text, _previous_school text, _current_grade text, _applying_grade_id uuid, _academic_average numeric, _id_copy_path text, _previous_results_path text, _proof_residence_path text, _birth_certificate_path text DEFAULT NULL::text)
 RETURNS TABLE(application_number text, appointment_date date, appointment_time time without time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _seat_ok boolean;
  _app_number text;
  _applicant_id uuid;
  _grade_name text;
  _grade_active boolean;
  _appt_date date := (now() AT TIME ZONE 'Africa/Johannesburg')::date + 7;
  _appt_time time := '09:00:00';
BEGIN
  IF _academic_average < 40 THEN
    RAISE EXCEPTION 'BELOW_MINIMUM_AVERAGE';
  END IF;

  SELECT is_active INTO _grade_active FROM public.grades WHERE id = _applying_grade_id;
  IF _grade_active IS NULL THEN
    RAISE EXCEPTION 'GRADE_NOT_FOUND';
  END IF;
  IF _grade_active IS NOT TRUE THEN
    RAISE EXCEPTION 'GRADE_NOT_ACCEPTING';
  END IF;

  UPDATE public.grades
     SET occupied = occupied + 1
   WHERE id = _applying_grade_id AND is_active AND occupied < capacity
  RETURNING true, name INTO _seat_ok, _grade_name;

  IF _seat_ok IS NOT TRUE THEN
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