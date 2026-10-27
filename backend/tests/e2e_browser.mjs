// Browser end-to-end: website -> /signup -> wizard (3 steps) -> sample quotation -> PDF download,
// on mobile (390x844) and desktop (1366x850). No dependencies: drives an installed Chrome/Edge over
// the DevTools protocol with Node's built-in WebSocket (Node 22+). Google itself cannot be automated,
// so the test starts from the state right after a first Google sign-in (see e2e_browser_user.py).
//
//   1. start the API (port 5000) and the frontend dev server (port 5173)
//   2. from backend/:  node tests/e2e_browser.mjs
// Screenshots go to the folder given as argv[2] (default: system temp).
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, "..");
const SHOTS = process.argv[2] || path.join(os.tmpdir(), "quotely-e2e");
const SITE = "http://localhost:5173";
const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];
const CHROME = BROWSERS.find((p) => fs.existsSync(p));
if (!CHROME) throw new Error("Chrome/Edge not found");
fs.mkdirSync(SHOTS, { recursive: true });

const py = (arg) =>
  execFileSync(path.join(BACKEND, "venv/Scripts/python.exe"), ["tests/e2e_browser_user.py", arg], { cwd: BACKEND, encoding: "utf8" }).trim().split("\n").pop();
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
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === "page");
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

// Poll an expression until it is truthy.
async function until(cdp, expr, what, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if (await cdp.eval(expr)) return true;
    } catch {
      /* page navigating */
    }
    await sleep(250);
  }
  throw new Error(`timed out waiting for: ${what}`);
}

const clickText = (text, sel = "button,a") =>
  `(()=>{const el=[...document.querySelectorAll(${JSON.stringify(sel)})].find(e=>e.offsetParent!==null&&e.textContent.trim().includes(${JSON.stringify(text)}));if(!el)return false;el.click();return true})()`;
const hasText = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;
// every text must be on the page (hasText("a") && hasText("b") would only test the last one)
const hasAll = (...lst) => `${JSON.stringify(lst)}.every((s) => document.body.innerText.includes(s))`;
const setInput = (id, value) =>
  `(()=>{const el=document.getElementById(${JSON.stringify(id)});if(!el)return false;const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));return true})()`;

async function shot(cdp, name) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(SHOTS, `${name}.png`), Buffer.from(data, "base64"));
}

async function run(label, w, h, mobile, port) {
  console.log(`\n== ${label} ${w}x${h} ==`);
  const { token, userInfo } = JSON.parse(py("create"));
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-chrome-"));
  const dlDir = fs.mkdtempSync(path.join(os.tmpdir(), "qp-dl-"));
  const { proc, wsUrl } = await launch(port, userDir);
  const cdp = new Cdp(wsUrl);
  await cdp.ready;
  const tag = label.toLowerCase();
  try {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dlDir });

    // 1. Website -> header CTA -> /signup
    await cdp.send("Page.navigate", { url: `${SITE}/` });
    await until(cdp, hasText("Make a professional quotation"), "home page");
    await sleep(500);
    check(await cdp.eval(`!!document.querySelector('a[href^="/signup?src=header"]')`), "header 'Try free' links to /signup?src=header");
    await shot(cdp, `${tag}-1-home`);
    await cdp.send("Page.navigate", { url: `${SITE}/signup?industry=cctv&src=lead_helper` });
    await until(cdp, hasText("Start your free 7-day trial"), "signup page");
    check(await cdp.eval(hasText("No payment needed. Set up in 2 minutes.")), "signup subline");
    await until(cdp, `!!document.querySelector('iframe[src*="accounts.google.com/gsi/button"]')`, "Google button");
    check(true, "'Continue with Google' button rendered");
    await sleep(1000); // let the button paint before the screenshot
    check(await cdp.eval(hasAll("Already have an account?", "Chat with our team on WhatsApp")), "sign-in + WhatsApp help links");
    check(await cdp.eval(`localStorage.getItem('qp_signup_ctx')`) === JSON.stringify({ industry: "cctv", src: "lead_helper" }), "?industry= and ?src= remembered");
    if (!mobile) check(await cdp.eval(hasText("Send on WhatsApp in a minute")), "left panel shows the four benefits (desktop)");
    await shot(cdp, `${tag}-2-signup`);

    // 2. Signed in as a brand-new Google user -> dashboard sends them to the wizard
    await cdp.eval(`localStorage.setItem('access_token', ${JSON.stringify(token)}); localStorage.setItem('userInfo', ${JSON.stringify(JSON.stringify(userInfo))}); true`);
    await cdp.send("Page.navigate", { url: `${SITE}/dashboard` });
    await until(cdp, `location.pathname === '/welcome' && ${hasText("Your business")}`, "wizard step 1");
    check(true, "new user is sent from /dashboard to /welcome");
    check(await cdp.eval(`document.getElementById('businessName').value === 'Browser Tester'`), "business name prefilled from Google name");

    // Step 1: required business name
    await cdp.eval(setInput("businessName", ""));
    await cdp.eval(clickText("Continue"));
    await until(cdp, hasText("Enter your business name"), "business name validation");
    check(true, "empty business name is rejected");
    await cdp.eval(setInput("businessName", "Sree Security Systems"));
    await cdp.eval(setInput("phone", "98765 43210"));
    await shot(cdp, `${tag}-3-wizard-1`);
    await cdp.eval(clickText("Continue"));

    // Step 2: trade chips, preselected from ?industry=cctv
    await until(cdp, hasText("What do you quote for?"), "wizard step 2");
    check(await cdp.eval(`document.querySelectorAll('[role=radio]').length === 15`), "15 trade chips");
    check(await cdp.eval(`document.querySelector('[role=radio][aria-checked=true]')?.textContent.includes('CCTV')`), "CCTV preselected from ?industry=cctv");
    check(await cdp.eval(hasText("You can edit rates anytime")), "'You can edit rates anytime' shown");
    await shot(cdp, `${tag}-4-wizard-2`);
    await cdp.eval(clickText("Add my items"));

    // Step 3: logo (skipped here; upload is covered by the API test)
    await until(cdp, hasText("Your quotation is ready"), "wizard step 3");
    check(await cdp.eval(`${hasText("Send your logo on WhatsApp")} && !${hasText("Choose logo image")}`), "logo upload is hidden: step 3 says to send the logo on WhatsApp");
    await shot(cdp, `${tag}-5-wizard-3`);
    await cdp.eval(clickText("Open my quotation"));

    // Finish: sample quotation opens with the hint
    await until(cdp, `location.pathname.startsWith('/quotations/edit/') && ${hasText("Change the customer name and quantities, then download the PDF.")}`, "sample quotation + hint", 30000);
    check(true, "sample quotation opens with the hint");
    await until(cdp, `${hasText("Sample Customer")} || [...document.querySelectorAll('input')].some(i=>i.value==='Sample Customer')`, "sample customer loaded");
    check(await cdp.eval(`/QT-\\d{4}-\\d+/.test(document.body.innerText)`), "quotation number assigned");
    await shot(cdp, `${tag}-6-sample`);

    // Download the PDF
    const blnClicked = await cdp.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.offsetParent!==null&&e.querySelector('svg.lucide-printer'));if(!b)return false;b.click();return true})()`);
    check(blnClicked, "download/print button found and clicked");
    let strPdf = null;
    for (let i = 0; i < 60 && !strPdf; i++) {
      await sleep(500);
      strPdf = fs.readdirSync(dlDir).find((f) => f.endsWith(".pdf"));
    }
    check(!!strPdf, `PDF downloaded (${strPdf || "none"})`);
    if (strPdf) check(fs.readFileSync(path.join(dlDir, strPdf)).subarray(0, 4).toString() === "%PDF", "downloaded file is a real PDF");

    // Dashboard: trial banner + checklist
    await cdp.send("Page.navigate", { url: `${SITE}/dashboard` });
    await until(cdp, hasText("Getting started"), "dashboard checklist", 30000);
    await until(cdp, hasText("See plans"), "trial banner (loads after the subscription status request)", 30000);
    check(await cdp.eval(hasAll("Free trial: 7 days left", "See plans")), "banner: 'Free trial: 7 days left' + 'See plans'");
    check(await cdp.eval(hasAll("Account created", "Create your first quotation", "Add your logo", "Download & send a quotation")), "checklist shows 4 items");
    check(await cdp.eval(`document.querySelectorAll('svg.lucide-circle-check').length === 2`), "ticked: account created + PDF downloaded (2 of 4)");
    await shot(cdp, `${tag}-7-dashboard`);
    // Custom PDF help: the checklist item opens WhatsApp with the account details and ticks when clicked
    const strHref = await cdp.eval(`decodeURIComponent(document.querySelector("[data-qe=custom-pdf-checklist]")?.href || "")`);
    check(strHref.startsWith("https://wa.me/918848644935?text=Hi, I'd like to add my logo / customise my quotation PDF. My account: zz-e2e-browser@example.com, business: "), "checklist: 'Add your logo & custom PDF layout' opens WhatsApp with the account email and business");
    check(!(await cdp.eval(`!!document.querySelector("a[href='/print-settings']")`)), "no link to Print Settings for a trial user");
    await cdp.eval(`(()=>{const a=document.querySelector("[data-qe=custom-pdf-checklist]"); a.addEventListener('click',e=>e.preventDefault(),true); a.click(); return true})()`);
    await sleep(300);
    check(await cdp.eval(`document.querySelectorAll('svg.lucide-circle-check').length === 3 && !document.querySelector("[data-qe=custom-pdf-checklist]")`), "clicking ticks the item (3 of 4)");
    check((await cdp.eval(`localStorage.getItem('qp_custom_pdf_clicked')`)) === "1", "the click is remembered");
    // Locked Print Settings page for a trial user
    await cdp.send("Page.navigate", { url: `${SITE}/print-settings` });
    await until(cdp, `!!document.querySelector("[data-qe=custom-pdf-card]")`, "locked print settings card", 30000);
    check(await cdp.eval(hasAll("Want your logo, colours or a custom layout on your PDF?", "Our team will set it up for you.", "Chat with our team on WhatsApp")), "Print Settings (locked) shows the WhatsApp card");
    check((await cdp.eval(`document.querySelector("[data-qe=custom-pdf-whatsapp]").href.startsWith("https://wa.me/918848644935?text=")`)), "card button opens WhatsApp with the pre-filled text");
    await shot(cdp, `${tag}-8-print-settings-locked`);
    check(await cdp.eval(`getComputedStyle(document.documentElement).overflowX !== 'scroll' && document.documentElement.scrollWidth <= window.innerWidth + 1`), "no horizontal scroll on dashboard");
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
    py("delete");
    fs.rmSync(userDir, { recursive: true, force: true });
    fs.rmSync(dlDir, { recursive: true, force: true });
  }
}

await run("Mobile", 390, 844, true, 9333);
await run("Desktop", 1366, 850, false, 9334);
console.log(`\nscreenshots: ${SHOTS}`);
console.log(intFail ? `FAILED (${intFail})` : "ALL PASSED");
process.exit(intFail ? 1 : 0);
