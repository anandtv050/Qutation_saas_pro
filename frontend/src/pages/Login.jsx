import { useState } from "react";
import { Loader2 } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) return setError("Enter your email");
    if (!EMAIL_REGEX.test(email)) return setError("Invalid email address");
    if (!password) return setError("Enter your password");

    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      console.log("Login:", { email, password });
      // TODO: API call
    } catch {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Main Content - Vertically & Horizontally Centered */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[400px]">
          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-[#18181b] rounded-xl mb-4">
              <span className="text-white text-xl font-bold">Q</span>
            </div>
            <h1 className="text-[#18181b] text-xl font-semibold">Quotely</h1>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-[#e4e4e7] p-8">
            {/* Header */}
            <h2 className="text-[#18181b] text-2xl font-semibold text-center mb-6">
              Welcome back
            </h2>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
                <p className="text-[#dc2626] text-sm text-center">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Email Field */}
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-[#18181b] text-sm font-medium mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  disabled={isLoading}
                  autoComplete="email"
                  autoFocus
                  className="w-full h-11 px-4 text-[15px] bg-white rounded-lg border border-[#e4e4e7]
                    text-[#18181b] placeholder:text-[#a1a1aa]
                    focus:outline-none focus:ring-2 focus:ring-[#18181b] focus:border-transparent
                    hover:border-[#a1a1aa]
                    disabled:bg-[#f4f4f5] disabled:cursor-not-allowed
                    transition-all duration-150"
                />
              </div>

              {/* Password Field */}
              <div className="mb-6">
                <label
                  htmlFor="password"
                  className="block text-[#18181b] text-sm font-medium mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full h-11 px-4 pr-11 text-[15px] bg-white rounded-lg border border-[#e4e4e7]
                      text-[#18181b] placeholder:text-[#a1a1aa]
                      focus:outline-none focus:ring-2 focus:ring-[#18181b] focus:border-transparent
                      hover:border-[#a1a1aa]
                      disabled:bg-[#f4f4f5] disabled:cursor-not-allowed
                      transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#a1a1aa]
                      hover:text-[#18181b] transition-colors rounded"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 text-[15px] font-semibold bg-[#18181b] text-white rounded-lg
                  hover:bg-[#27272a] active:bg-[#09090b]
                  focus:outline-none focus:ring-2 focus:ring-[#18181b] focus:ring-offset-2
                  disabled:bg-[#a1a1aa] disabled:cursor-not-allowed
                  transition-all duration-150
                  flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>

          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4 text-[#22c55e]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
            <span className="text-[#71717a] text-xs">
              Secured with SSL encryption
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-[#a1a1aa] text-xs">
          &copy; {new Date().getFullYear()} Quotely. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
