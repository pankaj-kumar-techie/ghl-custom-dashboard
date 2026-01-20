# Supabase Deployment & Connection Guide

This guide explains how to deploy your **Supabase Edge Functions** and set up the **Database** for production.

## 1. Prerequisites
- **Supabase CLI**: Ensure you have the Supabase CLI installed.
  - MacOS: `brew install supabase/tap/supabase`
  - Windows: `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase`
  - NPM: `npm install -g supabase`
- **Supabase Project**: Create a new project at [supabase.com](https://supabase.com).

## 2. Link Local Project to Remote
1.  Log in to Supabase CLI:
    ```bash
    supabase login
    ```
2.  Get your **Reference ID** from your Supabase Dashboard URL (e.g., `https://app.supabase.com/project/YOUR_REF_ID`).
3.  Link the project:
    ```bash
    supabase link --project-ref YOUR_REF_ID
    ```
    - Enter your database password when prompted.

## 3. Deploy Database Schema
Push your local migration files to the remote database:
```bash
supabase db push
```
This applies the `supabase/migrations/20240120_init.sql` file, creating the `ghl_tokens` table.

## 4. Deploy Edge Functions
Deploy the two functions: `ghl-oauth` and `ghl-proxy`.
```bash
supabase functions deploy ghl-oauth
supabase functions deploy ghl-proxy
```

## 5. Set Environment Secrets
The Edge Functions need secrets to communicate with GHL and Supabase.
Run the following command (replace with your actual values):

```bash
supabase secrets set --env-file ./supabase/.env
```
*Tip: Create a `supabase/.env` file locally with the following keys first:*
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GHL_CLIENT_ID=your-ghl-app-client-id
GHL_CLIENT_SECRET=your-ghl-app-client-secret
GHL_REDIRECT_URI=https://your-vercel-app.vercel.app/auth/callback
```
Or set them manually one by one:
```bash
supabase secrets set GHL_CLIENT_ID=...
```

## 6. Frontend Connection (Vercel/Netlify)
1.  Go to your Vercel Project Settings -> Environment Variables.
2.  Add:
    - `VITE_SUPABASE_URL`: Your Supabase Project URL.
    - `VITE_SUPABASE_ANON_KEY`: Your Supabase **Anon** Key (public).
    - `VITE_GHL_CLIENT_ID`: Your GHL App Client ID.
    - `VITE_GHL_REDIRECT_URI`: Your production callback URL (e.g., `https://myapp.vercel.app/auth/callback`).

## 7. Verification
1.  Open your deployed frontend app.
2.  Click **Connect**.
3.  If configured correctly, it should redirect to GHL, then back to your app, and successfully exchange the token using the deployed Edge Function.
