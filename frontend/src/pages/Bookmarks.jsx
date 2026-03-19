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
  <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-5 sm:mb-6 border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md">
    {/* Header */}
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
          <img
            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${author}`}
            alt="avatar"
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <h3 className="font-bold text-gray-900 truncate">{author}</h3>
            <span className="text-gray-400 text-xs">• {time}</span>
          </div>

          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
            {genre}
          </span>
        </div>
      </div>

      <button className="text-gray-400 hover:text-gray-600">
        <MoreHorizontal size={20} />
      </button>
    </div>

    {/* Content */}
    <h2 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900">
      {title}
    </h2>

    <p className="text-gray-600 text-sm leading-relaxed mb-6">{excerpt}</p>

    {/* Actions */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-50">
      <div className="flex items-center gap-6">
        <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition">
          <Heart size={20} />
          <span className="text-sm font-medium">{likes}</span>
        </button>

        <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition">
          <MessageCircle size={20} />
          <span className="text-sm font-medium">{comments}</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-red-400">
          <Bookmark size={20} fill="currentColor" />
        </button>
        <button className="text-gray-500 hover:text-black">
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
    <div className="flex min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <Navbar title="Saved Items" />

        {/* Page Content */}
        <main className="flex-1 pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10">
          <div className="max-w-6xl mx-auto">
            {bookmarks.map((post, i) => (
              <PostCard key={i} {...post} />
            ))}
          </div>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
