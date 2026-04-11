import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import api from "@/lib/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) return setError("Enter your email");
    if (!EMAIL_REGEX.test(email)) return setError("Invalid email address");

    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err) {
      // Always show success to prevent email enumeration
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-neutral-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-xl mb-4">
            <span className="text-white text-xl font-bold">Q</span>
          </div>
          <h1 className="text-black text-xl font-semibold">Quotely</h1>
        </div>

        {success ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-black mb-2">Check your email</h2>
            <p className="text-neutral-500 text-sm mb-6">
              If an account with <strong>{email}</strong> exists, we've sent a password reset link.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-black hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-black mb-2 tracking-tight">Forgot password?</h2>
              <p className="text-neutral-600 text-sm">Enter your email and we'll send you a reset link.</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-neutral-700 text-sm font-medium mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  disabled={isLoading}
                  autoFocus
                  className="w-full h-12 px-4 text-sm bg-white rounded-lg border border-neutral-300
                    text-black placeholder:text-neutral-400
                    focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10
                    hover:border-neutral-400 disabled:bg-neutral-50 disabled:cursor-not-allowed
                    transition-all duration-200"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 text-sm font-semibold bg-black text-white rounded-lg
                  hover:bg-neutral-800 active:scale-[0.99]
                  focus:outline-none focus:ring-2 focus:ring-black/20
                  disabled:bg-neutral-400 disabled:cursor-not-allowed
                  transition-all duration-200
                  flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-black transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
