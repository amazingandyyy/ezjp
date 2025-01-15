-- Set default values for japanese_level and font_size
ALTER TABLE public.profiles
  ALTER COLUMN japanese_level SET DEFAULT 'N5';

-- Add font_size column if it doesn't exist, or set default if it does
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'font_size'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN font_size SET DEFAULT 'medium';
    ELSE
        ALTER TABLE public.profiles ADD COLUMN font_size text DEFAULT 'medium';
    END IF;
END
$$; 