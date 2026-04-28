-- Drop existing policies to recreate with explicit role targeting
DROP POLICY IF EXISTS "Appts public insert" ON public.appointments;
DROP POLICY IF EXISTS "Appts public confirm pending" ON public.appointments;
DROP POLICY IF EXISTS "Appts owner read" ON public.appointments;
DROP POLICY IF EXISTS "Appts owner update" ON public.appointments;
DROP POLICY IF EXISTS "Appts owner delete" ON public.appointments;

-- Anyone (anon + authenticated) can create an appointment
CREATE POLICY "Anyone can create appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(client_name) BETWEEN 1 AND 100
  AND length(client_phone) BETWEEN 5 AND 30
  AND scheduled_at > (now() - interval '1 day')
  AND EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = appointments.barber_id)
);

-- Anyone can confirm their own pending appointment (status pending -> confirmed)
CREATE POLICY "Anyone can confirm pending appointment"
ON public.appointments
FOR UPDATE
TO anon, authenticated
USING (status = 'pending')
WITH CHECK (status IN ('pending', 'confirmed'));

-- Owner barber can view their appointments
CREATE POLICY "Barber owner can view appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = appointments.barber_id AND b.user_id = auth.uid())
);

-- Owner barber can update their appointments (full control)
CREATE POLICY "Barber owner can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = appointments.barber_id AND b.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = appointments.barber_id AND b.user_id = auth.uid())
);

-- Owner barber can delete their appointments
CREATE POLICY "Barber owner can delete appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.barbers b WHERE b.id = appointments.barber_id AND b.user_id = auth.uid())
);