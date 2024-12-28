-- Set default values for japanese_level and font_size
ALTER TABLE public.profiles
  ALTER COLUMN japanese_level SET DEFAULT 'N5',
  ALTER COLUMN font_size SET DEFAULT 'medium'; 