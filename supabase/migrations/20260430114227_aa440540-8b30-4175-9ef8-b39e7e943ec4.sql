-- Update get_taken_slots to ignore pending appointments older than 10 minutes
CREATE OR REPLACE FUNCTION public.get_taken_slots(_barber_id uuid, _day date)
 RETURNS TABLE(scheduled_at timestamp with time zone, duration_minutes integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT scheduled_at, duration_minutes
  FROM public.appointments
  WHERE barber_id = _barber_id
    AND scheduled_at::date = _day
    AND status <> 'cancelled'
    AND NOT (status = 'pending' AND created_at < (now() - interval '10 minutes'));
$function$;