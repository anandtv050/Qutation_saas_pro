import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, Sparkles, Zap, FileText } from "lucide-react";
import authService from "@/services/authServices";
import serviceService from "@/services/serviceService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    businessName: "",
    phone: "",
    serviceId: "",
  });
  const [services, setServices] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    serviceService.getActive()
      .then((res) => { if (res.lstServices) setServices(res.lstServices); })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.username.trim()) return setError("Enter your full name");
    if (!formData.email.trim()) return setError("Enter your email");
    if (!EMAIL_REGEX.test(formData.email)) return setError("Invalid email address");
    if (!formData.password) return setError("Enter a password");
    if (formData.password.length < 8) return setError("Password must be at least 8 characters");
    if (formData.password !== formData.confirmPassword) return setError("Passwords do not match");

    setIsLoading(true);
    try {
      const response = await authService.signup({
        ...formData,
        serviceId: formData.serviceId ? parseInt(formData.serviceId) : null,
      });

      localStorage.setItem("access_token", response.strAccessToken);
      localStorage.setItem("userInfo", JSON.stringify(response.dctUserInfo));

      // Navigate to dashboard
      window.location.href = "/dashboard";
    } catch (error) {
      setError(error.message || "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-black relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }} />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-3xl" />

        <div className="flex flex-col justify-between w-full px-16 py-14 relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm">
              <span className="text-black text-xl font-bold">Q</span>
            </div>
            <span className="text-white text-xl font-semibold">Quotely</span>
          </div>

          <div className="space-y-7">
            <h1 className="text-white text-5xl font-bold leading-tight tracking-tight max-w-xl">
              Start creating professional quotes today
            </h1>
            <p className="text-neutral-400 text-base max-w-md leading-relaxed">
              Join hundreds of businesses using AI-powered quotations. Free 7-day trial, no credit card required.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-white/60 mt-1 flex-shrink-0" strokeWidth={2} />
              <div>
                <h3 className="text-white text-sm font-medium mb-0.5">AI-Powered Generation</h3>
                <p className="text-neutral-500 text-xs leading-relaxed">Generate professional quotes instantly with intelligent automation</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="w-4 h-4 text-white/60 mt-1 flex-shrink-0" strokeWidth={2} />
              <div>
                <h3 className="text-white text-sm font-medium mb-0.5">Lightning Fast Workflow</h3>
                <p className="text-neutral-500 text-xs leading-relaxed">Save hours with automated calculations and smart templates</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-white/60 mt-1 flex-shrink-0" strokeWidth={2} />
              <div>
                <h3 className="text-white text-sm font-medium mb-0.5">Professional Output</h3>
                <p className="text-neutral-500 text-xs leading-relaxed">Polished, branded quotes that win clients every time</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-black rounded-xl mb-4">
              <span className="text-white text-xl font-bold">Q</span>
            </div>
            <h1 className="text-black text-xl font-semibold">Quotely</h1>
          </div>

          {/* Header */}
          <div className="mb-7">
            <h2 className="text-black text-3xl font-bold mb-2 tracking-tight">Create your account</h2>
            <p className="text-neutral-600 text-sm leading-relaxed">Start your free 7-day trial. No credit card required.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="username" className="block text-neutral-700 text-sm font-medium mb-1.5">
                Full name
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="John Doe"
                disabled={isLoading}
                autoFocus
                className="w-full h-11 px-4 text-sm bg-white rounded-lg border border-neutral-300
                  text-black placeholder:text-neutral-400
                  focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10
                  hover:border-neutral-400 disabled:bg-neutral-50 disabled:cursor-not-allowed
                  transition-all duration-200"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-neutral-700 text-sm font-medium mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@company.com"
                disabled={isLoading}
                autoComplete="email"
                className="w-full h-11 px-4 text-sm bg-white rounded-lg border border-neutral-300
                  text-black placeholder:text-neutral-400
                  focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10
                  hover:border-neutral-400 disabled:bg-neutral-50 disabled:cursor-not-allowed
                  transition-all duration-200"
              />
            </div>

            {/* Business Name */}
            <div>
              <label htmlFor="businessName" className="block text-neutral-700 text-sm font-medium mb-1.5">
                Business name <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Your Company Pvt Ltd"
                disabled={isLoading}
                className="w-full h-11 px-4 text-sm bg-white rounded-lg border border-neutral-300
                  text-black placeholder:text-neutral-400
                  focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10
                  hover:border-neutral-400 disabled:bg-neutral-50 disabled:cursor-not-allowed
                  transition-all duration-200"
              />
            </div>

            {/* Service Type */}
            {services.length > 0 && (
              <div>
                <label htmlFor="serviceId" className="block text-neutral-700 text-sm font-medium mb-1.5">
                  What service do you provide?
                </label>
                <select
                  id="serviceId"
                  name="serviceId"
                  value={formData.serviceId}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-full h-11 px-4 text-sm bg-white rounded-lg border border-neutral-300
                    text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10
                    hover:border-neutral-400 disabled:bg-neutral-50 disabled:cursor-not-allowed
                    transition-all duration-200"
                >
                  <option value="">Select your service</option>
                  {services.map((svc) => (
                    <option key={svc.intServiceId} value={svc.intServiceId}>
                      {svc.strDisplayName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-neutral-700 text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 8 characters"
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="w-full h-11 px-4 pr-12 text-sm bg-white rounded-lg border border-neutral-300
                    text-black placeholder:text-neutral-400
                    focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10
                    hover:border-neutral-400 disabled:bg-neutral-50 disabled:cursor-not-allowed
                    transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500
                    hover:text-neutral-900 transition-colors rounded-md hover:bg-neutral-100"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-neutral-700 text-sm font-medium mb-1.5">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                disabled={isLoading}
                autoComplete="new-password"
                className="w-full h-11 px-4 text-sm bg-white rounded-lg border border-neutral-300
                  text-black placeholder:text-neutral-400
                  focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10
                  hover:border-neutral-400 disabled:bg-neutral-50 disabled:cursor-not-allowed
                  transition-all duration-200"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 w-full h-11 text-sm font-semibold bg-black text-white rounded-lg
                hover:bg-neutral-800 active:scale-[0.99]
                focus:outline-none focus:ring-2 focus:ring-black/20
                disabled:bg-neutral-400 disabled:cursor-not-allowed
                transition-all duration-200
                flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                "Start free trial"
              )}
            </button>
          </form>

          {/* Already have account */}
          <div className="mt-6 text-center">
            <p className="text-neutral-600 text-sm">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-black hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-neutral-400 text-xs">
              &copy; {new Date().getFullYear()} Quotely. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
