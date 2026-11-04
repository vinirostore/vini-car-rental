# VINI CAR RENTAL — static hosting & Supabase setup

This site is plain HTML, CSS and browser JavaScript. It does not use a Node.js server, build step, npm runtime, or MilesWeb application slot. Supabase supplies the database, sign-in and image storage. Admin email OTP runs in a Supabase Edge Function; no server process runs on MilesWeb.

## 1. Create the Supabase project

1. Create a Supabase project and keep its database password private.
2. Open **SQL Editor**, paste in [`supabase/schema.sql`](./supabase/schema.sql), and run it. The script creates the catalogue, pricing, customers, bookings, enquiries and admin profiles tables; row-level security; RPCs; the confirmed-booking overlap constraint; and the public-read/admin-write `vehicle-photos` bucket. It also adds sample catalogue entries and a 5% service fee. Change sample vehicles, prices, copy and policies to reflect the actual VINI business before going live.
   - If you already ran an earlier version of this schema, run this permission update in the SQL Editor so public catalogue reads can evaluate the admin-only RLS policies:

     ```sql
     grant execute on function public.is_admin() to anon, authenticated;
     ```

     The function only reports whether the current signed-in user is an admin; it does not expose profile data.
3. In **Project Settings → API**, copy the **Project URL** and the **publishable key** (or legacy `anon` key). Put them in [`supabase-config.js`](./supabase-config.js). Never use a `service_role` / secret key in this file or anywhere in the website.
4. In **Authentication → URL Configuration**, set the production site URL and add the domain and any preview domain to the allowed redirect URLs. This site uses email/password sign-in only for an administrator; do not enable public sign-ups unless your operations specifically need them.
5. In **Authentication → Users**, create an account for each administrator. Copy its user UUID, then run this in the SQL Editor for each approved account:

   ```sql
   insert into public.profiles (id, role)
   values ('AUTH_USER_UUID', 'admin')
   on conflict (id) do update set role = 'admin';
   ```

   This privileged role assignment is intentionally not exposed through the public website. Use a strong unique password and enable MFA for admin accounts where available.

## 2. Require email OTP for admin sign-in

After the admin email/password is accepted, the portal sends a random six-digit one-time code to **vinirostore@gmail.com**. Admin database and storage access is denied until the code is verified. Codes expire in 10 minutes, can be used once, and allow at most six verification attempts. Each Supabase sign-in session is authorized for 30 minutes after email verification.

1. In your existing [Brevo](https://app.brevo.com/) account, open **Transactional → Senders, domains & dedicated IPs** and make sure the sender email address/domain you plan to use is verified. Open **SMTP & API → API Keys** and create/copy a Brevo API key. Keep it private.
2. In your existing Supabase project, open **SQL Editor**, paste in [`supabase/admin-email-mfa.sql`](./supabase/admin-email-mfa.sql), and run it. This adds the OTP, rate-limit and verified-session tables and changes database/storage admin policies to require completed email verification.
3. Deploy the Edge Function `supabase/functions/admin-email-otp/index.ts` as `admin-email-otp` to project `voqfeireufyayrslnpec`. Using the Supabase CLI from this project directory:

   ```text
   supabase login
   supabase link --project-ref voqfeireufyayrslnpec
   supabase functions deploy admin-email-otp
   ```

   Keep the function's default JWT verification enabled.
4. In Supabase **Edge Functions → Secrets**, add:

   | Secret name | Value |
   | --- | --- |
   | `BREVO_API_KEY` | Your Brevo API key |
   | `ADMIN_OTP_FROM_EMAIL` | The exact sender email address verified in Brevo |
   | `ADMIN_OTP_EMAIL` | `vinirostore@gmail.com` |
   | `ADMIN_OTP_HMAC_SECRET` | A random secret of at least 32 characters, generated privately |
   | `ADMIN_OTP_ALLOWED_ORIGINS` | `http://localhost:8080,https://YOUR-LIVE-DOMAIN` |

   Set `ADMIN_OTP_FROM_EMAIL` to the exact verified sender email in your Brevo account. Replace `https://YOUR-LIVE-DOMAIN` with the exact production origin (scheme and hostname, no trailing slash); add any `www` origin separately if used. Generate the HMAC secret locally with a password manager or a cryptographically secure generator, for example `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Do not share or commit it. Supabase provides its project URL and service-role key to Edge Functions automatically; do not put those secrets in browser files.
5. Reload the website, open `/#admin`, sign in, then check the admin mailbox (and spam folder) for the code. Each account is limited to 3 code sends and 6 code checks per 15 minutes.

Brevo availability, sending limits and sender-verification requirements depend on its current plan and account. Do not grant admin RLS access based only on the email/password login. The migration enforces the email OTP check at the database and Storage policy layer as well as in the portal UI.

## 3. Upload to MilesWeb

1. In cPanel File Manager, open the domain's document root (typically `public_html`). Alternatively, connect with FTP/SFTP.
2. Upload the contents of this folder, preserving the `supabase` directory:

   ```text
   index.html
   styles.css
   app.js
   supabase-config.js
   wordmark logo.png
   logo.png
   vini bg removed.png
   supabase/schema.sql
   ```

3. Ensure `index.html` is in the domain's document root and is readable by the web server. Open the domain over HTTPS and test the home, fleet, contact, booking and admin pages.
4. The Supabase JavaScript client and Google Fonts are loaded from their CDNs. For restrictive Content Security Policies, allow the Supabase project's HTTPS origin, `cdn.jsdelivr.net`, `fonts.googleapis.com`, `fonts.gstatic.com`, and `images.unsplash.com` (or self-host approved fonts and photographs).

## 4. Live booking behavior and operations

- The site calculates an estimate as daily rate × whole rental days plus the active `service_fee_percent` from `pricing`. The database recalculates and stores the quote and daily-rate snapshot; browser-submitted totals are never trusted.
- Submitting the reservation form opens WhatsApp at **+91 91048 81806**, with the vehicle, requested dates, location, customer contact, notes and estimated total prefilled. The guest must tap **Send** in WhatsApp to deliver the request. When Supabase is configured, a pending booking record and reference are created first and included in that message; without Supabase, the direct WhatsApp request still works.
- WhatsApp requests are not confirmed bookings and do not charge a payment method. An administrator reviews any saved pending request and confirms it in **Admin → Bookings**.
- PostgreSQL enforces a GiST exclusion constraint over confirmed vehicle date ranges. Concurrent attempts to confirm overlapping bookings cannot both succeed. Date ranges use `[pickup, return)`, so a car can be returned and re-rented on the same calendar date. A conflict is returned as an error in the admin dashboard; keep the conflicting request pending or cancel it.
- Guests can retrieve limited booking status and vehicle/date/total details using the random UUID reference returned at submission. Treat that reference like a private access token.
- The admin dashboard supports reservation status management, vehicle create/edit, daily price and availability changes, image uploads to Supabase Storage, and enquiry review. Admin data access and writes require an authenticated user whose role is assigned in `profiles`; database RLS is authoritative.
- The Contact enquiry form creates records in Supabase when credentials are configured. Reservation requests can always be composed and sent via WhatsApp; booking records and status lookup require Supabase.

## 5. Security and launch checklist

- Only use the project publishable/anon key in browser code. It is designed to be public; security comes from the SQL functions, grants and RLS policies.
- Keep the Supabase database password, service-role key and any secret API keys out of uploaded files, source control and browser developer tools.
- Review the sample fleet, rates, vehicle images, business email, service fee, rental terms, insurance/deposit requirements and legal/privacy notices before launch. The WhatsApp contact is configured to +91 91048 81806.
- Configure Supabase Auth email delivery, database backups, project billing/quotas and appropriate production domain restrictions. Monitor database and storage usage.
- Run a real end-to-end test: submit a request and send the prefilled WhatsApp message, check its UUID status, sign in as an admin, confirm it, try a conflicting date range (which must fail), then verify the approved status as a guest. Also test cancellation and contact enquiries.
- Configure any jurisdiction-specific privacy notice and consent requirements before collecting customer data. Data is retained in Supabase until your operations delete it.
- This implementation does not collect card data or take payment. Add a reputable payment provider and server-side payment verification before advertising payments or deposits as part of the checkout.

## Local preview

Open `index.html` directly for the no-backend catalogue preview, or serve this folder from any static web server. Live Supabase features require the setup above. No build command is needed.
