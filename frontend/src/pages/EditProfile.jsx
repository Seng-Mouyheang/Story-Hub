import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Camera } from "lucide-react";
import { uploadFiles } from "../lib/uploadthing";

export default function EditProfile() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const profileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
      return null;
    }
  }, []);

  const fallbackAvatar = useMemo(() => {
    const stableSeed = String(
      currentUser?.id || currentUser?.username || "storyhub-user",
    );
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(stableSeed)}`;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.id) {
      navigate("/profile", { replace: true });
      return;
    }

    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    let isMounted = true;

    const loadProfile = async () => {
      try {
        const response = await fetch(`/api/profile/${currentUser.id}`, {
          headers,
        });

        if (!response.ok) {
          throw new Error("Failed to load profile");
        }

        const payload = await response.json();

        if (!isMounted) {
          return;
        }

        setName(payload?.displayName || currentUser.username || "");
        setBio(payload?.bio || "");
        setProfilePicture(payload?.profilePicture || "");
        setCoverImage(payload?.coverImage || "");
      } catch {
        if (isMounted) {
          setName(currentUser.username || "");
          setErrorMessage("Unable to load your current profile.");
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [currentUser, navigate]);

  const handleImageUpload = async (endpoint, file, fieldName) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setErrorMessage("You need to log in again before uploading images.");
      return;
    }

    setErrorMessage("");
    setUploadingField(fieldName);

    try {
      const [uploadedFile] = await uploadFiles(endpoint, {
        files: [file],
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const uploadedUrl = uploadedFile?.ufsUrl || "";

      if (!uploadedUrl) {
        throw new Error("Upload completed without a file URL");
      }

      if (fieldName === "profile") {
        setProfilePicture(uploadedUrl);
      } else {
        setCoverImage(uploadedUrl);
      }
    } catch (error) {
      console.error(`Upload failed for ${fieldName}:`, error);
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : `Failed to upload ${fieldName} image.`,
      );
    } finally {
      setUploadingField("");
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setErrorMessage("You need to log in again before saving your profile.");
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: name.trim(),
          bio,
          profilePicture,
          coverImage,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to save profile");
      }

      navigate("/profile");
    } catch (error) {
      setErrorMessage(error.message || "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    navigate("/profile");
  };

  const previewProfileImage = profilePicture || fallbackAvatar;

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <Navbar title="Edit Dashboard" />
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-100">
                <h3 className="font-bold text-lg mb-8">
                  Edit Profile Information
                </h3>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="h-40 rounded-3xl overflow-hidden border border-slate-200 bg-slate-100">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-linear-to-r from-rose-100 via-orange-50 to-amber-100" />
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-sm">Cover Image</h4>
                        <p className="text-xs text-slate-400">
                          Recommended size: 1500x500px
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingField === "cover"}
                        className="px-4 py-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                      >
                        {uploadingField === "cover"
                          ? "Uploading..."
                          : "Upload Cover"}
                      </button>
                    </div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          handleImageUpload("coverImage", file, "cover");
                        }
                        event.target.value = "";
                      }}
                    />
                  </div>

                  {/* Profile Picture */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 relative group overflow-hidden">
                      <img
                        src={previewProfileImage}
                        className="w-full h-full object-cover"
                        alt="Profile"
                      />
                      <button
                        type="button"
                        onClick={() => profileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                      >
                        <Camera className="text-white w-6 h-6" />
                      </button>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Profile Picture</h4>
                      <p className="text-xs text-slate-400">
                        Recommended size: 400x400px
                      </p>
                      <button
                        type="button"
                        onClick={() => profileInputRef.current?.click()}
                        disabled={uploadingField === "profile"}
                        className="mt-3 px-4 py-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                      >
                        {uploadingField === "profile"
                          ? "Uploading..."
                          : "Upload Profile"}
                      </button>
                    </div>
                    <input
                      ref={profileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          handleImageUpload("profileImage", file, "profile");
                        }
                        event.target.value = "";
                      }}
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <label
                      htmlFor="display-name"
                      className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
                    >
                      Display Name
                    </label>
                    <input
                      id="display-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label
                      htmlFor="bio"
                      className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
                    >
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-red-100 h-32 resize-none"
                    />
                  </div>

                  {errorMessage ? (
                    <p className="text-sm text-red-500">{errorMessage}</p>
                  ) : null}

                  {/* Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                    <button
                      onClick={handleDiscard}
                      className="flex-1 px-6 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || Boolean(uploadingField)}
                      className="flex-1 px-6 py-3 bg-red-400 text-white font-bold rounded-xl shadow-lg shadow-red-100 hover:opacity-90 disabled:opacity-60"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
