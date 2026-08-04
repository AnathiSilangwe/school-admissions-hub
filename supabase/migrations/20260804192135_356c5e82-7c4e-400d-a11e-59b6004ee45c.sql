DO $$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM public.applicants WHERE application_number = 'TSS-2026-000005';
  IF _id IS NOT NULL THEN
    DELETE FROM public.documents WHERE applicant_id = _id;
    DELETE FROM public.appointments WHERE applicant_id = _id;
    DELETE FROM public.email_outbox WHERE applicant_id = _id;
    DELETE FROM public.applicants WHERE id = _id;
    UPDATE public.grades SET occupied = GREATEST(occupied - 1, 0) WHERE grade_number = 10;
  END IF;
END $$;