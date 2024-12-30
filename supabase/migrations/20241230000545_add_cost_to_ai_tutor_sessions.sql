-- Add cost tracking columns to ai_tutor_sessions table
ALTER TABLE ai_tutor_sessions
ADD COLUMN input_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,  -- Cost in USD for input tokens
ADD COLUMN output_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,  -- Cost in USD for output tokens
ADD COLUMN total_cost DECIMAL(10, 6) NOT NULL DEFAULT 0;  -- Total cost in USD

-- Update existing records with calculated costs
UPDATE ai_tutor_sessions
SET 
  input_cost = (input_tokens::decimal / 1000) * 0.001,
  output_cost = (output_tokens::decimal / 1000) * 0.002,
  total_cost = ((input_tokens::decimal / 1000) * 0.001) + ((output_tokens::decimal / 1000) * 0.002);

-- Remove the default values after updating existing records
ALTER TABLE ai_tutor_sessions
ALTER COLUMN input_cost DROP DEFAULT,
ALTER COLUMN output_cost DROP DEFAULT,
ALTER COLUMN total_cost DROP DEFAULT; 