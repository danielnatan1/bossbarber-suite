
-- Helper functions don't need SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.unaccent_safe(value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT translate(value,
    'áàâãäåÁÀÂÃÄÅéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑ',
    'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN')
$$;

CREATE OR REPLACE FUNCTION public.slugify(value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT trim(both '-' from regexp_replace(lower(public.unaccent_safe(value)), '[^a-z0-9]+', '-', 'g'))
$$;

REVOKE EXECUTE ON FUNCTION public.slugify(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unaccent_safe(TEXT) FROM PUBLIC, anon, authenticated;

-- Tighten public booking insert: require basic fields and a real barber
DROP POLICY "Appts public insert" ON public.appointments;
CREATE POLICY "Appts public insert" ON public.appointments FOR INSERT
  WITH CHECK (
    length(client_name) BETWEEN 1 AND 100
    AND length(client_phone) BETWEEN 5 AND 30
    AND scheduled_at > now() - interval '1 day'
    AND EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id)
  );
