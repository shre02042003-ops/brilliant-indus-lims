-- Allow the Express API (anon / publishable key) to read and insert.
-- Run this in Supabase → SQL Editor, then try New Company again.

GRANT SELECT, INSERT ON public.companies TO anon, authenticated;
GRANT SELECT, INSERT ON public.uuc_registry TO anon, authenticated;
GRANT SELECT, INSERT ON public.master_instruments TO anon, authenticated;

DROP POLICY IF EXISTS companies_select_anon ON public.companies;
DROP POLICY IF EXISTS companies_insert_anon ON public.companies;
CREATE POLICY companies_select_anon ON public.companies
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY companies_insert_anon ON public.companies
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS uuc_registry_select_anon ON public.uuc_registry;
DROP POLICY IF EXISTS uuc_registry_insert_anon ON public.uuc_registry;
CREATE POLICY uuc_registry_select_anon ON public.uuc_registry
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY uuc_registry_insert_anon ON public.uuc_registry
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS master_instruments_select_anon ON public.master_instruments;
DROP POLICY IF EXISTS master_instruments_insert_anon ON public.master_instruments;
CREATE POLICY master_instruments_select_anon ON public.master_instruments
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY master_instruments_insert_anon ON public.master_instruments
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT SELECT ON public.uuc_master_mapping TO anon, authenticated;
DROP POLICY IF EXISTS uuc_master_mapping_select_anon ON public.uuc_master_mapping;
CREATE POLICY uuc_master_mapping_select_anon ON public.uuc_master_mapping
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.uuc_final TO anon, authenticated;
DROP POLICY IF EXISTS uuc_final_select_anon ON public.uuc_final;
CREATE POLICY uuc_final_select_anon ON public.uuc_final
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.master_fullnfinal TO anon, authenticated;
DROP POLICY IF EXISTS master_fullnfinal_select_anon ON public.master_fullnfinal;
CREATE POLICY master_fullnfinal_select_anon ON public.master_fullnfinal
  FOR SELECT TO anon, authenticated USING (true);

