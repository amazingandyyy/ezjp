-- Add level column to profiles table
ALTER TABLE profiles
ADD COLUMN level INTEGER DEFAULT 0 NOT NULL;

-- Add computed role column based on level
ALTER TABLE profiles
ADD COLUMN role TEXT GENERATED ALWAYS AS (
  CASE 
    WHEN level >= 10 THEN 'super_admin'
    WHEN level >= 1 THEN 'premium_user'
    ELSE 'normal_user'
  END
) STORED;

-- Create function to set super admin level
CREATE OR REPLACE FUNCTION set_super_admin_level()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = NEW.id 
    AND email = 'amazingandyyy@gmail.com'
  ) THEN
    NEW.level := 10;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set super admin level
DROP TRIGGER IF EXISTS set_super_admin_level_trigger ON profiles;
CREATE TRIGGER set_super_admin_level_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_super_admin_level();

-- Set amazingandyyy@gmail.com as super_admin (for existing profile)
UPDATE profiles 
SET level = 10
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'amazingandyyy@gmail.com'
);

-- Create policy to allow users to read all roles
CREATE POLICY "Allow users to read all roles" ON profiles
FOR SELECT
USING (true);

-- Create policy to allow high level users to update roles
CREATE POLICY "Allow high level users to update roles" ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND level >= 10
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND level >= 10
  )
);

-- Add RLS for profiles
ALTER TABLE profiles
  ENABLE ROW LEVEL SECURITY; 