import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import GoogleSignInButton, { isGoogleEnabled } from "@/components/GoogleSignInButton";
import AuthLeftPanel from "@/components/AuthLeftPanel";
import { demoLink, helpLink } from "@/marketing/site";
import { captureSignupContext, funnelEvent, trafficSource } from "@/marketing/leadHelper/leadLog";

const STARTED_KEY = "qp_signup_started";

export default function Signup() {
  const [error, setError] = useState("");
  const blnLoggedIn = !!localStorage.getItem("access_token");

  // Remember ?industry= and ?src=, and log the visit once per tab session.
  useEffect(() => {
    captureSignupContext();
    try {
      if (!sessionStorage.getItem(STARTED_KEY)) {
        sessionStorage.setItem(STARTED_KEY, "1");
        funnelEvent("signup_started", { answer: trafficSource() });
      }
    } catch {
      funnelEvent("signup_started", { answer: trafficSource() });
    }
  }, []);

  if (blnLoggedIn) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      <AuthLeftPanel />

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-xl mb-4">
              <span className="text-white text-xl font-bold">Q</span>
            </div>
            <p className="text-black text-xl font-semibold">Quotely Pro</p>
          </div>

          <div className="mb-9">
            <h2 className="text-black text-3xl font-bold mb-2 tracking-tight">Start your free 7-day trial</h2>
            <p className="text-neutral-600 text-sm leading-relaxed">No payment needed. Set up in 2 minutes.</p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-lg" role="alert">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {isGoogleEnabled ? (
            <GoogleSignInButton onError={setError} />
          ) : (
            <a
              href={demoLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-11 text-sm font-semibold bg-black text-white rounded-lg hover:bg-neutral-800"
            >
              Start free trial on WhatsApp
            </a>
          )}

          <p className="mt-8 text-center text-sm text-neutral-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-black underline underline-offset-2 hover:text-neutral-700">
              Sign in
            </Link>
          </p>
          <p className="mt-3 text-center text-sm text-neutral-600">
            Need help?{" "}
            <a
              href={helpLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-black underline underline-offset-2 hover:text-neutral-700"
            >
              Chat with our team on WhatsApp
            </a>
          </p>

          <div className="mt-8 text-center">
            <p className="text-neutral-400 text-xs">
              &copy; {new Date().getFullYear()} Quotely Pro. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
