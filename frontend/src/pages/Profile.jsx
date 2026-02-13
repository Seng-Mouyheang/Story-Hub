import React from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { Share } from 'lucide-react';

export default function Profile() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col bg-white">
        <Navbar title="User Profile" />
        <main className="flex-1 overflow-y-auto pt-10 px-6 pb-10">
          <div className="max-w-5xl mx-auto">
            <div className="space-y-8">
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 relative shadow-sm">
              <div className="h-48 bg-gradient-to-r from-red-100 to-amber-50"></div>
              <div className="px-8 pb-8">
                <div className="relative -mt-16 mb-4">
                  <div className="w-32 h-32 rounded-3xl border-4 border-white overflow-hidden bg-white shadow-xl">
                    <img
                      src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                      className="w-full h-full"
                      alt="Profile"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold">Felix Designer</h1>
                    <p className="text-slate-500">@felix_uiux</p>
                    <p className="mt-4 text-slate-600 max-w-lg">
                      UI Designer & Content Creator. Visualizing the world through simple interfaces.
                      Coffee addict and minimalist. ☕️✨
                    </p>
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
                    <span className="font-bold">124</span> <span className="text-slate-400 text-sm">Posts</span>
                  </div>
                  <div>
                    <span className="font-bold">1.2k</span> <span className="text-slate-400 text-sm">Followers</span>
                  </div>
                  <div>
                    <span className="font-bold">850</span> <span className="text-slate-400 text-sm">Following</span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
