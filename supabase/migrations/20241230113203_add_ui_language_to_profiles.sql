ALTER TABLE profiles
ADD COLUMN ui_language text DEFAULT 'en';

COMMENT ON COLUMN profiles.ui_language IS 'The user''s preferred interface language'; 