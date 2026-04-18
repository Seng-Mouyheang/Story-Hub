import React, { useState, useEffect, useMemo } from "react";
import { Search, Sun, Moon, User } from "lucide-react";
import { Link } from "react-router-dom";

export default function Navbar({ title }) {
  const [darkMode, setDarkMode] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
      return null;
    }
  }, []);

  // Toggle Theme Function
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Apply dark mode class to HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    let isMounted = true;

    if (!currentUser?.id) {
      return;
    }

    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const loadProfileAvatar = async () => {
      try {
        const response = await fetch(`/api/profile/${currentUser.id}`, {
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
  }, [currentUser?.id]);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Title */}
      <h2 className="text-base sm:text-lg font-semibold truncate pl-10 lg:pl-0">
        {title}
      </h2>

      {/* Right Side */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search Bar */}
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-1.5 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-red-200 outline-none w-40 md:w-64"
          />
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-slate-600 transition"
        >
          {darkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Profile Avatar */}
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
