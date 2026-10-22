// Lead Helper chat widget: an always-present launcher, one auto teaser (rules in leadLog.js),
// a toast after page downloads, and a button-only chat (no AI) that hands the lead to WhatsApp.
// Loaded lazily by LeadHelperMount. Non-modal: no backdrop, no scroll lock.
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { X, MessageCircle } from "lucide-react";
import { SITE } from "../site";
import { INDUSTRY_PAGES } from "../pages";
import { templatePath } from "../samples";
import {
  canAutoTeaser, noteTeaserShown, snooze, markConverted, getConvertedText, canToast, noteToastShown,
  getSavedAnswers, saveAnswers, markNumberGiven, normaliseMobile, logEvent, clarityEvent,
} from "./leadLog";
import { whatsappText, whatsappUrl, withArticle, pageTitle, industryName, industryOfSlug } from "./whatsapp";

// Industry chips (general hook, and "Which industry are you in?"): 6 short ones first, "More…" reveals the rest.
const PRIORITY = [
  ["cctv-quotation-format", "CCTV"],
  ["solar-installation-quotation-format", "Solar"],
  ["electrical-work-quotation-format", "Electrical"],
  ["ac-installation-service-quotation-format", "AC"],
  ["interior-design-quotation-format", "Interior"],
  ["event-management-quotation-format", "Events"],
];
const PRIORITY_CHIPS = PRIORITY.map(([slug, label]) => ({ page: INDUSTRY_PAGES.find((p) => p.slug === slug), label })).filter((c) => c.page);
const MORE_CHIPS = INDUSTRY_PAGES.filter((p) => !PRIORITY.some(([slug]) => slug === p.slug)).map((p) => ({ page: p, label: p.navLabel }));

const METHOD_OPTIONS = ["Excel", "By hand", "Software", "Other"];
const QUOTE_OPTIONS = ["1 or less", "2–5", "5–10", "10+"];
// The chat offers only the PDF format (the page itself still lists every format).
const ASK_METHOD = "How do you make quotations now?";
const ASK_QUOTES = "How many quotations do you send in a day?";
const CLOSING = {
  Excel: "No more fixing Excel formulas. Pick your items, and a clean PDF with your logo is ready in a minute.",
  "By hand": "No more writing by hand. Send a professional PDF quotation straight from your phone.",
  Software: "Keep your software for billing. Make quick, good-looking quotations from your phone, even on site.",
};
const CLOSING_DEFAULT = "Make item-wise quotations with your logo, ready in a minute.";
const CLOSING_BUSY = "That's a lot of quotations. This will save you real time every week.";
// After a download: point them to Quotely Pro; the WhatsApp trial button always ends the chat.
const AFTER_DOWNLOAD = [
  "Good luck with your quotation!",
  `Next time, make quotations like this with your own logo in 1 minute on Quotely Pro. Start free for ${SITE.trialDays} days 👇`,
];
const TRIGGER_DELAY_MS = 7000;
const SCROLL_SHARE = 0.4;
const TYPING_MS = 600;
const TEASER_MS = 10000;
const TOAST_MS = 12000;
const FADE_MS = 300;
// Photo on the launcher: add public/anand.jpg (square, about 96 px) and set ready: true.
// Until then a chat-bubble icon is shown (no request for a missing file).
const AVATAR = { src: "/anand.jpg", ready: false };
const PILL_MOBILE = "Make this in 1 min →";

// Name of each step in the sheet's "question" column.
const QUESTION = { hook: "hook", industry: "industry", method: "current_method", quotes: "quotes_per_day", result: "result", download: "download", end: "end" };

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Green "online" dot between 9:00 and 21:00 IST, whatever the visitor's own time zone.
function isOnlineIST() {
  const d = new Date();
  const intMinutes = (d.getUTCHours() * 60 + d.getUTCMinutes() + 330) % 1440;
  return intMinutes >= 9 * 60 && intMinutes < 21 * 60;
}
const reducedMotion = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

// Closing messages: by how they make quotations now, plus a line for busy senders.
function closingTexts(strMethod, strQuotes) {
  const lstTexts = [CLOSING[strMethod] || CLOSING_DEFAULT];
  if (strQuotes === "5–10" || strQuotes === "10+") lstTexts.push(CLOSING_BUSY);
  lstTexts.push(`Set up free for ${SITE.trialDays} days with your logo and items.`);
  return lstTexts;
}

const CHIP =
  "inline-flex items-center justify-center min-h-[44px] px-4 text-sm font-medium text-neutral-900 bg-white border border-neutral-300 rounded-full hover:border-black hover:bg-neutral-50 transition-colors";
const BUBBLE =
  "max-w-[260px] rounded-2xl rounded-br-md bg-white px-4 py-3 text-left text-[15px] font-medium leading-snug text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.16)] ring-1 ring-black/5";

function Chip({ label, onPick, chipRef }) {
  return (
    <button ref={chipRef} type="button" className={CHIP} onClick={onPick}>
      {label}
    </button>
  );
}

function Avatar({ blnOnline, blnClose }) {
  return (
    <span className="relative shrink-0 w-9 h-9 sm:w-11 sm:h-11" aria-hidden="true">
      {blnClose ? (
        <span className="w-full h-full rounded-full bg-white/15 flex items-center justify-center">
          <X className="w-5 h-5" />
        </span>
      ) : AVATAR.ready ? (
        <img src={AVATAR.src} alt="" width="44" height="44" className="w-full h-full rounded-full object-cover ring-2 ring-white/20" />
      ) : (
        <span className="w-full h-full rounded-full bg-[#15803d] flex items-center justify-center">
          <MessageCircle className="w-5 h-5" />
        </span>
      )}
      {blnOnline && !blnClose && (
        <span data-online="" className="absolute -bottom-0.5 -right-0.5 w-3 h-3">
          <span data-online-pulse="" className="absolute inset-0 rounded-full bg-[#22c55e] motion-safe:animate-lead-dot-pulse" />
          <span className="absolute inset-0 rounded-full bg-[#22c55e] ring-2 ring-black" />
        </span>
      )}
    </span>
  );
}

function TypingDots() {
  return (
    <div className="self-start inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-neutral-100 px-3.5 py-3" aria-label="Typing">
      {[0, 150, 300].map((intDelay) => (
        <span key={intDelay} className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: `${intDelay}ms` }} />
      ))}
    </div>
  );
}

// page: entry from pages.js, or null on the homepage.
export default function LeadHelper({ page }) {
  const blnIndustryPage = page?.kind === "industry";
  const strPageTitle = pageTitle(page);
  const strLauncherLabel = blnIndustryPage ? `${capitalise(industryName(page))} quotation help` : "Quotation help";
  const strPillDesktop = blnIndustryPage ? "Make this with your logo in 1 min" : "Make a quotation in 1 min";
  const [blnOnline] = useState(() => isOnlineIST());
  const strTeaser = blnIndustryPage ? `👋 Need ${withArticle(industryName(page))} quotation format?` : "👋 Need help making a quotation?";

  const [objSaved] = useState(() => getSavedAnswers());
  const [strConverted, setStrConverted] = useState(() => getConvertedText());
  const [teaser, setTeaser] = useState("off"); // off | in | out
  const [toast, setToast] = useState("off"); // off | in | out
  const [blnVisible, setBlnVisible] = useState(false);
  const [blnOpen, setBlnOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { from: "bot" | "user", text }
  const [step, setStep] = useState(null); // hook | quotes | method | result | download | end
  const [blnTyping, setBlnTyping] = useState(false);
  const [blnPulse, setBlnPulse] = useState(false); // one launcher pulse when the teaser appears
  const [blnMore, setBlnMore] = useState(false);
  const [strNumber, setStrNumber] = useState(""); // "leave your number" box at the end of the chat
  const [blnNumberError, setBlnNumberError] = useState(false);
  const [blnNumberSent, setBlnNumberSent] = useState(false);
  const [answers, setAnswers] = useState(() =>
    objSaved
      ? { method: "", quotes: "", ...objSaved, visitorType: objSaved.visitorType || "owner" }
      : { industrySlug: blnIndustryPage ? page.slug : "", method: "", quotes: "", visitorType: "unknown" }
  );

  const strTitleId = useId();
  const strNumberId = useId();
  const refLauncher = useRef(null);
  const refScroll = useRef(null);
  const refLastBot = useRef(null);
  const refFirstMore = useRef(null);
  const refTimers = useRef([]);
  const refFocusLauncher = useRef(false);
  const refOpen = useRef(false);
  const refToast = useRef("off");
  const refTeaserNoted = useRef(false);
  const refLog = useRef(null);

  const later = (fn, ms) => refTimers.current.push(setTimeout(fn, ms));

  const log = useCallback(
    (strEvent, strQuestion = "", strAnswer = "", objAnswers = answers) =>
      logEvent(page, strEvent, { question: strQuestion, answer: strAnswer, answers: objAnswers }),
    [answers, page]
  );

  useEffect(() => {
    refLog.current = log;
    refOpen.current = blnOpen;
  });

  // Only when the toast really changes: the click handler sets "in" at once, and a render that
  // was already under way must not reset it to "off".
  useEffect(() => {
    refToast.current = toast;
  }, [toast]);

  useEffect(() => {
    const lstTimers = refTimers.current;
    const intFrame = requestAnimationFrame(() => setBlnVisible(true));
    return () => {
      cancelAnimationFrame(intFrame);
      lstTimers.forEach(clearTimeout);
    };
  }, []);

  // Auto teaser trigger: 7 s on the page AND (sample in view OR 40% scrolled), if the rules allow.
  useEffect(() => {
    if (!canAutoTeaser()) return;
    let blnTimeUp = false;
    let blnEngaged = false;
    let observer = null;
    const elSample = document.getElementById("sample-heading")?.closest("section");
    const stop = () => {
      clearTimeout(intTimer);
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
    const check = () => {
      if (!blnTimeUp || !blnEngaged) return;
      stop();
      // Never on top of the open chat or the download toast.
      if (!refOpen.current && refToast.current === "off" && canAutoTeaser()) {
        setTeaser((t) => (t === "off" ? "in" : t));
        setBlnPulse(true);
      }
    };
    const onScroll = () => {
      const intRange = document.documentElement.scrollHeight - window.innerHeight;
      if (intRange <= 0 || window.scrollY / intRange >= SCROLL_SHARE) {
        blnEngaged = true;
        check();
      }
    };
    const intTimer = setTimeout(() => {
      blnTimeUp = true;
      check();
    }, TRIGGER_DELAY_MS);
    if (elSample && "IntersectionObserver" in window) {
      observer = new IntersectionObserver((lstEntries) => {
        if (lstEntries.some((e) => e.isIntersecting)) {
          blnEngaged = true;
          check();
        }
      });
      observer.observe(elSample);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return stop;
  }, []);

  // Teaser shown: count it (session + 7-day limit), log, and fade it after 10 s.
  useEffect(() => {
    if (teaser === "out") {
      const intGone = setTimeout(() => setTeaser("off"), FADE_MS);
      return () => clearTimeout(intGone);
    }
    if (teaser !== "in") return;
    if (!refTeaserNoted.current) {
      refTeaserNoted.current = true;
      noteTeaserShown();
      refLog.current("shown");
      clarityEvent("helper_shown");
    }
    const intFade = setTimeout(() => setTeaser((t) => (t === "in" ? "out" : t)), TEASER_MS);
    return () => clearTimeout(intFade);
  }, [teaser]);

  useEffect(() => {
    if (toast === "out") {
      const intGone = setTimeout(() => setToast("off"), FADE_MS);
      return () => clearTimeout(intGone);
    }
    if (toast !== "in") return;
    const intFade = setTimeout(() => setToast((t) => (t === "in" ? "out" : t)), TOAST_MS);
    return () => clearTimeout(intFade);
  }, [toast]);

  // Template downloads on the page itself (not inside the widget): log, and offer the toast.
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target.closest?.('a[download][href^="/templates/"]');
      if (!a || a.closest("[data-lead-helper]")) return;
      refLog.current("download_click", "page", a.getAttribute("href").split(".").pop());
      clarityEvent("helper_download");
      if (refOpen.current || !canToast()) return;
      noteToastShown();
      refToast.current = "in";
      setTeaser((t) => (t === "in" ? "out" : t));
      setToast("in");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // New message: scroll to it and move focus there (without scrolling the page).
  useEffect(() => {
    if (!blnOpen) return;
    const el = refScroll.current;
    if (el) el.scrollTop = el.scrollHeight;
    if (messages.at(-1)?.from === "bot") refLastBot.current?.focus({ preventScroll: true });
  }, [messages, blnTyping, blnOpen, step]);

  useEffect(() => {
    if (blnMore) refFirstMore.current?.focus({ preventScroll: true });
  }, [blnMore]);

  // After closing, focus the launcher once it is visible again (it is hidden on mobile while open).
  useEffect(() => {
    if (blnOpen || !refFocusLauncher.current) return;
    refFocusLauncher.current = false;
    refLauncher.current?.focus({ preventScroll: true });
  }, [blnOpen]);

  // Bot replies, each after a short typing indicator (none with reduced motion).
  const say = (lstTexts, strNextStep) => {
    setStep(null);
    if (reducedMotion()) {
      setMessages((lst) => [...lst, ...lstTexts.map((text) => ({ from: "bot", text }))]);
      setStep(strNextStep);
      return;
    }
    setBlnTyping(true);
    lstTexts.forEach((text, i) => {
      later(() => {
        setMessages((lst) => [...lst, { from: "bot", text }]);
        if (i === lstTexts.length - 1) {
          setBlnTyping(false);
          setStep(strNextStep);
        }
      }, (i + 1) * TYPING_MS + i * 150);
    });
  };
  const userSays = (strText) => setMessages((lst) => [...lst, { from: "user", text: strText }]);

  // Returning visitor with saved answers: skip what we already know.
  const startChat = () => {
    if (objSaved) {
      const pageSaved = INDUSTRY_PAGES.find((p) => p.slug === objSaved.industrySlug);
      const strWelcome = `Welcome back 👋 Still want help with your ${pageSaved ? `${industryName(pageSaved)} ` : ""}quotations?`;
      if (!answers.method) return say([strWelcome, ASK_METHOD], "method");
      if (!answers.quotes) return say([strWelcome, ASK_QUOTES], "quotes");
      return say([strWelcome, ...closingTexts(answers.method, answers.quotes)], "result");
    }
    say([blnIndustryPage ? `Hi 👋 Looking for ${withArticle(industryName(page))} quotation?` : "Hi 👋 What quotation do you want to make?"], "hook");
  };

  const openChat = (strFrom) => {
    if (blnOpen) return;
    setTeaser((t) => (t === "in" ? "out" : t));
    setToast((t) => (t === "in" ? "out" : t));
    setBlnOpen(true);
    log("opened", step ? QUESTION[step] : "", strFrom);
    clarityEvent("helper_opened");
    if (messages.length === 0 && !blnTyping) startChat();
  };

  const closeChat = useCallback(
    (strAnswer = "") => {
      log("closed", step ? QUESTION[step] : "", strAnswer);
      refFocusLauncher.current = true;
      setBlnOpen(false);
    },
    [log, step]
  );

  const dismissTeaser = useCallback(() => {
    snooze();
    log("closed", "teaser");
    setTeaser("out");
  }, [log]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (blnOpen) closeChat();
      else if (teaser === "in") dismissTeaser();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [blnOpen, teaser, closeChat, dismissTeaser]);

  const update = (objPatch) => {
    const objNext = { ...answers, ...objPatch };
    setAnswers(objNext);
    return objNext;
  };

  // Answers (remembered for "Welcome back") ---------------------------------------
  const onYes = () => {
    const objNext = update({ visitorType: "owner" });
    saveAnswers(objNext);
    userSays("Yes");
    log("hook_yes", "hook", "yes", objNext);
    clarityEvent("helper_yes");
    say([ASK_METHOD], "method");
  };
  const onNo = () => {
    userSays("No");
    log("hook_no", "hook", "no");
    clarityEvent("helper_no");
    say(["No problem 🙂 Which industry are you in?"], "industry");
  };
  // Industry chip: on the general hook it means Yes for that industry; after "No" it is another
  // trade (other_business). null = "Other". Both continue with the questions.
  const onIndustry = (chip) => {
    const blnFromHook = step === "hook";
    const objNext = update({ industrySlug: chip ? chip.page.slug : "other", visitorType: blnFromHook ? "owner" : "other_business" });
    saveAnswers(objNext);
    userSays(chip ? chip.label : "Other");
    const strAnswer = chip ? chip.page.slug.replace(/-quotation-format$/, "") : "other";
    if (blnFromHook) {
      log("hook_yes", "hook", strAnswer, objNext);
      clarityEvent("helper_yes");
    } else {
      log("answered", "industry", strAnswer, objNext);
    }
    setBlnMore(false);
    say([ASK_METHOD], "method");
  };
  // Not a trade: straight to the free format.
  const onNotTrade = (strLabel, strVisitorType) => {
    const objNext = update({ visitorType: strVisitorType });
    userSays(strLabel);
    log("answered", "industry", strVisitorType, objNext);
    setBlnMore(false);
    say(["Here's the format free:"], "download");
  };
  const onMethod = (strValue) => {
    const objNext = update({ method: strValue });
    saveAnswers(objNext);
    userSays(strValue);
    log("answered", "current_method", strValue, objNext);
    say([ASK_QUOTES], "quotes");
  };
  const onQuotes = (strValue) => {
    const objNext = update({ quotes: strValue });
    saveAnswers(objNext);
    userSays(strValue);
    log("answered", "quotes_per_day", strValue, objNext);
    say(closingTexts(objNext.method, strValue), "result");
  };

  // Hand-off. Links must stay in the page until the browser has followed them, so anything
  // that removes them waits for the next tick.
  const strChatText = whatsappText({ industry: industryOfSlug(answers.industrySlug), method: answers.method, quotes: answers.quotes, pageTitle: strPageTitle });
  const strToastText = whatsappText({
    industry: blnIndustryPage ? industryName(page) : industryOfSlug(answers.industrySlug),
    method: answers.method,
    quotes: answers.quotes,
    pageTitle: strPageTitle,
  });
  const convert = (strText) => {
    markConverted(strText);
    clarityEvent("helper_whatsapp");
    later(() => setStrConverted(strText), 0);
  };
  const onWhatsApp = () => {
    log("whatsapp_click", QUESTION[step]);
    convert(strChatText);
  };
  // "Leave your number": a valid Indian mobile is logged to the sheet (phone column).
  const onSubmitNumber = (e) => {
    e.preventDefault();
    const strMobile = normaliseMobile(strNumber);
    if (!strMobile) {
      setBlnNumberError(true);
      return;
    }
    setBlnNumberError(false);
    setBlnNumberSent(true);
    markNumberGiven();
    logEvent(page, "number_submitted", { question: QUESTION[step], answers, phone: strMobile });
    clarityEvent("helper_number");
    userSays(strMobile.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2"));
    say([`Thanks! Our team will message you on WhatsApp within a few hours (9 AM – 9 PM).`], step);
  };
  const onToastWhatsApp = () => {
    log("toast_whatsapp_click", "toast");
    convert(strToastText);
    later(() => setToast("out"), 0);
  };
  const onLauncherWhatsApp = () => log("whatsapp_click", "launcher");
  const onDownloadPdf = () => {
    log("download_click", QUESTION[step], "pdf");
    clarityEvent("helper_download");
    later(() => {
      userSays("PDF format");
      say(AFTER_DOWNLOAD, "end");
    }, 0);
  };

  // The chosen industry's template, else this page's, else the general format.
  const strTemplateSlug =
    answers.industrySlug && answers.industrySlug !== "other"
      ? answers.industrySlug
      : page?.sample
        ? page.slug
        : "quotation-format";

  const industryChips = (
    <>
      {PRIORITY_CHIPS.map((c) => <Chip key={c.page.slug} label={c.label} onPick={() => onIndustry(c)} />)}
      {blnMore ? (
        <>
          {MORE_CHIPS.map((c, i) => (
            <Chip key={c.page.slug} label={c.label} onPick={() => onIndustry(c)} chipRef={i === 0 ? refFirstMore : undefined} />
          ))}
          <Chip label="Other" onPick={() => onIndustry(null)} />
        </>
      ) : (
        <Chip label="More…" onPick={() => setBlnMore(true)} />
      )}
    </>
  );

  let chips = null;
  if (step === "hook" && blnIndustryPage) {
    chips = (
      <>
        <Chip label="Yes" onPick={onYes} />
        <Chip label="No" onPick={onNo} />
      </>
    );
  } else if (step === "hook") {
    chips = industryChips;
  } else if (step === "industry") {
    chips = (
      <>
        {industryChips}
        <Chip label="I'm a customer" onPick={() => onNotTrade("I'm a customer", "needs_quote")} />
        <Chip label="Just learning" onPick={() => onNotTrade("Just learning", "learning")} />
      </>
    );
  } else if (step === "method") {
    chips = METHOD_OPTIONS.map((s) => <Chip key={s} label={s} onPick={() => onMethod(s)} />);
  } else if (step === "quotes") {
    chips = QUOTE_OPTIONS.map((s) => <Chip key={s} label={s} onPick={() => onQuotes(s)} />);
  } else if (step === "download") {
    chips = (
      <a href={templatePath(strTemplateSlug, "pdf")} download className={CHIP} onClick={onDownloadPdf}>
        📄 Download PDF format
      </a>
    );
  }

  const intLastBot = messages.map((m) => m.from).lastIndexOf("bot");
  const strBubblePos = "fixed z-[60] right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] sm:bottom-[5.25rem]";
  // Appears with a 300 ms slide-up + fade (fade only with reduced motion); one 600 ms pulse when
  // the auto teaser appears (none with reduced motion); otherwise still.
  const strLauncherClass = `fixed z-[60] right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-4 h-12 sm:h-14 pl-1.5 pr-4 sm:pr-5 gap-2.5 rounded-full bg-black text-white text-sm sm:text-[15px] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-neutral-800 transition-[opacity,translate,background-color] duration-300 ease-out motion-reduce:transition-opacity items-center ${
    blnVisible ? "opacity-100 translate-y-0" : "opacity-0 motion-safe:translate-y-3"
  } ${blnPulse ? "motion-safe:animate-lead-pill-pulse" : ""}`;
  const onPillAnimationEnd = (e) => {
    if (e.animationName === "lead-pill-pulse") setBlnPulse(false);
  };
  // Pill text: short on mobile, page-aware on desktop.
  const pillText = (strMobile, strDesktop) => (
    <span className="whitespace-nowrap">
      <span className="sm:hidden">{strMobile}</span>
      <span className="hidden sm:inline">{strDesktop}</span>
    </span>
  );

  return (
    <>
      {/* Chat panel */}
      {blnOpen && (
        <div
          data-lead-helper=""
          role="dialog"
          aria-modal="false"
          aria-labelledby={strTitleId}
          className="fixed z-[60] inset-x-0 bottom-0 max-h-[60vh] sm:inset-x-auto sm:right-4 sm:bottom-[5.5rem] sm:w-[360px] sm:max-h-[520px] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.18)] sm:shadow-[0_12px_48px_rgba(0,0,0,0.2)] ring-1 ring-black/5 overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4"
        >
          <div className="flex items-center gap-3 border-b border-neutral-100 pl-4 pr-1 py-2.5">
            <span className="w-9 h-9 shrink-0 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold" aria-hidden="true">
              Q
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p id={strTitleId} className="text-sm font-semibold text-black">Quotely Pro</p>
              <p className="text-xs text-neutral-500">Quick questions · then chat with our team on WhatsApp</p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => closeChat()}
              className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-neutral-500 hover:text-black hover:bg-neutral-100"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div ref={refScroll} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
            <div role="log" aria-live="polite" className="flex flex-col gap-2">
              {messages.map((m, i) =>
                m.from === "bot" ? (
                  <p
                    key={i}
                    ref={i === intLastBot ? refLastBot : undefined}
                    tabIndex={i === intLastBot ? -1 : undefined}
                    className="self-start max-w-[85%] rounded-2xl rounded-bl-md bg-neutral-100 px-3.5 py-2.5 text-[15px] leading-relaxed text-neutral-900 outline-none"
                  >
                    {m.text}
                  </p>
                ) : (
                  <p key={i} className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-neutral-900 px-3.5 py-2.5 text-[15px] leading-relaxed text-white">
                    {m.text}
                  </p>
                )
              )}
              {blnTyping && <TypingDots />}
            </div>

            {chips && <div className="mt-3 flex flex-wrap gap-2">{chips}</div>}

            {step === "result" && (
              <div className="mt-3 grid gap-2">
                <a
                  href={whatsappUrl(strChatText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 min-h-[48px] px-4 text-[15px] font-semibold text-white bg-[#15803d] rounded-xl shadow-sm hover:bg-[#166534] transition-colors"
                  onClick={onWhatsApp}
                >
                  💬 Chat with our engineer on WhatsApp
                </a>
                <p className="-mt-0.5 text-xs text-neutral-600 text-center">Our team usually replies within a few hours (9 AM – 9 PM).</p>
                <a
                  href={templatePath(strTemplateSlug, "pdf")}
                  download
                  className="flex items-center justify-center gap-2 min-h-[44px] px-4 text-sm font-semibold text-neutral-800 border border-neutral-300 rounded-xl hover:border-black"
                  onClick={onDownloadPdf}
                >
                  📄 Download PDF format
                </a>
              </div>
            )}

            {/* End of the chat: leave a number, or (always last) start the free trial on WhatsApp */}
            {step === "end" && (
              <div className="mt-3 grid gap-2">
                {!blnNumberSent && (
                  <form onSubmit={onSubmitNumber} noValidate className="rounded-xl border border-neutral-200 p-3">
                    <label htmlFor={strNumberId} className="block text-sm font-medium text-neutral-900">
                      Or leave your WhatsApp number and our team will message you
                    </label>
                    <div className="mt-2 flex gap-2">
                      <input
                        id={strNumberId}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="10-digit mobile number"
                        value={strNumber}
                        onChange={(e) => {
                          setStrNumber(e.target.value);
                          setBlnNumberError(false);
                        }}
                        aria-invalid={blnNumberError}
                        aria-describedby={blnNumberError ? `${strNumberId}-err` : undefined}
                        className={`min-w-0 flex-1 min-h-[44px] px-3 text-base text-neutral-900 bg-white border rounded-lg outline-none focus:border-black ${
                          blnNumberError ? "border-red-500" : "border-neutral-300"
                        }`}
                      />
                      <button type="submit" className="shrink-0 min-h-[44px] px-4 text-sm font-semibold text-white bg-black rounded-lg hover:bg-neutral-800">
                        Send
                      </button>
                    </div>
                    {blnNumberError && (
                      <p id={`${strNumberId}-err`} role="alert" className="mt-1.5 text-xs text-red-600">
                        Please enter a valid 10-digit mobile number.
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-neutral-500">We'll only use it to contact you about Quotely Pro.</p>
                  </form>
                )}
                <a
                  href={whatsappUrl(strChatText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 min-h-[48px] px-4 text-[15px] font-semibold text-white bg-[#15803d] rounded-xl shadow-sm hover:bg-[#166534] transition-colors"
                  onClick={onWhatsApp}
                >
                  💬 Start free {SITE.trialDays}-day trial on WhatsApp
                </a>
                <p className="-mt-0.5 text-xs text-neutral-600 text-center">Our team usually replies within a few hours (9 AM – 9 PM).</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto teaser */}
      {teaser !== "off" && !blnOpen && (
        <div
          data-lead-helper=""
          className={`${strBubblePos} flex items-start transition-all duration-300 motion-reduce:transition-none ${
            teaser === "in" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <button type="button" onClick={() => openChat("teaser")} className={`${BUBBLE} relative pr-9 hover:ring-black/20`}>
            {strTeaser}
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismissTeaser}
            className="relative z-10 -ml-11 w-11 h-11 flex items-center justify-center text-neutral-400 hover:text-black"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Download toast */}
      {toast !== "off" && !blnOpen && (
        <div
          data-lead-helper=""
          role="status"
          className={`${strBubblePos} ${BUBBLE} pr-10 transition-all duration-300 motion-reduce:transition-none ${
            toast === "in" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <p>✅ Downloaded! Want this with your logo, ready in 1 minute?</p>
          <a
            href={whatsappUrl(strToastText)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onToastWhatsApp}
            className="mt-2.5 inline-flex items-center justify-center min-h-[44px] px-4 text-sm font-semibold text-white bg-[#15803d] rounded-xl hover:bg-[#166534]"
          >
            💬 Chat with our engineer
          </a>
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              log("closed", "toast");
              setToast("out");
            }}
            className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center text-neutral-400 hover:text-black"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Launcher pill: opens the chat, or WhatsApp directly once they have messaged us */}
      {strConverted && !blnOpen ? (
        <a
          data-lead-helper=""
          data-lead-launcher=""
          ref={refLauncher}
          href={whatsappUrl(strConverted)}
          target="_blank"
          rel="noopener noreferrer"
          title={`${strLauncherLabel} on WhatsApp`}
          onClick={onLauncherWhatsApp}
          onAnimationEnd={onPillAnimationEnd}
          className={`${strLauncherClass} flex`}
        >
          <Avatar blnOnline={blnOnline} />
          {pillText("Chat with our team", "Chat with our team on WhatsApp")}
        </a>
      ) : (
        <button
          data-lead-helper=""
          data-lead-launcher=""
          ref={refLauncher}
          type="button"
          title={blnOpen ? "Close quotation help" : strLauncherLabel}
          aria-expanded={blnOpen}
          onClick={() => (blnOpen ? closeChat() : openChat("launcher"))}
          onAnimationEnd={onPillAnimationEnd}
          className={`${strLauncherClass} ${blnOpen ? "hidden sm:flex" : "flex"}`}
        >
          <Avatar blnOnline={blnOnline} blnClose={blnOpen} />
          {blnOpen ? <span>Close</span> : pillText(PILL_MOBILE, strPillDesktop)}
        </button>
      )}
    </>
  );
}
