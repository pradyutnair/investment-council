# Investment Council

An AI-powered investment analysis platform that orchestrates multiple AI models to provide comprehensive due diligence on investment opportunities. The system combines Google Gemini Deep Research with a multi-agent "council" approach, leveraging ChatGPT and Claude to deliver critical analysis from multiple perspectives.

## Overview

The Investment Council transforms investment research into a structured workflow:

1. **Scout Phase** - Define investment thesis and commission deep research
2. **Research Phase** - Gemini Deep Research delivers comprehensive market and company analysis
3. **Council Phase** - AI agents (The Skeptic, The Risk Officer) critique the report from specialized perspectives
4. **Interrogation Phase** - Interactive Q&A with full context to finalize investment decisions

The platform supports two research workflows:
- **Thesis-Based Sessions**: Multi-opportunity research guided by an investment thesis
- **Traditional Deal Memos**: Focused analysis on individual investment opportunities

## Architecture

### Tech Stack

**Frontend**
- Next.js 15 (App Router)
- React 19 with TypeScript
- Tailwind CSS v4 with shadcn/ui components
- Custom financial terminal typography (Inter, Merriweather, JetBrains Mono)

**Backend & Infrastructure**
- Supabase (PostgreSQL with Row Level Security)
- Supabase Auth for authentication
- Server Actions for type-safe data mutations

**AI Orchestration**
- Mastra framework for agent orchestration
- Google Gemini 2.0 (Deep Research)
- OpenAI GPT-4o-mini (Skeptic Agent)
- Anthropic Claude 3.5 Sonnet (Risk Officer & Interrogation)

**External Integrations**
- Financial Modeling Prep (FMP) for financial data
- Yahoo Finance for market data
- PDF processing for document analysis

### Project Structure

```
investment-council/
├── app/
│   ├── api/                           # API routes
│   │   ├── research/                  # Research endpoints
│   │   ├── council/                   # Council critique endpoints
│   │   └── interrogation/             # Interrogation chat endpoints
│   ├── dashboard/
│   │   ├── deal/[dealId]/             # Deal memo pages
│   │   ├── research/                  # Thesis-based research pages
│   │   ├── chat/                      # Chat interface
│   │   └── layout.tsx                 # Dashboard layout
│   ├── login/                         # Authentication pages
│   └── globals.css                    # Global styles
├── components/
│   ├── dashboard/                     # Dashboard components
│   │   ├── scout-form.tsx             # Deal creation form
│   │   ├── report-viewer.tsx          # Markdown report display
│   │   ├── council-split-view.tsx     # Side-by-side critique view
│   │   ├── interrogation-chat.tsx     # Chat with verdict widget
│   │   └── sidebar.tsx                # Deal navigation
│   ├── research/                      # Research workflow components
│   └── ui/                            # shadcn/ui base components
├── src/
│   ├── lib/
│   │   └── actions/                   # Server actions
│   ├── mastra/
│   │   ├── agents/                    # AI agent definitions
│   │   ├── workflows/                 # AI workflow orchestration
│   │   └── tools/                     # AI tool integrations
│   └── services/                      # External service integrations
├── supabase/
│   └── migrations/                    # Database migrations
└── package.json
```

## Database Schema

### Research Sessions (Thesis-Based Workflow)

**research_sessions**
- Core table for thesis-driven investment research
- Supports multi-opportunity discovery and analysis
- Fields: title, thesis, strategy, status, research_report, council_analyses, verdict

**research_opportunities**
- Individual investment opportunities within a session
- Fields: ticker, company_name, type, risk_level, score, research_report, verdict

### Deal Memos (Traditional Workflow)

**deal_memos**
- Traditional investment deal tracking
- Fields: company_name, ticker, status, thesis, research_report, critiques, verdict

**interrogation_messages**
- Chat history for final Q&A phase
- Fields: deal_id, role, content

## Investment Strategies

The platform supports multiple investment research strategies:

- **Value Investing**: Fundamental analysis following Benjamin Graham principles
- **Special Situations**: Event-driven opportunities (mergers, spinoffs, restructuring)
- **Distressed Investing**: Turnaround and distressed security analysis
- **General Research**: Comprehensive company and market analysis

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account ([supabase.com](https://supabase.com))
- Google Gemini API key ([aistudio.google.com](https://aistudio.google.com/app/apikey))
- OpenAI API key ([platform.openai.com](https://platform.openai.com/api-keys))
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com/))

### Installation

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Set up Supabase:
   - Create a new Supabase project
   - Run the migration files from `supabase/migrations/` in the SQL Editor
   - Configure authentication providers (Google/GitHub) as needed

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your API keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_GEMINI_API_KEY=your_gemini_key
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Development

### Adding New AI Agents

1. Create a new agent in `src/mastra/agents/`:
   ```typescript
   export const newAgent = new Agent({
     name: 'new-agent',
     instructions: `Your role and instructions...`,
     model: {
       provider: 'OPEN_AI',
       name: 'gpt-4o-mini',
     } as any,
   });
   ```

2. Update the relevant workflow in `src/mastra/workflows/` to include the new agent

3. Extend TypeScript types to support the new agent's output

4. Add UI components to display the agent's analysis

### Customizing Research Prompts

Edit `src/mastra/agents/` to modify agent behavior:
- Adjust research scope and depth
- Customize output formats
- Modify role-specific instructions

### Styling

Global styles are in `app/globals.css`. Key classes:
- `.report-content`: Report typography and formatting
- `.terminal-font`: Financial terminal-style monospace text

## Security

- Row Level Security (RLS) enabled on all database tables
- Users can only access their own research sessions and deal memos
- API routes validate authentication via Supabase
- Server Actions provide type-safe data mutations
- No sensitive API keys exposed to client-side code

## License

MIT License

## Disclaimer

This platform is for educational and research purposes only. The content generated by AI agents does not constitute financial advice. Always conduct your own due diligence before making investment decisions.
