import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  MoreHorizontal,
  User,
} from "lucide-react";

/* -------------------- Post Card -------------------- */
const PostCard = ({ author, genre, time, title, excerpt, likes, comments }) => (
  <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-5 sm:mb-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md">
    {/* Header */}
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
          <img
            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${author}`}
            alt="avatar"
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <h3 className="font-semibold text-slate-900 truncate">{author}</h3>
            <span className="text-slate-400 text-xs">• {time}</span>
          </div>

          <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">
            {genre}
          </span>
        </div>
      </div>

      <button className="text-slate-400 hover:text-slate-600 transition-colors">
        <MoreHorizontal size={20} />
      </button>
    </div>

    {/* Content */}
    <h2 className="text-xl sm:text-2xl font-semibold mb-3 text-slate-900">
      {title}
    </h2>

    <p className="text-slate-600 text-sm leading-relaxed mb-6">{excerpt}</p>

    {/* Actions */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-6">
        <button className="flex items-center gap-2 text-slate-500 hover:text-rose-500 transition">
          <Heart size={20} />
          <span className="text-sm font-medium">{likes}</span>
        </button>

        <button className="flex items-center gap-2 text-slate-500 hover:text-sky-500 transition">
          <MessageCircle size={20} />
          <span className="text-sm font-medium">{comments}</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-rose-500">
          <Bookmark size={20} fill="currentColor" />
        </button>
        <button className="text-slate-500 hover:text-slate-900">
          <Share2 size={20} />
        </button>
      </div>
    </div>
  </div>
);

/* -------------------- Bookmarks Page -------------------- */
export default function Bookmarks() {
  const bookmarks = [
    {
      author: "Jane Doe",
      genre: "LIFESTYLE",
      time: "2 days ago",
      title: "Visualizing System Design",
      excerpt:
        "A deep dive into how we created the visualize platform architecture and best practices...",
      likes: "1.2K",
      comments: "300",
    },
    {
      author: "Alex Smith",
      genre: "TECHNOLOGY",
      time: "5 days ago",
      title: "UI Component Library",
      excerpt:
        "Comprehensive guide to building reusable UI components for faster design and development...",
      likes: "800",
      comments: "120",
    },
    {
      author: "Bob Wilson",
      genre: "DESIGN",
      time: "1 week ago",
      title: "Design Trends 2024",
      excerpt:
        "Latest trends and predictions for UI/UX design in 2024. Stay ahead of the curve...",
      likes: "950",
      comments: "210",
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Section */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Navbar */}
        <Navbar title="Saved Items" />

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                  Saved Stories
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Your bookmarked reads in one focused view.
                </p>
              </div>

              {bookmarks.map((post, i) => (
                <PostCard key={i} {...post} />
              ))}
            </div>
            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
