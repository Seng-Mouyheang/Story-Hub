import React from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";

import {
  Bookmark,
  Share2,
  ArrowRightCircle,
  Heart,
  Eye,
  ChevronRight,
} from "lucide-react";

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
        <p className="text-[10px] text-red-500 font-medium truncate">{role}</p>
      </div>
    </div>

    <button className="bg-red-400 hover:bg-red-500 text-white text-[10px] font-bold px-3 sm:px-4 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap">
      Follow
    </button>
  </div>
);

export default function Explore() {
  const topAuthors = [
    { name: "Hannah Rose", role: "Top Mystery Writer" },
    { name: "Emily Foster", role: "Top Lifestyle Author" },
    { name: "David Chen", role: "Top Tech Writer" },
    { name: "Lisa Park", role: "Top Romance Author" },
  ];

  const recommendedStories = [
    {
      title: "The Echoes of Midnight",
      tags: ["Mystery", "Fantasy"],
      excerpt:
        "The hero is a wizard from Charlottetown who has a particular set of skills...",
      likes: "115K",
      views: "302K",
    },
    {
      title: "The Lost Kingdom",
      tags: ["Adventure", "Fantasy"],
      excerpt: "A magical adventure beyond the imagination...",
      likes: "98K",
      views: "250K",
    },
  ];

  const popularStories = [
    {
      title: "The Shadow Hunter",
      tags: ["Thriller", "Action"],
      excerpt: "The hero rises from darkness...",
      likes: "200K",
      views: "500K",
    },
    {
      title: "Enchanted Forest",
      tags: ["Fantasy", "Romance"],
      excerpt: "A tale of love and magic in a mystical forest...",
      likes: "150K",
      views: "320K",
    },
  ];

  return (
    <div className="flex min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col bg-white">
        <Navbar title="Explore Communities" />

        <main className="flex-1 overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* LEFT Content */}
            <div className="flex-1 min-w-0">
              {/* Categories */}
              <div className="flex items-center gap-2 sm:gap-3 mb-8 sm:mb-10 overflow-x-auto pb-2">
                <button className="bg-red-400 text-white px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
                  All
                </button>
                <button className="border border-gray-400 text-gray-600 px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
                  Most visited
                </button>
                <button className="border border-gray-400 text-gray-600 px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
                  Fantasy
                </button>
                <button className="border border-gray-400 text-gray-600 px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
                  Drama
                </button>
                <button className="border border-gray-400 text-gray-600 px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
                  Romance
                </button>
                <button className="border border-gray-400 text-gray-600 px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
                  Thriller
                </button>
                <button className="border border-gray-400 text-gray-600 px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap">
                  Action
                </button>
                <button className="hidden sm:inline-flex text-gray-400 ml-2">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Recommended Section */}
              <div className="mb-12">
                <h3 className="font-bold text-lg mb-6 text-gray-800">
                  Recommended for you
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {recommendedStories.map((story, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-50 shadow-md transition-all duration-300 hover:shadow-lg h-full flex flex-col"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                        <div className="flex flex-wrap gap-2">
                          {story.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="bg-red-50 text-red-400 text-[10px] font-bold px-3 py-1 rounded-md uppercase"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 text-gray-600 shrink-0">
                          <button>
                            <Bookmark className="w-5 h-5" />
                          </button>
                          <button>
                            <Share2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-lg sm:text-xl mb-3">
                        {story.title}
                      </h4>

                      <p className="text-gray-500 text-sm leading-relaxed mb-6 italic">
                        {story.excerpt}
                      </p>

                      {/* Bottom Right Stats */}
                      <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col items-end gap-1">
                        <a
                          href="#"
                          className="text-red-400 text-xs font-bold flex items-center gap-1"
                        >
                          Read More <ArrowRightCircle className="w-4 h-4" />
                        </a>

                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-gray-400 text-[10px] font-medium">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {story.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {story.views} views
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Popular Section */}
              <div className="mb-12">
                <h3 className="font-bold text-lg mb-6 text-gray-800">
                  Most Popular
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {popularStories.map((story, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-gray-50 shadow-md transition-all duration-300 hover:shadow-lg h-full flex flex-col"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                        <div className="flex flex-wrap gap-2">
                          {story.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="bg-red-50 text-red-400 text-[10px] font-bold px-3 py-1 rounded-md uppercase"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 text-gray-600 shrink-0">
                          <button>
                            <Bookmark className="w-5 h-5" />
                          </button>
                          <button>
                            <Share2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-bold text-lg sm:text-xl mb-3">
                        {story.title}
                      </h4>

                      <p className="text-gray-500 text-sm leading-relaxed mb-6 italic">
                        {story.excerpt}
                      </p>

                      {/* Bottom Right Stats */}
                      <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col items-end gap-1">
                        <a
                          href="#"
                          className="text-red-400 text-xs font-bold flex items-center gap-1"
                        >
                          Read More <ArrowRightCircle className="w-4 h-4" />
                        </a>

                        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-gray-400 text-[10px] font-medium">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {story.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {story.views} views
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <aside className="w-full lg:w-72 xl:w-80 h-fit lg:sticky lg:top-24">
              <div className="bg-white border border-gray-100 rounded-3xl sm:rounded-[40px] p-5 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-md">
                <h2 className="text-xl font-black mb-6">Top Authors</h2>

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
