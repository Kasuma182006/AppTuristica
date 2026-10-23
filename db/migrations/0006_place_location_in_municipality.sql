-- Custom migration (HU-13): a place's location must lie inside its municipality, so every site is
-- inside the configured departments whatever writes it (ingest, proposals or a manual edit).
CREATE OR REPLACE FUNCTION public.check_place_location_in_municipality()
RETURNS trigger
LANGUAGE plpgsql
-- Definer rights: municipalities has RLS without policies, so the check must not depend on
-- the caller's role. The fixed search_path keeps it safe.
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.municipalities m
    WHERE m.id = NEW.municipality_id AND ST_Covers(m.geom, NEW.location)
  ) THEN
    RAISE EXCEPTION 'Place "%" is outside municipality %', NEW.slug, NEW.municipality_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER places_location_in_municipality
BEFORE INSERT OR UPDATE OF location, municipality_id ON public.places
FOR EACH ROW EXECUTE FUNCTION public.check_place_location_in_municipality();
--> statement-breakpoint
-- Only the trigger calls it.
REVOKE EXECUTE ON FUNCTION public.check_place_location_in_municipality() FROM PUBLIC, anon, authenticated;
