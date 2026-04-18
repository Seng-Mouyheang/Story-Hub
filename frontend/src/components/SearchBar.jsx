import React, { useState, useRef, useEffect } from "react";
import { Search, X, ArrowLeft } from "lucide-react";
import { globalSearch } from "../api/search/searchApi";

export default function SearchBar({ onResult }) {
  // Separate state for mobile and desktop
  const [mobileActive, setMobileActive] = useState(false);
  const [mobileQuery, setMobileQuery] = useState("");
  const [mobileResults, setMobileResults] = useState(null);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileError, setMobileError] = useState("");
  const [mobileDropdown, setMobileDropdown] = useState(false);
  const mobileInputRef = useRef();
  const mobileTimeoutRef = useRef();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();
  const timeoutRef = useRef();

  // Mobile search effect
  useEffect(() => {
    if (!mobileActive) return;
    if (!mobileQuery.trim()) {
      setMobileResults(null);
      setMobileDropdown(false);
      setMobileError("");
      return;
    }
    setMobileLoading(true);
    setMobileError("");
    if (mobileTimeoutRef.current) clearTimeout(mobileTimeoutRef.current);
    mobileTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await globalSearch(mobileQuery);
        setMobileResults(res);
        setMobileDropdown(true);
        setMobileError("");
        if (onResult) onResult(res);
      } catch (e) {
        setMobileError(e.message || "Search failed");
        setMobileResults(null);
        setMobileDropdown(false);
      } finally {
        setMobileLoading(false);
      }
    }, 350);
    return () => clearTimeout(mobileTimeoutRef.current);
  }, [mobileQuery, mobileActive, onResult]);

  // Desktop search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await globalSearch(query);
        setResults(res);
        // setShowDropdown removed: dropdown is always shown based on query/loading/error
        setError("");
        if (onResult) onResult(res);
      } catch (e) {
        setError(e.message || "Search failed");
        setResults(null);
        // setShowDropdown removed: dropdown is always shown based on query/loading/error
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timeoutRef.current);
  }, [query, onResult]);

  // Mobile handlers
  const openMobileSearch = () => {
    setMobileActive(true);
    setTimeout(() => {
      mobileInputRef.current?.focus();
    }, 100);
  };
  const closeMobileSearch = () => {
    setMobileActive(false);
    setMobileQuery("");
    setMobileResults(null);
    setMobileDropdown(false);
    setMobileError("");
  };

  // Desktop handlers
  const handleClear = () => {
    setQuery("");
    setResults(null);
    // setShowDropdown removed: dropdown is always shown based on query/loading/error
    setError("");
    inputRef.current?.focus();
  };

  return (
    <React.Fragment>
      {/* Mobile: show only icon, open overlay on click */}
      <div className="block sm:hidden">
        <button
          type="button"
          className="p-2 text-slate-400 hover:text-slate-600"
          onClick={openMobileSearch}
        >
          <Search className="w-6 h-6" />
        </button>
        {mobileActive && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center">
            <div className="bg-white w-full max-w-md mt-10 mx-2 rounded-xl shadow-lg relative">
              <div className="relative p-4 flex items-center gap-2">
                <button
                  className="p-2 text-slate-400 hover:text-slate-600"
                  onClick={closeMobileSearch}
                  aria-label="Back"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={mobileQuery}
                  onChange={(e) => setMobileQuery(e.target.value)}
                  placeholder="Search..."
                  className="flex-1 py-2 bg-slate-100 border-none rounded-full text-base focus:ring-2 focus:ring-red-200 outline-none w-full px-4"
                  onFocus={() => mobileQuery && setMobileDropdown(true)}
                  onBlur={() => setTimeout(() => setMobileDropdown(false), 150)}
                  autoComplete="off"
                />
                {/* No right-side X/cancel icon, only back arrow */}
              </div>
              {mobileDropdown && (
                <div className="absolute left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
                  {mobileLoading && (
                    <div className="p-3 text-sm text-slate-400">
                      Searching...
                    </div>
                  )}
                  {mobileError && (
                    <div className="p-3 text-sm text-rose-500">
                      {mobileError}
                    </div>
                  )}
                  {mobileResults && !mobileLoading && !mobileError && (
                    <>
                      {mobileResults.accounts?.length > 0 && (
                        <div className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-500">
                          Accounts
                        </div>
                      )}
                      {mobileResults.accounts?.map((acc) => (
                        <div
                          key={acc.userId}
                          className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                        >
                          <img
                            src={
                              acc.profilePicture ||
                              "https://api.dicebear.com/7.x/avataaars/svg?seed=" +
                                (acc.username || acc.displayName)
                            }
                            alt="avatar"
                            className="w-6 h-6 rounded-full bg-slate-200"
                          />
                          <span className="font-medium text-slate-800">
                            {acc.displayName || acc.username}
                          </span>
                          <span className="ml-2 text-xs text-slate-400">
                            @{acc.username}
                          </span>
                        </div>
                      ))}
                      {mobileResults.stories?.length > 0 && (
                        <div className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-500">
                          Stories
                        </div>
                      )}
                      {mobileResults.stories?.map((story) => (
                        <div
                          key={story._id}
                          className="px-3 py-2 hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="font-medium text-slate-800">
                            {story.title}
                          </div>
                          <div className="text-xs text-slate-400">
                            {story.summary?.slice(0, 60) || "No summary"}
                          </div>
                        </div>
                      ))}
                      {mobileResults.confessions?.length > 0 && (
                        <div className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-500">
                          Confessions
                        </div>
                      )}
                      {mobileResults.confessions?.map((conf) => (
                        <div
                          key={conf._id}
                          className="px-3 py-2 hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="font-medium text-slate-800">
                            {conf.content?.slice(0, 60) || "No content"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {conf.authorDisplayName}
                          </div>
                        </div>
                      ))}
                      {mobileResults.accounts?.length === 0 &&
                        mobileResults.stories?.length === 0 &&
                        mobileResults.confessions?.length === 0 && (
                          <div className="p-3 text-sm text-slate-400">
                            No results found.
                          </div>
                        )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Desktop: normal search bar */}
      <div className="hidden sm:block relative w-full max-w-xs">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="pl-10 pr-8 py-1.5 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-red-200 outline-none w-full"
          // onFocus and onBlur handlers for dropdown removed
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={handleClear}
            tabIndex={-1}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {(query || loading || error) && (
          <div className="absolute left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
            {loading && (
              <div className="p-3 text-sm text-slate-400">Searching...</div>
            )}
            {error && <div className="p-3 text-sm text-rose-500">{error}</div>}
            {results && !loading && !error && (
              <>
                {results.accounts?.length > 0 && (
                  <div className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-500">
                    Accounts
                  </div>
                )}
                {results.accounts?.map((acc) => (
                  <div
                    key={acc.userId}
                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2"
                  >
                    <img
                      src={
                        acc.profilePicture ||
                        "https://api.dicebear.com/7.x/avataaars/svg?seed=" +
                          (acc.username || acc.displayName)
                      }
                      alt="avatar"
                      className="w-6 h-6 rounded-full bg-slate-200"
                    />
                    <span className="font-medium text-slate-800">
                      {acc.displayName || acc.username}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      @{acc.username}
                    </span>
                  </div>
                ))}
                {results.stories?.length > 0 && (
                  <div className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-500">
                    Stories
                  </div>
                )}
                {results.stories?.map((story) => (
                  <div
                    key={story._id}
                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="font-medium text-slate-800">
                      {story.title}
                    </div>
                    <div className="text-xs text-slate-400">
                      {story.summary?.slice(0, 60) || "No summary"}
                    </div>
                  </div>
                ))}
                {results.confessions?.length > 0 && (
                  <div className="px-3 pt-3 pb-1 text-xs font-semibold text-slate-500">
                    Confessions
                  </div>
                )}
                {results.confessions?.map((conf) => (
                  <div
                    key={conf._id}
                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="font-medium text-slate-800">
                      {conf.content?.slice(0, 60) || "No content"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {conf.authorDisplayName}
                    </div>
                  </div>
                ))}
                {results.accounts?.length === 0 &&
                  results.stories?.length === 0 &&
                  results.confessions?.length === 0 && (
                    <div className="p-3 text-sm text-slate-400">
                      No results found.
                    </div>
                  )}
              </>
            )}
          </div>
        )}
      </div>
    </React.Fragment>
  );
}
