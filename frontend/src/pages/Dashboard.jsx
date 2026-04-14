import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import {
  BookOpenText,
  ChevronDown,
  Filter,
  MessageSquareLock,
  PenTool,
  History,
} from "lucide-react";

const DASHBOARD_FILTERS_STORAGE_KEY = "dashboardActivityFilters";

const DEFAULT_ACTIVITY_FILTERS = {
  contentType: "all",
  sortBy: "date",
  order: "desc",
  storyStatus: "all",
  storyVisibility: "all",
};

const getSavedDashboardFilters = () => {
  try {
    const raw = localStorage.getItem(DASHBOARD_FILTERS_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_ACTIVITY_FILTERS;
    }

    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_ACTIVITY_FILTERS,
      ...(typeof parsed === "object" && parsed !== null ? parsed : {}),
    };
  } catch {
    return DEFAULT_ACTIVITY_FILTERS;
  }
};

const formatCount = (value) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return String(value);
};

const formatUpdatedLabel = (value) => {
  const sourceDate = new Date(value);

  if (Number.isNaN(sourceDate.getTime())) {
    return "N/A";
  }

  const now = new Date();
  const sourceDateStart = new Date(sourceDate);
  sourceDateStart.setHours(0, 0, 0, 0);
  const nowStart = new Date(now);
  nowStart.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (nowStart.getTime() - sourceDateStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays >= 2 && diffDays <= 9) {
    return `${diffDays} days ago`;
  }

  if (diffDays <= 20) {
    return "A week ago";
  }

  if (diffDays <= 31) {
    return "A month ago";
  }

  return sourceDate.toLocaleDateString();
};

const buildFetchParams = (config) => {
  const { limit = "8", page, sortBy, order, ...extra } = config;
  const params = new URLSearchParams({ limit, page: String(page) });

  if (sortBy) params.set("sortBy", sortBy);
  if (order) params.set("order", order);

  Object.entries(extra).forEach(([key, val]) => {
    if (val !== null && val !== undefined) params.set(key, val);
  });

  return params.toString();
};

const normalizeActivityItem = (item, type) => ({
  id: String(item?._id || `${type}-${Math.random()}`),
  type,
  title:
    item?.title ||
    (type === "story" ? "Untitled Story" : "Untitled Confession"),
  likesCount: Number(item?.likesCount || 0),
  commentCount: Number(item?.commentCount || 0),
  createdAt: item?.createdAt || null,
  updatedAt: item?.updatedAt || item?.createdAt || null,
  status: item?.status || null,
  visibility: item?.visibility || null,
});

const normalizePayloadItems = (payload, type) =>
  Array.isArray(payload?.data)
    ? payload.data.map((item) => normalizeActivityItem(item, type))
    : [];

const formatDateOnly = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString();
};

const getStatusBadgeClasses = (status) => {
  const value = String(status || "").toLowerCase();

  if (value === "published") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }

  if (value === "draft") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600";
};

const getVisibilityBadgeClasses = (visibility) => {
  const value = String(visibility || "").toLowerCase();

  if (value === "public") {
    return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
  }

  if (value === "private") {
    return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
  }

  return "bg-slate-100 text-slate-600";
};

const renderStatCard = (title, value, subtitle) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between min-h-40 shadow-sm">
    <div>
      <h2 className="text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase">
        {title}
      </h2>
      <div className="mt-4 text-5xl sm:text-[64px] leading-tight font-light text-rose-500">
        {value}
      </div>
    </div>
    <div className="text-xs text-slate-400 font-medium tracking-tight">
      {subtitle}
    </div>
  </div>
);

export default function Dashboard() {
  const [showFilters, setShowFilters] = useState(false);
  const [activityFilters, setActivityFilters] = useState(
    getSavedDashboardFilters,
  );
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalWords: 0,
    totalLikes: 0,
  });
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [storyPage, setStoryPage] = useState(1);
  const [confessionPage, setConfessionPage] = useState(1);
  const [hasMoreStories, setHasMoreStories] = useState(true);
  const [hasMoreConfessions, setHasMoreConfessions] = useState(true);
  const filterPanelRef = useRef(null);
  const filterButtonRef = useRef(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setStats({ totalPosts: 0, totalWords: 0, totalLikes: 0 });
        setActivities([]);
        setErrorMessage("Please log in to load dashboard data.");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const shouldFetchStories = activityFilters.contentType !== "confession";
      const shouldFetchConfessions = activityFilters.contentType !== "story";

      const storyParams = new URLSearchParams({
        limit: "8",
        page: "1",
        sortBy: activityFilters.sortBy,
        order: activityFilters.order,
        status: activityFilters.storyStatus,
        visibility: activityFilters.storyVisibility,
        deleted: "active",
      });

      const confessionParams = new URLSearchParams({
        limit: "8",
        page: "1",
        sortBy: activityFilters.sortBy,
        order: activityFilters.order,
      });

      const [statsResponse, storiesResponse, confessionsResponse] =
        await Promise.all([
          fetch("/api/dashboard/stats", { headers }),
          shouldFetchStories
            ? fetch(`/api/dashboard/stories?${storyParams.toString()}`, {
                headers,
              })
            : Promise.resolve({ ok: true, json: async () => ({ data: [] }) }),
          shouldFetchConfessions
            ? fetch(
                `/api/dashboard/confessions?${confessionParams.toString()}`,
                {
                  headers,
                },
              )
            : Promise.resolve({ ok: true, json: async () => ({ data: [] }) }),
        ]);

      const [statsPayload, storiesPayload, confessionsPayload] =
        await Promise.all([
          statsResponse.json().catch(() => ({})),
          storiesResponse.json().catch(() => ({})),
          confessionsResponse.json().catch(() => ({})),
        ]);

      if (!statsResponse.ok) {
        throw new Error(
          statsPayload?.message || "Unable to load dashboard statistics.",
        );
      }

      if (!storiesResponse.ok) {
        throw new Error(
          storiesPayload?.message || "Unable to load dashboard stories.",
        );
      }

      if (!confessionsResponse.ok) {
        throw new Error(
          confessionsPayload?.message ||
            "Unable to load dashboard confessions.",
        );
      }

      setStats({
        totalPosts: Number(statsPayload?.stats?.totalPosts || 0),
        totalWords: Number(statsPayload?.stats?.totalWords || 0),
        totalLikes: Number(statsPayload?.stats?.totalLikes || 0),
      });

      const mappedStories = Array.isArray(storiesPayload?.data)
        ? storiesPayload.data.map((story) =>
            normalizeActivityItem(story, "story"),
          )
        : [];

      const mappedConfessions = Array.isArray(confessionsPayload?.data)
        ? confessionsPayload.data.map((confession) =>
            normalizeActivityItem(confession, "confession"),
          )
        : [];

      const mergedActivity = [...mappedStories, ...mappedConfessions].sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      );

      setActivities(mergedActivity);
      setStoryPage(1);
      setConfessionPage(1);
      setHasMoreStories(
        Number(storiesPayload?.pagination?.totalPages || 0) > 1,
      );
      setHasMoreConfessions(
        Number(confessionsPayload?.pagination?.totalPages || 0) > 1,
      );
    } catch (error) {
      setErrorMessage(error.message || "Unable to load dashboard right now.");
    } finally {
      setIsLoading(false);
    }
  }, [activityFilters]);

  const validateAndParseResponse = async (response, type) => {
    if (!response) return null;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorType = type === "story" ? "stories" : "confessions";
      throw new Error(payload?.message || `Unable to load more ${errorType}.`);
    }
    return payload;
  };

  const updatePaginationState = (response, payload, type) => {
    if (!response) return;
    const pagination = payload?.pagination || {};
    const currentPage = Number(pagination.page || 0);
    const totalPages = Number(pagination.totalPages || 0);
    const hasMore = currentPage < totalPages;

    if (type === "story") {
      setStoryPage((prev) => prev + 1);
      setHasMoreStories(hasMore);
    } else {
      setConfessionPage((prev) => prev + 1);
      setHasMoreConfessions(hasMore);
    }
  };

  const loadMoreActivities = useCallback(async () => {
    if (isLoadingMore || (!hasMoreStories && !hasMoreConfessions)) return;

    setIsLoadingMore(true);
    setErrorMessage("");

    const token = localStorage.getItem("token");
    if (!token) {
      setErrorMessage("Please log in to load more activities.");
      setIsLoadingMore(false);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const shouldFetchStories =
        activityFilters.contentType !== "confession" && hasMoreStories;
      const shouldFetchConfessions =
        activityFilters.contentType !== "story" && hasMoreConfessions;

      const [storiesResponse, confessionsResponse] = await Promise.all([
        shouldFetchStories
          ? fetch(
              `/api/dashboard/stories?${buildFetchParams({
                limit: "8",
                page: storyPage + 1,
                sortBy: activityFilters.sortBy,
                order: activityFilters.order,
                status: activityFilters.storyStatus,
                visibility: activityFilters.storyVisibility,
                deleted: "active",
              })}`,
              { headers },
            )
          : null,
        shouldFetchConfessions
          ? fetch(
              `/api/dashboard/confessions?${buildFetchParams({
                limit: "8",
                page: confessionPage + 1,
                sortBy: activityFilters.sortBy,
                order: activityFilters.order,
              })}`,
              { headers },
            )
          : null,
      ]);

      const storiesPayload = await validateAndParseResponse(
        storiesResponse,
        "story",
      );
      const confessionsPayload = await validateAndParseResponse(
        confessionsResponse,
        "confession",
      );

      const allNewItems = [
        ...normalizePayloadItems(storiesPayload, "story"),
        ...normalizePayloadItems(confessionsPayload, "confession"),
      ];

      setActivities((prev) =>
        [...prev, ...allNewItems].sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
        ),
      );

      updatePaginationState(storiesResponse, storiesPayload, "story");
      updatePaginationState(
        confessionsResponse,
        confessionsPayload,
        "confession",
      );
    } catch (error) {
      setErrorMessage(error.message || "Unable to load more activities.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    activityFilters,
    confessionPage,
    hasMoreConfessions,
    hasMoreStories,
    isLoadingMore,
    storyPage,
  ]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    localStorage.setItem(
      DASHBOARD_FILTERS_STORAGE_KEY,
      JSON.stringify(activityFilters),
    );
  }, [activityFilters]);

  useEffect(() => {
    if (!showFilters) {
      return;
    }

    const handleWindowClick = (event) => {
      if (filterPanelRef.current?.contains(event.target)) {
        return;
      }

      if (filterButtonRef.current?.contains(event.target)) {
        return;
      }

      setShowFilters(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowFilters(false);
      }
    };

    globalThis.addEventListener("mousedown", handleWindowClick);
    globalThis.addEventListener("keydown", handleEscape);

    return () => {
      globalThis.removeEventListener("mousedown", handleWindowClick);
      globalThis.removeEventListener("keydown", handleEscape);
    };
  }, [showFilters]);

  const updateFilter = useCallback((key, value) => {
    setActivityFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setActivityFilters(DEFAULT_ACTIVITY_FILTERS);
  }, []);

  const hasActivity = useMemo(() => activities.length > 0, [activities]);
  const canLoadMore = useMemo(
    () => hasMoreStories || hasMoreConfessions,
    [hasMoreConfessions, hasMoreStories],
  );

  const recentActivityContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <p className="text-slate-500 text-sm md:text-base font-medium">
            Loading your recent activity...
          </p>
        </div>
      );
    }

    if (!hasActivity) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="bg-slate-100 p-6 rounded-full mb-6">
            <PenTool className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
          </div>
          <p className="text-slate-500 text-sm md:text-base font-medium">
            You have no activity yet. Publish your first post to get started.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-245 border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
              <th className="px-4 sm:px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 bg-slate-50/95 backdrop-blur">
                Type
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 bg-slate-50/95 backdrop-blur">
                Title
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 bg-slate-50/95 backdrop-blur">
                Status
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 bg-slate-50/95 backdrop-blur">
                Visibility
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 bg-slate-50/95 backdrop-blur">
                Created
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 bg-slate-50/95 backdrop-blur">
                Updated
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 text-right bg-slate-50/95 backdrop-blur">
                Likes
              </th>
              <th className="px-4 sm:px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 text-right bg-slate-50/95 backdrop-blur">
                Comments
              </th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr
                key={activity.id}
                className="border-b border-slate-100 last:border-b-0"
              >
                <td className="px-4 sm:px-8 py-6">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {activity.type === "story" ? (
                      <BookOpenText size={13} />
                    ) : (
                      <MessageSquareLock size={13} />
                    )}
                    <span>
                      {activity.type === "story" ? "Story" : "Confession"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-6">
                  <p className="max-w-70 truncate text-sm font-medium text-slate-800">
                    {activity.title}
                  </p>
                </td>
                <td className="px-4 py-6 align-top">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${getStatusBadgeClasses(
                      activity.status,
                    )}`}
                  >
                    {activity.status || "N/A"}
                  </span>
                </td>
                <td className="px-4 py-6 align-top">
                  <span
                    className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${getVisibilityBadgeClasses(
                      activity.visibility,
                    )}`}
                  >
                    {activity.visibility || "N/A"}
                  </span>
                </td>
                <td className="px-4 py-6 text-xs text-slate-600 whitespace-nowrap">
                  {formatDateOnly(activity.createdAt)}
                </td>
                <td className="px-4 py-6">
                  <p className="text-xs text-slate-600 whitespace-nowrap">
                    {formatUpdatedLabel(activity.updatedAt)}
                  </p>
                </td>
                <td className="px-4 py-6 text-right text-xs font-medium text-slate-600">
                  {formatCount(activity.likesCount)}
                </td>
                <td className="px-4 sm:px-8 py-6 text-right text-xs font-medium text-slate-600">
                  {formatCount(activity.commentCount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {canLoadMore && (
          <div className="flex items-center justify-center border-t border-slate-100 px-4 sm:px-8 py-6">
            <button
              onClick={loadMoreActivities}
              disabled={isLoadingMore}
              className="inline-flex items-center gap-2 text-sm font-semibold text-rose-500 cursor-pointer transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingMore ? (
                "Loading..."
              ) : (
                <>
                  Load More Stories
                  <ChevronDown strokeWidth={2.5} size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }, [
    activities,
    canLoadMore,
    hasActivity,
    isLoading,
    isLoadingMore,
    loadMoreActivities,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;

    if (activityFilters.contentType !== "all") count += 1;
    if (activityFilters.sortBy !== "date") count += 1;
    if (activityFilters.order !== "desc") count += 1;
    if (activityFilters.storyStatus !== "all") count += 1;
    if (activityFilters.storyVisibility !== "all") count += 1;

    return count;
  }, [activityFilters]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Analytics Dashboard" />
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <header className="mb-8 sm:mb-10">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                  Writing Analytics
                </h1>
                <p className="mt-3 text-sm text-slate-500">
                  Track your publishing progress and engagement at a glance.
                </p>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                {renderStatCard(
                  "Published Stories",
                  isLoading ? "..." : formatCount(stats.totalPosts),
                  "Total posts",
                )}
                {renderStatCard(
                  "Total Word Count",
                  isLoading ? "..." : formatCount(stats.totalWords),
                  "Across your stories and confessions",
                )}
                {renderStatCard(
                  "Total Reader Loves",
                  isLoading ? "..." : formatCount(stats.totalLikes),
                  "Total likes",
                )}
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {errorMessage}
                </div>
              )}

              {/* Recent Activity Card */}
              <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden min-h-105 sm:min-h-125 flex flex-col shadow-sm">
                <div className="relative px-4 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="flex items-center text-lg font-semibold text-slate-700 gap-2">
                    <History strokeWidth={2} size={26} /> Your Recent Activity
                  </h3>
                  <button
                    ref={filterButtonRef}
                    onClick={() => setShowFilters((prev) => !prev)}
                    className="relative p-2 hover:bg-slate-100 rounded-full transition-colors group"
                    aria-label="Open activity filters"
                  >
                    <Filter className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-semibold px-1.5 flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  {showFilters && (
                    <div
                      ref={filterPanelRef}
                      className="absolute right-4 sm:right-8 top-full mt-2 z-20 w-75 rounded-2xl border border-slate-200 bg-white shadow-xl p-4"
                    >
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">
                        Activity Filters
                      </h4>

                      <div className="space-y-3">
                        <label
                          htmlFor="dashboard-content-type"
                          className="block text-xs font-medium text-slate-500 uppercase tracking-wide"
                        >
                          Content Type
                        </label>
                        <select
                          id="dashboard-content-type"
                          value={activityFilters.contentType}
                          onChange={(event) =>
                            updateFilter("contentType", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
                        >
                          <option value="all">Stories + Confessions</option>
                          <option value="story">Stories only</option>
                          <option value="confession">Confessions only</option>
                        </select>

                        <label
                          htmlFor="dashboard-sort-by"
                          className="block text-xs font-medium text-slate-500 uppercase tracking-wide"
                        >
                          Sort By
                        </label>
                        <select
                          id="dashboard-sort-by"
                          value={activityFilters.sortBy}
                          onChange={(event) =>
                            updateFilter("sortBy", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
                        >
                          <option value="date">Date</option>
                          <option value="likes">Likes</option>
                        </select>

                        <label
                          htmlFor="dashboard-sort-order"
                          className="block text-xs font-medium text-slate-500 uppercase tracking-wide"
                        >
                          Sort Order
                        </label>
                        <select
                          id="dashboard-sort-order"
                          value={activityFilters.order}
                          onChange={(event) =>
                            updateFilter("order", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
                        >
                          <option value="desc">Newest / Highest first</option>
                          <option value="asc">Oldest / Lowest first</option>
                        </select>

                        <label
                          htmlFor="dashboard-story-status"
                          className="block text-xs font-medium text-slate-500 uppercase tracking-wide"
                        >
                          Story Status
                        </label>
                        <select
                          id="dashboard-story-status"
                          value={activityFilters.storyStatus}
                          onChange={(event) =>
                            updateFilter("storyStatus", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
                          disabled={
                            activityFilters.contentType === "confession"
                          }
                        >
                          <option value="all">All</option>
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                        </select>

                        <label
                          htmlFor="dashboard-story-visibility"
                          className="block text-xs font-medium text-slate-500 uppercase tracking-wide"
                        >
                          Story Visibility
                        </label>
                        <select
                          id="dashboard-story-visibility"
                          value={activityFilters.storyVisibility}
                          onChange={(event) =>
                            updateFilter("storyVisibility", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
                          disabled={
                            activityFilters.contentType === "confession"
                          }
                        >
                          <option value="all">All</option>
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <button
                          onClick={resetFilters}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => setShowFilters(false)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {recentActivityContent}
              </div>
            </div>
            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
