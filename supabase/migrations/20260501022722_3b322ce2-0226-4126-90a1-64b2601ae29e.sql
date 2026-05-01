CREATE UNIQUE INDEX IF NOT EXISTS appointments_unique_active_slot
ON public.appointments (barber_id, scheduled_at)
WHERE status <> 'cancelled';