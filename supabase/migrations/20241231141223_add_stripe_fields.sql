-- Add additional Stripe-related columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS premium_type text,
  ADD COLUMN IF NOT EXISTS premium_updated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS premium_until timestamp with time zone;

-- Add comment for the new columns
COMMENT ON COLUMN profiles.is_premium IS 'Whether the user has an active premium subscription';
COMMENT ON COLUMN profiles.premium_type IS 'The type of premium subscription (monthly/yearly)';
COMMENT ON COLUMN profiles.premium_updated_at IS 'When the premium status was last updated';
COMMENT ON COLUMN profiles.premium_until IS 'When the premium subscription expires'; 