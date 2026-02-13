import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { Share } from 'lucide-react';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('Stories');

  const userData = {
    name: "Felix Designer",
    handle: "@felix_uiux",
    followers: "1.2k",
    following: "850",
    bio: "UI Designer & Content Creator. Visualizing the world through simple interfaces. Coffee addict and minimalist. ☕️✨",
    genres: ["UI/UX", "Design", "Art"],
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
  };

  const tabs = ['Stories', 'Saved', 'Activity'];

  const stories = [
    {
      id: 1,
      title: "Fragment Memories #1",
      excerpt: "Continuing the saga from where the last moon fell...",
      likes: "1.2K",
      saves: "100",
      date: "OCT 24, 2023"
    },
    {
      id: 2,
      title: "Fragment Memories #2",
      excerpt: "Continuing the saga from where the last moon fell...",
      likes: "1.2K",
      saves: "100",
      date: "OCT 24, 2023"
    }
  ];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-white">
        <Navbar title="User Profile" />

        <main className="flex-1 overflow-y-auto pt-10 px-6 pb-10">
          <div className="max-w-5xl mx-auto">

            {/* Profile Header Card */}
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 relative shadow-sm">
              <div className="h-48 bg-gradient-to-r from-red-100 to-amber-50"></div>
              <div className="px-8 pb-8">
                {/* Avatar */}
                <div className="relative -mt-16 mb-4">
                  <div className="w-32 h-32 rounded-3xl border-4 border-white overflow-hidden bg-white shadow-xl">
                    <img
                      src={userData.avatar}
                      className="w-full h-full object-cover"
                      alt="Profile"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold">{userData.name}</h1>
                    <p className="text-slate-500">{userData.handle}</p>
                    <p className="mt-4 text-slate-600 max-w-lg">{userData.bio}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to="/edit-profile"
                      className="px-4 py-2 border border-slate-200 rounded-xl font-medium text-sm hover:bg-slate-50"
                    >
                      Edit Profile
                    </Link>
                    <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50">
                      <Share className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-8 mt-8 border-t border-slate-50 pt-8">
                  <div>
                    <span className="font-bold">{stories.length}</span>{" "}
                    <span className="text-slate-400 text-sm">Posts</span>
                  </div>
                  <div>
                    <span className="font-bold">{userData.followers}</span>{" "}
                    <span className="text-slate-400 text-sm">Followers</span>
                  </div>
                  <div>
                    <span className="font-bold">{userData.following}</span>{" "}
                    <span className="text-slate-400 text-sm">Following</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content: Bio, Genres, Stories/Saved/Activity */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">

              {/* Sidebar: Bio & Genres */}
              <div className="md:col-span-4">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-xs font-bold text-gray-900 tracking-widest uppercase mb-4">Bio</h2>
                  <p className="text-sm text-gray-500 italic leading-relaxed mb-8">{userData.bio}</p>

                  <h2 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-4">Preferred Genres</h2>
                  <div className="flex flex-wrap gap-2">
                    {userData.genres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-red-400 text-white text-[10px] font-bold rounded-full cursor-default"
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
                <div className="flex gap-8 border-b border-gray-200 mb-6 px-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-3 text-sm font-bold tracking-wide transition-colors relative ${
                        activeTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {tab}
                      {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-400" />}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="space-y-4">
                  {stories.map((story) => (
                    <div key={story.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <div className="mb-2">
                        <h3 className="text-xl font-serif font-bold text-gray-800">{story.title}</h3>
                      </div>
                      <p className="text-sm text-gray-400 italic mb-6">{story.excerpt}</p>
                      <div className="flex items-center justify-end gap-6 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                        <div className="flex items-center gap-1"><span>{story.likes} likes</span></div>
                        <div className="flex items-center gap-1"><span>{story.saves} Saves</span></div>
                        <div>{story.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
