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
  Plus,
} from "lucide-react";

/* -------------------- Story Circle -------------------- */
const StoryCircle = ({ name, isAdd = false, image }) => (
  <div className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group transition-transform duration-300 hover:-translate-y-0.5">
    <div
      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${
        isAdd ? "border-gray-200 border-dashed p-1" : "border-blue-400 p-1"
      } relative`}
    >
      <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
            <User size={30} />
          </div>
        )}
      </div>

      {isAdd && (
        <div className="absolute bottom-0 right-0 bg-black text-white rounded-full p-1 border-2 border-white shadow-sm">
          <Plus size={12} />
        </div>
      )}
    </div>

    <span className="text-[11px] sm:text-xs font-medium text-gray-700 whitespace-nowrap">
      {name}
    </span>
  </div>
);

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

      <button className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
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
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-all duration-200">
          <Heart size={20} />
          <span className="text-xs sm:text-sm font-medium">{likes}</span>
        </button>

        <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-all duration-200">
          <MessageCircle size={20} />
          <span className="text-xs sm:text-sm font-medium">{comments}</span>
        </button>
      </div>

      <div className="flex items-center gap-4 sm:ml-auto">
        <button className="text-gray-500 hover:text-black transition-colors duration-200">
          <Bookmark size={20} />
        </button>
        <button className="text-gray-500 hover:text-black transition-colors duration-200">
          <Share2 size={20} />
        </button>
      </div>
    </div>
  </div>
);

/* -------------------- Author Row -------------------- */
const AuthorRow = ({ name, role }) => (
  <div className="flex items-center justify-between gap-3 py-3">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
        <img
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
          alt={name}
        />
      </div>

      <div className="min-w-0">
        <h4 className="font-bold text-sm text-gray-900 truncate">{name}</h4>
        <p className="text-[10px] text-red-500 font-medium">{role}</p>
      </div>
    </div>

    <button className="bg-red-400 hover:bg-red-500 text-white text-[10px] font-bold px-3 sm:px-4 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap">
      Follow
    </button>
  </div>
);

/* -------------------- Home Page -------------------- */
export default function Home() {
  const stories = [
    { name: "Add Story", isAdd: true },
    {
      name: "Jane Doe",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
    },
    {
      name: "Alex Smith",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    },
    {
      name: "Bob Wilson",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
    },
    {
      name: "Sarah Chen",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    },
    {
      name: "Maria Garcia",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    },
  ];

  const posts = [
    {
      author: "Jane Doe",
      genre: "LIFESTYLE",
      time: "2 hours ago",
      title: "A Day in My Creative Journey",
      excerpt:
        "Just started my new project with amazing UI components! The design system is so clean and intuitive. I'm excited to share my progress with everyone.",
      likes: "118K",
      comments: "3K",
    },
    {
      author: "Alex Smith",
      genre: "TECHNOLOGY",
      time: "5 hours ago",
      title: "Building the Future of Web Design",
      excerpt:
        "Looking for collaborators on a new open source design system. DM me if interested! We're creating something revolutionary.",
      likes: "45K",
      comments: "1.2K",
    },
  ];

  const topAuthors = [
    { name: "Hannah Rose", role: "Top Mystery Writer" },
    { name: "Emily Foster", role: "Top Lifestyle Author" },
    { name: "David Chen", role: "Top Tech Writer" },
    { name: "Lisa Park", role: "Top Romance Author" },
  ];

  return (
    <div className="flex min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <Navbar title="Home Feed" />

        {/* Page Content */}
        <main className="flex-1 pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Feed */}
            <div className="flex-1 min-w-0">
              {/* Stories */}
              <section className="bg-white border border-gray-100 rounded-3xl sm:rounded-[40px] p-4 sm:p-6 mb-6 sm:mb-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <h2 className="text-xl sm:text-2xl font-black mb-5 sm:mb-6 px-1 sm:px-2">
                  Stories
                </h2>

                <div className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth">
                  {stories.map((story, i) => (
                    <div key={i} className="snap-start">
                      <StoryCircle {...story} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Posts */}
              <section>
                {posts.map((post, i) => (
                  <PostCard key={i} {...post} />
                ))}
              </section>
            </div>

            {/* Right Sidebar */}
            <aside className="w-full lg:w-72 xl:w-80 xl:sticky xl:top-24 h-fit">
              <div className="bg-white border border-gray-100 rounded-3xl sm:rounded-[40px] p-5 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <h2 className="text-lg sm:text-xl font-black mb-5 sm:mb-6">
                  Top Authors
                </h2>

                <div className="space-y-4 mb-8">
                  {topAuthors.map((author, i) => (
                    <AuthorRow key={i} {...author} />
                  ))}
                </div>

                <button className="w-full text-red-400 text-xs font-bold hover:underline py-2">
                  Show more
                </button>
              </div>
            </aside>
          </div>
        </main>

        <SiteFooter className="text-left lg:text-right" />
      </div>
    </div>
  );
}
