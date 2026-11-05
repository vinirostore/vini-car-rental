# VINI CAR RENTAL — static hosting & Supabase setup

This site is plain HTML, CSS and browser JavaScript. It does not use a Node.js server, build step, npm runtime, or MilesWeb application slot. Supabase supplies the database, email/password sign-in and image storage.

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

## 2. Use email/password for admin sign-in

The admin portal signs in with the email and password for an account created under **Authentication → Users**. The account must have `role = 'admin'` in `public.profiles`; there is no public admin sign-up. Admin database and Storage policies check this role directly.

If you previously enabled email OTP for this project, run [`supabase/admin-password-only.sql`](./supabase/admin-password-only.sql) in the Supabase **SQL Editor**. This restores role-based admin access for the database and vehicle-photo storage. Then deploy the updated `app.js` with your website. The old OTP tables can remain unused.

The previously deployed `admin-email-otp` Edge Function is no longer called by the site. You may delete it from **Edge Functions → `admin-email-otp`** and remove the `BREVO_API_KEY` and `ADMIN_OTP_*` custom secrets if they are no longer used elsewhere. Do not remove Supabase's default secrets.

Use a strong, unique password for each administrator. Password-only sign-in is less secure than adding a second verification factor.

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
