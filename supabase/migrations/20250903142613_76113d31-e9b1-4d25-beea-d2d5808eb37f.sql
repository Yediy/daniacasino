-- Fix all function search_path issues for security compliance
CREATE OR REPLACE FUNCTION public.sanitize_text(input_text text)
RETURNS text AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove potential XSS characters and encode HTML entities
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(input_text, '<[^>]*>', '', 'g'),
        '&', '&amp;', 'g'
      ),
      '"', '&quot;', 'g'
    ),
    '''', '&#x27;', 'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = 'public';