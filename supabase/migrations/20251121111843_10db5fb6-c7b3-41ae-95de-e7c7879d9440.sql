-- Fix search path for calculate_time_entry_hours function
-- Drop trigger first, then function, then recreate both
DROP TRIGGER IF EXISTS calculate_hours_trigger ON public.time_entries;
DROP FUNCTION IF EXISTS calculate_time_entry_hours();

CREATE OR REPLACE FUNCTION calculate_time_entry_hours()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
    
    -- Subtract break time if exists
    IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
      NEW.total_hours := NEW.total_hours - (EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 3600);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER calculate_hours_trigger
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_hours();