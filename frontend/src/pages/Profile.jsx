import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Share } from "lucide-react";

export default function Profile() {
  const [activeTab, setActiveTab] = useState("Stories");

  const userData = useMemo(() => {
    let currentUser = null;

    try {
      currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
      currentUser = null;
    }

    const username = currentUser?.username || "StoryHub User";
    const email = currentUser?.email || "";

    return {
      name: username,
      handle: email ? `@${email.split("@")[0]}` : "@storyhub_user",
      followers: "0",
      following: "0",
      bio: "Welcome to your StoryHub profile. Start writing and sharing your stories.",
      genres: ["General"],
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
    };
  }, []);

  const tabs = ["Stories", "Saved", "Activity"];

  const stories = [
    {
      id: 1,
      title: "Fragment Memories #1",
      excerpt: "Continuing the saga from where the last moon fell...",
      likes: "1.2K",
      saves: "100",
      date: "OCT 24, 2023",
    },
    {
      id: 2,
      title: "Fragment Memories #2",
      excerpt: "Continuing the saga from where the last moon fell...",
      likes: "1.2K",
      saves: "100",
      date: "OCT 24, 2023",
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="User Profile" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-6xl mx-auto">
              {/* Profile Header Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 relative shadow-sm">
                <div className="h-36 sm:h-48 bg-gradient-to-r from-rose-100 to-amber-50"></div>
                <div className="px-4 sm:px-8 pb-6 sm:pb-8">
                  {/* Avatar */}
                  <div className="relative -mt-12 sm:-mt-16 mb-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl border-4 border-white overflow-hidden bg-white shadow-xl">
                      <img
                        src={userData.avatar}
                        className="w-full h-full object-cover"
                        alt="Profile"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="min-w-0">
                      <h1 className="text-xl sm:text-2xl font-semibold truncate text-slate-900">
                        {userData.name}
                      </h1>
                      <p className="text-slate-500 truncate font-medium">
                        {userData.handle}
                      </p>
                      <p className="mt-4 text-slate-600 max-w-lg">
                        {userData.bio}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to="/edit-profile"
                        className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-sm hover:bg-slate-100 transition-colors"
                      >
                        Edit Profile
                      </Link>
                      <button className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors">
                        <Share className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 sm:flex sm:gap-8 mt-8 border-t border-slate-50 pt-6 sm:pt-8">
                    <div>
                      <span className="font-semibold text-slate-900">
                        {stories.length}
                      </span>{" "}
                      <span className="text-slate-400 text-sm">Posts</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">
                        {userData.followers}
                      </span>{" "}
                      <span className="text-slate-400 text-sm">Followers</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">
                        {userData.following}
                      </span>{" "}
                      <span className="text-slate-400 text-sm">Following</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content: Bio, Genres, Stories/Saved/Activity */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
                {/* Sidebar: Bio & Genres */}
                <div className="md:col-span-4">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-xs font-semibold text-slate-900 tracking-widest uppercase mb-4">
                      Bio
                    </h2>
                    <p className="text-sm text-slate-600 italic leading-relaxed mb-8">
                      {userData.bio}
                    </p>

                    <h2 className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-4">
                      Preferred Genres
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {userData.genres.map((genre) => (
                        <span
                          key={genre}
                          className="px-3 py-1 bg-rose-500 text-white text-[10px] font-semibold rounded-full cursor-default"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stories / Tabs Area */}
                <div className="md:col-span-8">
                  {/* Tabs */}
                  <div className="flex gap-4 sm:gap-8 border-b border-slate-200 mb-6 px-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-semibold tracking-wide transition-colors relative ${
                          activeTab === tab
                            ? "text-slate-900"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {tab}
                        {activeTab === tab && (
                          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="space-y-4">
                    {stories.map((story) => (
                      <div
                        key={story.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="mb-2">
                          <h3 className="text-xl font-semibold text-slate-900">
                            {story.title}
                          </h3>
                        </div>
                        <p className="text-sm text-slate-500 italic mb-6">
                          {story.excerpt}
                        </p>
                        <div className="flex flex-wrap items-center justify-end gap-4 sm:gap-6 text-[10px] font-semibold text-slate-500 uppercase tracking-tighter">
                          <div className="flex items-center gap-1">
                            <span>{story.likes} likes</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{story.saves} Saves</span>
                          </div>
                          <div>{story.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
