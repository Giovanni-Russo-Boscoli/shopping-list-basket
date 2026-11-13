# Basket setup (one time, about 10 minutes)

## 1. Supabase (the database)
1. Go to https://supabase.com and click **Start your project**. Sign in with GitHub.
2. **New project**: name `basket`, region **West EU (Ireland)**, click **Generate a password** (save it in your password manager; Claude never needs it), plan **Free**. Create.
3. When it's ready, open **SQL Editor > New query**, paste the whole of `supabase/schema.sql`, click **Run**. You should see "Success".
4. **Authentication > Sign In / Providers > Email**: keep **Allow new users to sign up** on, and turn **Confirm email** off (Supabase's free email service only delivers to the project's own team, so confirmation emails would never arrive).
5. **Project Settings > API Keys** (or **Data API**): copy the **Project URL** and the **publishable** key into `config.js`.
These are safe to share (the app ships them to every phone). Never send the database password or the `service_role` key.

## 2. GitHub (hosting)
1. Create an empty **public** repository (e.g. `basket`) and tell Claude its name.
2. After Claude pushes the code: repository **Settings > Pages > Build and deployment > Source: Deploy from a branch**, branch `main`, folder `/ (root)`, Save.
   The app appears at `https://<your-github-name>.github.io/basket/` about a minute later.

## 3. Phones
- **iPhone**: open the link in Safari, tap Share > **Add to Home Screen**.
- **Android**: open the link in Chrome, tap the menu > **Install app** (or Add to Home screen).
Open it from the home screen, enter the household password, pick your name.

## 4. Accounts and households (one time)
Supabase > **SQL Editor**: paste `supabase/004_accounts.sql`, click **Run**. The result shows the **invite code** of the household holding the existing list: create your account in the app, choose **Join**, and paste that code.

## 4b. Photos (one time)
Supabase > **SQL Editor**: paste `supabase/002_photos.sql`, click **Run**.

## 5. Notifications (one time, about 5 minutes)
1. Supabase > **Edge Functions** > **Deploy a new function** > **Via Editor**.
2. Name it exactly `notify`. Replace all the sample code with the contents of `supabase/functions/notify/index.ts`. Click **Deploy function**.
3. Open the function's **Details** (or **Settings**) tab, turn **off** "Verify JWT with legacy secret" / "Enforce JWT verification", and save.
4. Supabase > **SQL Editor**: paste `supabase/003_notifications.sql`, click **Run**.
5. On each phone: open Basket **from the Home Screen icon** (iPhone needs this), go to **Settings > Notifications > Turn on**, and allow.
