# Lead Helper → Google Sheet

The Lead Helper on the marketing pages (`frontend/src/marketing/leadHelper/`) sends one event per
step to a Google Apps Script web app, which appends a row to the **Website Leads** tab of the
Growth Tracker sheet. Free, no backend.

## Columns
`timestamp, session_id, page_slug, page_type, industry, event, question, answer, quotes_per_day, current_method, visitor_type, source, device, referrer, phone, visitor_id`

- `visitor_id`: one random id per browser (localStorage `qp_vid`), on **every** row from the website, the editor and the signup, so a visit can be followed to the account. `session_id` is still per page visit (Lead Helper) or per signup (funnel).

- `event`: `shown` (auto teaser appeared), `opened` (chat opened), `closed`, `hook_yes`, `hook_no`, `answered`, `whatsapp_click`, `download_click`, `toast_whatsapp_click` (download toast), `inline_whatsapp_click` (the line under each sample), `number_submitted` (visitor left their WhatsApp number at the end of the chat)
- Self-serve signup funnel events (same endpoint, raw tab only, `page_type` = `app`): `signup_started` (opened /signup; `answer` = traffic source), `signup_completed` (new account created with Google), `onboarding_step` (`question` = wizard step 1/2/3, `answer` = `done` or `skipped`), `first_quote_created`, `first_pdf_downloaded` (the last two once per browser, only for accounts made through the wizard). `source` is the `?src=` of the button used (`header`, `hero`, `pricing`, `final_cta`, `inline`, `page_cta`, `lead_helper`), else the traffic source; `industry` is the `?industry=` trade. `session_id` stays the same across the whole signup. **After changing `Code.gs`, redeploy the web app** (Deploy → Manage deployments → Edit → New version).
- Website editor funnel (raw tab only, `page_type` = `site`): `editor_opened` (editor shown), `editor_edited` (first change per page view), `save_click` (Download my PDF), `google_prompt_opened` (save dialog; `answer` = `anonymous` or `signed_in`), `google_prompt_closed` (`answer` = `dismissed`), `draft_imported` (`answer` = number of warnings), `item_added` (`answer` = `custom` or `suggested`), plus the Lead Helper's `signup_click`. In the signed-in app: `custom_pdf_whatsapp_click` (`answer` = where: `checklist`, `locked_page` or `saved_quotation`). `signup_completed` and `first_pdf_downloaded` (existing) close the loop. `industry` is the trade of the page.
- `session_id`: random per page visit. One helper run = one session_id.
- `question`: `hook`, `industry`, `current_method`, `quotes_per_day`, `result`, `download`, `end`, `teaser` / `toast` (closed), `page` (a download link on the page itself), `launcher` (launcher opened WhatsApp directly), `inline`. On `opened` rows, `answer` is `teaser` or `launcher`
- `visitor_type`: `owner`, `other_business` (another trade, after "No"), `needs_quote` ("I'm a customer"), `learning` ("Just learning"), `unknown`
- `phone`: only on `number_submitted` rows, as `+91XXXXXXXXXX`. This is personal data: share the sheet only with people who follow up leads.
- `source`: `utm_source`, else referrer (`google`, `bing`, `chatgpt.com`, other host, `internal`), else `direct`
- `referrer`: origin only (e.g. `https://www.google.com`), never the full URL
- `timestamp`: set by the script, IST

## Visitors tab (readable summary)
One row per visit (`session_id`), updated on every event:
`first_seen, last_seen, session_id, page_slug, industry, source, device, visitor_type, current_method, quotes_per_day, furthest_step, downloaded, whatsapp, phone, result`

- `furthest_step`: shown < opened < hook < current_method < quotes_per_day < result < end. It only moves forward, from the event type and from the `question` of any event (e.g. `closed` at `result` = reached result).
- `downloaded`: pdf / excel / word (each listed once). `whatsapp`: Yes / No.
- `result`: 🟢 WhatsApp lead > 📞 Number given > 📥 Downloaded only > 🔁 Returning, saw offer, left > 🟡 Answered, left at {step} > ⚪ Opened, no answer > Seen teaser only.
- 🔁 Returning: the visit's method / quotes came from memory (on opened, shown, closed… events) and no answer was given in this session. Marked with a note on the session_id cell.
- Events can reach the script out of order (each is a separate run), so the row is merged without depending on order: known answers are never blanked, and `unknown` never replaces a real visitor type.

## When the widget shows itself
- The launcher (round Q button, bottom-right) is on every public marketing page after load.
- Auto teaser: 7 s on the page AND the sample in view (or 40% scrolled). At most once per browser session, at most 2 per 7 days. None for 7 days after the teaser ×. Never again after a WhatsApp click (the launcher then opens WhatsApp directly).
- Download toast: after a template download on the page, once per session, not during the 7-day snooze.
- Answers are remembered in the browser; a returning visitor gets "Welcome back" and skips what they already answered.
- After a PDF download the chat ends with a "leave your number" box and the "Start free 7-day trial on WhatsApp" button (always last). A visitor who leaves a number gets no more auto teasers or toasts.

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
