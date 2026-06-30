
-- Roles scaffold (admin auth ready, no UI yet)
CREATE TYPE public.app_role AS ENUM ('admin', 'admissions_officer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Application number sequence
CREATE SEQUENCE public.application_number_seq START 1;

-- Grades
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_number INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  capacity INT NOT NULL,
  occupied INT NOT NULL DEFAULT 0,
  CHECK (occupied >= 0 AND occupied <= capacity)
);
GRANT SELECT ON public.grades TO anon, authenticated;
GRANT ALL ON public.grades TO service_role;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view grade availability" ON public.grades FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can manage grades" ON public.grades FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed grade data per spec
INSERT INTO public.grades (grade_number, name, capacity, occupied) VALUES
  (8,  'Grade 8',  180, 165),
  (9,  'Grade 9',  160, 160),
  (10, 'Grade 10', 150, 140),
  (11, 'Grade 11', 140, 138),
  (12, 'Grade 12', 130, 120);

-- Applicants
CREATE TABLE public.applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  age INT NOT NULL,
  gender TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  parent_relationship TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  previous_school TEXT NOT NULL,
  current_grade TEXT NOT NULL,
  applying_grade_id UUID NOT NULL REFERENCES public.grades(id),
  academic_average NUMERIC(5,2) NOT NULL,
  application_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.applicants TO anon, authenticated;
GRANT SELECT, UPDATE ON public.applicants TO authenticated;
GRANT ALL ON public.applicants TO service_role;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit an application" ON public.applicants FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins view all applications" ON public.applicants FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admissions_officer'));
CREATE POLICY "Admins update applications" ON public.applicants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admissions_officer'));

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  id_copy_path TEXT NOT NULL,
  previous_results_path TEXT NOT NULL,
  proof_residence_path TEXT NOT NULL,
  birth_certificate_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.documents TO anon, authenticated;
GRANT SELECT ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can attach documents" ON public.documents FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins view documents" ON public.documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admissions_officer'));

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  venue TEXT NOT NULL DEFAULT 'Thabazi Secondary School Admissions Office',
  fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.appointments TO anon, authenticated;
GRANT SELECT ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create appointment" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins view appointments" ON public.appointments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admissions_officer'));

-- Seat-claiming RPC: atomically reserves a seat if available
CREATE OR REPLACE FUNCTION public.claim_grade_seat(_grade_id UUID)
RETURNS public.grades LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.grades;
BEGIN
  UPDATE public.grades SET occupied = occupied + 1
  WHERE id = _grade_id AND occupied < capacity
  RETURNING * INTO g;
  RETURN g;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_grade_seat(UUID) TO anon, authenticated, service_role;

-- Application number generator
CREATE OR REPLACE FUNCTION public.next_application_number()
RETURNS TEXT LANGUAGE SQL VOLATILE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'TSS-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.application_number_seq')::TEXT, 6, '0');
$$;
GRANT EXECUTE ON FUNCTION public.next_application_number() TO anon, authenticated, service_role;
