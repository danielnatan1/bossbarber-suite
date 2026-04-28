
CREATE TABLE public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_barber ON public.services(barber_id);
CREATE INDEX idx_appts_barber_time ON public.appointments(barber_id, scheduled_at);

CREATE OR REPLACE FUNCTION public.unaccent_safe(value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT translate(value,
    'áàâãäåÁÀÂÃÄÅéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑ',
    'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN')
$$;

CREATE OR REPLACE FUNCTION public.slugify(value TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '-' from regexp_replace(lower(public.unaccent_safe(value)), '[^a-z0-9]+', '-', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  shop TEXT;
  i INT := 0;
BEGIN
  shop := COALESCE(NEW.raw_user_meta_data->>'shop_name', 'Barbearia');
  base_slug := public.slugify(shop);
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'barbearia';
  END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.barbers WHERE slug = final_slug) LOOP
    i := i + 1;
    final_slug := base_slug || '-' || i;
  END LOOP;
  INSERT INTO public.barbers (user_id, shop_name, slug, phone)
  VALUES (NEW.id, shop, final_slug, NEW.raw_user_meta_data->>'phone');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Barbers public read" ON public.barbers FOR SELECT USING (true);
CREATE POLICY "Barbers self update" ON public.barbers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Barbers self insert" ON public.barbers FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Services public read" ON public.services FOR SELECT USING (true);
CREATE POLICY "Services owner insert" ON public.services FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND b.user_id = auth.uid()));
CREATE POLICY "Services owner update" ON public.services FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND b.user_id = auth.uid()));
CREATE POLICY "Services owner delete" ON public.services FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND b.user_id = auth.uid()));

CREATE POLICY "Appts owner read" ON public.appointments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND b.user_id = auth.uid()));
CREATE POLICY "Appts public insert" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Appts owner update" ON public.appointments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND b.user_id = auth.uid()));
CREATE POLICY "Appts owner delete" ON public.appointments FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = barber_id AND b.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.get_taken_slots(_barber_id UUID, _day DATE)
RETURNS TABLE(scheduled_at TIMESTAMPTZ, duration_minutes INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT scheduled_at, duration_minutes
  FROM public.appointments
  WHERE barber_id = _barber_id
    AND scheduled_at::date = _day
    AND status <> 'cancelled';
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
