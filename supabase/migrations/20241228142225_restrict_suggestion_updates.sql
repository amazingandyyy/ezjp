-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own suggestions" ON public.suggestions;

-- Create new update policy that checks status
CREATE POLICY "Users can update their own pending suggestions"
  ON public.suggestions
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND status = 'pending'
  ); 