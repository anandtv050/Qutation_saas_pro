import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import onboardingService from "@/services/onboardingService";
import { funnelEvent, getSignupContext, normaliseMobile } from "@/marketing/leadHelper/leadLog";
import { helpLink } from "@/marketing/site";

const INPUT_CLASS = `w-full h-12 px-4 text-base bg-white rounded-lg border border-neutral-300
  text-black placeholder:text-neutral-400
  focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10
  hover:border-neutral-400 disabled:bg-neutral-50 disabled:cursor-not-allowed
  transition-all duration-200`;
const PRIMARY_BTN = `w-full h-12 text-sm font-semibold bg-black text-white rounded-lg
  hover:bg-neutral-800 active:scale-[0.99] disabled:bg-neutral-400 disabled:cursor-not-allowed
  transition-all duration-200 flex items-center justify-center gap-2`;
const LINK_BTN = "w-full h-11 text-sm font-medium text-neutral-600 hover:text-black disabled:opacity-50";

// First-run setup after the first Google sign-in: business → trade → sample quotation.
// (Visitors who save a quotation from the website editor never see this: the editor skips it.)
// Step 2 can be skipped; only the business name is required. Logo upload is off for now: step 3 tells
// people to send their logo on WhatsApp.
export default function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [redirectHome, setRedirectHome] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [lstTrades, setLstTrades] = useState([]);
  const [trade, setTrade] = useState("");

  // Prefill from the server; a user who is already set up goes to the dashboard.
  useEffect(() => {
    let blnActive = true;
    onboardingService
      .getState()
      .then((state) => {
        if (!blnActive) return;
        if (!state.blnNeedsOnboarding) {
          try {
            const objInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
            localStorage.setItem("userInfo", JSON.stringify({ ...objInfo, blnNeedsOnboarding: false }));
          } catch {
            // ignore
          }
          return setRedirectHome(true);
        }
        let strGoogleName = "";
        try {
          strGoogleName = JSON.parse(localStorage.getItem("userInfo") || "{}").strUserName || "";
        } catch {
          // ignore
        }
        setBusinessName(state.strBusinessName || strGoogleName);
        setPhone(state.strPhone || "");
        setLstTrades(state.lstTrades || []);
        setTrade(state.strTrade || getSignupContext().industry || "");
        setIsLoading(false);
      })
      .catch((err) => {
        if (!blnActive) return;
        setError(err.message);
        setIsLoading(false);
      });
    return () => {
      blnActive = false;
    };
  }, []);

  if (redirectHome) return <Navigate to="/dashboard" replace />;

  const goTo = (intNext, strDone) => {
    funnelEvent("onboarding_step", { question: String(step), answer: strDone });
    setError("");
    setStep(intNext);
  };

  const submitBusiness = async (e) => {
    e.preventDefault();
    setError("");
    if (!businessName.trim()) return setError("Enter your business name");
    let strPhone = null;
    if (phone.trim()) {
      strPhone = normaliseMobile(phone);
      if (!strPhone) return setError("Enter a valid 10-digit mobile number, or leave it empty");
    }
    setIsBusy(true);
    try {
      await onboardingService.saveProfile({ businessName: businessName.trim(), phone: strPhone });
      goTo(2, "done");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const submitTrade = async () => {
    setIsBusy(true);
    setError("");
    try {
      await onboardingService.selectTrade(trade);
      goTo(3, "done");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  // Last step: create the sample quotation and open it.
  const finish = async () => {
    setIsBusy(true);
    setError("");
    try {
      funnelEvent("onboarding_step", { question: "3", answer: "done" });
      const { intQuotationId } = await onboardingService.finish();
      try {
        const objInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
        localStorage.setItem(
          "userInfo",
          JSON.stringify({ ...objInfo, strBusinessName: businessName.trim(), blnNeedsOnboarding: false, blnSelfServe: true })
        );
      } catch {
        // ignore
      }
      navigate(`/quotations/edit/${intQuotationId}?welcome=1`, { replace: true });
    } catch (err) {
      setError(err.message);
      setIsBusy(false);
    }
  };

  const skipTrade = () => goTo(3, "skipped");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center px-4 py-8 sm:px-6 bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-2 rounded-full transition-all duration-300 ${n === step ? "w-8 bg-black" : n < step ? "w-2 bg-black" : "w-2 bg-neutral-300"}`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg" role="alert">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={submitBusiness} className="space-y-5">
            <div>
              <h1 className="text-black text-2xl font-bold tracking-tight mb-1">Your business</h1>
              <p className="text-neutral-600 text-sm">This appears on your quotations.</p>
            </div>
            <div>
              <label htmlFor="businessName" className="block text-neutral-700 text-sm font-medium mb-2">Business name</label>
              <input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Sree Electricals"
                disabled={isBusy}
                maxLength={200}
                autoComplete="organization"
                autoFocus
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-neutral-700 text-sm font-medium mb-2">
                WhatsApp / phone number <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                disabled={isBusy}
                maxLength={20}
                autoComplete="tel"
                className={INPUT_CLASS}
              />
            </div>
            <button type="submit" disabled={isBusy} className={PRIMARY_BTN}>
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-black text-2xl font-bold tracking-tight mb-1">What do you quote for?</h1>
              <p className="text-neutral-600 text-sm">
                We add typical items with rates for your trade. You can edit rates anytime.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Trade">
              {lstTrades.map((t) => {
                const blnOn = t.strKey === trade;
                return (
                  <button
                    key={t.strKey}
                    type="button"
                    role="radio"
                    aria-checked={blnOn}
                    disabled={isBusy}
                    onClick={() => setTrade(t.strKey)}
                    className={`min-h-[48px] px-3 py-2 text-sm font-medium rounded-lg border text-left transition-colors ${
                      blnOn ? "bg-black text-white border-black" : "bg-white text-neutral-800 border-neutral-300 hover:border-neutral-500"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{t.strLabel}</span>
                      {blnOn && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={submitTrade} disabled={isBusy || !trade} className={PRIMARY_BTN}>
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add my items"}
            </button>
            <button type="button" onClick={skipTrade} disabled={isBusy} className={LINK_BTN}>
              Skip for now
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-black text-2xl font-bold tracking-tight mb-1">Your quotation is ready</h1>
              <p className="text-neutral-600 text-sm">We added your items. Open it, change the customer and quantities, and download the PDF.</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700">
              <p className="font-semibold text-neutral-900 mb-1">Want your logo on the PDF?</p>
              <p>Send your logo on WhatsApp and we'll add it.</p>
              <a
                href={helpLink("adding my logo")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block font-medium text-black underline underline-offset-2 hover:no-underline"
              >
                Send logo on WhatsApp
              </a>
            </div>
            <button type="button" onClick={finish} disabled={isBusy} className={PRIMARY_BTN}>
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Setting up...</span>
                </>
              ) : (
                "Open my quotation"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
