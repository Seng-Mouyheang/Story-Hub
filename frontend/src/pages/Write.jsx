import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Edit2, Plus, X } from "lucide-react";
import { createStory, getStoryById, updateStory } from "../api/story/storyApi";

export default function Write() {
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [genres, setGenres] = useState(["MYSTERY", "FANTASY", "ROMANCE"]);
  const [newGenre, setNewGenre] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const editingStoryId = searchParams.get("storyId");
  const returnTo = searchParams.get("returnTo");
  const isEditMode = Boolean(editingStoryId);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Unauthorized. Please log in first.");
      return;
    }

    let isMounted = true;

    const loadStoryForEdit = async () => {
      setIsLoadingStory(true);
      setErrorMessage("");

      try {
        const payload = await getStoryById(editingStoryId);

        if (!isMounted) {
          return;
        }

        setTitle(payload?.title || "");
        setContent(payload?.content || "");
        setGenres(
          Array.isArray(payload?.genres) && payload.genres.length > 0
            ? payload.genres
            : [],
        );
        setTags(Array.isArray(payload?.tags) ? payload.tags.join(", ") : "");
        setVisibility(payload?.visibility || "public");
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Failed to load story.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingStory(false);
        }
      }
    };

    loadStoryForEdit();

    return () => {
      isMounted = false;
    };
  }, [editingStoryId, isEditMode]);

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

  const parseTagsArray = () => {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  };

  const submitStory = async (status) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!title.trim()) {
      setErrorMessage("Title is required.");
      return;
    }

    if (!content.trim()) {
      setErrorMessage("Story content is required.");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrorMessage("Unauthorized. Please log in first.");
        setIsLoading(false);
        return;
      }

      const mutationPromise = isEditMode
        ? updateStory(editingStoryId, {
            title: title.trim(),
            content: content.trim(),
            genres: genres.length > 0 ? genres : [],
            tags: parseTagsArray(),
            visibility,
            status,
          })
        : createStory({
            title: title.trim(),
            content: content.trim(),
            genres: genres.length > 0 ? genres : [],
            tags: parseTagsArray(),
            visibility,
            status,
          });

      await mutationPromise;

      setSuccessMessage(
        isEditMode
          ? `Story updated and ${status === "published" ? "published" : "saved"} successfully!`
          : `Story ${status === "published" ? "published" : "saved"} successfully!`,
      );

      setTimeout(() => {
        if (isEditMode && returnTo === "home") {
          navigate("/");
          return;
        }

        if (status === "published") {
          navigate("/");
          return;
        }

        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      setErrorMessage(error.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    submitStory("draft");
  };

  const handlePublish = () => {
    submitStory("published");
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title={isEditMode ? "Edit Story" : "Write Story"} />

        {/* Top Header - Visibility Dropdown */}
        <div className="h-16 px-4 sm:px-6 lg:px-12 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">
              {isEditMode ? "Editing Story" : "Untitled 1"}
            </span>
            <Edit2
              size={14}
              className="text-slate-400 cursor-pointer hover:text-slate-600"
            />
          </div>

          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="flex items-center gap-2 px-5 py-2 bg-rose-50 text-rose-600 rounded-full text-sm font-semibold border border-rose-200 hover:bg-rose-100 transition-all outline-none cursor-pointer"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex flex-col lg:flex-row max-w-[1400px] mx-auto w-full p-3 sm:p-5 lg:p-8 gap-6 lg:gap-12">
              {/* Editor Section */}
              <div className="flex-1 bg-white p-4 sm:p-8 lg:p-12 shadow-sm border border-slate-200 rounded-2xl">
                <div className="max-w-3xl mx-auto">
                  {isLoadingStory && (
                    <p className="text-sm text-slate-500 mb-4">
                      Loading story...
                    </p>
                  )}
                  <input
                    type="text"
                    placeholder="Untitled Story Title"
                    className="w-full text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-300 focus:text-slate-900 outline-none transition-colors mb-6"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <div className="h-[1px] bg-slate-200 w-full mb-10"></div>
                  <textarea
                    placeholder="Untitled story line..."
                    className="w-full min-h-[360px] sm:min-h-[500px] lg:min-h-[600px] text-base sm:text-lg lg:text-xl text-slate-300 focus:text-slate-700 outline-none resize-none leading-relaxed"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
              </div>

              {/* Story Metadata Panel */}
              <aside className="w-full lg:w-[340px] flex flex-col gap-8 lg:gap-10 lg:sticky lg:top-24 self-start">
                {/* Story Details */}
                <section>
                  <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-6">
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
                  <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-6">
                    Genre
                  </h3>
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="Add Genres"
                      className="w-full pl-4 pr-10 py-3 border border-slate-300 rounded-xl text-sm outline-none focus:border-rose-300 transition-colors"
                      value={newGenre}
                      onChange={(e) => setNewGenre(e.target.value)}
                      onKeyDown={addGenre}
                    />
                    <button
                      onClick={addGenre}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre, index) => (
                      <span
                        key={index}
                        className="flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-600 text-[11px] font-semibold rounded-md uppercase tracking-tight"
                      >
                        {genre}
                        <X
                          size={12}
                          className="cursor-pointer ml-1 hover:text-rose-700"
                          onClick={() => removeGenre(index)}
                        />
                      </span>
                    ))}
                  </div>
                </section>

                {/* Tags */}
                <section>
                  <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-6">
                    Tags #
                  </h3>
                  <textarea
                    placeholder="Eg. #DailyLifeMotivation, #NeedAdvice, ..."
                    className="w-full h-32 p-4 border border-slate-300 rounded-2xl text-sm bg-slate-50 outline-none focus:bg-white focus:border-rose-300 transition-all resize-none italic text-slate-400"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </section>

                {/* Error Message */}
                {errorMessage && (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                  >
                    {errorMessage}
                  </p>
                )}

                {/* Success Message */}
                {successMessage && (
                  <p
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                  >
                    {successMessage}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 sm:gap-4 mt-2 sm:mt-4">
                  <button
                    onClick={handleSave}
                    disabled={isLoading || isLoadingStory}
                    className="flex-1 py-3 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading
                      ? isEditMode
                        ? "Updating..."
                        : "Saving..."
                      : "Save"}
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={isLoading || isLoadingStory}
                    className="flex-1 py-3 bg-rose-500 text-white text-sm font-semibold rounded-xl hover:bg-rose-600 shadow-sm shadow-rose-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading
                      ? isEditMode
                        ? "Updating..."
                        : "Publishing..."
                      : "Publish"}
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
  <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className="font-semibold text-slate-800">{value}</span>
  </div>
);
