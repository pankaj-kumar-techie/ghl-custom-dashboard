# HighLevel (GHL) Integration Guide

This guide explains how to integrate this custom dashboard into HighLevel.

## 1. Prerequisites
- **GHL Marketplace App**: You must have a private app created in the [GHL Marketplace](https://marketplace.leadconnectorhq.com/).
- **Deployed App**: This project must be deployed (e.g. Vercel) to have a public HTTPS URL.

## 2. Setting up the GHL App
1.  Go to **Marketplace** -> **My Apps**.
2.  Create or Edit your app.
3.  **Scopes**: Ensure you request the following permissions (Scopes):
    - `appointments.readonly`
    - `calendars.readonly`
    - `contacts.readonly`
    - `opportunities.readonly`
    - `users.readonly`
    - `conversations.readonly` (if needed)

4.  **Redirect URI**: Set this to your deployed URL + `/auth/callback`.
    - Example: `https://my-ghl-dashboard.vercel.app/auth/callback`
    - For local testing: `http://localhost:5173/auth/callback`

### 3. Displaying the Dashboard in GHL (Iframe)
To show this app inside the GHL UI (removing reliance on the sidebar), you have two main options:

#### Option A: Custom Menu Link (simplest)
1.  Go to **Settings** -> **Custom Menu Link**.
2.  **Create New**:
    - **Icon**: Choose one.
    - **Link Title**: "My Dashboard".
    - **URL**: Your deployed URL (e.g. `https://my-ghl-dashboard.vercel.app/`).
    - **Show Link on**: Account Sidebar (or Agency Sidebar).
    - **Open in**: `Iframe` (IMPORTANT: Select "Inside the platform" or "Iframe").

#### Option B: Agency Dashboard (Marketplace App Feature)
1.  In your Marketplace App settings, go to **Agency Dashboard** or **Account Dashboard**.
2.  Enable it and point the **Iframe URL** to your deployed app.
3.  This replaces the native dashboard or adds a new tab.

## 4. Troubleshooting
- **"Refused to connect"**: Ensure your app allows framing. Vercel usually allows it, but checking headers (`X-Frame-Options`) is good practice.
- **Tailwind/Styles missing**: Ensure `npm run build` succeeds and `dist/index.css` is loaded.
- **Sidebar double-up**: We switched to a Top Navigation layout so the internal app sidebar doesn't conflict with GHL's sidebar.

## 5. Development Tips
- Use `http://localhost:5173` for the Custom Menu Link URL while developing to see changes live inside GHL (might require allowing mixed content or using a tunnel like Ngrok on some browsers).
