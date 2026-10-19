# Play Store listing

The Android app is the website in a Trusted Web Activity (made with PWABuilder): it always shows the live site, so
there's nothing to update in the store when the site changes. Steps to build and upload are in the README under
"Play Store (Android)". This page has everything the listing asks for.

## You need
- A Google Play developer account (one-time fee) and the live site on your domain with HTTPS.
- In Vercel: `ANDROID_PACKAGE_NAME` and `ANDROID_SHA256_CERT` after Play App Signing is set up, then redeploy.
  Check `https://your-domain.in/.well-known/assetlinks.json` shows them (without this the app shows a browser bar).

## Store listing
- **App name:** Eliphas Indicus Publications
- **Short description** (80 characters max):
  Publish your book in print, and discover Hindi and English books.
- **Full description:**

  Eliphas Indicus Publications is a print-on-demand bookstore and publishing platform for independent authors in India.

  For readers
  • Discover books by independent authors in Hindi and English
  • Read a free sample before you buy
  • Order in print: every copy is printed when you order and delivered to your door
  • Track your order and get updates when it ships
  • Follow authors, read articles and join the community

  For authors
  • Publish your book in print with no upfront printing cost
  • See exactly what you earn per copy before you publish
  • Track sales, earnings and payouts
  • Every edition gets an Eliphas Edition ID and QR code
  • Optional help with covers, formatting and launch creatives

  Payments are handled securely by Razorpay. Log in with your mobile number.

- **Category:** Books & Reference. **Tags:** books, publishing, reading.
- **Contact email / website / privacy policy:** your support email, `https://your-domain.in`, `https://your-domain.in/privacy`.

## Graphics
- **App icon (512×512):** `public/icons/icon-512.png`
- **Feature graphic (1024×500):** `docs/store/feature-graphic.png`
- **Phone screenshots:** `public/screenshots/phone-home.webp`, `phone-book.webp`, `phone-dashboard.webp` (780×1688).
  They currently show the sample books. Retake them once real books are live: run the store screenshot script
  against the live site, or take phone screenshots yourself (at least 2, portrait).

## Data safety (answers that match the app)
- **Data collected:**
  - Personal info: name, phone number, email (optional), city/state/PIN code and delivery address (for orders).
  - Financial info: purchase history. Card/UPI details are entered with Razorpay and never stored by Eliphas.
  - Photos: profile photo (optional). Files: manuscripts and covers uploaded by authors.
  - App activity: books, articles, posts, comments and reviews you create.
- **Shared with third parties:** Razorpay (payments), the printer (name, phone and address to deliver the order),
  Resend (email delivery, if you turn on order emails), Supabase and Vercel (hosting).
- **Not collected:** location from the device, contacts, advertising ID. No ads and no analytics trackers.
- **Encrypted in transit:** yes (HTTPS). **Users can request deletion:** yes, in the app: Settings & help → Delete
  account (`https://your-domain.in/account/profile`).

## Content rating
Fill the questionnaire honestly: user-generated content (community posts, articles, reviews) with reporting and
moderation; no violence, gambling or ads. Purchases of physical goods.

## iPhone
There's no separate App Store app. iPhone users add the site to the Home Screen from Safari (Share → Add to Home
Screen); it opens full screen with the Eliphas icon and launch screen. A native App Store app would need a Mac and a
wrapper such as Capacitor, and Apple often rejects apps that only show a website.
