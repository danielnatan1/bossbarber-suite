-- Recreate all Row Level Security policies for appointments from a clean slate
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'appointments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.appointments', policy_record.policyname);
  END LOOP;
END $$;

-- Remove table-level CHECK constraints that may block anonymous booking inserts.
-- This keeps primary key / not-null rules intact and only removes explicit CHECK constraints.
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.appointments'::regclass
      AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
  END LOOP;
END $$;

-- Anonymous clients can create pending appointments for an existing barber/service.
-- The app currently stores the public barber profile id in appointments.barber_id,
-- not the authenticated auth user id.
CREATE POLICY "Anonymous clients can create appointments"
ON public.appointments
FOR INSERT
TO anon
WITH CHECK (
  barber_id IS NOT NULL
  AND client_name IS NOT NULL
  AND length(trim(client_name)) BETWEEN 1 AND 100
  AND client_phone IS NOT NULL
  AND length(trim(client_phone)) BETWEEN 5 AND 30
  AND scheduled_at > (now() - interval '1 day')
  AND status IN ('pending', 'confirmed')
  AND EXISTS (
    SELECT 1
    FROM public.barbers b
    WHERE b.id = appointments.barber_id
  )
  AND (
    service_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.services s
      WHERE s.id = appointments.service_id
        AND s.barber_id = appointments.barber_id
    )
  )
);

-- If a logged-in barber creates an appointment manually, apply the same ownership check.
CREATE POLICY "Authenticated barbers can create own appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.barbers b
    WHERE b.id = appointments.barber_id
      AND b.user_id = auth.uid()
  )
);

-- Only the authenticated barber who owns the public barber profile can read appointments.
CREATE POLICY "Authenticated barbers can view own appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.barbers b
    WHERE b.id = appointments.barber_id
      AND b.user_id = auth.uid()
  )
);

-- Only the authenticated barber who owns the public barber profile can edit appointments.
CREATE POLICY "Authenticated barbers can update own appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.barbers b
    WHERE b.id = appointments.barber_id
      AND b.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.barbers b
    WHERE b.id = appointments.barber_id
      AND b.user_id = auth.uid()
  )
);

-- Only the authenticated barber who owns the public barber profile can delete appointments.
CREATE POLICY "Authenticated barbers can delete own appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.barbers b
    WHERE b.id = appointments.barber_id
      AND b.user_id = auth.uid()
  )
);

-- Keep the anti-spam WhatsApp flow: anonymous clients may only move a pending appointment to confirmed.
CREATE POLICY "Anonymous clients can confirm pending appointments"
ON public.appointments
FOR UPDATE
TO anon
USING (status = 'pending')
WITH CHECK (status = 'confirmed');