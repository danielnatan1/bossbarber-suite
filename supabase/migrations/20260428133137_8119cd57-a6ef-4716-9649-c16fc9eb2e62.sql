
-- handle_new_user is invoked only by the auth trigger, never via API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- get_taken_slots only returns time + duration (no client PII), needed for public booking page
-- Keep executable but documented as intentional public read of non-sensitive scheduling data
