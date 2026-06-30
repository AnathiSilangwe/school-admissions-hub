
CREATE POLICY "Public uploads to admissions bucket" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'admissions-documents');
CREATE POLICY "Admins read admissions docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'admissions-documents' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admissions_officer')));
