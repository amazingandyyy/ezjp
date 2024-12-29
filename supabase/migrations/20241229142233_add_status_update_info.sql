-- Add columns to track status updates
ALTER TABLE public.suggestions
ADD COLUMN IF NOT EXISTS status_updated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS status_updated_by uuid;

-- Add foreign key constraint
ALTER TABLE public.suggestions
ADD CONSTRAINT suggestions_status_updated_by_fkey
FOREIGN KEY (status_updated_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Create a function to automatically update status tracking info
CREATE OR REPLACE FUNCTION public.handle_suggestion_status_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.status_updated_at = timezone('utc'::text, now());
    NEW.status_updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status updates
DROP TRIGGER IF EXISTS on_suggestion_status_update ON public.suggestions;
CREATE TRIGGER on_suggestion_status_update
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_suggestion_status_update(); 