import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
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
  <div className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group">
    <div
      className={`w-20 h-20 rounded-full border-2 ${
        isAdd
          ? "border-gray-200 border-dashed p-1"
          : "border-blue-400 p-1"
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
        <div className="absolute bottom-0 right-0 bg-black text-white rounded-full p-1 border-2 border-white">
          <Plus size={12} />
        </div>
      )}
    </div>

    <span className="text-xs font-medium text-gray-700">{name}</span>
  </div>
);

/* -------------------- Post Card -------------------- */
const PostCard = ({
  author,
  genre,
  time,
  title,
  excerpt,
  likes,
  comments,
}) => (
  <div className="bg-white rounded-3xl p-6 mb-6 border border-gray-100 shadow-sm">
    {/* Header */}
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
          <img
            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${author}`}
            alt="avatar"
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900">{author}</h3>
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
    <h2 className="text-2xl font-bold mb-3 text-gray-900">{title}</h2>

    <p className="text-gray-600 text-sm leading-relaxed mb-6">
      {excerpt}
    </p>

    {/* Actions */}
    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
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
        <button className="text-gray-500 hover:text-black">
          <Bookmark size={20} />
        </button>
        <button className="text-gray-500 hover:text-black">
          <Share2 size={20} />
        </button>
      </div>
    </div>
  </div>
);

/* -------------------- Author Row -------------------- */
const AuthorRow = ({ name, role }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
        <img
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
          alt={name}
        />
      </div>

      <div>
        <h4 className="font-bold text-sm text-gray-900">{name}</h4>
        <p className="text-[10px] text-red-500 font-medium">{role}</p>
      </div>
    </div>

    <button className="bg-red-400 hover:bg-red-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-full transition">
      Follow
    </button>
  </div>
);

/* -------------------- Home Page -------------------- */
export default function Home() {
  const stories = [
    { name: "Add Story", isAdd: true },
    { name: "Jane Doe", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" },
    { name: "Alex Smith", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
    { name: "Bob Wilson", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" },
    { name: "Sarah Chen", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
    { name: "Maria Garcia", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria" },
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
    <div className="flex min-h-screen bg-white text-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <Navbar title="Home Feed" />

        {/* Page Content */}
        <main className="pt-10 px-6 pb-10">
          <div className="max-w-6xl mx-auto flex gap-8">
            {/* Feed */}
            <div className="flex-1">
              {/* Stories */}
              <section className="bg-white border border-gray-100 rounded-[40px] p-6 mb-8 shadow-sm">
                <h2 className="text-2xl font-black mb-6 px-2">
                  Stories
                </h2>

                <div className="flex gap-6 overflow-x-auto pb-2">
                  {stories.map((story, i) => (
                    <StoryCircle key={i} {...story} />
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
            <aside className="w-80 sticky top-24 h-fit">
              <div className="bg-white border border-gray-100 rounded-[40px] p-8 shadow-sm">
                <h2 className="text-xl font-black mb-6">
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

              <p className="text-[10px] text-gray-400 text-right mt-6">
                © 2026 Story Hub. All rights reserved.
              </p>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
