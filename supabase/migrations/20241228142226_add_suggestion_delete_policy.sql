-- Add policy to allow users to delete their own pending suggestions or super admins to delete any
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

-- Also need to cascade delete votes when suggestion is deleted
ALTER TABLE public.suggestion_votes
  DROP CONSTRAINT IF EXISTS suggestion_votes_suggestion_id_fkey,
  ADD CONSTRAINT suggestion_votes_suggestion_id_fkey
    FOREIGN KEY (suggestion_id)
    REFERENCES public.suggestions(id)
    ON DELETE CASCADE; 