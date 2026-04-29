import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Camera, User, X } from "lucide-react";
import GenrePicker from "../components/GenrePicker";
import {
  getProfileByUserId,
  updateProfile,
  uploadProfileImage,
  uploadCoverImage,
} from "../api/profile";

const toCanonicalInterest = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const GENRE_OPTIONS = [
  "MYSTERY",
  "FANTASY",
  "ROMANCE",
  "DRAMA",
  "THRILLER",
  "HORROR",
  "SCI-FI",
  "ADVENTURE",
  "ACTION",
  "COMEDY",
  "SLICE OF LIFE",
  "HISTORICAL",
  "CRIME",
  "YOUNG ADULT",
];

const normalizeInterests = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set();

  return values.reduce((accumulator, value) => {
    const canonical = toCanonicalInterest(value);
    if (!canonical) {
      return accumulator;
    }

    const key = canonical.toLowerCase();
    if (seen.has(key)) {
      return accumulator;
    }

    seen.add(key);
    accumulator.push(canonical);
    return accumulator;
  }, []);
};

export default function EditProfile() {
  // Show 'Not yet' only if needsProfileSetup is set in localStorage
  const [showNotYet, setShowNotYet] = useState(() => {
    try {
      return Boolean(localStorage.getItem("needsProfileSetup"));
    } catch {
      return false;
    }
  });
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState([]);
  const [selectedInterest, setSelectedInterest] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadDebug, setUploadDebug] = useState(null);
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

  const currentUserId = useMemo(
    () => String(currentUser?.id || currentUser?._id || "").trim(),
    [currentUser],
  );

  useEffect(() => {
    if (!currentUserId) {
      navigate("/profile", { replace: true });
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      try {
        const payload = await getProfileByUserId(currentUserId);

        if (!isMounted) {
          return;
        }

        setName(payload?.displayName || currentUser.username || "");
        setBio(payload?.bio || "");
        setInterests(normalizeInterests(payload?.interest || []));
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
  }, [currentUser, currentUserId, navigate]);

  const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    const unitIndex = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1,
    );
    const size = bytes / 1024 ** unitIndex;

    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const handleImageUpload = async (file, fieldName) => {
    setErrorMessage("");
    setUploadingField(fieldName);
    setUploadDebug({
      fieldName,
      fileName: file?.name || "unknown",
      fileType: file?.type || "unknown",
      fileSize: formatFileSize(file?.size || 0),
      tokenPresent: Boolean(localStorage.getItem("token")),
      endpoint: "/api/uploadthing",
    });

    try {
      const uploadedUrl =
        fieldName === "profile"
          ? await uploadProfileImage(file)
          : await uploadCoverImage(file);

      if (fieldName === "profile") {
        setProfilePicture(uploadedUrl);
      } else {
        setCoverImage(uploadedUrl);
      }

      setUploadDebug(null);
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
    setErrorMessage("");

    // Profile picture is optional during initial setup

    setIsSaving(true);

    try {
      await updateProfile({
        displayName: name.trim(),
        bio,
        interest: normalizeInterests(interests),
        profilePicture,
        coverImage,
      });

      localStorage.removeItem("needsProfileSetup");

      navigate("/profile");
    } catch (error) {
      setErrorMessage(error?.message || "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    navigate("/profile");
  };

  const handleNotNow = () => {
    localStorage.removeItem("needsProfileSetup");
    setShowNotYet(false);
    navigate("/");
  };

  const handleAddInterest = (interestValue = selectedInterest) => {
    const canonicalInterest = toCanonicalInterest(interestValue);
    if (!canonicalInterest) {
      return;
    }

    const exists = interests.some(
      (interestValue) =>
        String(interestValue || "")
          .trim()
          .toLowerCase() === canonicalInterest.toLowerCase(),
    );

    if (!exists) {
      setInterests((previous) => [...previous, canonicalInterest]);
    }

    setSelectedInterest("");
  };

  const handleRemoveInterest = (indexToRemove) => {
    setInterests((previous) =>
      previous.filter((_, index) => index !== indexToRemove),
    );
  };

  const previewProfileImage = profilePicture || null;

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <Navbar title="Edit Profile" />
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-100">
                <div className="mb-8 rounded-xl border border-rose-100 bg-rose-50/70 px-4 py-3">
                  <h3 className="font-bold text-lg text-rose-700">
                    Edit Profile Information
                  </h3>
                </div>
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
                          handleImageUpload(file, "cover");
                        }
                        event.target.value = "";
                      }}
                    />
                  </div>

                  {/* Profile Picture */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 relative group overflow-hidden">
                      {previewProfileImage ? (
                        <img
                          src={previewProfileImage}
                          className="w-full h-full object-cover"
                          alt="Profile"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                          <User className="w-7 h-7" />
                        </div>
                      )}
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
                          handleImageUpload(file, "profile");
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

                  <div>
                    <label
                      htmlFor="preferred-genres"
                      className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
                    >
                      Preferred Genres
                    </label>

                    <div className="flex gap-2 mb-3">
                      <GenrePicker
                        id="preferred-genres"
                        value={selectedInterest}
                        onChange={handleAddInterest}
                        options={GENRE_OPTIONS}
                        placeholder="Select preferred genre"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {interests.map((interestValue, index) => (
                        <span
                          key={`${interestValue}-${index}`}
                          className="flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-600 text-[11px] font-semibold rounded-md uppercase tracking-tight"
                        >
                          {interestValue}
                          <X
                            size={12}
                            className="cursor-pointer ml-1 hover:text-rose-700"
                            onClick={() => handleRemoveInterest(index)}
                          />
                        </span>
                      ))}
                    </div>
                  </div>

                  {errorMessage ? (
                    <div className="space-y-2">
                      <p className="text-sm text-red-500">{errorMessage}</p>
                      {uploadDebug ? (
                        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700 space-y-1">
                          <p className="font-semibold">Upload debug</p>
                          <p>Field: {uploadDebug.fieldName}</p>
                          <p>File: {uploadDebug.fileName}</p>
                          <p>Type: {uploadDebug.fileType}</p>
                          <p>Size: {uploadDebug.fileSize}</p>
                          <p>
                            Token found:{" "}
                            {uploadDebug.tokenPresent ? "yes" : "no"}
                          </p>
                          <p>Endpoint: {uploadDebug.endpoint}</p>
                          {!uploadDebug.tokenPresent ? (
                            <p>Log in again, then retry the upload.</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                    {showNotYet ? (
                      <button
                        type="button"
                        onClick={handleNotNow}
                        className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
                      >
                        Not yet
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDiscard}
                        className="flex-1 px-6 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200"
                      >
                        Discard
                      </button>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={isSaving || Boolean(uploadingField)}
                      className="flex-1 py-3 bg-rose-500 text-white text-sm font-semibold rounded-xl hover:bg-rose-600 shadow-sm shadow-rose-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
