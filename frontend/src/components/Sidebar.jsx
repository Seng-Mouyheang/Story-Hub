import React, { useState } from "react";
import { useLocation, Link } from "react-router-dom";
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
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path) =>
    location.pathname === path ? "active-link" : "";

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/explore", icon: Compass, label: "Explore" },
    { path: "/confession", icon: MessageSquare, label: "Confession" },
    { path: "/profile", icon: User, label: "Profile" },
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/bookmarks", icon: Bookmark, label: "Bookmark" },
  ];

  return (
    <aside
      className={`bg-white border-r border-slate-100 h-screen sticky top-0 transition-all duration-300
      ${isCollapsed ? "w-20" : "w-64"}`}
    >
      {/* Logo + Toggle */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <h1 className="text-lg font-bold flex items-center gap-2">
            <div className="w-8 h-8 bg-red-400 rounded-lg flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            Story-Hub
          </h1>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-4 space-y-1 px-2">
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
                    : "text-slate-500 hover:bg-slate-50"
                }
              `}
            >
              <Icon className="w-5 h-5 shrink-0" />

              {/* Text hides when collapsed */}
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Trending Tags Section Added Back */}
      {!isCollapsed && (
        <div className="px-4 mt-6">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">
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
                className="block text-gray-600 text-sm hover:text-black transition-colors"
              >
                {tag}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Buttons */}
      <div className="absolute bottom-0 w-full p-3 border-t border-slate-100 space-y-2">
        {/* Write Post Button */}
        <Link
          to="/write"
          className="bg-red-400 text-white py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90"
        >
          <FileText className="w-4 h-4" />
          {!isCollapsed && "Write Post"}
        </Link>

        {/* Logout Button */}
        <Link
          to="/login"
          className="text-slate-400 py-2 text-sm flex items-center justify-center gap-2 hover:text-slate-600"
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && "Logout"}
        </Link>
      </div>
    </aside>
  );
}
