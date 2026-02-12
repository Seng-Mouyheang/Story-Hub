import React from "react";
import { useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  MessageSquare,
  Bookmark,
  BarChart3,
  User,
  LogOut,
  FileText,
  BookOpen,
} from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path ? "active-link" : "";

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Home" },
    { path: "/explore", icon: Search, label: "Explore" },
    { path: "/confession", icon: MessageSquare, label: "Confessions" },
    { path: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
    { path: "/dashboard", icon: BarChart3, label: "Dashboard" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 overflow-y-auto custom-scrollbar">
      
      {/* Logo Section */}
      <div className="p-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <div className="w-8 h-8 bg-red-400 rounded-lg flex items-center justify-center text-white">
            <BookOpen className="w-5 h-5" />
          </div>
          Story-Hub
        </h1>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive(item.path)
                  ? "active-link"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Buttons */}
      <div className="p-4 border-t border-slate-100">
        
        {/* Write Post Button */}
        <Link
          to="/write"
          className="w-full bg-red-400 text-white py-2 rounded-xl font-medium shadow-lg shadow-red-100 hover:opacity-90 transition-all block text-center text-sm flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Write Post
        </Link>

        {/* Logout Button */}
        <Link
          to="/login"
          className="w-full mt-2 text-slate-400 py-2 text-sm flex items-center justify-center gap-2 hover:text-slate-600"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Link>
      </div>
    </aside>
  );
}
