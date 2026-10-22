# Lead Helper → Google Sheet

The Lead Helper on the marketing pages (`frontend/src/marketing/leadHelper/`) sends one event per
step to a Google Apps Script web app, which appends a row to the **Website Leads** tab of the
Growth Tracker sheet. Free, no backend.

## Columns
`timestamp, session_id, page_slug, page_type, industry, event, question, answer, quotes_per_day, current_method, visitor_type, source, device, referrer`

- `event`: `shown` (auto teaser appeared), `opened` (chat opened), `closed`, `hook_yes`, `hook_no`, `answered`, `whatsapp_click`, `download_click`, `toast_whatsapp_click` (download toast), `inline_whatsapp_click` (the line under each sample)
- `session_id`: random per page visit. One helper run = one session_id.
- `question`: `hook`, `quotes_per_day`, `current_method`, `result`, `download`, `end`, `teaser` / `toast` (closed), `page` (a download link on the page itself), `launcher` (launcher opened WhatsApp directly), `inline`. On `opened` rows, `answer` is `teaser` or `launcher`
- `visitor_type`: `owner`, `learning` ("No, just looking"), `unknown`
- `source`: `utm_source`, else referrer (`google`, `bing`, `chatgpt.com`, other host, `internal`), else `direct`
- `referrer`: origin only (e.g. `https://www.google.com`), never the full URL
- `timestamp`: set by the script, IST

## When the widget shows itself
- The launcher (round Q button, bottom-right) is on every public marketing page after load.
- Auto teaser: 7 s on the page AND the sample in view (or 40% scrolled). At most once per browser session, at most 2 per 7 days. None for 7 days after the teaser ×. Never again after a WhatsApp click (the launcher then opens WhatsApp directly).
- Download toast: after a template download on the page, once per session, not during the 7-day snooze.
- Answers are remembered in the browser; a returning visitor gets "Welcome back" and skips what they already answered.

## Deploy the script (one time)
1. Open the **Growth Tracker** Google Sheet.
2. **Extensions → Apps Script**.
3. Delete the sample code in `Code.gs` and paste the contents of [`Code.gs`](Code.gs) from this folder. Click **Save**.
4. Optional check: choose `testPost` in the function list and click **Run**. Allow access when asked.
   A **Website Leads** tab appears with a header row and one test row. Delete the test row.
5. **Deploy → New deployment**.
6. Click the gear next to "Select type" and choose **Web app**.
7. Description: `Lead Helper`. **Execute as: Me**. **Who has access: Anyone**.
8. Click **Deploy**, allow access if asked, then copy the **Web app URL** (ends in `/exec`).

## Turn it on in the site
In Vercel → Project → Settings → Environment Variables (Production):

| Name | Value |
|---|---|
| `VITE_LEAD_HELPER` | `on` |
| `VITE_LEAD_SHEET_URL` | the `/exec` URL from step 8 |

These are read at **build time**: redeploy after adding or changing them.
Kill switch: set `VITE_LEAD_HELPER` to `off` (or delete it) and redeploy.
Without `VITE_LEAD_SHEET_URL` the helper still works but logs nothing.

## Test the endpoint
```bash
curl -L -H "Content-Type: text/plain" \
  -d '{"session_id":"curl-test","page_slug":"home","page_type":"home","event":"shown","visitor_type":"unknown","source":"direct","device":"desktop"}' \
  "https://script.google.com/macros/s/XXXX/exec"
```
It prints `ok` and a row appears. A body with an unknown `event` also prints `ok` but adds no row.

## Changing the script later
Edit the code, then **Deploy → Manage deployments → ✏️ (edit) → Version: New version → Deploy**.
This keeps the same `/exec` URL. A "New deployment" gives a new URL that you would have to put in Vercel again.
