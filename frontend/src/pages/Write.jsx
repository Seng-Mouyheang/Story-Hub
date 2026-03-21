import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Edit2, Globe, Plus, X, ChevronDown } from "lucide-react";

export default function Write() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [genres, setGenres] = useState(["MYSTERY", "FANTASY", "ROMANCE"]);
  const [newGenre, setNewGenre] = useState("");
  const [tags, setTags] = useState("");

  // Derived statistics
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const readingTime = Math.ceil(wordCount / 200);

  const removeGenre = (index) => {
    setGenres(genres.filter((_, i) => i !== index));
  };

  const addGenre = (e) => {
    if ((e.key === "Enter" || e.type === "click") && newGenre.trim()) {
      if (!genres.includes(newGenre.toUpperCase())) {
        setGenres([...genres, newGenre.toUpperCase()]);
      }
      setNewGenre("");
    }
  };

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <Navbar title="Write Story" />

        {/* Top Header - Public Button */}
        <div className="h-16 px-4 sm:px-6 lg:px-12 border-b border-gray-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              Untitled 1
            </span>
            <Edit2
              size={14}
              className="text-gray-400 cursor-pointer hover:text-gray-600"
            />
          </div>

          <button className="flex items-center gap-2 px-5 py-2 bg-[#FF8B8B] bg-opacity-10 text-[#D63636] rounded-full text-sm font-semibold border border-[#FF8B8B] border-opacity-40 hover:bg-opacity-15 transition-all">
            <Globe size={16} className="text-[#D63636]" />
            <span className="hidden sm:inline text-[#D63636]">Public</span>
            <ChevronDown size={14} className="ml-1 text-[#D63636]" />
          </button>
        </div>

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex flex-col lg:flex-row max-w-[1400px] mx-auto w-full p-3 sm:p-5 lg:p-8 gap-6 lg:gap-12">
              {/* Editor Section */}
              <div className="flex-1 bg-white p-4 sm:p-8 lg:p-12 shadow-sm border border-gray-100 rounded-xl sm:rounded-sm">
                <div className="max-w-3xl mx-auto">
                  <input
                    type="text"
                    placeholder="Untitled Story Title"
                    className="w-full text-3xl sm:text-4xl lg:text-5xl font-serif text-gray-200 focus:text-gray-800 outline-none transition-colors mb-6"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <div className="h-[1px] bg-gray-100 w-full mb-10"></div>
                  <textarea
                    placeholder="Untitled story line..."
                    className="w-full min-h-[360px] sm:min-h-[500px] lg:min-h-[600px] text-base sm:text-lg lg:text-xl text-gray-300 focus:text-gray-700 outline-none resize-none leading-relaxed font-light"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
              </div>

              {/* Story Metadata Panel */}
              <aside className="w-full lg:w-[340px] flex flex-col gap-8 lg:gap-10 lg:sticky lg:top-24 self-start">
                {/* Story Details */}
                <section>
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">
                    Story Details
                  </h3>
                  <div className="space-y-6">
                    <StatRow label="Words" value={wordCount} />
                    <StatRow label="Characters" value={charCount} />
                    <StatRow label="Est. Reading Time" value={readingTime} />
                  </div>
                </section>

                {/* Genre Selection */}
                <section>
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">
                    Genre
                  </h3>
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="Add Genres"
                      className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#FF8B8B] transition-colors"
                      value={newGenre}
                      onChange={(e) => setNewGenre(e.target.value)}
                      onKeyDown={addGenre}
                    />
                    <button
                      onClick={addGenre}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre, index) => (
                      <span
                        key={index}
                        className="flex items-center gap-1 px-3 py-1 bg-[#FF8B8B] bg-opacity-15 text-[#D63636] text-[11px] font-bold rounded-md uppercase tracking-tight"
                      >
                        {genre}
                        <X
                          size={12}
                          className="cursor-pointer ml-1 hover:text-red-700"
                          onClick={() => removeGenre(index)}
                        />
                      </span>
                    ))}
                  </div>
                </section>

                {/* Tags */}
                <section>
                  <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">
                    Tags #
                  </h3>
                  <textarea
                    placeholder="Eg. #DailyLifeMotivation, #NeedAdvice, ..."
                    className="w-full h-32 p-4 border border-gray-200 rounded-2xl text-sm bg-gray-50 outline-none focus:bg-white focus:border-[#FF8B8B] transition-all resize-none italic text-gray-400"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </section>

                {/* Action Buttons */}
                <div className="flex gap-3 sm:gap-4 mt-2 sm:mt-4">
                  <button className="flex-1 py-3 border border-gray-800 text-gray-800 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors">
                    Save
                  </button>
                  <button className="flex-1 py-3 bg-[#FF8B8B] text-white text-sm font-bold rounded-xl hover:bg-[#ff7a7a] shadow-lg shadow-pink-100 transition-all">
                    Publish
                  </button>
                </div>
              </aside>
            </div>
            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  );
}

// Sub-component for the stats rows
const StatRow = ({ label, value }) => (
  <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
    <span className="text-gray-500 font-medium">{label}</span>
    <span className="font-bold text-gray-800">{value}</span>
  </div>
);
