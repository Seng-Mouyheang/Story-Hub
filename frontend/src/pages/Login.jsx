import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Feather, Eye, EyeOff } from "lucide-react";
import SiteFooter from "../components/SiteFooter";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message || "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Login failed.");
      }

      if (payload?.token) {
        localStorage.setItem("token", payload.token);
      }

      if (payload?.user) {
        localStorage.setItem("currentUser", JSON.stringify(payload.user));
      }

      if (localStorage.getItem("needsProfileSetup") === "true") {
        navigate("/edit-profile", { replace: true });
      } else {
        navigate("/");
      }
    } catch (error) {
      setErrorMessage(error.message || "Unable to login right now.");
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
                Welcome back to StoryHub
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-300">
                Share your stories with the world in a clean, focused space
                inspired by modern social platforms.
              </p>
            </div>

            <p className="text-sm text-slate-400">Write. Reflect. Connect.</p>
          </div>
        </aside>

        <section className="flex flex-col px-4 py-6 sm:px-6 lg:px-10">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
              <div className="mb-8 text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 lg:hidden">
                  <Feather size={14} />
                  StoryHub
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[32px]">
                  Welcome back
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Login to continue your writing journey.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {successMessage && (
                  <p
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
                  >
                    {successMessage}
                  </p>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-500"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                  >
                    {errorMessage}
                  </p>
                )}

                {/* Remember checkbox removed per request */}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-rose-500 px-4 py-3 text-base font-semibold text-white shadow-sm shadow-rose-200 transition hover:bg-rose-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Logging in..." : "Login"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-rose-500 transition hover:text-rose-600"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          <SiteFooter />
        </section>
      </div>
    </div>
  );
}
