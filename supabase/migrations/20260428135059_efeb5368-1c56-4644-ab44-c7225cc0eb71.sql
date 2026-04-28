
ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS work_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  ADD COLUMN IF NOT EXISTS work_start TIME NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS work_end TIME NOT NULL DEFAULT '19:00';

ALTER TABLE public.appointments
  ALTER COLUMN status SET DEFAULT 'pending';

-- Allow public to confirm a pending appointment (used after WhatsApp click)
CREATE POLICY "Appts public confirm pending"
ON public.appointments
FOR UPDATE
TO public
USING (status = 'pending')
WITH CHECK (status IN ('pending','confirmed'));
