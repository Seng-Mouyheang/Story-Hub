import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Shield, Trash2, LogOut, Loader2 } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { changePassword, deleteAccount } from "../api/auth/authApi";

export default function Settings() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Clear local auth state even if the network request fails.
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("rememberLogin");
      navigate("/login", { replace: true });
    }
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentFieldError, setCurrentFieldError] = useState("");
  const [newFieldError, setNewFieldError] = useState("");
  const [confirmFieldError, setConfirmFieldError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFieldError, setDeleteFieldError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Ensure no password values persist when opening the Settings page
  useEffect(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setDeletePassword("");
  }, []);

  const handleChangePassword = async () => {
    setError("");
    setMessage("");

    // client-side validations
    setCurrentFieldError("");
    setNewFieldError("");
    setConfirmFieldError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmFieldError("New passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      // Clear stale token immediately so no further API calls fire with revoked credentials
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      setMessage("Password updated. Please log in again.");
      setCurrentFieldError("");
      setNewFieldError("");
      setConfirmFieldError("");
      setTimeout(() => {
        navigate("/login", {
          state: { message: "Password changed. Please log in again." },
        });
      }, 1500);
    } catch (err) {
      const msg = err?.message || "Failed to change password.";
      // Map validation messages to field-level errors when possible
      if (/invalid credentials/i.test(msg)) {
        setCurrentFieldError("Current password is incorrect.");
      } else if (/current/i.test(msg) && /required/i.test(msg)) {
        setCurrentFieldError(msg);
      } else if (
        /new password/i.test(msg) ||
        /password must/i.test(msg) ||
        /uppercase|number|symbol/i.test(msg)
      ) {
        setNewFieldError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError("");
    setMessage("");

    if (!deletePassword) {
      setDeleteFieldError(
        "Please enter your current password to delete account.",
      );
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete your account? This action can be recovered later.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount({ currentPassword: deletePassword });
      navigate("/signup", { replace: true });
    } catch (err) {
      const msg = err?.message || "Failed to delete account.";
      if (/invalid credentials/i.test(msg)) {
        setDeleteFieldError("Current password is incorrect.");
      } else if (/current/i.test(msg) && /required/i.test(msg)) {
        setDeleteFieldError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Settings" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10">
            <div className="flex justify-center">
              <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 flex flex-col items-center">
                <h2 className="text-lg font-semibold mb-6 text-center">
                  Account Settings
                </h2>

                {/* Change Password */}
                <div className="w-full mb-8">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Change Password
                  </h3>

                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type={showCurrent ? "text" : "password"}
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          setCurrentFieldError("");
                          setError("");
                          setDeleteFieldError("");
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-100"
                      />
                      {currentFieldError && (
                        <p className="mt-1 text-sm text-rose-600 text-center">
                          {currentFieldError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowCurrent((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        aria-label={
                          showCurrent
                            ? "Hide current password"
                            : "Show current password"
                        }
                      >
                        {showCurrent ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setNewFieldError("");
                          setError("");
                          setConfirmFieldError("");
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-100"
                      />
                      {newFieldError && (
                        <p className="mt-1 text-sm text-rose-600 text-center">
                          {newFieldError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNew((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        aria-label={
                          showNew ? "Hide new password" : "Show new password"
                        }
                      >
                        {showNew ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setNewFieldError("");
                          setError("");
                          setConfirmFieldError("");
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-100"
                      />
                      {confirmFieldError && (
                        <p className="mt-1 text-sm text-rose-600 text-center">
                          {confirmFieldError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        aria-label={
                          showConfirm
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirm ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={isSaving}
                      className="w-full py-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isSaving ? "Saving..." : "Change Password"}
                    </button>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="w-full border-t border-slate-100 pt-6">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-600" /> Delete Account
                  </h3>

                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type={showCurrent ? "text" : "password"}
                        placeholder="Current password"
                        value={deletePassword}
                        onChange={(e) => {
                          setDeletePassword(e.target.value);
                          setError("");
                          setDeleteFieldError("");
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-100"
                      />
                      {deleteFieldError && (
                        <p className="mt-1 text-sm text-rose-600 text-center">
                          {deleteFieldError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowCurrent((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        aria-label={
                          showCurrent ? "Hide password" : "Show password"
                        }
                      >
                        {showCurrent ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="w-full py-3 bg-white text-rose-600 border border-rose-600 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isDeleting && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {isDeleting ? "Deleting..." : "Delete Account"}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="mt-4 text-sm text-rose-600 text-center">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="mt-4 text-sm text-emerald-600 text-center">
                    {message}
                  </p>
                )}

                {/* Logout — mobile only, stays left-aligned */}
                <div className="lg:hidden w-full border-t border-slate-100 pt-6 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-500 hover:border-rose-200 transition-colors text-sm font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
            <SiteFooter />
          </div>
        </main>
      </div>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-white sm:rounded-2xl rounded-t-2xl shadow-xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-2">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                <LogOut className="w-5 h-5 text-rose-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Logout of your account?
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                You'll need to sign in again to access your account.
              </p>
            </div>
            <div className="flex flex-col gap-2 px-6 py-4">
              <button
                onClick={handleLogout}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Logout
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-3 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
