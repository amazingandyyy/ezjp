-- Add policy to allow users to delete their own suggestions
CREATE POLICY "Users can delete their own suggestions"
  ON public.suggestions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Also need to cascade delete votes when suggestion is deleted
ALTER TABLE public.suggestion_votes
  DROP CONSTRAINT IF EXISTS suggestion_votes_suggestion_id_fkey,
  ADD CONSTRAINT suggestion_votes_suggestion_id_fkey
    FOREIGN KEY (suggestion_id)
    REFERENCES public.suggestions(id)
    ON DELETE CASCADE; 