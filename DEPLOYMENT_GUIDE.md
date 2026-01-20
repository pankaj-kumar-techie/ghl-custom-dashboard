# Vercel Deployment & Production Setup

This guide walks you through deploying your dashboard to Vercel and switching from `localhost` to a secure `https` URL.

## 1. Deploy Frontend to Vercel

1.  **Push your code to GitHub**.
    *   Create a new repository on GitHub.
    *   Push your local code to that repository.
2.  **Import to Vercel**.
    *   Go to [Vercel](https://vercel.com/new).
    *   Select your GitHub repository.
    *   Click **Import**.

## 2. Configure Vercel Environment Variables

In the Vercel Project Settings > **Environment Variables**, add the following:

| Variable | Value |
| :--- | :--- |
| `VITE_SUPABASE_URL` | `https://vcsibpgjyilegvzpxfry.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` (Copy from your local .env) |
| `VITE_GHL_CLIENT_ID` | `696e6227...` (Copy from your local .env) |
| `VITE_GHL_REDIRECT_URI` | `https://your-project-name.vercel.app/auth/callback` |

*Note: Replace `your-project-name.vercel.app` with the actual URL Vercel gives you after the first deploy.*

## 3. Update Supabase Secrets (Backend)

Your backend also needs to know about the new Production URL. Run this command locally:

```powershell
npx supabase secrets set GHL_REDIRECT_URI=https://your-project-name.vercel.app/auth/callback
```

## 4. Update GHL Marketplace

1.  Go to **GHL Marketplace** > **My Apps** > **Settings**.
2.  Under **Redirect URLs**, click **+ Add**.
3.  Add your new Vercel URL: `https://your-project-name.vercel.app/auth/callback`
4.  **Save**.

## 5. Final Verification

1.  Open your Vercel URL (e.g., `https://my-dashboard.vercel.app/`).
2.  Click **Connect**.
3.  You should be redirected to GHL, then back to your live Vercel app successfully!

---
**Summary of Matching URLs:**
For production to work, these three must match **exactly**:
1.  **Vercel Env Var** (`VITE_GHL_REDIRECT_URI`)
2.  **Supabase Secret** (`GHL_REDIRECT_URI`)
3.  **GHL Marketplace Setting** (Redirect URL)
