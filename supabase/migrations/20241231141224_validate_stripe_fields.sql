-- Add constraints and validation for premium fields
ALTER TABLE public.profiles
  ADD CONSTRAINT check_premium_type CHECK (premium_type IN ('monthly', 'yearly') OR premium_type IS NULL);

-- Create a function to validate premium status
CREATE OR REPLACE FUNCTION validate_premium_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_premium = true AND (
    NEW.premium_type IS NULL OR
    NEW.premium_updated_at IS NULL OR
    NEW.premium_until IS NULL OR
    NEW.premium_until <= now()
  ) THEN
    RAISE EXCEPTION 'Premium users must have all required fields populated and a valid premium_until date';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to validate premium status before insert or update
DROP TRIGGER IF EXISTS validate_premium_status_trigger ON public.profiles;
CREATE TRIGGER validate_premium_status_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_premium_status(); 