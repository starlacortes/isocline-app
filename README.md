# isocline.app

The public site for Isocline: four static pages and one small endpoint, served by Cloudflare Pages. There is no build step, and the pages make no request to any other origin.

| Path | What it is |
|---|---|
| `public/` | Everything Pages serves as-is: Home, `privacy/`, `support/`, `404.html`. |
| `public/assets/site.css` | Layout and type. Every color comes from the tokens. |
| `public/assets/plates.js` | The moving designs behind the wordmark: 60 scenes, about two minutes per loop. |
| `public/assets/notify.js` | Sends the launch-notice form in place. The form also works without it. |
| `public/tokens/`, `public/brand/`, `public/favicon.svg` | **Generated from the app repo. Do not edit by hand.** |
| `public/fonts/` | The same font files the app bundles, with their licenses. |
| `public/_headers`, `public/_redirects` | Security headers, caching and redirects. |
| `functions/api/notify.js` | `POST /api/notify`: saves one email address. Stores the address and the time, nothing else. |
| `schema.sql` | The one table that holds those addresses. |
| `wrangler.jsonc` | Pages configuration: output folder and the database binding. |

## Where the design comes from

Colors, type families, the wordmark outline and the favicon are generated from the app repo (`xT`), so the site and the app cannot drift. After changing `docs/design/tokens/isocline.tokens.json` or the logo masters there, run, from the app repo:

```sh
ISOCLINE_SITE_DIR=../isocline-app/public python3 -I tools/scripts/gen_isocline_tokens.py
```

and commit the result here. That rewrites `public/tokens/isocline.css`, `public/brand/isocline-wordmark.svg`, `public/favicon.svg` and the `theme-color` values in each page.

## Before the first deploy

1. Fill in the bracketed placeholders. This lists every one:

   ```sh
   grep -rn "\[[A-Z][A-Z :]*\]" public --include="*.html"
   ```

2. Create the database table (the database `isocline-notify` already exists in your account):

   ```sh
   npx wrangler login
   npx wrangler d1 execute isocline-notify --remote --file=schema.sql
   ```

3. In the Cloudflare dashboard, create a Pages project connected to this repository: no framework, no build command, output directory `public`. The database binding is read from `wrangler.jsonc`.
4. Add `isocline.app` as a custom domain on the Pages project. The zone is already on Cloudflare, so the DNS record is created for you.
5. Turn on Email Routing for `isocline.app` and forward `support@isocline.app` to your inbox.
6. In App Store Connect, set the privacy policy URL to `https://isocline.app/privacy` and the support URL to `https://isocline.app/support`.

After that, every push to `main` deploys.

## Reading and clearing the list

```sh
npx wrangler d1 execute isocline-notify --remote --command "SELECT email, created_at FROM notify ORDER BY created_at"
npx wrangler d1 execute isocline-notify --remote --command "DELETE FROM notify"
```

The privacy page promises the addresses are deleted once the launch notice has gone out.

## Running it locally

```sh
npx wrangler d1 execute isocline-notify --local --file=schema.sql
npx wrangler pages dev
```

Add `#s=12` to a page address to start the plates at scene 12, and `#hold` to freeze them.
