import React, { useState, useEffect } from "react";
import { Search, Sun, Moon } from "lucide-react";
import { Link } from "react-router-dom";

export default function Navbar({ title }) {
  const [darkMode, setDarkMode] = useState(false);

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

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-10 px-8 flex items-center justify-between">
      {/* Title */}
      <h2 className="text-lg font-semibold">{title}</h2>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-1.5 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-red-200 outline-none w-64"
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
          className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden cursor-pointer"
        >
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
            alt="User"
          />
        </Link>
      </div>
    </header>
  );
}
