import React, { useState, useEffect, useMemo } from "react";
import { User } from "lucide-react";
import { Link } from "react-router-dom";
import SearchBar from "./SearchBar";

export default function Navbar({ title }) {
  // const [darkMode, setDarkMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

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
    let isMounted = true;

    if (!currentUserId) {
      return;
    }

    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const loadProfileAvatar = async () => {
      try {
        const response = await fetch(`/api/profile/${currentUserId}`, {
          headers,
        });

        if (!response.ok) {
          if (isMounted) setAvatarUrl("");
          return;
        }

        const profile = await response.json();
        if (isMounted) {
          setAvatarUrl(profile?.profilePicture || "");
        }
      } catch {
        if (isMounted) {
          setAvatarUrl("");
        }
      }
    };

    loadProfileAvatar();

    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Title */}
      <h2 className="text-base sm:text-lg font-semibold truncate pl-0">
        {title}
      </h2>

      {/* Right Side */}
      <div className="flex items-center gap-0 sm:gap-2 w-auto">
        {/* Desktop: Search Bar left of theme toggle */}
        <div className="hidden sm:block relative w-52 md:w-64 lg:w-96 xl:w-136">
          <SearchBar />
        </div>

        {/* Mobile: Search Icon left of theme toggle */}
        <div className="block sm:hidden">
          <SearchBar />
        </div>

        {/* Profile Avatar always at far right */}
        <Link
          to="/profile"
          className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden cursor-pointer transition-all duration-150 hover:ring-2 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="User"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
              <User className="w-4 h-4" />
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
