import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Shield, Trash2 } from "lucide-react";
import { changePassword, deleteAccount } from "../api/auth/authApi";

import { Eye, EyeOff } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();

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
      // Backend revokes current token; show message then redirect to login
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
            <div className="max-w-3xl mx-auto">
              <div className="bg-white p-4 sm:p-8 rounded-2xl border border-slate-200">
                <h2 className="text-lg font-semibold mb-4">Account Settings</h2>

                <div className="mb-8">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Change Password
                  </h3>

                  <div className="space-y-3 max-w-md">
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
                        <p className="mt-1 text-sm text-rose-600">
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
                        <p className="mt-1 text-sm text-rose-600">
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
                        <p className="mt-1 text-sm text-rose-600">
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
                    <div className="flex gap-3">
                      <button
                        onClick={handleChangePassword}
                        disabled={isSaving}
                        className="px-4 py-2 bg-rose-500 text-white rounded-xl"
                      >
                        {isSaving ? "Saving..." : "Change Password"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-600" /> Delete Account
                  </h3>

                  <div className="space-y-3 max-w-md">
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
                        <p className="mt-1 text-sm text-rose-600">
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
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-white text-rose-600 border border-rose-600 rounded-xl"
                      >
                        {isDeleting ? "Deleting..." : "Delete Account"}
                      </button>
                    </div>
                  </div>
                </div>

                {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
                {message && (
                  <p className="mt-4 text-sm text-emerald-600">{message}</p>
                )}
              </div>
            </div>
            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
