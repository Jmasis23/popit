# Popit

Turn a business's reviews — from Google, Yelp, Facebook, and Trustpilot —
into a social-proof popup for their landing page. A user enters their
business, Popit matches it on each platform they connect, pulls in reviews,
and generates a one-line `<script>` embed. Dropped onto any page,
`public/widget.js` shows a rotating "Joe says: ..." review toast in the
corner of the screen.

## How it works

1. **`/dashboard/new`** — business owner enters a landing page name/URL and
   (optionally) searches for their business on Google to connect it right
   away. They can skip and connect platforms later.
2. **`/dashboard/[id]?token=...`** — a private, token-protected manage page.
   Its "Review platforms" section lists Google (Places), Google Business
   Profile, Yelp, Facebook, and Trustpilot; each can be connected
   independently and has its own **enable switch** that controls whether
   that platform's reviews are shown in the popup, without disconnecting it:
   - **Google (Places)** / **Yelp** — search by business name + city, pick
     the right match. Public API-key lookups, no login needed; Google Places
     caps out at ~5 reviews per business.
   - **Google Business Profile** — a "Connect with Google" button that
     starts a real OAuth flow (`/api/sites/[id]/platforms/google_business_profile/oauth/start`
     → Google consent screen → `/api/oauth/google/callback`). Requires the
     business owner to sign in with the account that manages their listing;
     in exchange it can read the account's full review set rather than the
     ~5 Places gives you. Auto-picks the first account/location it finds —
     a business managing multiple locations would need a picker UI, which
     isn't built here.
   - **Trustpilot** — enter the business's website domain; looked up via the
     Trustpilot Business Units API.
   - **Facebook** — paste a Page ID and a Page Access Token (generated from
     Meta's Graph API Explorer). A full "Login with Facebook" connect flow
     isn't wired up because it requires Meta App Review before it works for
     users other than the app's own testers — this is the pragmatic
     workaround for an MVP.
3. Each connected platform's reviews (4-5 star only) are cached in the
   database via Prisma, tagged with their source platform. "Refresh" re-syncs
   a single platform on demand (and silently rotates the Google Business
   Profile access token using its stored refresh token).
4. The owner pastes `<script src=".../widget.js" data-site="..." async>` on
   their site. `widget.js` fetches `/api/widget/reviews/[siteId]` (public,
   CORS-enabled, cached), which aggregates reviews from every **enabled**
   platform connection and shuffles them, and rotates through review toasts
   labeled with their source ("✓ Verified Yelp review").

There's no login system for this MVP — each site's manage link contains a
random token that acts as the access key, similar to how private sharing
links work elsewhere. Don't share the `?token=` URL publicly.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set whichever platform keys you plan to use — none are
required to run the app, only to connect that specific platform:

- `DATABASE_URL` — defaults to a local SQLite file, fine for development.
- `GOOGLE_PLACES_API_KEY` — Google Cloud API key with the **Places API**
  enabled. https://console.cloud.google.com/apis/credentials
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` — OAuth client for
  the **Google Business Profile** connection, with a redirect URI of
  `{your app origin}/api/oauth/google/callback` and the Business Profile
  APIs enabled. Note: production access to those APIs requires applying to
  Google (https://support.google.com/business/answer/9053347); without
  approval this only works for accounts added as test users on the OAuth
  consent screen.
- `YELP_API_KEY` — Yelp Fusion API key. Note: Yelp's public API only returns
  up to 3 short review excerpts (~150 chars) per business, not full reviews.
  https://www.yelp.com/developers/v3/manage_app
- `TRUSTPILOT_API_KEY` — Trustpilot Business API key.
  https://developers.trustpilot.com/
- Facebook needs no server-side key; the business owner supplies their own
  Page ID + Page Access Token per site when connecting.

Then set up the database and start the dev server:

```bash
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000.

## Data model

- `Site` — a customer's landing page: name, URL, popup position/interval,
  and access `token`.
- `PlatformConnection` — one row per `(site, platform)` pair: the platform's
  external id (Google placeId / Yelp business id / Facebook page id /
  Trustpilot business unit id / Business Profile "accountId/locationId"),
  cached rating, OAuth tokens for Google Business Profile, and an `enabled`
  flag that controls whether it feeds the widget.
- `Review` — cached reviews belonging to a `PlatformConnection`, refreshed on
  demand via that platform's "Refresh" button.

## Production notes

This is an MVP scaffold, not yet production-hardened:

- No rate limiting on `/api/platforms/search` or `/api/sites` — add before
  public launch to avoid API cost abuse.
- SQLite is fine for a single instance; move to Postgres (swap the Prisma
  datasource) before scaling past one server.
- Token-based access instead of real auth is intentionally minimal for
  MVP speed — revisit if the product needs team accounts, billing, or
  audit trails.
- Facebook Page Access Tokens are stored as plaintext in the database;
  encrypt at rest before handling real customer credentials.
- A real Facebook OAuth connect flow would need Meta App Review — the
  paste-your-own-token approach here is a stopgap.
- Google Business Profile OAuth tokens are stored as plaintext in the
  database; encrypt at rest before handling real customer credentials.
- The Business Profile connect flow auto-picks the first account/location;
  add a picker before shipping to businesses with multiple locations.
