-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own suggestions" ON public.suggestions;

-- Create new update policy that checks status and allows super admins to update any suggestion
CREATE POLICY "Users can update their own pending suggestions or super admins can update any"
  ON public.suggestions
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id AND status = 'pending')
    OR 
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role_level >= 10
    )
  )
  WITH CHECK (
    (auth.uid() = user_id AND status = 'pending')
    OR 
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role_level >= 10
    )
  ); 