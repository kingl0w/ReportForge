# ReportForge

Transform raw data into polished, professional reports in seconds. Upload CSV, Excel, or JSON data and get beautifully formatted PDF/DOCX reports with charts, summaries, and AI-powered insights.

## Features

- **Instant Reports** — Upload data, pick a template, get a professional report in under 15 seconds
- **Smart Analysis** — Local statistical engine computes trends, anomalies, rankings, and correlations with zero API latency
- **AI Narratives** — Gemini Flash (free tier) turns computed stats into natural-sounding executive summaries
- **6 Built-in Templates** — Sales, Social Media, Crypto Wallet, E-commerce, Website Analytics, and Custom
- **Multiple Formats** — Export as PDF, DOCX, or both
- **Template Customization** — Pick brand colors, toggle sections, override chart types
- **Drag-and-Drop Upload** — Supports CSV, Excel (.xlsx/.xls), and JSON files up to 10 MB
- **Stripe Payments** — Pro subscription ($10/mo) or pay-per-report ($2.99)
- **Auto-Save Drafts** — Resume where you left off with localStorage draft persistence

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Animation | Framer Motion |
| Database | Supabase (Postgres) |
| ORM | Prisma 7 |
| Auth | Supabase Auth (email, Google, GitHub) |
| Payments | Stripe (subscriptions + one-time) |
| PDF Rendering | Puppeteer |
| DOCX Generation | docx (npm) |
| Charts | Recharts |
| AI | Google Gemini Flash (free tier, narrative only) |
| Data Parsing | PapaParse, SheetJS |
| Validation | Zod |

## Prerequisites

- **Node.js** 20+
- **Supabase** project (database + storage + auth)
- **Stripe** account (test mode for development)
- **Google AI API key** for Gemini Flash (free tier)

## Getting Started

### 1. Clone and install

```bash
git clone <repository-url>
cd reportforge
npm install
```

### 2. Environment setup

```bash
cp .env.local.example .env.local
```

Fill in the required values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRO_PRICE_ID=
STRIPE_PER_REPORT_PRICE_ID=

# Google Gemini (free tier)
GOOGLE_GEMINI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database setup

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npx prisma migrate dev` | Run database migrations |
| `npx prisma generate` | Generate Prisma client |
| `npx prisma studio` | Open database GUI |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (marketing)/        # Landing page, pricing (public)
│   ├── (dashboard)/        # Authenticated app
│   │   ├── dashboard/      # Overview + recent reports
│   │   ├── reports/        # Report history, new wizard, detail
│   │   ├── templates/      # User's saved templates
│   │   ├── connections/    # API connections (Shopify, GA)
│   │   └── settings/       # Account + billing
│   ├── api/                # API routes
│   │   ├── reports/        # Generate, CRUD, download
│   │   ├── analyze/        # Statistical analysis + narrative
│   │   ├── upload/         # File upload handler
│   │   ├── stripe/         # Checkout + webhooks
│   │   └── subscription/   # Plan + usage status
│   └── auth/               # Login, signup, callback
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── reports/            # Wizard, uploader, preview, charts
│   ├── dashboard/          # Sidebar, stats, recent reports
│   ├── marketing/          # Hero, features, pricing, CTA
│   └── shared/             # Loading states, error boundary
├── lib/
│   ├── analytics/          # Statistical engine (local, zero API)
│   ├── reports/            # Generation pipeline + templates
│   ├── ai/                 # Gemini client + fallback
│   ├── stripe/             # Stripe client + plan definitions
│   ├── supabase/           # Client, server, admin clients
│   └── utils/              # Validation, formatting, transforms
├── hooks/                  # React hooks (upload, generation, subscription)
└── types/                  # TypeScript type definitions
```

## Deployment

### Vercel

1. Connect your repository to [Vercel](https://vercel.com)
2. Add all environment variables from `.env.local.example`
3. Deploy — Vercel auto-detects Next.js and configures build settings
4. Function timeouts are pre-configured in `vercel.json` (60s for report generation)

### Required Services

| Service | Purpose | Setup |
|---------|---------|-------|
| [Supabase](https://supabase.com) | Database, auth, file storage | Create project, run migrations |
| [Stripe](https://stripe.com) | Payments | Create products + prices, configure webhook |
| [Google AI Studio](https://aistudio.google.com) | Narrative generation | Get free API key |

### Stripe Webhook

For local development:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

For production, configure the webhook endpoint in the Stripe dashboard pointing to `https://your-domain.com/api/stripe/webhook`.

## Architecture

### Report Generation Pipeline

```
Upload → Parse → Statistical Analysis (local) → Template Selection (rules)
  → Chart Generation → Narrative (Gemini free) → Render PDF → Store & Deliver
```

The "AI insights" are 90% local math (trends, anomalies, rankings, correlations). Gemini Flash is only called once per report to polish the narrative — keeping API costs at $0.

### Hybrid Intelligence

- **Statistical Engine** — Pure TypeScript functions for all number crunching
- **Rule-Based Matching** — Pattern matching selects templates and chart types
- **Gemini Flash** — Free tier (15 RPM, 1M tokens/day) for executive summary text only
- **Automatic Fallback** — If Gemini is unavailable, template-based text is used instead

## License

MIT — see [LICENSE](LICENSE) for details.
