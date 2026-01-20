# Production Configuration Checklist
**Target URL:** `https://ghl-custom-dashboard.vercel.app/`

I have already updated your **Backend Secret** for you. Now you must do these 2 steps to make the live site work:

## 1. Update Vercel Environment Variables
Go to your Vercel Project Settings -> Environment Variables and ensure these are set:

| Variable | Value |
| :--- | :--- |
| `VITE_GHL_REDIRECT_URI` | `https://ghl-custom-dashboard.vercel.app/auth/callback` |
| `VITE_GHL_CLIENT_ID` | `696e6227811efea3542525c1-mkmck0jz` |
| `VITE_SUPABASE_URL` | `https://vcsibpgjyilegvzpxfry.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(Your long Anon Key from .env)* |

## 2. Update GHL Marketplace
Go to [HighLevel Marketplace](https://marketplace.leadconnectorhq.com/) -> My Apps -> Settings.

1.  Find **Redirect URLs**.
2.  Add: `https://ghl-custom-dashboard.vercel.app/auth/callback`
3.  Click **Save**.

---
### Important Note
Now that the Backend is configured for **Production**, local testing (`localhost`) might fail OAuth redirection.
To switch back to **Localhost testing**, run this terminal command:
`npx supabase secrets set GHL_REDIRECT_URI=http://localhost:5173/auth/callback`
