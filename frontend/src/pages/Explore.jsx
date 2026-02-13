import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

import {
  Bookmark,
  Share2,
  ArrowRightCircle,
  Heart,
  Eye,
  ChevronRight,
} from "lucide-react";

export default function Explore() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Navbar */}
        <Navbar title="Explore Communities" />

        <main className="flex-1 overflow-y-auto pt-10 px-6 pb-10">
          <div className="max-w-6xl mx-auto">
            {/* Categories */}
            <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2">
          <button className="bg-red-400 text-white px-6 py-2 rounded-lg text-sm font-medium">
            All
          </button>

          <button className="border border-gray-400 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium whitespace-nowrap">
            Most visited
          </button>

          <button className="border border-gray-400 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium">
            Fantasy
          </button>

          <button className="border border-gray-400 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium">
            Drama
          </button>

          <button className="border border-gray-400 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium">
            Romance
          </button>

          <button className="border border-gray-400 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium">
            Sci-fi
          </button>

          <button className="border border-gray-400 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium">
            Thriller
          </button>

          <button className="border border-gray-400 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium">
            Action
          </button>

          <button className="text-gray-400 ml-2">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Recommended Section */}
        <div className="mb-12">
          <h3 className="font-bold text-lg mb-6 text-gray-800">
            Recommended for you
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Story Card 1 */}
            <div className="bg-white rounded-3xl p-6 border border-gray-50 shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  <span className="bg-red-50 text-red-400 text-[10px] font-bold px-3 py-1 rounded-md uppercase">
                    Mystery
                  </span>
                  <span className="bg-red-50 text-red-400 text-[10px] font-bold px-3 py-1 rounded-md uppercase">
                    Fantasy
                  </span>
                </div>

                <div className="flex gap-4 text-gray-600">
                  <button>
                    <Bookmark className="w-5 h-5" />
                  </button>
                  <button>
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <h4 className="font-bold text-xl mb-3">
                The Echoes of Midnight
              </h4>

              <p className="text-gray-500 text-sm leading-relaxed mb-6 italic">
                "The hero is a wizard from Charlottetown who has a particular
                set of skills. Upon wandering his journey to an unknown town, a
                curse has been caste on all those within the town with lust of
                genocide..."
              </p>

              <div className="flex items-center justify-between">
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                    <img
                      src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jaiden"
                      alt="Avatar"
                    />
                  </div>

                  <div>
                    <p className="font-bold text-sm">Jaiden Man</p>
                    <p className="text-red-400 text-[10px] font-medium">
                      Top Mystery Writer
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <a
                    href="#"
                    className="text-red-400 text-xs font-bold flex items-center gap-1 justify-end mb-1"
                  >
                    Read More <ArrowRightCircle className="w-4 h-4" />
                  </a>

                  <div className="flex items-center gap-3 text-gray-400 text-[10px] font-medium">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> 115K
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> 302K views
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Story Card 2 */}
            <div className="bg-white rounded-3xl p-6 border border-gray-50 shadow-md">
              <h4 className="font-bold text-xl mb-3">
                The Echoes of Midnight
              </h4>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 italic">
                "The hero is a wizard from Charlottetown who has a particular
                set of skills. Upon wandering his journey to an unknown town..."
              </p>
            </div>
          </div>
        </div>

        {/* Most Popular */}
        <div className="mb-12">
          <h3 className="font-bold text-lg mb-6 text-gray-800">
            Most Popular
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-50 shadow-md">
              <h4 className="font-bold text-xl mb-3">
                The Echoes of Midnight
              </h4>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 italic">
                "The hero is a wizard from Charlottetown..."
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 flex justify-end text-[10px] text-gray-400 font-medium">
          © 2026 Story Hub. All rights reserved.
        </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
