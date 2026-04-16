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
import { Filter, History } from "lucide-react";
import ActivityFiltersPanel from "../features/dashboard/ActivityFiltersPanel";
import RecentActivityTable from "../features/dashboard/RecentActivityTable";
import StatsCard from "../features/dashboard/StatsCard";
import {
  DASHBOARD_FILTERS_STORAGE_KEY,
  DEFAULT_ACTIVITY_FILTERS,
  buildFetchParams,
  formatCount,
  getSavedDashboardFilters,
  getSortConfig,
  getStoryQueryFilters,
  normalizeActivityItem,
  normalizePayloadItems,
  sortMergedActivities,
} from "../features/dashboard/dashboardUtils";

const DASHBOARD_PAGE_SIZE = 8;

const parseDashboardResponse = async (response) =>
  response.json().catch(() => ({}));

const loadDashboardFeedData = async ({ headers, activityFilters }) => {
  const { apiSortBy, order } = getSortConfig(activityFilters.sortBy);
  const { status, deleted, visibility } = getStoryQueryFilters(activityFilters);

  const feedParams = new URLSearchParams({
    limit: String(DASHBOARD_PAGE_SIZE),
    page: "1",
    sortBy: apiSortBy,
    order,
    status,
    visibility,
    deleted,
  });

  const [statsResponse, feedResponse] = await Promise.all([
    fetch("/api/dashboard/stats", { headers }),
    fetch(`/api/dashboard/feed?${feedParams.toString()}`, { headers }),
  ]);

  const [statsPayload, feedPayload] = await Promise.all([
    parseDashboardResponse(statsResponse),
    parseDashboardResponse(feedResponse),
  ]);

  if (!statsResponse.ok) {
    throw new Error(
      statsPayload?.message || "Unable to load dashboard statistics.",
    );
  }

  if (!feedResponse.ok) {
    throw new Error(
      feedPayload?.message || "Unable to load dashboard activity.",
    );
  }

  return {
    statsPayload,
    activities: Array.isArray(feedPayload?.data)
      ? feedPayload.data.map((item) =>
          normalizeActivityItem(item, item?.type || "story"),
        )
      : [],
    hasMoreFeed: Number(feedPayload?.pagination?.totalPages || 0) > 1,
  };
};

const loadDashboardSplitData = async ({ headers, activityFilters }) => {
  const { apiSortBy, order } = getSortConfig(activityFilters.sortBy);
  const { status, deleted, visibility } = getStoryQueryFilters(activityFilters);

  const storyParams = new URLSearchParams({
    limit: String(DASHBOARD_PAGE_SIZE),
    page: "1",
    sortBy: apiSortBy,
    order,
    status,
    visibility,
    deleted,
  });

  const confessionParams = new URLSearchParams({
    limit: String(DASHBOARD_PAGE_SIZE),
    page: "1",
    sortBy: apiSortBy,
    order,
  });

  const [statsResponse, storiesResponse, confessionsResponse] =
    await Promise.all([
      fetch("/api/dashboard/stats", { headers }),
      fetch(`/api/dashboard/stories?${storyParams.toString()}`, {
        headers,
      }),
      fetch(`/api/dashboard/confessions?${confessionParams.toString()}`, {
        headers,
      }),
    ]);

  const [statsPayload, storiesPayload, confessionsPayload] = await Promise.all([
    parseDashboardResponse(statsResponse),
    parseDashboardResponse(storiesResponse),
    parseDashboardResponse(confessionsResponse),
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
      confessionsPayload?.message || "Unable to load dashboard confessions.",
    );
  }

  const mappedStories = Array.isArray(storiesPayload?.data)
    ? storiesPayload.data.map((story) => normalizeActivityItem(story, "story"))
    : [];

  const mappedConfessions = Array.isArray(confessionsPayload?.data)
    ? confessionsPayload.data.map((confession) =>
        normalizeActivityItem(confession, "confession"),
      )
    : [];

  return {
    statsPayload,
    activities: sortMergedActivities(
      [...mappedStories, ...mappedConfessions],
      activityFilters,
    ),
    hasMoreStories: Number(storiesPayload?.pagination?.totalPages || 0) > 1,
    hasMoreConfessions:
      Number(confessionsPayload?.pagination?.totalPages || 0) > 1,
  };
};

const loadDashboardData = async ({ headers, activityFilters }) =>
  activityFilters.contentType === "all"
    ? loadDashboardFeedData({ headers, activityFilters })
    : loadDashboardSplitData({ headers, activityFilters });

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
  const [feedPage, setFeedPage] = useState(1);
  const [hasMoreStories, setHasMoreStories] = useState(true);
  const [hasMoreConfessions, setHasMoreConfessions] = useState(true);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
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

      const result = await loadDashboardData({ headers, activityFilters });

      setStats({
        totalPosts: Number(result.statsPayload?.stats?.totalPosts || 0),
        totalWords: Number(result.statsPayload?.stats?.totalWords || 0),
        totalLikes: Number(result.statsPayload?.stats?.totalLikes || 0),
      });

      setActivities(result.activities);
      setStoryPage(1);
      setConfessionPage(1);
      setFeedPage(1);
      setHasMoreFeed(Boolean(result.hasMoreFeed));
      setHasMoreStories(Boolean(result.hasMoreStories));
      setHasMoreConfessions(Boolean(result.hasMoreConfessions));
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
      let errorType = "confessions";

      if (type === "story") {
        errorType = "stories";
      } else if (type === "feed") {
        errorType = "activities";
      }

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
    if (
      isLoadingMore ||
      (activityFilters.contentType === "all"
        ? !hasMoreFeed
        : !hasMoreStories && !hasMoreConfessions)
    ) {
      return;
    }

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

      if (activityFilters.contentType === "all") {
        const { apiSortBy, order } = getSortConfig(activityFilters.sortBy);
        const { status, deleted, visibility } =
          getStoryQueryFilters(activityFilters);

        const feedResponse = await fetch(
          `/api/dashboard/feed?${buildFetchParams({
            limit: "8",
            page: feedPage + 1,
            sortBy: apiSortBy,
            order,
            status,
            visibility,
            deleted,
          })}`,
          { headers },
        );

        const feedPayload = await validateAndParseResponse(
          feedResponse,
          "feed",
        );

        const newFeedItems = Array.isArray(feedPayload?.data)
          ? feedPayload.data.map((item) =>
              normalizeActivityItem(item, item?.type || "story"),
            )
          : [];

        setActivities((prev) => [...prev, ...newFeedItems]);
        setFeedPage((prev) => prev + 1);
        setHasMoreFeed(
          Number(feedPayload?.pagination?.page || 0) <
            Number(feedPayload?.pagination?.totalPages || 0),
        );
        return;
      }

      const shouldFetchStories =
        activityFilters.contentType !== "confession" && hasMoreStories;
      const shouldFetchConfessions =
        activityFilters.contentType !== "story" && hasMoreConfessions;
      const { apiSortBy, order } = getSortConfig(activityFilters.sortBy);
      const { status, deleted, visibility } =
        getStoryQueryFilters(activityFilters);

      const [storiesResponse, confessionsResponse] = await Promise.all([
        shouldFetchStories
          ? fetch(
              `/api/dashboard/stories?${buildFetchParams({
                limit: "8",
                page: storyPage + 1,
                sortBy: apiSortBy,
                order,
                status,
                visibility,
                deleted,
              })}`,
              { headers },
            )
          : null,
        shouldFetchConfessions
          ? fetch(
              `/api/dashboard/confessions?${buildFetchParams({
                limit: "8",
                page: confessionPage + 1,
                sortBy: apiSortBy,
                order,
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
        sortMergedActivities([...prev, ...allNewItems], activityFilters),
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
    feedPage,
    storyPage,
    hasMoreFeed,
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

  const canLoadMore = useMemo(() => {
    if (activityFilters.contentType === "all") {
      return hasMoreFeed;
    }

    if (activityFilters.contentType === "story") {
      return hasMoreStories;
    }

    if (activityFilters.contentType === "confession") {
      return hasMoreConfessions;
    }

    return hasMoreStories || hasMoreConfessions;
  }, [
    activityFilters.contentType,
    hasMoreConfessions,
    hasMoreFeed,
    hasMoreStories,
  ]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;

    if (activityFilters.contentType !== "all") count += 1;
    if (activityFilters.sortBy !== "updated_desc") count += 1;
    if (activityFilters.contentType !== "confession") {
      if (activityFilters.storyStatus !== "all") count += 1;
      if (activityFilters.storyVisibility !== "all") count += 1;
    }

    return count;
  }, [activityFilters]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Analytics Dashboard" />
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-6xl mx-auto mb-4">
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
                <StatsCard
                  title="Published Stories"
                  value={isLoading ? "..." : formatCount(stats.totalPosts)}
                  subtitle="Total posts"
                />
                <StatsCard
                  title="Total Word Count"
                  value={isLoading ? "..." : formatCount(stats.totalWords)}
                  subtitle="Across your stories and confessions"
                />
                <StatsCard
                  title="Total Reader Loves"
                  value={isLoading ? "..." : formatCount(stats.totalLikes)}
                  subtitle="Total likes"
                />
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
              <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-visible min-h-115 sm:min-h-136 flex flex-col shadow-sm">
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
                    <ActivityFiltersPanel
                      activityFilters={activityFilters}
                      updateFilter={updateFilter}
                      resetFilters={resetFilters}
                      setShowFilters={setShowFilters}
                      filterPanelRef={filterPanelRef}
                    />
                  )}
                </div>

                <RecentActivityTable
                  activities={activities}
                  isLoading={isLoading}
                  canLoadMore={canLoadMore}
                  isLoadingMore={isLoadingMore}
                  loadMoreActivities={loadMoreActivities}
                />
              </div>
            </div>
            <SiteFooter />
          </div>
        </main>
      </div>
    </div>
  );
}
