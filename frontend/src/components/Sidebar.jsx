import React, { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  Home,
  Compass,
  MessageSquare,
  Bookmark,
  User,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => (location.pathname === path ? "active-link" : "");

  const handleLogout = async () => {
    const token = localStorage.getItem("token");

    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      // Clear local auth state even if the network request fails.
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("rememberLogin");
      setMobileOpen(false);
      navigate("/login", { replace: true });
    }
  };

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/explore", icon: Compass, label: "Explore" },
    { path: "/confession", icon: MessageSquare, label: "Confession" },
    { path: "/profile", icon: User, label: "Profile" },
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/bookmarks", icon: Bookmark, label: "Bookmark" },
  ];

  const sidebarBody = (
    <>
      {/* Logo + Toggle */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            Story-Hub
          </h1>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:inline-flex p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-4 space-y-1 px-2 flex-1 overflow-y-auto pb-4">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                ${
                  isActive(item.path)
                    ? "active-link"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }
              `}
            >
              <Icon className="w-5 h-5 shrink-0" />

              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Trending Tags */}
      {!isCollapsed && (
        <div className="px-4 mt-2">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
            Trending Tags #
          </h3>

          <div className="space-y-3">
            {[
              "#DailyLifeAsGenZ",
              "#CampusStory",
              "#StudyMood",
              "#LateNightThoughts",
            ].map((tag, index) => (
              <a
                key={index}
                href="#"
                className="block text-slate-600 text-sm hover:text-rose-500 transition-colors"
              >
                {tag}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Buttons */}
      <div className="w-full p-3 border-t border-slate-200 space-y-2 bg-white/95">
        <Link
          to="/write"
          onClick={() => setMobileOpen(false)}
          className="bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <FileText className="w-4 h-4" />
          {!isCollapsed && "Write Post"}
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="text-slate-500 py-2 text-sm flex items-center justify-center gap-2 hover:text-rose-500 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && "Logout"}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-white/95 border border-slate-200 shadow-sm"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      {/* Mobile overlay drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/30"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation overlay"
        />

        <aside
          className={`relative h-full w-72 max-w-[85vw] bg-white/95 border-r border-slate-200 flex flex-col transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="pt-2 h-full flex flex-col">{sidebarBody}</div>
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col bg-white/95 border-r border-slate-200 h-screen sticky top-0 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarBody}
      </aside>
    </>
  );
}
