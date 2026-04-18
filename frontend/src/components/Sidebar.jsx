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
      // setMobileOpen(false) removed
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
              // onClick for setMobileOpen(false) removed
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
          // onClick for setMobileOpen(false) removed
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
      {/* Mobile: Facebook-style bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex justify-around items-center py-0.5 shadow-sm lg:hidden h-12">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center px-1 py-0.5 text-[10px] ${
                isActive(item.path)
                  ? "text-rose-500"
                  : "text-slate-500 hover:text-rose-400"
              }`}
              style={{ flex: 1 }}
            >
              <Icon className="w-5 h-5 mb-0" />
              <span className="text-[9px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

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
