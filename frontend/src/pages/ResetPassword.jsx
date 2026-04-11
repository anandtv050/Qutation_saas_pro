import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import api from "@/lib/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password) return setError("Enter a new password");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== confirmPassword) return setError("Passwords do not match");
    if (!token) return setError("Invalid reset link. Please request a new one.");

    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Reset failed. The link may have expired.");
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-black mb-2">Password reset!</h2>
            <p className="text-neutral-500 text-sm mb-6">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-black mb-2 tracking-tight">Reset password</h2>
              <p className="text-neutral-600 text-sm">Enter your new password below.</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-neutral-700 text-sm font-medium mb-2">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  disabled={isLoading}
                  autoFocus
                  className="w-full h-12 px-4 text-sm bg-white rounded-lg border border-neutral-300
                    text-black placeholder:text-neutral-400
                    focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10
                    hover:border-neutral-400 disabled:bg-neutral-50 disabled:cursor-not-allowed
                    transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-neutral-700 text-sm font-medium mb-2">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={isLoading}
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
                    Resetting...
                  </>
                ) : (
                  "Reset password"
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
