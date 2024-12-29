-- Drop the old policy
DROP POLICY IF EXISTS "Users can delete their own pending suggestions or super admins can delete any" ON public.suggestions;

-- Create the updated policy using role_level instead of level
CREATE POLICY "Users can delete their own pending suggestions or super admins can delete any"
  ON public.suggestions
  FOR DELETE
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
  ); 