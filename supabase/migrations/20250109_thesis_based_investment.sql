-- Migration: Thesis-Based Investment Workflow
-- Adds support for multi-opportunity research sessions

-- ============================================================================
-- 1. Add strategy column to research_sessions
-- ============================================================================

ALTER TABLE research_sessions
ADD COLUMN IF NOT EXISTS strategy TEXT CHECK (strategy IN ('value', 'special-sits', 'distressed', 'general'));

-- Update existing sessions to have 'general' strategy
UPDATE research_sessions
SET strategy = 'general'
WHERE strategy IS NULL;

-- ============================================================================
-- 2. Create research_opportunities table
-- ============================================================================

CREATE TABLE IF NOT EXISTS research_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,

  -- Opportunity details
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  thesis TEXT NOT NULL,
  type TEXT NOT NULL,
  key_metrics JSONB DEFAULT '{}'::jsonb,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  score INTEGER,

  -- Analysis results
  research_report TEXT,
  strategy_analysis TEXT,
  critiques JSONB DEFAULT '{}'::jsonb, -- { skeptic: {...}, risk_officer: {...} }
  verdict TEXT,
  final_score INTEGER,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'researching',
    'analyzing',
    'completed',
    'failed'
  )),
  errors JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for research_opportunities
CREATE INDEX IF NOT EXISTS idx_research_opportunities_session_id ON research_opportunities(session_id);
CREATE INDEX IF NOT EXISTS idx_research_opportunities_ticker ON research_opportunities(ticker);
CREATE INDEX IF NOT EXISTS idx_research_opportunities_status ON research_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_research_opportunities_score ON research_opportunities(score DESC);

-- Enable RLS for research_opportunities
ALTER TABLE research_opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for research_opportunities
CREATE POLICY "Users can view opportunities from own sessions" ON research_opportunities
  FOR SELECT USING (session_id IN (SELECT id FROM research_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can create opportunities in own sessions" ON research_opportunities
  FOR INSERT WITH CHECK (session_id IN (SELECT id FROM research_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can update opportunities in own sessions" ON research_opportunities
  FOR UPDATE USING (session_id IN (SELECT id FROM research_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete opportunities in own sessions" ON research_opportunities
  FOR DELETE USING (session_id IN (SELECT id FROM research_sessions WHERE user_id = auth.uid()));

-- ============================================================================
-- 3. Update status enum to include new statuses for thesis workflow
-- ============================================================================

-- Add new status for thesis-based workflow
ALTER TABLE research_sessions
DROP CONSTRAINT IF EXISTS research_sessions_status_check;

ALTER TABLE research_sessions
ADD CONSTRAINT research_sessions_status_check
CHECK (status IN (
  'pending',         -- Session created, not started
  'discovering',     -- Finding opportunities from thesis
  'researching',     -- Researching opportunities
  'analyzing',       -- Strategy and critique agents analyzing
  'deliberation',    -- User reviewing and chatting
  'finalized'        -- Final verdict reached
));

-- ============================================================================
-- 4. Add columns for thesis workflow tracking
-- ============================================================================

ALTER TABLE research_sessions
ADD COLUMN IF NOT EXISTS discovered_opportunities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS final_verdict JSONB; -- { decision, confidence, topPick, rationale }

-- ============================================================================
-- 5. Helper functions for thesis workflow
-- ============================================================================

-- Function to insert discovered opportunities
CREATE OR REPLACE FUNCTION insert_discovered_opportunities(
  p_session_id UUID,
  p_opportunities JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO research_opportunities (
    session_id,
    ticker,
    company_name,
    thesis,
    type,
    key_metrics,
    risk_level,
    score,
    status
  )
  SELECT
    p_session_id,
    (op->>'ticker')::TEXT,
    (op->>'companyName')::TEXT,
    (op->>'thesis')::TEXT,
    (op->>'type')::TEXT,
    op->>'keyMetrics',
    (op->>'riskLevel')::TEXT,
    (op->>'score')::INTEGER,
    'pending'::TEXT
  FROM jsonb_array_elements(p_opportunities) AS op;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update opportunity analysis
CREATE OR REPLACE FUNCTION update_opportunity_analysis(
  p_opportunity_id UUID,
  p_research_report TEXT,
  p_strategy_analysis TEXT,
  p_critiques JSONB,
  p_verdict TEXT,
  p_final_score INTEGER,
  p_status TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE research_opportunities
  SET
    research_report = COALESCE(p_research_report, research_report),
    strategy_analysis = COALESCE(p_strategy_analysis, strategy_analysis),
    critiques = COALESCE(p_critiques, critiques),
    verdict = COALESCE(p_verdict, verdict),
    final_score = COALESCE(p_final_score, final_score),
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE id = p_opportunity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set session final verdict
CREATE OR REPLACE FUNCTION set_session_final_verdict(
  p_session_id UUID,
  p_decision TEXT,
  p_confidence INTEGER,
  p_top_pick TEXT,
  p_rationale TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE research_sessions
  SET
    final_verdict = jsonb_build_object(
      'decision', p_decision,
      'confidence', p_confidence,
      'topPick', p_top_pick,
      'rationale', p_rationale,
      'timestamp', NOW()
    ),
    status = 'finalized',
    finalized_at = NOW(),
    updated_at = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Triggers
-- ============================================================================

-- Trigger to auto-update research_opportunities updated_at
CREATE TRIGGER update_research_opportunities_updated_at
  BEFORE UPDATE ON research_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
