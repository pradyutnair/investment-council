# The Investment Committee 🏦

An AI-powered investment analysis platform that orchestrates Google's Gemini Deep Research with a "Council" of AI critics (ChatGPT + Claude) to provide comprehensive due diligence on investment opportunities.

## 🎯 Project Overview

The Investment Committee transforms investment research into a structured workflow:

1. **Scout** → Define your thesis and commission deep research
2. **The Report** → Gemini Deep Research delivers comprehensive analysis
3. **The Council** → ChatGPT (The Skeptic) and Claude (The Risk Officer) critique the report
4. **Interrogation** → Interactive Q&A with full context to finalize your verdict

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: Shadcn UI (New York style) with custom financial terminal typography
- **Auth & Database**: Supabase (PostgreSQL with Row Level Security)
- **AI Orchestration**: Mastra framework
- **AI Models**:
  - Google Gemini 2.0 (Deep Research)
  - OpenAI GPT-4o-mini (The Skeptic)
  - Anthropic Claude 3.5 Sonnet (The Risk Officer + Interrogation)

### Key Features

#### 🎨 Financial Terminal UI
- **Typography**: Inter (UI), Merriweather (reports), JetBrains Mono (data tables)
- **Layout**: Persistent sidebar with deal memos, tabbed workspace for each deal
- **Status Tracking**: Visual badges for workflow stages (Scouting → Researching → Council Review → Interrogation → Finalized)

#### 🔍 Deep Research (Gemini)
- Comprehensive investment analysis with streaming thought steps
- Structured markdown reports covering business model, financials, industry dynamics, and risks
- Fallback to standard Gemini if Deep Research API unavailable

#### 🎭 The Council
- **The Skeptic** (ChatGPT): Short-seller perspective, identifies flaws and overoptimistic assumptions
- **The Risk Officer** (Claude): Systematic risk assessment, regulatory concerns, data gaps
- Split-screen "diff" view comparing original report with critiques

#### 💬 Interrogation Phase
- Interactive chat with AI that has full context (thesis + report + critiques)
- Verdict widget with Invest/Pass/Watch decision and investment note
- Deal finalization workflow

## 📁 Project Structure

```
investment-council/
├── app/
│   ├── dashboard/
│   │   ├── deal/[dealId]/page.tsx    # Main deal page with tabs
│   │   ├── layout.tsx                # Dashboard layout with sidebar
│   │   └── page.tsx                  # Redirects to new deal creation
│   ├── api/
│   │   ├── research/route.ts         # Gemini research streaming endpoint
│   │   ├── council/route.ts          # Council critique orchestration
│   │   └── interrogation/route.ts    # Final Q&A chat endpoint
│   ├── layout.tsx                    # Root layout with fonts
│   └── globals.css                   # Custom typography utilities
├── components/
│   ├── dashboard/
│   │   ├── scout-form.tsx            # Deal creation & research commission
│   │   ├── report-viewer.tsx         # Markdown report reader
│   │   ├── council-split-view.tsx    # Side-by-side critique view
│   │   ├── interrogation-chat.tsx    # Chat + verdict widget
│   │   └── sidebar.tsx               # Deal memos list
│   └── ui/                           # Shadcn components
├── src/
│   ├── lib/actions/deals.ts          # Server actions for deal CRUD
│   ├── mastra/
│   │   ├── agents/
│   │   │   ├── skeptic-agent.ts      # GPT-4o short seller
│   │   │   └── risk-officer-agent.ts # Claude risk analyst
│   │   └── workflows/
│   │       └── council-critique.ts   # Council orchestration
│   ├── services/
│   │   └── gemini-research.ts        # Gemini API integration
│   └── types/deals.ts                # TypeScript types
├── supabase-schema.sql               # Database schema
├── .env.example                      # Environment variables template
└── README.md                         # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase project ([supabase.com](https://supabase.com))
- Google Gemini API key ([aistudio.google.com](https://aistudio.google.com/app/apikey))
- OpenAI API key ([platform.openai.com](https://platform.openai.com/api-keys))
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com/))

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL from `supabase-schema.sql` in the SQL Editor
   - Enable Google/GitHub OAuth in Authentication settings (optional)

3. **Configure environment variables**
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

4. **Run development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

### `deal_memos`
Core table for investment opportunities:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `company_name` | TEXT | Company being analyzed |
| `ticker` | TEXT | Stock ticker symbol (optional) |
| `status` | ENUM | Workflow stage: scouting, researching, council_review, interrogation, finalized |
| `thesis` | TEXT | User's investment hypothesis |
| `context_files` | JSONB | Uploaded files metadata |
| `council_enabled` | BOOLEAN | Whether to run council critique |
| `research_report` | TEXT | Gemini's markdown report |
| `critiques` | JSONB | {skeptic: {content, timestamp}, risk_officer: {content, timestamp}} |
| `verdict` | ENUM | invest, pass, watch |
| `verdict_note` | TEXT | Final investment decision rationale |

### `interrogation_messages`
Chat history for final Q&A phase:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `deal_id` | UUID | Foreign key to deal_memos |
| `role` | ENUM | user, assistant |
| `content` | TEXT | Message content |

## 🔄 Workflow Stages

### 1. Scout (Scouting)
- User fills out form: Company name, ticker, thesis
- Toggles council critique on/off
- Clicks "Commission Deep Research"

### 2. Research (Researching)
- Backend calls Gemini Deep Research API
- Streams thought steps to frontend (e.g., "Browsing Edgar...", "Reading 10-K...")
- Saves final markdown report to `research_report` field
- Automatically advances to Council Review

### 3. The Report (Council Review)
- Displays research report with serif typography
- Floating action button: "Convene Council"
- User clicks to trigger council critique

### 4. The Council (Council Review)
- Backend runs parallel agent workflows:
  - The Skeptic (GPT-4o): Counter-arguments and bear case
  - The Risk Officer (Claude): Risk assessment and missing data
- Saves critiques to `critiques` JSONB field
- UI shows split-screen view: report (left) vs. critiques (right)

### 5. Interrogation (Interrogation)
- Chat interface with AI that has full context
- Verdict widget on right: Invest/Pass/Watch dropdown + note
- User finalizes verdict → status becomes "finalized"

## 🛠️ Development Guide

### Adding New Council Members

1. Create agent in `src/mastra/agents/`:
   ```typescript
   export const newAgent = new Agent({
     name: 'new-agent',
     instructions: `Your role...`,
     model: {
       provider: 'OPEN_AI',
       name: 'gpt-4o-mini',
     } as any,
   });
   ```

2. Update `src/mastra/workflows/council-critique.ts`:
   ```typescript
   const [skeptic, riskOfficer, newAgent] = await Promise.all([
     skepticAgent.generate(context),
     riskOfficerAgent.generate(context),
     newAgent.generate(context),
   ]);
   ```

3. Extend `DealCritiques` type in `src/types/deals.ts`

4. Add card to `components/dashboard/council-split-view.tsx`

### Customizing Research Prompts

Edit `src/services/gemini-research.ts` → `buildResearchPrompt()` to modify:
- Sections to analyze
- Output format
- Tone and depth

### Styling Reports

Customize `app/globals.css` → `.report-content` class for:
- Heading styles
- Paragraph spacing
- Table formatting
- Code blocks

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own deal memos
- API routes validate authentication via Supabase
- No sensitive data in client-side code

## 📝 TODO / Future Enhancements

- [ ] File upload integration (Supabase Storage) for 10-Ks, transcripts
- [ ] Real-time streaming UI for research thought steps
- [ ] Export deal memos as PDF
- [ ] Comparison view for multiple deals
- [ ] Portfolio-level analysis
- [ ] Email notifications for research completion
- [ ] Mobile-responsive design improvements
- [ ] Vector search for historical deal memos
- [ ] Integration with financial data APIs (FMP, Polygon, etc.)

## 🤝 Contributing

This is a prototype built with Cursor AI. Contributions welcome via pull requests.

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn UI](https://ui.shadcn.com/)
- Agent orchestration by [Mastra](https://mastra.ai/)
- Powered by Google Gemini, OpenAI, and Anthropic

---

**Note**: This platform is for educational/research purposes. Not financial advice. Always conduct your own due diligence before making investment decisions.
