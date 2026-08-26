# QWERTY Google OAuth Configuration Requirements

To complete the Google OAuth Sign In setup for the QWERTY platform, the following manual configuration steps are required in the Google Cloud Console and the Supabase Dashboard.

## 1. Information Required from QWERTY Project

* **Supabase OAuth Callback URL:**
  `https://[PROJECT_ID].supabase.co/auth/v1/callback`
  (Found in Supabase Dashboard -> Authentication -> URL Configuration)

* **Local/Development Application URL:**
  `http://localhost:3000` (or the AI Studio development environment URL)

* **Approved Production URL Placeholder:**
  `https://qwerty.com` (To be updated to the final production domain once live)

## 2. Configuration Steps

### A. In Google Cloud Console:
1. Navigate to APIs & Services > Credentials.
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Set **Authorized JavaScript origins** to your Local and Production URLs.
4. Set **Authorized redirect URIs** to the Supabase OAuth Callback URL.
5. Save the generated **Client ID** and **Client Secret**.

### B. In Supabase Dashboard:
1. Navigate to Authentication > Providers > Google.
2. Enable the Google provider.
3. Input the **Client ID** and **Client Secret** obtained from Google Cloud.
4. Save the configuration.

### C. Redirect URL Configuration (Supabase):
1. Navigate to Authentication > URL Configuration.
2. Ensure the Site URL is set to the primary application URL.
3. Add any necessary secondary URLs (like local development URLs) to the **Redirect URLs** list to allow sign-ins during development.

Once these steps are completed, the "Continue with Google" button in the QWERTY application will function correctly.
