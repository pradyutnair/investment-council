-- Migration: Add strategy column to research_sessions
-- This column stores the investment strategy used for research (value, special-sits, distressed, general)

-- Add the strategy column with a default of 'general'
ALTER TABLE research_sessions 
ADD COLUMN IF NOT EXISTS strategy TEXT NOT NULL DEFAULT 'general' 
CHECK (strategy IN ('value', 'special-sits', 'distressed', 'general'));

-- Create index for strategy queries
CREATE INDEX IF NOT EXISTS idx_research_sessions_strategy ON research_sessions(strategy);

-- Update the status check to include 'pending' state
ALTER TABLE research_sessions 
DROP CONSTRAINT IF EXISTS research_sessions_status_check;

ALTER TABLE research_sessions 
ADD CONSTRAINT research_sessions_status_check 
CHECK (status IN (
  'pending',          -- Ready to start research
  'researching',      -- Gemini Deep Research in progress
  'council_gather',   -- Council agents analyzing
  'council_debate',   -- Council agents debating
  'deliberation',     -- User reviewing and chatting
  'finalized'         -- Final verdict reached
));

-- Set default status to 'pending' for new sessions
ALTER TABLE research_sessions 
ALTER COLUMN status SET DEFAULT 'pending';
