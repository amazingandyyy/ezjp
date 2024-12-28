-- Drop existing status column and type if they exist
DO $$ 
BEGIN
    -- Drop the status column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'suggestions' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE suggestions DROP COLUMN status;
    END IF;

    -- Drop the enum type if it exists
    IF EXISTS (
        SELECT 1 
        FROM pg_type 
        WHERE typname = 'suggestion_status'
    ) THEN
        DROP TYPE suggestion_status;
    END IF;
END $$;

-- Create enum type for suggestion status
CREATE TYPE suggestion_status AS ENUM ('pending', 'in_progress', 'done');

-- Add status column to suggestions table
ALTER TABLE suggestions 
ADD COLUMN status suggestion_status DEFAULT 'pending' NOT NULL;

-- Create policy to allow high level users to update suggestion status
CREATE POLICY "Allow high level users to update suggestion status" ON suggestions
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