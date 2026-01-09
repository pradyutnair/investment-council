-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS interrogation_messages CASCADE;
DROP TABLE IF EXISTS deal_memos CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- ============================================================================
-- RESEARCH WORKFLOW TABLES
-- ============================================================================

-- Research sessions table (main workflow table)
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Research input (thesis-based, not company-specific)
  title TEXT NOT NULL DEFAULT 'New Research',
  thesis TEXT NOT NULL,
  strategy TEXT CHECK (strategy IN ('value', 'special-sits', 'distressed', 'general')) DEFAULT 'general',

  -- Workflow stages
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',         -- Session created, not started
    'discovering',     -- Finding opportunities from thesis
    'researching',     -- Researching opportunities
    'analyzing',       -- Strategy and critique agents analyzing
    'deliberation',    -- User reviewing and chatting
    'finalized'        -- Final verdict reached
  )),

  -- Research phase (Gemini Deep Research output)
  research_report TEXT,
  research_started_at TIMESTAMP WITH TIME ZONE,
  research_completed_at TIMESTAMP WITH TIME ZONE,

  -- Council phase (multi-model analysis)
  -- Stores individual agent analyses
  council_analyses JSONB DEFAULT '[]'::jsonb,
  -- Stores the debate between agents
  council_debate JSONB DEFAULT '[]'::jsonb,
  council_started_at TIMESTAMP WITH TIME ZONE,
  council_completed_at TIMESTAMP WITH TIME ZONE,

  -- Final verdict
  verdict TEXT CHECK (verdict IS NULL OR verdict IN ('invest', 'pass', 'watch', 'needs_more_research')),
  verdict_note TEXT,
  confidence_level TEXT CHECK (confidence_level IS NULL OR confidence_level IN ('high', 'medium', 'low')),
  finalized_at TIMESTAMP WITH TIME ZONE,

  -- Thesis-based workflow columns
  discovered_opportunities JSONB DEFAULT '[]'::jsonb,
  final_verdict JSONB,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for research sessions
CREATE INDEX IF NOT EXISTS idx_research_sessions_user_id ON research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_status ON research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_research_sessions_created_at ON research_sessions(created_at DESC);

-- Enable RLS for research sessions
ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for research_sessions
CREATE POLICY "Users can view own research sessions" ON research_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own research sessions" ON research_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own research sessions" ON research_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own research sessions" ON research_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- CHAT SYSTEM TABLES (for deliberation phase)
-- ============================================================================

-- Chat messages linked to research sessions
CREATE TABLE IF NOT EXISTS deliberation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'gemini', 'chatgpt', 'claude')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for deliberation messages
CREATE INDEX IF NOT EXISTS idx_deliberation_messages_session_id ON deliberation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_deliberation_messages_created_at ON deliberation_messages(created_at DESC);

-- Enable RLS for deliberation messages
ALTER TABLE deliberation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deliberation_messages
CREATE POLICY "Users can view deliberation messages from own sessions" ON deliberation_messages
  FOR SELECT USING (session_id IN (SELECT id FROM research_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can create deliberation messages in own sessions" ON deliberation_messages
  FOR INSERT WITH CHECK (session_id IN (SELECT id FROM research_sessions WHERE user_id = auth.uid()));

-- ============================================================================
-- RESEARCH OPPORTUNITIES TABLE (for thesis-based workflow)
-- ============================================================================

-- Individual opportunities discovered and analyzed within a research session
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
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update research_sessions updated_at
CREATE TRIGGER update_research_sessions_updated_at
  BEFORE UPDATE ON research_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update research_opportunities updated_at
CREATE TRIGGER update_research_opportunities_updated_at
  BEFORE UPDATE ON research_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTION TO CREATE RESEARCH SESSION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_research_session(
  p_user_id UUID,
  p_title TEXT,
  p_thesis TEXT,
  p_strategy TEXT DEFAULT 'general'
) RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  INSERT INTO research_sessions (user_id, title, thesis, strategy, status)
  VALUES (p_user_id, p_title, p_thesis, p_strategy, 'pending')
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION TO UPDATE RESEARCH REPORT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_research_report(
  p_session_id UUID,
  p_report TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE research_sessions
  SET
    research_report = p_report,
    research_completed_at = NOW(),
    status = 'council_gather',
    updated_at = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION TO ADD COUNCIL ANALYSIS
-- ============================================================================

CREATE OR REPLACE FUNCTION add_council_analysis(
  p_session_id UUID,
  p_agent_name TEXT,
  p_analysis TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE research_sessions
  SET
    council_analyses = council_analyses || jsonb_build_object(
      'agent', p_agent_name,
      'analysis', p_analysis,
      'timestamp', NOW()
    ),
    updated_at = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION TO COMPLETE COUNCIL DEBATE
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_council_debate(
  p_session_id UUID,
  p_debate JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE research_sessions
  SET
    council_debate = p_debate,
    council_completed_at = NOW(),
    status = 'deliberation',
    updated_at = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION TO SET FINAL VERDICT
-- ============================================================================

CREATE OR REPLACE FUNCTION set_verdict(
  p_session_id UUID,
  p_verdict TEXT,
  p_note TEXT,
  p_confidence TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE research_sessions
  SET
    verdict = p_verdict,
    verdict_note = p_note,
    confidence_level = p_confidence,
    finalized_at = NOW(),
    status = 'finalized',
    updated_at = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
