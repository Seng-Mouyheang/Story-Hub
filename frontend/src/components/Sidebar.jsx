import React, { useState, useEffect } from "react";
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
  Settings,
  X,
  Menu,
  Plus,
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [fabVisible, setFabVisible] = useState(true);

  const isActive = (path) => (location.pathname === path ? "active-link" : "");

  // Detect scroll direction across both window scroll and inner-container scroll.
  useEffect(() => {
    let lastY = 0;

    const onScroll = (e) => {
      const el =
        e.target === document ? document.documentElement : e.target;
      const current =
        el === document.documentElement ? window.scrollY : el.scrollTop;

      if (Math.abs(current - lastY) < 4) return;
      setFabVisible(current <= lastY);
      lastY = current;
    };

    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

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
      setIsMobileOpen(false);
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
    { path: "/settings", icon: Settings, label: "Settings" },
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

      {/* Bottom Buttons */}
      <div className="w-full p-3 border-t border-slate-200 space-y-2 bg-white/95">
        <Link
          to="/write"
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
      {/* Mobile: hamburger button — sits in the pl-10 space reserved by Navbar */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-0 left-0 z-50 w-10 h-16 flex items-center justify-center text-slate-600 hover:text-rose-500 transition-all duration-300 lg:hidden"
        style={{
          opacity: fabVisible ? 1 : 0,
          pointerEvents: fabVisible ? "auto" : "none",
        }}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile: backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile: slide-out drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white flex flex-col shadow-2xl transition-transform duration-300 lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            Story-Hub
          </h1>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer navigation */}
        <nav className="mt-4 space-y-1 px-2 flex-1 overflow-y-auto pb-4">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                  ${
                    isActive(item.path)
                      ? "active-link"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }
                `}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Drawer bottom buttons */}
        <div className="w-full p-3 border-t border-slate-200 shrink-0">
          <Link
            to="/write"
            onClick={() => setIsMobileOpen(false)}
            className="bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Write Post
          </Link>
        </div>
      </aside>

      {/* Mobile: FAB (write post) */}
      <button
        type="button"
        onClick={() => navigate("/write")}
        aria-label="Write post"
        className="fixed bottom-16 right-4 z-40 lg:hidden w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(244,63,94,0.45)] hover:bg-rose-600 hover:scale-110 active:scale-95 transition-all duration-300"
        style={{
          opacity: fabVisible ? 1 : 0,
          pointerEvents: fabVisible ? "auto" : "none",
        }}
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} />
      </button>

      {/* Mobile: bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex justify-around items-center py-0.5 shadow-sm lg:hidden h-12 transition-all duration-300"
        style={{
          opacity: fabVisible ? 1 : 0,
          pointerEvents: fabVisible ? "auto" : "none",
        }}
      >
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
