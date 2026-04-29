-- Keep get_taken_slots callable for the public booking page, but avoid exposing it as SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.get_taken_slots(_barber_id uuid, _day date)
RETURNS TABLE(scheduled_at timestamp with time zone, duration_minutes integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT scheduled_at, duration_minutes
  FROM public.appointments
  WHERE barber_id = _barber_id
    AND scheduled_at::date = _day
    AND status <> 'cancelled';
$$;

GRANT EXECUTE ON FUNCTION public.get_taken_slots(uuid, date) TO anon, authenticated;

-- Ensure the internal new-user trigger function is not callable through public API roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;