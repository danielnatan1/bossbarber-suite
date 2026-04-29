ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Backfill from existing phone column for current barbers
UPDATE public.barbers
SET whatsapp_number = regexp_replace(COALESCE(phone, ''), '\D', '', 'g')
WHERE whatsapp_number IS NULL AND phone IS NOT NULL;