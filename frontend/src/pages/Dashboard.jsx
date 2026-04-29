import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Filter, PenTool, Clock3, FileText, Trash2, AlertTriangle } from "lucide-react";

import {
  getDashboardStats,
  getDashboardStories,
  getDashboardConfessions,
} from "../api/dashboard/dashboardApi";
import { deleteStory, restoreStory } from "../api/story/storyApi";
import ActivityFiltersPanel from "../features/dashboard/ActivityFiltersPanel";
import {
  DEFAULT_ACTIVITY_FILTERS,
  getSavedDashboardFilters,
  getSortConfig,
  getStoryQueryFilters,
} from "../features/dashboard/dashboardUtils";

const StatCard = ({ title, value, subtitle, loading = false }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between min-h-[160px] shadow-sm">
    <div>
      <h2 className="text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase">
        {title}
      </h2>
      <div className="mt-4 text-5xl sm:text-[64px] leading-tight font-light text-rose-500">
        {loading ? "—" : value}
      </div>
    </div>
    <div className="text-xs text-slate-400 font-medium tracking-tight">
      {subtitle}
    </div>
  </div>
);

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString();
};

const DashboardStoryCard = ({ story, onDelete, onRecover }) => {
  const id = story?.id || story?._id;
  const title =
    story?.title ||
    (story?._type === "confession" ? "Confession" : "Untitled Story");
  const excerpt =
    story?.summary || story?.content?.slice(0, 140) || "No preview available.";
  const isConfession = story?._type === "confession";
  const statusLabel =
    isConfession
      ? null
      : story?.status
        ? `${story.status.charAt(0).toUpperCase()}${story.status.slice(1)}`
        : "Draft";
  const visibilityLabel = story?.visibility
    ? `${story.visibility.charAt(0).toUpperCase()}${story.visibility.slice(1)}`
    : "Public";
  const wordCount = Number(story?.wordCount || 0);
  const isDeleted = !!story.deletedAt;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 hover:bg-white hover:shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {statusLabel && (
              <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-600">
                {statusLabel}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {visibilityLabel}
            </span>
          </div>

          <h4 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
            {title}
          </h4>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            {excerpt}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isDeleted ? (
            <button
              type="button"
              onClick={() => onRecover && onRecover(story)}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-green-600 hover:bg-green-50 transition-colors"
            >
              Recover
            </button>
          ) : (
            <>
              <Link
                to={
                  story?._type === "confession"
                    ? `/confession?editId=${id}&returnTo=dashboard`
                    : `/write?storyId=${id}&returnTo=dashboard`
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <FileText className="h-4 w-4" />
                Edit
              </Link>
              <button
                type="button"
                onClick={() => onDelete && onDelete(story)}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5" />
          {formatRelativeTime(story?.updatedAt || story?.createdAt)}
        </span>
        <span>{wordCount} words</span>
        <span>{Number(story?.likesCount || 0)} likes</span>
      </div>
    </div>
  );
};
export default function Dashboard() {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activityFilters, setActivityFilters] = useState(() =>
    getSavedDashboardFilters(),
  );
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const filterButtonRef = useRef(null);
  const filterPanelRef = useRef(null);

  useEffect(() => {
    if (!showFilters) return;
    const handleClickOutside = (e) => {
      if (
        filterButtonRef.current?.contains(e.target) ||
        filterPanelRef.current?.contains(e.target)
      )
        return;
      setShowFilters(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const loadDashboard = async () => {
      setIsStatsLoading(true);
      setErrorMessage("");

      try {
        const statsPayload = await getDashboardStats({
          signal: controller.signal,
        });
        if (!isMounted) return;
        setDashboardStats(statsPayload);
      } catch (error) {
        if (error.name !== "AbortError" && isMounted) {
          setErrorMessage(error.message || "Failed to load dashboard stats.");
        }
      } finally {
        if (isMounted) setIsStatsLoading(false);
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Fetch activities (stories, confessions, or both) with filters and pagination
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function fetchActivities() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const { apiSortBy, order } = getSortConfig(activityFilters.sortBy);

        if (activityFilters.contentType === "confession") {
          const confessionFilters = getStoryQueryFilters(activityFilters);
          const payload = await getDashboardConfessions({
            deleted: confessionFilters.deleted,
            visibility: confessionFilters.visibility,
            sortBy: apiSortBy,
            order,
            page,
            limit: 5,
            signal: controller.signal,
          });

          if (!isMounted) return;
          setActivities(
            (payload?.data || []).map((c) => ({ ...c, _type: "confession" })),
          );
          return;
        }

        if (activityFilters.contentType === "story") {
          const filters = getStoryQueryFilters(activityFilters);
          const payload = await getDashboardStories({
            ...filters,
            sortBy: apiSortBy,
            order,
            page,
            limit: 5,
            signal: controller.signal,
          });

          if (!isMounted) return;
          setActivities(
            (payload?.data || []).map((s) => ({ ...s, _type: "story" })),
          );
          return;
        }

        // contentType === 'all' -> fetch both and merge
        const allFilters = getStoryQueryFilters(activityFilters);
        const [storiesRes, confessionsRes] = await Promise.allSettled([
          getDashboardStories({
            ...allFilters,
            sortBy: apiSortBy,
            order,
            page,
            limit: 5,
            signal: controller.signal,
          }),
          getDashboardConfessions({
            deleted: allFilters.deleted,
            visibility: allFilters.visibility,
            sortBy: apiSortBy,
            order,
            page,
            limit: 5,
            signal: controller.signal,
          }),
        ]);

        const stories =
          storiesRes.status === "fulfilled" ? storiesRes.value?.data || [] : [];
        const confessions =
          confessionsRes.status === "fulfilled"
            ? confessionsRes.value?.data || []
            : [];

        // Confessions have no draft/published status, so exclude them when
        // the user is filtering by a specific story status.
        const includeConfessions = allFilters.status === "all";
        const merged = [
          ...stories.map((s) => ({ ...s, _type: "story" })),
          ...(includeConfessions
            ? confessions.map((c) => ({ ...c, _type: "confession" }))
            : []),
        ];

        // sort by updated or created date desc
        merged.sort((a, b) => {
          const aTime = new Date(
            a.updatedAt || a.createdAt || a.created_at || 0,
          ).getTime();
          const bTime = new Date(
            b.updatedAt || b.createdAt || b.created_at || 0,
          ).getTime();
          return bTime - aTime;
        });

        if (!isMounted) return;
        setActivities(merged);
      } catch (error) {
        if (error.name !== "AbortError" && isMounted) {
          setErrorMessage(error.message || "Failed to load dashboard data.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchActivities();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [activityFilters, page]);

  const handleDeleteClick = (item) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const item = deleteTarget;
    setDeleteTarget(null);
    try {
      const id = item.id || item._id || item.storyId || item.confessionId;
      if (item._type === "story") {
        await deleteStory(id);
      } else if (item._type === "confession") {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/confessions/${id}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.message || "Failed to delete confession");
        }
      }

      setActivities((prev) =>
        prev.filter(
          (a) => (a.id || a._id || a.storyId || a.confessionId) !== id,
        ),
      );
    } catch (err) {
      setErrorMessage(err.message || "Failed to delete activity");
    }
  };

  const handleRecoverActivity = async (item) => {
    try {
      const id = item.id || item._id || item.storyId || item.confessionId;
      if (item._type === "story") {
        await restoreStory(id);
      } else if (item._type === "confession") {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/confessions/${id}/restore`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.message || "Failed to restore confession");
        }
      }

      setActivities((prev) =>
        prev.filter(
          (a) => (a.id || a._id || a.storyId || a.confessionId) !== id,
        ),
      );
    } catch (err) {
      setErrorMessage(err.message || "Failed to recover activity");
      console.error("Failed to recover activity", err);
    }
  };

  // Filter panel handlers
  const updateFilter = (key, value) => {
    setActivityFilters((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("dashboardActivityFilters", JSON.stringify(next));
      return next;
    });
    setPage(1);
  };
  const resetFilters = () => {
    setActivityFilters(DEFAULT_ACTIVITY_FILTERS);
    setPage(1);
  };

  const storyStats = useMemo(
    () => dashboardStats?.stats?.breakdown || {},
    [dashboardStats],
  );

  const statCards = useMemo(() => {
    let readerLoves = 0;
    let subtitle = "Likes on your stories";
    if (activityFilters.contentType === "confession") {
      readerLoves = Number(storyStats.confessionLikes || 0);
      subtitle = "Likes on your confessions";
    } else if (activityFilters.contentType === "story") {
      readerLoves = Number(storyStats.storyLikes || 0);
      subtitle = "Likes on your stories";
    } else {
      readerLoves = Number(dashboardStats?.stats?.totalLikes || 0);
      subtitle = "Likes on all your posts";
    }
    return [
      {
        title: "Total Stories",
        value: Number(storyStats.storyCount || 0),
        subtitle: "Active stories on your dashboard",
      },
      {
        title: "Total Word Count",
        value: Number(storyStats.storyWords || 0),
        subtitle: "Across your story drafts and posts",
      },
      {
        title: "Total Reader Loves",
        value: readerLoves,
        subtitle,
      },
    ];
  }, [storyStats, dashboardStats, activityFilters.contentType]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Analytics Dashboard" />
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-6xl mx-auto">
              <header className="mb-8 sm:mb-10 flex items-start justify-between gap-4">
                <div className="flex items-start justify-between gap-4 w-full">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                      Writing Analytics
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Track your publishing progress and engagement at a glance.
                    </p>
                  </div>
                  <div className="relative flex items-center">
                    <button
                      className="hidden sm:inline-flex p-2 hover:bg-slate-100 rounded-full transition-colors group"
                      onClick={() => setShowFilters((v) => !v)}
                      ref={filterButtonRef}
                    >
                      <Filter className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                    </button>
                    {showFilters && (
                      <div className="absolute right-0 top-full mt-2 z-30 w-80 max-w-full shadow-xl">
                        <ActivityFiltersPanel
                          activityFilters={activityFilters}
                          updateFilter={updateFilter}
                          resetFilters={resetFilters}
                          setShowFilters={setShowFilters}
                          filterPanelRef={filterPanelRef}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {errorMessage && (
                <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                {statCards.map((card) => (
                  <StatCard
                    key={card.title}
                    title={card.title}
                    value={card.value}
                    subtitle={card.subtitle}
                    loading={isStatsLoading}
                  />
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden min-h-[420px] sm:min-h-[500px] flex flex-col shadow-sm">
                <div className="px-4 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700">
                      {activityFilters.contentType === "confession"
                        ? "Your Recent Confessions"
                        : "Your Recent Stories"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Latest items from your dashboard feed.
                    </p>
                  </div>
                </div>

                <div className="flex-1 p-4 sm:p-8">
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
                        />
                      ))}
                    </div>
                  ) : activities.length > 0 ? (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {activities.map((item) => (
                        <DashboardStoryCard
                          key={item._id || item.id}
                          story={{
                            id: String(item._id || item.id),
                            title: item.title,
                            summary: item.summary,
                            content: item.content,
                            status: item.status,
                            visibility: item.visibility,
                            updatedAt: item.updatedAt,
                            createdAt: item.createdAt,
                            deletedAt: item.deletedAt,
                            wordCount: item.wordCount,
                            likesCount: item.likesCount,
                            _type: item._type,
                          }}
                          onDelete={handleDeleteClick}
                          onRecover={handleRecoverActivity}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                      <div className="bg-slate-100 p-6 rounded-full mb-6">
                        <PenTool
                          className="w-12 h-12 text-slate-300"
                          strokeWidth={1.5}
                        />
                      </div>
                      <p className="text-slate-500 text-sm md:text-base font-medium max-w-md">
                        {activityFilters.contentType === "confession"
                          ? "You haven't written any confessions yet. Start your first confession to see dashboard activity here."
                          : "You haven't written any stories yet. Start your first post to see dashboard activity here."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <SiteFooter />
          </div>
        </main>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Delete this {deleteTarget._type === "confession" ? "confession" : "story"}?
              </h3>
            </div>
            <p className="text-sm text-slate-500 mb-6 pl-12">
              This will permanently remove it from your dashboard. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
