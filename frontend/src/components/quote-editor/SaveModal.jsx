import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { isGoogleEnabled } from "@/components/GoogleSignInButton";
import { setSignupContext } from "@/marketing/leadHelper/leadLog";
import { importDraft, ImportError } from "./importDraft.js";
import { makeImportDeps } from "./importDeps.js";

const GoogleSignInButton = lazy(() => import("@/components/GoogleSignInButton"));

const INPUT = `w-full h-11 px-3 text-base bg-white rounded-lg border border-neutral-300 text-black placeholder:text-neutral-400
  focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10`;

function readUser() {
  try {
    return localStorage.getItem("access_token") ? JSON.parse(localStorage.getItem("userInfo") || "{}") : null;
  } catch {
    return null;
  }
}

// "Save your quotation": Google sign-in (or, when already signed in, one button), then the draft
// becomes real records through the existing APIs and the visitor lands on the quotation.
export default function SaveModal({ draft, tradeKey, tradeLabel, onPatch, onClose, track }) {
  const [strStage, setStrStage] = useState("form"); // form | saving
  const [strError, setStrError] = useState("");
  const user = readUser();
  const refPanel = useRef(null);
  const refBusy = useRef(false);

  const blnNeedBusiness = !draft.business.trim() && !(user?.strBusinessName || "").trim();
  const blnNeedCustomer = !draft.customerName.trim();
  const blnReady = !blnNeedBusiness && !blnNeedCustomer;

  useEffect(() => {
    track("google_prompt_opened", user ? "signed_in" : "anonymous");
    refPanel.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = (strHow) => {
    if (refBusy.current) return;
    track("google_prompt_closed", strHow);
    onClose();
  };

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close("dismissed");
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (info, blnNewUser) => {
    refBusy.current = true;
    setStrStage("saving");
    setStrError("");
    try {
      const res = await importDraft(
        draft,
        { accountBusinessName: info?.strBusinessName || "", needsOnboarding: info?.blnNeedsOnboarding === true },
        makeImportDeps(tradeLabel)
      );
      track("draft_imported", String(res.warnings.length));
      try {
        const stored = JSON.parse(localStorage.getItem("userInfo") || "{}");
        localStorage.setItem(
          "userInfo",
          JSON.stringify({
            ...stored,
            strBusinessName: stored.strBusinessName || draft.business.trim() || null,
            blnNeedsOnboarding: res.onboardingFinished ? false : stored.blnNeedsOnboarding,
            blnSelfServe: true,
          })
        );
      } catch {
        // ignore
      }
      window.location.assign(res.quotationId ? `/quotations/edit/${res.quotationId}?saved=${blnNewUser ? "new" : "1"}` : "/dashboard");
    } catch (e) {
      refBusy.current = false;
      setStrStage("form");
      setStrError(e instanceof ImportError ? e.message : "Something went wrong. Your quotation is safe here: please try again.");
    }
  };

  const onGoogleSuccess = (response) => run(response.dctUserInfo, response.dctUserInfo?.blnIsNewUser === true);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && close("dismissed")}>
      <div
        ref={refPanel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qe-modal-title"
        data-qe="modal"
        className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-xl focus:outline-none max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="qe-modal-title" className="text-xl font-bold text-black">Save your quotation</h2>
          <button type="button" aria-label="Close" onClick={() => close("dismissed")} disabled={strStage === "saving"} className="-mr-2 -mt-1 w-10 h-10 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-1 text-sm text-neutral-600">
          {user ? `Save it to your account${user.strEmail ? ` (${user.strEmail})` : ""} and download the PDF.` : "Sign in with Google to save it and download your PDF. Your free 7-day trial starts now. No payment needed."}
        </p>

        {strStage === "saving" ? (
          <div className="mt-6 mb-2 flex items-center justify-center gap-2 text-sm text-neutral-700" role="status" data-qe="saving">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Saving your quotation...
          </div>
        ) : (
          <>
            {(blnNeedBusiness || blnNeedCustomer) && (
              <div className="mt-4 space-y-3">
                {blnNeedBusiness && (
                  <div>
                    <label htmlFor="qe-m-business" className="block text-sm font-medium text-neutral-700 mb-1">Your business name *</label>
                    <input id="qe-m-business" data-qe="m-business" className={INPUT} value={draft.business} onChange={(e) => onPatch({ business: e.target.value.slice(0, 200) })} placeholder="e.g. Sree Electricals" />
                  </div>
                )}
                {blnNeedCustomer && (
                  <div>
                    <label htmlFor="qe-m-customer" className="block text-sm font-medium text-neutral-700 mb-1">Customer name *</label>
                    <input id="qe-m-customer" data-qe="m-customer" className={INPUT} value={draft.customerName} onChange={(e) => onPatch({ customerName: e.target.value.slice(0, 200) })} placeholder="Who is this quotation for?" />
                  </div>
                )}
              </div>
            )}

            {strError && <p role="alert" className="mt-3 text-sm text-red-600" data-qe="modal-error">{strError}</p>}

            <div className="mt-5">
              {!blnReady ? (
                <p className="text-sm text-neutral-500 text-center">Fill in the details above to continue.</p>
              ) : user ? (
                <button type="button" data-qe="modal-save" onClick={() => run(user, false)} className="w-full h-12 text-base font-semibold bg-black text-white rounded-xl hover:bg-neutral-800">
                  {strError ? "Try again" : "Save to my account"}
                </button>
              ) : isGoogleEnabled ? (
                <Suspense fallback={<div className="h-11" />}>
                  <GoogleSignInButton
                    onError={setStrError}
                    onBeforeSignIn={() => setSignupContext({ industry: tradeKey, src: "editor" })}
                    onSuccess={onGoogleSuccess}
                  />
                </Suspense>
              ) : (
                <a href={`/signup`} className="block w-full h-12 leading-[3rem] text-center text-base font-semibold bg-black text-white rounded-xl">Start free trial</a>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  );
}
