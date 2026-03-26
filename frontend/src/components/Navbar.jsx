import React, { useState, useEffect, useMemo } from "react";
import { Search, Sun, Moon } from "lucide-react";
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

  const fallbackAvatar = useMemo(() => {
    const stableSeed = String(
      currentUser?.id || currentUser?.username || "user",
    );
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(stableSeed)}`;
  }, [currentUser]);

  // Toggle Theme Function
  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
  };

  // Initialize theme from saved preference or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      setDarkMode(true);
      return;
    }

    if (savedTheme === "light") {
      setDarkMode(false);
      return;
    }

    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(prefersDark);
  }, []);

  // Apply dark mode class to HTML
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    let isMounted = true;

    if (!currentUser?.id) {
      setAvatarUrl(fallbackAvatar);
      return;
    }

    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const loadProfileAvatar = async () => {
      try {
        const response = await fetch(`/api/profiles/${currentUser.id}`, {
          headers,
        });

        if (!response.ok) {
          if (isMounted) setAvatarUrl(fallbackAvatar);
          return;
        }

        const profile = await response.json();
        if (isMounted) {
          setAvatarUrl(profile?.profilePicture || fallbackAvatar);
        }
      } catch {
        if (isMounted) {
          setAvatarUrl(fallbackAvatar);
        }
      }
    };

    loadProfileAvatar();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, fallbackAvatar]);

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
          aria-label={
            darkMode ? "Switch to bright theme" : "Switch to dark theme"
          }
          title={darkMode ? "Switch to bright theme" : "Switch to dark theme"}
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
          className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden cursor-pointer"
        >
          <img src={avatarUrl || fallbackAvatar} alt="User" />
        </Link>
      </div>
    </header>
  );
}
