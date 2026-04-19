import React, { useState, useRef, useEffect } from "react";
import { Search, X, ArrowLeft, Clock, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { globalSearch } from "../api/search/searchApi";

const MIN_SEARCH_LENGTH = 2;
const MAX_HISTORY = 10;
const SEARCH_HISTORY_KEY = "story_hub_search_history";

const historyKey = (entry) => {
  if (!entry || typeof entry !== "object") return "";
  if (entry.kind === "account" && entry.userId)
    return `account:${entry.userId}`;
  if (entry.kind === "query" && entry.query) return `query:${entry.query}`;
  return "";
};

const normalizeHistoryEntry = (entry) => {
  if (!entry) return null;

  if (typeof entry === "string") {
    const query = entry.trim();
    if (query.length < MIN_SEARCH_LENGTH) return null;
    return { kind: "query", query };
  }

  if (typeof entry !== "object") return null;

  if (entry.kind === "account" && entry.userId) {
    return {
      kind: "account",
      userId: entry.userId,
      username: entry.username || "",
      displayName: entry.displayName || entry.username || "",
      profilePicture: entry.profilePicture || "",
    };
  }

  if (entry.kind === "query" && typeof entry.query === "string") {
    const query = entry.query.trim();
    if (query.length < MIN_SEARCH_LENGTH) return null;
    return { kind: "query", query };
  }

  return null;
};

const loadSearchHistory = () => {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeHistoryEntry)
      .filter(Boolean)
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
};

const saveSearchHistory = (history) => {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

const upsertHistoryEntry = (entry) => {
  const normalized = normalizeHistoryEntry(entry);
  if (!normalized) return loadSearchHistory();

  const history = loadSearchHistory();
  const key = historyKey(normalized);
  const filtered = history.filter((item) => historyKey(item) !== key);
  const updated = [normalized, ...filtered].slice(0, MAX_HISTORY);
  saveSearchHistory(updated);
  return updated;
};

const addQueryToHistory = (query) => {
  if (!query || query.trim().length < MIN_SEARCH_LENGTH) return;
  const trimmed = query.trim();
  return upsertHistoryEntry({ kind: "query", query: trimmed });
};

const addAccountToHistory = (account) => {
  if (!account?.userId) return;
  return upsertHistoryEntry({
    kind: "account",
    userId: account.userId,
    username: account.username || "",
    displayName: account.displayName || account.username || "",
    profilePicture: account.profilePicture || "",
  });
};

export default function SearchBar({ onResult }) {
  const navigate = useNavigate();

  // Separate state for mobile and desktop
  const [mobileHistory, setMobileHistory] = useState([]);
  const [mobileActive, setMobileActive] = useState(false);
  const [mobileQuery, setMobileQuery] = useState("");
  const [mobileResults, setMobileResults] = useState(null);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileError, setMobileError] = useState("");
  const [mobileDropdown, setMobileDropdown] = useState(false);
  const mobileInputRef = useRef();
  const mobileTimeoutRef = useRef();
  const mobileAbortRef = useRef(null);
  const mobileContainerRef = useRef(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [showDesktopDropdown, setShowDesktopDropdown] = useState(false);
  const inputRef = useRef();
  const timeoutRef = useRef();
  const abortRef = useRef(null);
  const desktopContainerRef = useRef(null);

  // Load search history on mount
  useEffect(() => {
    const loaded = loadSearchHistory();
    setHistory(loaded);
    setMobileHistory(loaded);
  }, []);

  // Click-outside handler for desktop dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        desktopContainerRef.current &&
        !desktopContainerRef.current.contains(event.target)
      ) {
        setResults(null);
        setError("");
        setShowDesktopDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Click-outside handler for mobile overlay
  useEffect(() => {
    if (!mobileActive) return;

    const handleClickOutside = (event) => {
      if (
        mobileContainerRef.current &&
        !mobileContainerRef.current.contains(event.target)
      ) {
        closeMobileSearch();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [mobileActive]);

  // Mobile search effect
  useEffect(() => {
    if (!mobileActive) {
      if (mobileTimeoutRef.current) clearTimeout(mobileTimeoutRef.current);
      mobileAbortRef.current?.abort();
      mobileAbortRef.current = null;
      return;
    }

    const trimmedQuery = mobileQuery.trim();

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      if (mobileTimeoutRef.current) clearTimeout(mobileTimeoutRef.current);
      mobileAbortRef.current?.abort();
      mobileAbortRef.current = null;
      setMobileResults(null);
      setMobileDropdown(false);
      setMobileError("");
      setMobileLoading(false);
      return;
    }

    setMobileLoading(true);
    setMobileError("");
    if (mobileTimeoutRef.current) clearTimeout(mobileTimeoutRef.current);
    mobileAbortRef.current?.abort();
    const controller = new AbortController();
    mobileAbortRef.current = controller;

    mobileTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await globalSearch(trimmedQuery, {
          signal: controller.signal,
        });
        if (mobileAbortRef.current !== controller) return;
        const updated = addQueryToHistory(trimmedQuery);
        setMobileHistory(updated);
        setMobileResults(res);
        setMobileDropdown(true);
        setMobileError("");
        if (onResult) onResult(res);
      } catch (e) {
        if (e?.name === "AbortError" || mobileAbortRef.current !== controller) {
          return;
        }
        setMobileError(e.message || "Search failed");
        setMobileResults(null);
        setMobileDropdown(false);
      } finally {
        if (mobileAbortRef.current === controller) {
          setMobileLoading(false);
          mobileAbortRef.current = null;
        }
      }
    }, 350);
    return () => {
      if (mobileTimeoutRef.current) clearTimeout(mobileTimeoutRef.current);
      controller.abort();
      if (mobileAbortRef.current === controller) {
        mobileAbortRef.current = null;
      }
    };
  }, [mobileQuery, mobileActive, onResult]);

  // Desktop search effect
  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      abortRef.current?.abort();
      abortRef.current = null;
      setResults(null);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await globalSearch(trimmedQuery, {
          signal: controller.signal,
        });
        if (abortRef.current !== controller) return;
        const updated = addQueryToHistory(trimmedQuery);
        setHistory(updated);
        setResults(res);
        // setShowDropdown removed: dropdown is always shown based on query/loading/error
        setError("");
        if (onResult) onResult(res);
      } catch (e) {
        if (e?.name === "AbortError" || abortRef.current !== controller) {
          return;
        }
        setError(e.message || "Search failed");
        setResults(null);
        // setShowDropdown removed: dropdown is always shown based on query/loading/error
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
          abortRef.current = null;
        }
      }
    }, 350);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      controller.abort();
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    };
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

  const searchFromQuery = async (q, { mobile = false } = {}) => {
    if (!q || q.trim().length < MIN_SEARCH_LENGTH) return;
    const trimmed = q.trim();
    const updated = addQueryToHistory(trimmed);
    setHistory(updated);
    setMobileHistory(updated);

    if (mobile) {
      setMobileQuery(trimmed);
    } else {
      setQuery(trimmed);
    }
  };

  const openUserProfile = (account, { mobile = false } = {}) => {
    if (!account?.userId) return;
    const updated = addAccountToHistory(account);
    if (updated) {
      setHistory(updated);
      setMobileHistory(updated);
    }

    if (mobile) {
      closeMobileSearch();
    } else {
      setQuery("");
      setResults(null);
      setError("");
    }

    navigate(`/profile/${account.userId}`);
  };

  // Desktop handlers
  const handleClear = () => {
    setQuery("");
    setResults(null);
    // setShowDropdown removed: dropdown is always shown based on query/loading/error
    setError("");
    inputRef.current?.focus();
  };

  const handleDeleteHistoryItem = (entry, e) => {
    e.stopPropagation();
    const key = historyKey(entry);
    if (!key) return;

    const updated = loadSearchHistory().filter(
      (item) => historyKey(item) !== key,
    );
    saveSearchHistory(updated);
    setHistory(updated);
    setMobileHistory(updated);
    setShowDesktopDropdown(true);
    if (mobileActive) setMobileDropdown(true);
  };

  const handleClearHistory = (e) => {
    e?.stopPropagation();
    saveSearchHistory([]);
    setHistory([]);
    setMobileHistory([]);
  };

  const shouldShowMobileHistory =
    mobileActive &&
    mobileDropdown &&
    mobileQuery.trim().length === 0 &&
    !mobileLoading &&
    !mobileError &&
    !mobileResults &&
    mobileHistory.length > 0;

  const shouldShowDesktopHistory =
    query.trim().length === 0 &&
    !loading &&
    !error &&
    !results &&
    history.length > 0;

  const hasMobileDropdownContent =
    mobileLoading || mobileError || shouldShowMobileHistory || mobileResults;

  const hasDesktopDropdownContent =
    query || loading || error || shouldShowDesktopHistory || results;

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
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={closeMobileSearch}
            ></div>
            <div
              ref={mobileContainerRef}
              className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-2"
            >
              <div
                className={`relative p-4 flex items-center gap-2 ${
                  mobileDropdown && hasMobileDropdownContent
                    ? "bg-white border border-slate-200 border-b-0 rounded-t-2xl rounded-b-none shadow-lg"
                    : "bg-white rounded-2xl shadow-lg"
                }`}
              >
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
                  onFocus={() => setMobileDropdown(true)}
                  onBlur={() => setTimeout(() => setMobileDropdown(false), 150)}
                  autoComplete="off"
                />
                {/* No right-side X/cancel icon, only back arrow */}
              </div>
              {mobileDropdown && hasMobileDropdownContent && (
                <div className="absolute left-0 top-full mt-0 w-full bg-white border border-slate-200 border-t-0 rounded-b-2xl shadow-lg z-50 max-h-80 overflow-y-auto">
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
                  {shouldShowMobileHistory && (
                    <div className="border-t border-slate-200">
                      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Recent
                        </span>
                        <button
                          type="button"
                          onClick={handleClearHistory}
                          className="text-xs text-slate-400 hover:text-slate-600"
                          aria-label="Clear all search history"
                        >
                          Clear all
                        </button>
                      </div>
                      {mobileHistory.map((item) => {
                        const key = historyKey(item);

                        if (item.kind === "account") {
                          return (
                            <div
                              key={key}
                              className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <button
                                type="button"
                                className="flex-1 cursor-pointer flex items-center gap-2 text-left"
                                onClick={() =>
                                  openUserProfile(item, { mobile: true })
                                }
                              >
                                <img
                                  src={
                                    item.profilePicture ||
                                    "https://api.dicebear.com/7.x/avataaars/svg?seed=" +
                                      (item.username || item.displayName)
                                  }
                                  alt="avatar"
                                  className="w-6 h-6 rounded-full bg-slate-200"
                                />
                                <span className="font-medium text-slate-800">
                                  {item.displayName || item.username}
                                </span>
                                <span className="ml-2 text-xs text-slate-400">
                                  @{item.username}
                                </span>
                              </button>
                              <button
                                type="button"
                                className="p-1 text-slate-400 hover:text-slate-600"
                                aria-label="Delete history item"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={(e) =>
                                  handleDeleteHistoryItem(item, e)
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={key}
                            className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <button
                              type="button"
                              className="flex-1 cursor-pointer flex items-center gap-2 text-left text-slate-700"
                              onClick={() =>
                                searchFromQuery(item.query, { mobile: true })
                              }
                            >
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span className="text-sm">{item.query}</span>
                            </button>
                            <button
                              type="button"
                              className="p-1 text-slate-400 hover:text-slate-600"
                              aria-label="Delete history item"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={(e) => handleDeleteHistoryItem(item, e)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
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
                        <button
                          type="button"
                          key={acc.userId}
                          className="w-full px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-left"
                          onClick={() => openUserProfile(acc, { mobile: true })}
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
                        </button>
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
          </>
        )}
      </div>
      {/* Desktop: normal search bar */}
      <div
        ref={desktopContainerRef}
        className="hidden ml-auto sm:block relative w-full max-w-xs lg:max-w-md"
      >
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className={`pl-10 pr-8 py-1.5 text-sm outline-none w-full ${
            showDesktopDropdown && hasDesktopDropdownContent
              ? "bg-white border border-slate-200 border-b-0 rounded-t-2xl rounded-b-none"
              : "bg-slate-100 border-none rounded-full"
          }`}
          onFocus={() => setShowDesktopDropdown(true)}
          onBlur={() => setTimeout(() => setShowDesktopDropdown(false), 150)}
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
        {showDesktopDropdown && hasDesktopDropdownContent && (
          <div className="absolute left-0 top-full mt-0 w-full bg-white border border-slate-200 border-t-0 rounded-b-2xl shadow-lg z-50 max-h-80 overflow-y-auto">
            {loading && (
              <div className="p-3 text-sm text-slate-400">Searching...</div>
            )}
            {error && <div className="p-3 text-sm text-rose-500">{error}</div>}
            {shouldShowDesktopHistory && (
              <div className="border-t border-slate-200">
                <div className="px-3 pt-3 pb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Recent
                  </span>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-xs text-slate-400 hover:text-slate-600"
                    aria-label="Clear all search history"
                  >
                    Clear all
                  </button>
                </div>
                {history.map((item) => {
                  const key = historyKey(item);

                  if (item.kind === "account") {
                    return (
                      <div
                        key={key}
                        className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <button
                          type="button"
                          className="flex-1 cursor-pointer flex items-center gap-2 text-left"
                          onClick={() => openUserProfile(item)}
                        >
                          <img
                            src={
                              item.profilePicture ||
                              "https://api.dicebear.com/7.x/avataaars/svg?seed=" +
                                (item.username || item.displayName)
                            }
                            alt="avatar"
                            className="w-6 h-6 rounded-full bg-slate-200"
                          />
                          <span className="font-medium text-slate-800">
                            {item.displayName || item.username}
                          </span>
                          <span className="ml-2 text-xs text-slate-400">
                            @{item.username}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="p-1 text-slate-400 hover:text-slate-600"
                          aria-label="Delete history item"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => handleDeleteHistoryItem(item, e)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={key}
                      className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <button
                        type="button"
                        className="flex-1 cursor-pointer flex items-center gap-2 text-left text-slate-700"
                        onClick={() => searchFromQuery(item.query)}
                      >
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">{item.query}</span>
                      </button>
                      <button
                        type="button"
                        className="p-1 text-slate-400 hover:text-slate-600"
                        aria-label="Delete history item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => handleDeleteHistoryItem(item, e)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
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
                  <button
                    type="button"
                    key={acc.userId}
                    className="w-full px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-2 text-left"
                    onClick={() => openUserProfile(acc)}
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
                  </button>
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
