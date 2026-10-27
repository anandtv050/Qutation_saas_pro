// Browser end-to-end for the website quotation editor, no dependencies (Chrome/Edge over DevTools, Node 22).
// One clear flow: edit a quotation -> "Download PDF — free" -> save dialog -> new account (no print settings written)
// -> quotation page with a Download PDF button -> a real PDF in the default look.
// At 390x844 (mobile) and 1366x850 (desktop). Google itself cannot be automated: the import runs through the
// signed-in path with a throw-away user made like a first Google sign-in (see e2e_browser_user.py).
//
//   1. API on :5000 + frontend dev server on :5173    2. from backend/:  node tests/e2e_editor.mjs [screenshot-dir]
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, "..");
const SHOTS = process.argv[2] || path.join(os.tmpdir(), "quotely-editor-e2e");
const SITE = "http://localhost:5173";
const API = "http://localhost:5000";
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error("Chrome/Edge not found");
fs.mkdirSync(SHOTS, { recursive: true });
const { INDUSTRY_PAGES } = await import(pathToFileURL(path.resolve(BACKEND, "../frontend/src/marketing/pages.js")).href);
const PAGE = "/electrical-work-quotation-format";
const NAMES = (slug) => INDUSTRY_PAGES.find((p) => p.slug === slug).sample.items.map((i) => i.name);

const venvPy = path.join(BACKEND, "venv/Scripts/python.exe");
const py = (...a) => execFileSync(venvPy, a, { cwd: BACKEND, encoding: "utf8" }).trim().split("\n").pop();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let intFail = 0;
const check = (ok, msg) => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`);
  if (!ok) intFail++;
};

async function launch(port, userDir) {
  const proc = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`, "--headless=new", "--no-first-run", "--disable-gpu", "about:blank"], { stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    try {
      const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
      if (page) return { proc, wsUrl: page.webSocketDebuggerUrl };
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error("browser did not start");
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((res) => (this.ws.onopen = res));
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) {
        const { res, rej } = this.pending.get(d.id);
        this.pending.delete(d.id);
        d.error ? rej(new Error(d.error.message)) : res(d.result);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed");
    return r.result.value;
  }
}

async function until(cdp, expr, what, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if (await cdp.eval(expr)) return true;
    } catch {
      /* navigating */
    }
    await sleep(200);
  }
  throw new Error(`timed out waiting for: ${what}`);
}

const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const qa = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})]`;
const setVal = (sel, value, nth = 0) =>
  `(()=>{const el=document.querySelectorAll(${JSON.stringify(sel)})[${nth}];if(!el)return false;const set=Object.getOwnPropertyDescriptor(el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set;set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));return true})()`;
const click = (sel, nth = 0) => `(()=>{const el=document.querySelectorAll(${JSON.stringify(sel)})[${nth}];if(!el)return false;el.click();return true})()`;
const visible = (sel) => `${qa(sel)}.filter((e)=>{const r=e.getBoundingClientRect();return e.offsetParent!==null&&r.width>0&&r.height>0})`;
const inViewport = (sel) => `${qa(sel)}.filter((e)=>{const r=e.getBoundingClientRect();return e.offsetParent!==null&&r.width>0&&r.bottom>0&&r.top<innerHeight})`;

// bring the editor card to the top (the phone's sticky button only shows while the card is in view)
const toEditor = (cdp) => cdp.eval("window.scrollTo(0, document.querySelector('[data-qe=editor]').getBoundingClientRect().top + scrollY - 70)").then(() => sleep(250));

async function shot(cdp, name) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(data, "base64"));
}
async function api(token, route, body) {
  const r = await fetch(API + route, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}
// the suggestions the open "+ Add item" sheet shows
const sheetNames = (cdp) => cdp.eval(`${qa("[data-qe=sheet-items] li button span:first-child")}.map(e=>e.textContent.trim())`);

async function run(label, w, h, mobile, port) {
  console.log(`\n== ${label} ${w}x${h} ==`);
  const { token, userInfo } = JSON.parse(py("tests/e2e_browser_user.py", "create"));
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-ed-"));
  const dlDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-eddl-"));
  const { proc, wsUrl } = await launch(port, userDir);
  const cdp = new Cdp(wsUrl);
  await cdp.ready;
  const tag = label.toLowerCase();
  const strSave = mobile ? "save-mobile" : "save";
  try {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dlDir });
    const go = async (p) => {
      await cdp.send("Page.navigate", { url: SITE + p });
      await until(cdp, `document.readyState==='complete'`, "page load");
    };

    // ---------------- homepage ----------------
    console.log("A. Homepage");
    await go("/");
    await cdp.eval("try{localStorage.clear();sessionStorage.clear()}catch(e){}");
    await go("/");
    await until(cdp, `!!${q("[data-qe=editor]")}`, "homepage editor");
    await sleep(600);
    const strHomeText = await cdp.eval("document.body.innerText");
    check(strHomeText.includes("Make your quotation — free ↓"), "hero has the one button: 'Make your quotation — free ↓'");
    check(!/Plans from|Try it now|Questions\? Chat on WhatsApp|Start free trial/.test(strHomeText.split("How it works")[0] || ""), "hero has no price line, 'Try it now', second trial button or WhatsApp line");
    const lstH2 = await cdp.eval(`${qa("main h2")}.map(e=>e.textContent.trim())`);
    const lstOrder = [/for every small business/i, /how it works/i, /everything you need/i, /quotation in seconds with ai/i, /already use vyapar/i, /quotation formats by industry/i, /simple pricing/i, /frequently/i, /send your next quotation/i];
    const lstIdx = lstOrder.map((rx) => lstH2.findIndex((t) => rx.test(t)));
    check(lstIdx.every((i, k) => i >= 0 && (k === 0 || i > lstIdx[k - 1])), `homepage order after the editor: who it's for → how it works → features → AI → Vyapar/Zoho → industries → pricing → FAQ → final (${lstIdx.join(",")})`);
    check((await cdp.eval(`${qa("#industries a[href^='/']")}.length`)) >= 19 && (await cdp.eval(`${qa("#billing-software a[href^='/']")}.length`)) === 4, "industries grid links all 15 formats + guides; the Vyapar/Zoho/myBillBook/Excel section links the 4 comparisons");
    check(!(await cdp.eval(`${qa("#who a, #ai a, #billing-software a, #industries a")}.some(a=>/wa\\.me|^\\/signup/.test(a.getAttribute('href')))`)) && (await cdp.eval(`${qa("main section button, main section a[href='#quote-editor']")}.length`)) >= 2, "restored sections have no WhatsApp or /signup buttons; the buttons scroll to the editor");
    check(!/Plans from/.test(await cdp.eval(`${q("main")}.innerText.split("Simple pricing")[0]`)), "pricing text appears only in the pricing section");
    check((await cdp.eval(`${qa("[data-qe=trades] button")}.length`)) === 6 && (await cdp.eval(`${q("[data-qe=more-trades]")}.options.length`)) === 10, "6 trade chips + a 'More ▾' dropdown with the other 9");
    check(!(await cdp.eval(`!!${q("[data-lead-helper]")}`)), "no Lead Helper launcher, teaser or toast");
    check(!(await cdp.eval(`performance.getEntriesByType('resource').some(r=>/LeadHelper(?!Mount)/.test(r.name))`)), "the Lead Helper chunk is never requested");
    check((await cdp.eval(`${qa("a[href*='wa.me']")}.every(a=>!!a.closest('footer'))`)), "WhatsApp appears only in the footer");
    check((await cdp.eval(`${qa("footer a[href*='wa.me']")}.map(a=>a.textContent.trim()).join('|')`)).includes("Need help? Chat on WhatsApp"), "footer link reads 'Need help? Chat on WhatsApp'");
    check((await cdp.eval(`${qa("header a")}.map(a=>a.textContent.trim()).filter(Boolean).join('|')`)).endsWith("Sign in|Try free"), "header: 'Sign in' + 'Try free'");
    // The faithful preview is tall, so on desktop the editor's own button (top of the preview column) can peek
    // into the first screen next to the hero's scroll button; on a phone only the hero button is in view.
    check((await cdp.eval(`${inViewport("button,a")}.filter(e=>/Make your quotation/.test(e.textContent)).length`)) === 1 && (await cdp.eval(`${inViewport("button,a")}.filter(e=>/Download PDF — free/.test(e.textContent)).length`)) <= (mobile ? 0 : 1), "only one hero button in view at the top of the homepage (plus the editor's button on desktop)");
    await shot(cdp, `${tag}-home-top`);
    await cdp.eval(`${q("a[href='#quote-editor']")}.click()`);
    await sleep(1200);
    check((await cdp.eval(`${q("#quote-editor")}.getBoundingClientRect().top`)) < 120, "the hero button scrolls to the editor");
    check((await cdp.eval(`${inViewport("button,a")}.filter(e=>/Download PDF — free|Make your quotation/.test(e.textContent)).length`)) === 1, "once at the editor, still exactly one primary action in view");
    await shot(cdp, `${tag}-home-editor`);
    // every trade on the homepage gets its own suggestions
    let blnAllTradesOk = true;
    const lstSlugs = INDUSTRY_PAGES.map((p) => p.slug);
    for (const slug of lstSlugs) {
      const blnChip = await cdp.eval(`(()=>{const label=${JSON.stringify(INDUSTRY_PAGES.find((p) => p.slug === slug).navLabel)};const chips=${qa("[data-qe=trades] button")};const c=chips.find(b=>b.textContent.trim()===({'cctv':'CCTV','solar-installation':'Solar','electrical-work':'Electrical','ac-installation-service':'AC','interior-design':'Interior','event-management':'Events'})[${JSON.stringify(slug.replace("-quotation-format", ""))}]);if(c){c.click();return true}return false})()`);
      if (!blnChip) await cdp.eval(setVal("[data-qe=more-trades]", slug));
      await sleep(120);
      if (mobile) await cdp.eval(click("[data-qe=tab-edit]"));
      await cdp.eval(click("[data-qe=add-item]"));
      await until(cdp, `!!${q("[data-qe=sheet]")}`, "sheet");
      const names = await sheetNames(cdp);
      const mine = new Set(NAMES(slug));
      if (!names.length || !names.every((n) => mine.has(n))) {
        blnAllTradesOk = false;
        console.log(`     wrong suggestions for ${slug}: ${names.slice(0, 3)}`);
      }
      await cdp.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`);
      await sleep(80);
    }
    check(blnAllTradesOk, "homepage: suggestions match the selected trade for all 15 trades (6 chips + More)");

    // ---------------- industry page ----------------
    console.log("B. Electrical page");
    await go(PAGE);
    await until(cdp, `!!${q("[data-qe=editor]")}`, "editor");
    await sleep(500);
    check(!(await cdp.eval(`!!${q("[data-qe=trades]")}`)), "no trade chips (the trade is preset by the page)");
    const strPageText = await cdp.eval("document.body.innerText");
    check(!/Edit full quotation|Free Excel|Your sign-in email prints|Plans from|Questions\? Chat/.test(strPageText), "no 'Edit full quotation', 'Free Excel/PDF', sign-in-email note, price line or WhatsApp help");
    check((await cdp.eval(`${qa("a[download]")}.length`)) === 3 && (await cdp.eval(`!!${q("[data-qe=blank-format]")}`)), "exactly ONE blank-format line with Excel · Word · PDF (3 download links)");
    const iEditor = await cdp.eval(`${q("[data-qe=editor]")}.getBoundingClientRect().top + scrollY`);
    const iIntro = await cdp.eval(`${qa("article p")}.find(p=>p.textContent.includes('Electrical work is one of the hardest'))?.getBoundingClientRect().top + scrollY`);
    check(iEditor < iIntro, "order: H1 + one line → editor → guide content");
    check((await cdp.eval(`${inViewport("button,a")}.filter(e=>/Download PDF — free/.test(e.textContent)).length`)) === 1, "one primary action in view");
    check(!(await cdp.eval(`document.documentElement.scrollWidth > innerWidth + 1`)), "no horizontal scroll");
    await shot(cdp, `${tag}-electrical-top`);
    if (mobile) {
      check((await cdp.eval(`${q("[data-qe=tab-edit]")}.getAttribute('aria-selected')`)) === "true" && !(await cdp.eval(`${visible("[data-qe=preview]")}.length`)), "mobile: 'Edit' tab is selected, the preview is hidden");
      await shot(cdp, `${tag}-editor-edit-tab`);
      await cdp.eval(click("[data-qe=tab-preview]"));
      check((await cdp.eval(`${visible("[data-qe=preview]")}.length`)) === 1 && !(await cdp.eval(`${visible("[data-qe=form]")}.length`)), "mobile: 'Preview' tab shows the preview");
      await shot(cdp, `${tag}-editor-preview-tab`);
      await cdp.eval(click("[data-qe=tab-edit]"));
    } else {
      const rF = await cdp.eval(`${q("[data-qe=form]")}.getBoundingClientRect().toJSON()`), rP = await cdp.eval(`${q("[data-qe=preview-col]")}.getBoundingClientRect().toJSON()`);
      check(rP.left > rF.right - 5 && Math.abs(rP.top - rF.top) < 20, "desktop: form on the left, preview on the right, side by side");
      await shot(cdp, `${tag}-editor-side-by-side`);
    }

    // trade preset suggestions, "Type your own item" first, search
    await cdp.eval(click("[data-qe=add-item]"));
    await until(cdp, `!!${q("[data-qe=sheet]")}`, "sheet");
    check((await cdp.eval(`${q("[data-qe=sheet] [data-qe=sheet-custom]")}.textContent`)).includes("Type your own item"), "sheet: 'Type your own item' is on top");
    const lstSug = await sheetNames(cdp);
    check(lstSug.length > 0 && lstSug.every((n) => NAMES("electrical-work-quotation-format").includes(n)), `sheet suggestions are all electrical items (${lstSug.length})`);
    await cdp.eval(setVal("[data-qe=sheet-search]", "mcb"));
    await sleep(150);
    check((await sheetNames(cdp)).every((n) => /mcb/i.test(n)), "sheet search filters the list");
    await cdp.eval(setVal("[data-qe=sheet-search]", ""));
    await sleep(100);
    const nBefore = await cdp.eval(`${qa("[data-qe=item]")}.length`);
    await cdp.eval(`${q("[data-qe=sheet-items] li button")}.click()`);
    await sleep(200);
    check((await cdp.eval(`${qa("[data-qe=item]")}.length`)) === nBefore + 1 && !(await cdp.eval(`!!${q("[data-qe=sheet]")}`)), "picking a suggestion adds a row and closes the sheet");
    await cdp.eval(click("[data-qe=add-item]"));
    await until(cdp, `!!${q("[data-qe=sheet]")}`, "sheet again");
    await cdp.eval(setVal("[data-qe=sheet-search]", "Site visit and testing"));
    await cdp.eval(click("[data-qe=sheet-custom]"));
    await sleep(250);
    check((await cdp.eval(`${qa("[data-qe=item] input")}.some(i=>i.value==='Site visit and testing')`)), "'Add \"…\" as your own item' adds a row with that name");

    // the stale-suggestions bug: client-side navigation printing -> electrical
    // (the draft keeps the visitor's items; the suggestions must follow the page)
    // fields
    await cdp.eval(setVal("[data-qe=business]", "sree electricals"));
    await cdp.eval(setVal("[data-qe=customer]", "Ramesh Kumar"));
    check(!(await cdp.eval(`!!${q("[data-qe=phone]")}`)), "phone is collapsed under '+ phone'");
    await cdp.eval(click("[data-qe=show-phone]"));
    await cdp.eval(setVal("[data-qe=phone]", "9876543210"));
    await cdp.eval(`(()=>{const it=document.querySelectorAll("[data-qe=item]")[0];const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;const r=it.querySelector('input[aria-label="Rate in rupees"]');set.call(r,"1000");r.dispatchEvent(new Event('input',{bubbles:true}));const qy=it.querySelector('input[aria-label="Quantity"]');set.call(qy,"2");qy.dispatchEvent(new Event('input',{bubbles:true}));it.querySelector('button[aria-label="Increase quantity"]').click();})()`);
    await cdp.eval(`document.querySelectorAll("[data-qe=item]")[1].querySelector('button[aria-label^="Remove item"]').click()`);
    const dblExpected = await cdp.eval(`(()=>{let t=0;document.querySelectorAll("[data-qe=item]").forEach(it=>{t+=(Number(it.querySelector('input[aria-label="Quantity"]').value)||0)*(Number(it.querySelector('input[aria-label="Rate in rupees"]').value)||0)});return t})()`);
    check((await cdp.eval(`${q("[data-qe=form-total]")}.textContent`)).trim() === `Rs. ${dblExpected.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, "live total updates with qty, rate, add and remove");
    // preview = the real default PDF (default colours, all six default columns, no colour picker)
    if (mobile) await cdp.eval(click("[data-qe=tab-preview]"));
    await sleep(150);
    check(!(await cdp.eval(`!!${q("[data-qe=colours]")}`)), "no colour swatches in the editor");
    check((await cdp.eval(`getComputedStyle(${q("[data-qe=preview-head]")}).backgroundColor`)) === "rgb(30, 58, 95)" && (await cdp.eval(`getComputedStyle(${q("[data-qe=preview-title]")}).color`)) === "rgb(27, 42, 74)", "preview uses the default PDF colours (navy #1B2A4A, table header #1E3A5F)");
    check((await cdp.eval(`[...${qa("[data-qe=preview-head] th")}].map((t) => t.textContent.trim()).join('|')`)) === "Item Code|Item|Unit|Qty|Unit Price|Amount", "preview shows the six default PDF columns, Item Code first");
    check(!/more item/.test(await cdp.eval(`${q("[data-qe=preview]")}.innerText`)), "preview has no '+N more'");
    check((await cdp.eval(`${qa("[data-qe=preview-row]")}.length`)) === (await cdp.eval(`${qa("[data-qe=item]")}.length`)) && /Rs\./.test(await cdp.eval(`${q("[data-qe=preview]")}.innerText`)) && !/₹|GST/.test(await cdp.eval(`${q("[data-qe=editor]")}.innerText`)), "preview shows every item, in Rs., with no GST");
    if (mobile) await cdp.eval(click("[data-qe=tab-edit]"));
    await sleep(700);
    const objDraft = JSON.parse(await cdp.eval(`localStorage.getItem('qp_draft')`));
    check(objDraft?.business === "sree electricals" && objDraft.dirty, "draft is saved in localStorage");

    // ---------------- save dialog, anonymous ----------------
    console.log("C. Save dialog");
    await cdp.eval(setVal("[data-qe=customer]", ""));
    await toEditor(cdp);
    await cdp.eval(click(`[data-qe=${strSave}]`));
    await until(cdp, `!!${q("[data-qe=modal]")}`, "save dialog");
    check(!!(await cdp.eval(`${q("[data-qe=m-customer]")}!==null`)), "dialog asks for the missing customer name");
    await cdp.eval(setVal("[data-qe=m-customer]", "Ramesh Kumar"));
    await until(cdp, `!!document.querySelector('iframe[src*="accounts.google.com/gsi/button"]')`, "Google button");
    check(true, "'Continue with Google' is shown");
    check(!/Download plain format|WhatsApp/.test(await cdp.eval(`${q("[data-qe=modal]")}.innerText`)), "the dialog has only Continue with Google and the × (no plain-format link, no WhatsApp line)");
    await sleep(800);
    await shot(cdp, `${tag}-google-modal`);
    await cdp.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`);

    // ---------------- save into a new account ----------------
    console.log("D. New account");
    await cdp.eval(`localStorage.setItem('access_token', ${JSON.stringify(token)}); localStorage.setItem('userInfo', ${JSON.stringify(JSON.stringify(userInfo))}); true`);
    await go(PAGE);
    await until(cdp, `!!${q("[data-qe=editor]")}`, "editor (signed in)");
    await toEditor(cdp);
    await cdp.eval(click(`[data-qe=${strSave}]`));
    await until(cdp, `!!${q("[data-qe=modal-save]")}`, "signed-in save button");
    await cdp.eval(click("[data-qe=modal-save]"));
    await until(cdp, `location.pathname.startsWith('/quotations/edit/') && !!${q("[data-qe=saved-banner]")}`, "saved quotation page", 40000);
    const intQ = Number((await cdp.eval(`location.pathname`)).split("/").pop());
    check(!!(await cdp.eval(`!!${q("[data-qe=download-pdf]")}`)) && (await cdp.eval(`${q("[data-qe=saved-toast]")}.innerText`)).includes("Saved to your account"), "lands on the quotation with a big Download PDF button and the toast");
    await shot(cdp, `${tag}-saved-quotation`);
    check((await cdp.eval(`${q("[data-qe=saved-banner]")}.innerText.includes('Want your logo on it? Chat with our team')`)) && (await cdp.eval(`decodeURIComponent(${q("[data-qe=custom-pdf-saved]")}.href).startsWith("https://wa.me/918848644935?text=Hi, I'd like to add my logo / customise my quotation PDF. My account: zz-e2e-browser@example.com")`)), "saved banner: small 'Want your logo on it? Chat with our team' line under Download PDF");
    const objQ = await api(token, "/quotation/get", { intQuotationId: intQ });
    check(objQ.data?.strCustomerName === "Ramesh Kumar" && objQ.data?.strCustomerPhone === "9876543210" && (objQ.data?.lstItems || []).length >= 5, "quotation saved: customer, phone and its lines");
    const objPs = await api(token, "/print-settings/get", { vchModule: "QUOTATION" });
    check(!objPs.data?.vchPrimaryColor, "no print settings are written for the new account (it cannot even read them)");
    check((await api(token, "/onboarding/state")).blnNeedsOnboarding === false, "setup wizard skipped");
    await cdp.eval(click("[data-qe=download-pdf]"));
    let strPdf = null;
    for (let i = 0; i < 60 && !strPdf; i++) {
      await sleep(500);
      strPdf = fs.readdirSync(dlDir).find((f) => f.endsWith(".pdf"));
    }
    check(!!strPdf, `PDF downloaded (${strPdf || "none"})`);
    if (strPdf) {
      const o = JSON.parse(py("tests/pdf_check.py", path.join(dlDir, strPdf), "#1B2A4A", "zz-e2e-browser@example.com"));
      check(o.colour, "the PDF uses the default navy #1B2A4A");
      check(o.has_item_code_header, "the PDF has the default Item Code column (matches the preview)");
      check(!o.forbidden_found, "the owner's email is NOT printed on the PDF");
    }

    // ---------------- all 15 industry pages ----------------
    console.log("E. Suggestions on every industry page (fresh visitor)");
    await cdp.eval("localStorage.removeItem('access_token');localStorage.removeItem('userInfo');localStorage.removeItem('qp_draft')");
    let intBad = 0;
    for (const p of INDUSTRY_PAGES) {
      await go("/" + p.slug);
      await until(cdp, `!!${q("[data-qe=editor]")}`, p.slug);
      await cdp.eval(click("[data-qe=add-item]"));
      await until(cdp, `!!${q("[data-qe=sheet]")}`, "sheet");
      const names = await sheetNames(cdp);
      const mine = new Set(NAMES(p.slug));
      const rows = await cdp.eval(`${qa("[data-qe=item] input[aria-label$='name']")}.map(i=>i.value)`);
      if (!names.length || !names.every((n) => mine.has(n)) || !rows.every((n) => mine.has(n))) {
        intBad++;
        console.log(`     wrong items on ${p.slug}: sheet ${names.slice(0, 2)} rows ${rows.slice(0, 2)}`);
      }
    }
    check(intBad === 0, "all 15 industry editors show only their own trade's rows and suggestions");
    // client-side navigation between two pages (the old bug): printing -> electrical via the footer link
    await go("/printing-quotation-format");
    await until(cdp, `!!${q("[data-qe=editor]")}`, "printing editor");
    await cdp.eval(`${q("footer a[href='/electrical-work-quotation-format']")}.click()`);
    await until(cdp, `location.pathname==='/electrical-work-quotation-format' && !!${q("[data-qe=editor]")}`, "electrical via the router");
    await sleep(600);
    await cdp.eval(click("[data-qe=add-item]"));
    await until(cdp, `!!${q("[data-qe=sheet]")}`, "sheet");
    const lstNav = await sheetNames(cdp);
    check(lstNav.length > 0 && lstNav.every((n) => NAMES("electrical-work-quotation-format").includes(n)), "after moving printing → electrical without a reload, suggestions are electrical (bug fixed)");
  } catch (e) {
    intFail++;
    console.log(`  FAIL ${e.message}`);
    try {
      await shot(cdp, `${tag}-FAILED`);
    } catch {
      /* ignore */
    }
  } finally {
    try {
      cdp.ws.close();
    } catch {
      /* ignore */
    }
    proc.kill();
    await sleep(500);
    py("tests/e2e_browser_user.py", "delete");
    fs.rmSync(userDir, { recursive: true, force: true });
    fs.rmSync(dlDir, { recursive: true, force: true });
  }
}

await run("Mobile", 390, 844, true, 9381);
await run("Desktop", 1366, 850, false, 9382);
console.log(`\nscreenshots: ${SHOTS}`);
console.log(intFail ? `FAILED (${intFail})` : "ALL PASSED");
process.exit(intFail ? 1 : 0);
