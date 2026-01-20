# GHL Custom Dashboard

A production-ready React + Vite dashboard connected to HighLevel (GHL) API 2.0 via Supabase Edge Functions.

## Features

- **OAuth Integration**: securely connect to GHL wth automatic token refresh.
- **Appointments**: View upcoming appointments with date filtering.
- **Dashboard**: High-level overview of stats (mocked connected to API in future).
- **Secure Backend**: Tokens stored in Supabase with RLS; no secrets in frontend.

## Prerequisites

1.  **Supabase Project**: Create a new project at [supabase.com](https://supabase.com).
2.  **GHL Marketplace App**: Create a private app in GHL Marketplace to get Client ID & Secret.
3.  **Surge/Vercel/Netlify**: For frontend deployment.

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in:
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GHL_CLIENT_ID=...
VITE_GHL_REDIRECT_URI=http://localhost:5173/auth/callback
```

### 2. Database & Functions

Run the SQL migration in `supabase/migrations/20240120_init.sql` in your Supabase SQL Editor.

Deploy Edge Functions (requires Supabase CLI):
```bash
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy ghl-oauth
supabase functions deploy ghl-proxy
```

Set Secrets for Functions:
```bash
supabase secrets set --env-file ./supabase/.env.local
# OR manually:
supabase secrets set GHL_CLIENT_ID=... GHL_CLIENT_SECRET=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Frontend

Install dependencies and run:
```bash
npm install
npm run dev
```

## Deployment

1.  Build frontend: `npm run build`.
2.  Deploy `dist/` folder to Vercel/Netlify.
3.  Update `VITE_GHL_REDIRECT_URI` in `.env` and in your GHL App settings to match the production URL.

## Architecture

- **Frontend**: React, Tailwind, Vite.
- **Backend**: Supabase Edge Functions (`ghl-oauth`, `ghl-proxy`).
- **Database**: Supabase Postgres (`ghl_tokens`).
