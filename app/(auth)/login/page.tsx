"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import {
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Check,
  Clock,
  Receipt,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup" | "forgot";

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  score = Math.min(score, 4);

  const levels = [
    { label: "Very Weak", color: "bg-red-500" },
    { label: "Weak", color: "bg-orange-500" },
    { label: "Fair", color: "bg-yellow-500" },
    { label: "Good", color: "bg-blue-500" },
    { label: "Strong", color: "bg-emerald-500" },
  ];

  return { score, ...levels[score] };
}

const FEATURES = [
  { icon: Clock, title: "Time Tracking", desc: "Log hours with precision across projects and billing types" },
  { icon: Receipt, title: "Expense Management", desc: "Submit mileage, meals, lodging and other expenses effortlessly" },
  { icon: Shield, title: "Approval Workflow", desc: "Multi-level approval chain with manager and finance review" },
];

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  function getFieldError(field: "email" | "password" | "confirm"): string | null {
    if (field === "email") {
      if (!emailTouched) return null;
      if (!email.trim()) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address";
    }
    if (field === "password") {
      if (!passwordTouched) return null;
      if (!password) return "Password is required";
      if (mode === "signin" && password.length < 6) return "Password must be at least 6 characters";
      if (mode === "signup" && password.length < 8) return "Password must be at least 8 characters";
    }
    if (field === "confirm") {
      if (!confirmTouched) return null;
      if (!confirmPassword) return "Please confirm your password";
      if (confirmPassword !== password) return "Passwords do not match";
    }
    return null;
  }

  const switchMode = useCallback((newMode: AuthMode) => {
    setIsTransitioning(true);
    setError(null);
    setMessage(null);
    setEmailTouched(false);
    setPasswordTouched(false);
    setConfirmTouched(false);
    setTimeout(() => {
      setMode(newMode);
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 150);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/dashboard";
        return;
      }

      if (mode === "signup") {
        if (confirmPassword !== password) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email for a confirmation link to complete your registration.");
        setLoading(false);
        return;
      }

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
        });
        if (error) throw error;
        setMessage("Password reset instructions have been sent to your email.");
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setLoading(false);
    }
  }

  const strength = getPasswordStrength(password);

  return (
    <div className="min-h-screen flex">
      {/* ──── Left Panel — Branding ──── */}
      <div
        className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #1e3a8a 100%)",
          backgroundSize: "200% 200%",
          animation: "auth-gradient-shift 15s ease infinite",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full border border-white/5"
          style={{ animation: "auth-pulse-ring 4s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full border border-white/5"
          style={{ animation: "auth-pulse-ring 4s ease-in-out infinite 1s" }}
        />

        {/* Floating dots */}
        <div
          className="absolute top-1/3 right-12 w-3 h-3 rounded-full bg-blue-400/20"
          style={{ animation: "auth-float 6s ease-in-out infinite" }}
        />
        <div
          className="absolute top-1/2 right-24 w-2 h-2 rounded-full bg-blue-400/15"
          style={{ animation: "auth-float 6s ease-in-out infinite 2s" }}
        />
        <div
          className="absolute bottom-1/3 left-20 w-4 h-4 rounded-full bg-blue-400/10"
          style={{ animation: "auth-float 6s ease-in-out infinite 4s" }}
        />

        {/* Top: Logo + headline */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <Image
              src="/logo.jpeg"
              alt="NLSD Logo"
              width={56}
              height={56}
              className="rounded-xl shadow-lg shadow-black/20"
            />
            <div>
              <h1 className="text-white text-2xl font-bold tracking-tight">NLSD</h1>
              <p className="text-blue-300/80 text-sm">WorkHub Portal</p>
            </div>
          </div>

          <h2
            className="text-white text-4xl font-bold leading-tight mb-4"
            style={{ animation: "auth-fade-up 0.6s ease-out" }}
          >
            Streamline your
            <br />
            <span className="text-blue-400">work management</span>
          </h2>
          <p
            className="text-slate-400 text-base leading-relaxed max-w-md"
            style={{ animation: "auth-fade-up 0.6s ease-out 0.1s both" }}
          >
            Timesheets, expenses, and approvals — all in one place.
            Track time, manage costs, and keep your team aligned.
          </p>
        </div>

        {/* Middle: Feature bullets */}
        <div
          className="relative z-10 space-y-5"
          style={{ animation: "auth-fade-up 0.6s ease-out 0.2s both" }}
        >
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className="flex items-start gap-4"
              style={{ animation: `auth-fade-up 0.5s ease-out ${0.3 + i * 0.1}s both` }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                <feature.icon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white text-sm font-semibold">{feature.title}</h3>
                <p className="text-slate-400 text-sm mt-0.5">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom: Social proof */}
        <div
          className="relative z-10"
          style={{ animation: "auth-fade-up 0.6s ease-out 0.6s both" }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex -space-x-2">
              {["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"].map((bg, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full ${bg} border-2 border-slate-900 flex items-center justify-center text-white text-xs font-bold`}
                >
                  {["J", "A", "M", "S"][i]}
                </div>
              ))}
            </div>
            <p className="text-slate-400 text-sm">
              Trusted by <span className="text-white font-semibold">your team</span>
            </p>
          </div>
          <p className="text-slate-500 text-xs">Enterprise-grade security with Supabase Auth</p>
        </div>
      </div>

      {/* ──── Right Panel — Form ──── */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white min-h-screen">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Image src="/logo.jpeg" alt="NLSD Logo" width={48} height={48} className="rounded-xl" />
            <div>
              <h1 className="text-gray-900 text-xl font-bold">NLSD</h1>
              <p className="text-gray-400 text-xs">WorkHub Portal</p>
            </div>
          </div>

          {/* Title */}
          <div style={{ animation: "auth-fade-up 0.4s ease-out" }}>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              {mode === "signin" && "Welcome back"}
              {mode === "signup" && "Create your account"}
              {mode === "forgot" && "Reset your password"}
            </h2>
            <p className="text-gray-400 text-sm mb-8">
              {mode === "signin" && "Enter your credentials to access your dashboard"}
              {mode === "signup" && "Fill in your details to get started"}
              {mode === "forgot" && "We\u2019ll send you a link to reset your password"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2"
              style={{ animation: "auth-fade-up 0.3s ease-out" }}
            >
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-red-500 text-xs font-bold">!</span>
              </div>
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {message && (
            <div
              className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm flex items-start gap-2"
              style={{ animation: "auth-fade-up 0.3s ease-out" }}
            >
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {/* Form */}
          <div
            className={cn(
              "transition-all duration-200 ease-out",
              isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            )}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="you@company.com"
                    required
                    className={cn(
                      "w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all duration-200",
                      "bg-gray-50 focus:bg-white",
                      "outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                      getFieldError("email")
                        ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                        : "border-gray-200"
                    )}
                  />
                </div>
                {getFieldError("email") && (
                  <p className="text-red-500 text-xs mt-1.5" style={{ animation: "auth-fade-up 0.15s ease-out" }}>
                    {getFieldError("email")}
                  </p>
                )}
              </div>

              {/* Password */}
              {mode !== "forgot" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                      placeholder={mode === "signup" ? "Min. 8 characters" : "Enter your password"}
                      required
                      minLength={mode === "signup" ? 8 : 6}
                      className={cn(
                        "w-full pl-10 pr-12 py-3 rounded-xl border text-sm transition-all duration-200",
                        "bg-gray-50 focus:bg-white",
                        "outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        getFieldError("password")
                          ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                          : "border-gray-200"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {getFieldError("password") && (
                    <p className="text-red-500 text-xs mt-1.5" style={{ animation: "auth-fade-up 0.15s ease-out" }}>
                      {getFieldError("password")}
                    </p>
                  )}

                  {/* Password strength (signup) */}
                  {mode === "signup" && password.length > 0 && (
                    <div className="mt-2.5" style={{ animation: "auth-fade-up 0.2s ease-out" }}>
                      <div className="flex gap-1.5 mb-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                i < strength.score ? strength.color : "bg-transparent"
                              )}
                              style={{
                                width: i < strength.score ? "100%" : "0%",
                                animation: i < strength.score ? "auth-strength-appear 0.3s ease-out" : "none",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <p
                        className={cn(
                          "text-xs font-medium",
                          strength.score <= 1 ? "text-red-500" :
                          strength.score === 2 ? "text-yellow-600" :
                          strength.score === 3 ? "text-blue-600" :
                          "text-emerald-600"
                        )}
                      >
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm password (signup) */}
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => setConfirmTouched(true)}
                      placeholder="Re-enter your password"
                      required
                      className={cn(
                        "w-full pl-10 pr-12 py-3 rounded-xl border text-sm transition-all duration-200",
                        "bg-gray-50 focus:bg-white",
                        "outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        getFieldError("confirm")
                          ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                          : confirmPassword && confirmPassword === password
                            ? "border-emerald-300 focus:ring-emerald-200 focus:border-emerald-400"
                            : "border-gray-200"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {confirmPassword && confirmPassword === password && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        <Check className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                  </div>
                  {getFieldError("confirm") && (
                    <p className="text-red-500 text-xs mt-1.5" style={{ animation: "auth-fade-up 0.15s ease-out" }}>
                      {getFieldError("confirm")}
                    </p>
                  )}
                </div>
              )}

              {/* Remember me + Forgot (signin) */}
              {mode === "signin" && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div
                      onClick={() => setRememberMe(!rememberMe)}
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 cursor-pointer",
                        rememberMe
                          ? "bg-primary border-primary"
                          : "border-gray-300 group-hover:border-gray-400"
                      )}
                    >
                      {rememberMe && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span
                      className="text-sm text-gray-600 select-none"
                      onClick={() => setRememberMe(!rememberMe)}
                    >
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2",
                  "bg-primary text-white hover:bg-primary/90",
                  "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                  "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none",
                  mode !== "forgot" ? "mt-6" : "mt-2"
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === "signin" && "Sign In"}
                    {mode === "signup" && "Create Account"}
                    {mode === "forgot" && "Send Reset Link"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Mode switch */}
            <div className="mt-8 text-center">
              {mode === "signin" && (
                <p className="text-sm text-gray-500">
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => switchMode("signup")}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    Create one
                  </button>
                </p>
              )}
              {mode === "signup" && (
                <p className="text-sm text-gray-500">
                  Already have an account?{" "}
                  <button
                    onClick={() => switchMode("signin")}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              )}
              {mode === "forgot" && (
                <p className="text-sm text-gray-500">
                  Remember your password?{" "}
                  <button
                    onClick={() => switchMode("signin")}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    Back to sign in
                  </button>
                </p>
              )}
            </div>

            {/* Footer */}
            <p className="mt-10 text-center text-xs text-gray-300">
              &copy; {new Date().getFullYear()} NLSD. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
