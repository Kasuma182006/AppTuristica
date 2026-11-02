-- Custom migration (HU-86, RF-23): the third report of a site hides it, in the same commit. A row
-- trigger only runs for a report actually saved, so a repeated one (HU-85) counts for nothing.
CREATE OR REPLACE FUNCTION public.hide_place_at_three_reports()
RETURNS trigger
LANGUAGE plpgsql
-- Definer rights: places and reports have RLS without policies, so the rule must not depend on
-- the caller's role. The fixed search_path keeps it safe.
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reports arriving at once wait here for each other, and each then counts the ones already
  -- committed: without it, two at the same moment would not see each other and the site would
  -- stay published. NO KEY: another report's foreign key check holds KEY SHARE on this row, which
  -- FOR UPDATE would wait for, ending in a deadlock.
  PERFORM 1 FROM public.places WHERE id = NEW.place_id FOR NO KEY UPDATE;

  IF (SELECT count(*) FROM public.reports WHERE place_id = NEW.place_id) >= 3 THEN
    UPDATE public.places SET status = 'hidden' WHERE id = NEW.place_id AND status = 'published';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER reports_hide_place
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.hide_place_at_three_reports();
--> statement-breakpoint
-- Only the trigger calls it.
REVOKE EXECUTE ON FUNCTION public.hide_place_at_three_reports() FROM PUBLIC, anon, authenticated;
