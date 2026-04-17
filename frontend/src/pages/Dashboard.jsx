import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { Filter, PenTool, Clock3, FileText } from "lucide-react";
import {
  getDashboardStats,
  getDashboardStories,
} from "../api/dashboard/dashboardApi";

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

const DashboardStoryCard = ({ story }) => {
  const title = story?.title || "Untitled Story";
  const excerpt =
    story?.summary || story?.content?.slice(0, 140) || "No preview available.";
  const statusLabel = story?.status
    ? `${story.status.charAt(0).toUpperCase()}${story.status.slice(1)}`
    : "Draft";
  const visibilityLabel = story?.visibility
    ? `${story.visibility.charAt(0).toUpperCase()}${story.visibility.slice(1)}`
    : "Public";
  const wordCount = Number(story?.wordCount || 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 hover:bg-white hover:shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-600">
              {statusLabel}
            </span>
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
          <Link
            to={`/write?storyId=${story.id}&returnTo=dashboard`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Edit
          </Link>
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
  const [recentStories, setRecentStories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [statsPayload, storiesPayload] = await Promise.all([
          getDashboardStats({ signal: controller.signal }),
          getDashboardStories({
            status: "all",
            visibility: "all",
            deleted: "active",
            sortBy: "date",
            order: "desc",
            page: 1,
            limit: 5,
            signal: controller.signal,
          }),
        ]);

        if (!isMounted) {
          return;
        }

        setDashboardStats(statsPayload);
        setRecentStories(
          Array.isArray(storiesPayload?.data) ? storiesPayload.data : [],
        );
      } catch (error) {
        if (error.name !== "AbortError" && isMounted) {
          setErrorMessage(error.message || "Failed to load dashboard data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const storyStats = useMemo(
    () => dashboardStats?.stats?.breakdown || {},
    [dashboardStats],
  );

  const statCards = useMemo(
    () => [
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
        value: Number(storyStats.storyLikes || 0),
        subtitle: "Likes on your stories",
      },
    ],
    [storyStats],
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="Analytics Dashboard" />
        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-6xl mx-auto">
              <header className="mb-8 sm:mb-10 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">
                    Writing Analytics
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Track your publishing progress and engagement at a glance.
                  </p>
                </div>
                <button className="hidden sm:inline-flex p-2 hover:bg-slate-100 rounded-full transition-colors group">
                  <Filter className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </button>
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
                    loading={isLoading}
                  />
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden min-h-[420px] sm:min-h-[500px] flex flex-col shadow-sm">
                <div className="px-4 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-700">
                      Your Recent Stories
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Latest items from your dashboard feed.
                    </p>
                  </div>
                  <button className="p-2 hover:bg-slate-100 rounded-full transition-colors group">
                    <Filter className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                  </button>
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
                  ) : recentStories.length > 0 ? (
                    <div className="space-y-4">
                      {recentStories.map((story) => (
                        <DashboardStoryCard
                          key={story._id || story.id}
                          story={{
                            id: String(story._id || story.id),
                            title: story.title,
                            summary: story.summary,
                            content: story.content,
                            status: story.status,
                            visibility: story.visibility,
                            updatedAt: story.updatedAt,
                            createdAt: story.createdAt,
                            wordCount: story.wordCount,
                            likesCount: story.likesCount,
                          }}
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
                        You haven't written any stories yet. Start your first
                        post to see dashboard activity here.
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
    </div>
  );
}
