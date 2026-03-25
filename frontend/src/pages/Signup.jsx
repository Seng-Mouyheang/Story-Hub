import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Feather } from "lucide-react";
import SiteFooter from "../components/SiteFooter";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: name,
          email,
          password,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Signup failed.");
      }

      navigate("/login", {
        state: { message: "Account created successfully. Please log in." },
      });
    } catch (error) {
      setErrorMessage(error.message || "Unable to sign up right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-2">
        <aside className="relative hidden lg:flex overflow-hidden bg-slate-900 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,63,94,0.22),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(251,191,36,0.14),transparent_40%)]" />
          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
            <div className="inline-flex items-center gap-3 text-sm font-semibold tracking-wide text-slate-200">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                <Feather size={18} />
              </span>
              StoryHub
            </div>

            <div className="max-w-md">
              <h2 className="text-4xl font-semibold leading-tight tracking-tight">
                Start your StoryHub account
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-300">
                Share your stories with the world and build your voice with a
                calm, premium writing experience.
              </p>
            </div>

            <p className="text-sm text-slate-400">Publish your perspective.</p>
          </div>
        </aside>

        <section className="flex flex-col px-4 py-6 sm:px-6 lg:px-10">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
              <div className="mb-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 lg:hidden">
                  <Feather size={14} />
                  StoryHub
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[32px]">
                  Create account
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Join StoryHub and start sharing today.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="username"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
                    required
                  />
                  <label
                    htmlFor="agreeTerms"
                    className="text-sm leading-relaxed text-slate-600"
                  >
                    I agree to the
                    <a
                      href="#"
                      className="mx-1 font-medium text-slate-900 transition hover:text-rose-500"
                    >
                      Terms of Service
                    </a>
                    and
                    <a
                      href="#"
                      className="mx-1 font-medium text-slate-900 transition hover:text-rose-500"
                    >
                      Privacy Policy
                    </a>
                  </label>
                </div>

                {errorMessage && (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                  >
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-rose-500 px-4 py-3 text-base font-semibold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-slate-600">
                  Already have an account?
                  <Link
                    to="/login"
                    className="ml-1 font-semibold text-rose-500 transition hover:text-rose-600"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <SiteFooter />
        </section>
      </div>
    </div>
  );
}
