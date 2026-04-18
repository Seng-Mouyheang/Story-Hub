import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { ChevronLeft, Share, User } from "lucide-react";
import {
  getProfileByUserId,
  getUserStats,
  getFollowStatus,
  followUser,
  unfollowUser,
} from "../api/profile";
import { getMyStories, getStoriesByAuthor } from "../api/story/storyApi";
import { getMyBookmarkedStories } from "../api/story/storyInteractionsApi";
import {
  getDashboardStories,
  getDashboardConfessions,
} from "../api/dashboard/dashboardApi";

const formatCount = (value) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return String(value);
};

const getRelativeTime = (dateString) => {
  const sourceDate = new Date(dateString);

  if (Number.isNaN(sourceDate.getTime())) {
    return "Recently";
  }

  const diffMs = Date.now() - sourceDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
};

const mapStoryToCard = (story, overrides = {}) => ({
  id: String(story._id),
  title: story.title || "Untitled Story",
  excerpt:
    story.summary ||
    story.content?.slice(0, 160) ||
    "No preview is available for this story.",
  likes: formatCount(Number(story.likesCount || 0)),
  saves: formatCount(Number(story.bookmarkCount || 0)),
  date: getRelativeTime(story.publishedAt || story.createdAt),
  genre: story.genres?.[0]?.toUpperCase() || "GENERAL",
  sortTs: new Date(story.publishedAt || story.createdAt || 0).getTime() || 0,
  ...overrides,
});

const StoryCard = ({ story, actionLabel, actionHref }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="text-xl font-semibold text-slate-900">{story.title}</h3>
      <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">
        {story.genre}
      </span>
    </div>
    <p className="text-sm text-slate-500 italic mb-6">{story.excerpt}</p>
    <div className="flex flex-wrap items-center justify-end gap-4 sm:gap-6 text-[10px] font-semibold text-slate-500 uppercase tracking-tighter">
      <div className="flex items-center gap-1">
        <span>{story.likes} likes</span>
      </div>
      <div className="flex items-center gap-1">
        <span>{story.savesLabel || `${story.saves} Saves`}</span>
      </div>
      <div>{story.date}</div>
    </div>
    {actionHref && actionLabel ? (
      <div className="mt-5 flex justify-end">
        <Link
          to={actionHref}
          className="text-xs font-semibold text-rose-500 hover:text-rose-600"
        >
          {actionLabel}
        </Link>
      </div>
    ) : null}
  </div>
);

export default function Profile() {
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams();
  const [activeTab, setActiveTab] = useState("Stories");
  const [profileData, setProfileData] = useState(null);
  const [profileStats, setProfileStats] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileRefreshToken, setProfileRefreshToken] = useState(0);
  const [isFollowingViewedUser, setIsFollowingViewedUser] = useState(false);
  const [isLoadingFollowStatus, setIsLoadingFollowStatus] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [storyItems, setStoryItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [activityItems, setActivityItems] = useState([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(true);
  const lastViewedUserIdRef = useRef("");

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("currentUser") || "null");
    } catch {
      return null;
    }
  }, []);

  const currentUserId = useMemo(
    () => String(currentUser?.id || currentUser?._id || ""),
    [currentUser],
  );

  const normalizeId = (value) => String(value || "").trim();
  const viewedUserId = normalizeId(routeUserId || currentUserId);
  const isOwnProfile =
    !routeUserId || normalizeId(routeUserId) === normalizeId(currentUserId);

  useEffect(() => {
    const handleFollowUpdated = (event) => {
      const normalizedViewedUserId = String(viewedUserId || "").trim();
      const normalizedCurrentUserId = String(currentUserId || "").trim();
      const followerId = String(event?.detail?.followerId || "").trim();
      const followingId = String(event?.detail?.followingId || "").trim();
      const isFollowing = Boolean(event?.detail?.following);

      if (!normalizedViewedUserId) {
        return;
      }

      setProfileData((previous) => {
        if (!previous) {
          return previous;
        }

        let nextFollowers = Number(previous.followers || 0);
        let nextFollowing = Number(previous.following || 0);

        if (normalizedViewedUserId === followingId) {
          nextFollowers = Math.max(0, nextFollowers + (isFollowing ? 1 : -1));
        }

        if (normalizedViewedUserId === followerId) {
          nextFollowing = Math.max(0, nextFollowing + (isFollowing ? 1 : -1));
        }

        return {
          ...previous,
          followers: nextFollowers,
          following: nextFollowing,
        };
      });

      if (
        normalizedViewedUserId === followerId ||
        normalizedViewedUserId === followingId
      ) {
        setProfileRefreshToken((previous) => previous + 1);
      }

      if (
        normalizedViewedUserId === followingId &&
        normalizedCurrentUserId === followerId
      ) {
        setIsFollowingViewedUser(isFollowing);
      }
    };

    window.addEventListener("storyhub:follow-updated", handleFollowUpdated);

    return () => {
      window.removeEventListener(
        "storyhub:follow-updated",
        handleFollowUpdated,
      );
    };
  }, [currentUserId, viewedUserId]);

  useEffect(() => {
    if (!viewedUserId || isOwnProfile) {
      setIsFollowingViewedUser(false);
      setIsLoadingFollowStatus(false);
      return;
    }

    let isMounted = true;

    const loadFollowStatus = async () => {
      setIsLoadingFollowStatus(true);

      try {
        const payload = await getFollowStatus(viewedUserId);
        if (isMounted) {
          setIsFollowingViewedUser(Boolean(payload?.following));
        }
      } catch {
        // Keep previous state when status refresh fails transiently.
      } finally {
        if (isMounted) {
          setIsLoadingFollowStatus(false);
        }
      }
    };

    loadFollowStatus();

    return () => {
      isMounted = false;
    };
  }, [isOwnProfile, viewedUserId]);

  useEffect(() => {
    if (!viewedUserId) {
      return;
    }

    let isMounted = true;
    const viewedUserChanged = lastViewedUserIdRef.current !== viewedUserId;
    lastViewedUserIdRef.current = viewedUserId;

    const loadProfile = async () => {
      if (isMounted && viewedUserChanged) {
        setIsLoadingProfile(true);
      }

      try {
        const [payload, statsPayload] = await Promise.all([
          getProfileByUserId(viewedUserId),
          getUserStats(viewedUserId).catch(() => null),
        ]);

        if (isMounted) {
          setProfileData(payload);
          setProfileStats(statsPayload);
        }
      } catch {
        if (isMounted && viewedUserChanged) {
          setProfileData(null);
          setProfileStats(null);
        }
      } finally {
        if (isMounted && viewedUserChanged) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [profileRefreshToken, viewedUserId]);

  useEffect(() => {
    if (!isOwnProfile) {
      setActiveTab("Stories");
    }
  }, [isOwnProfile]);

  useEffect(() => {
    if (!viewedUserId) {
      return;
    }

    let isMounted = true;
    const abortController = new AbortController();

    const loadTabs = async () => {
      setIsLoadingTabs(true);

      try {
        const [
          myStoriesResult,
          bookmarkedResult,
          dashboardStoriesResult,
          dashboardConfessionsResult,
        ] = await Promise.all([
          (isOwnProfile
            ? getMyStories({ limit: 20, signal: abortController.signal })
            : getStoriesByAuthor(viewedUserId, {
                limit: 20,
                signal: abortController.signal,
              })
          ).catch(() => ({ data: [] })),
          (isOwnProfile
            ? getMyBookmarkedStories({
                limit: 20,
                signal: abortController.signal,
              })
            : Promise.resolve({ data: [] })
          ).catch(() => ({ data: [] })),
          (isOwnProfile
            ? getDashboardStories({
                limit: 8,
                page: 1,
                sortBy: "date",
                order: "desc",
                status: "all",
                visibility: "all",
                deleted: "active",
                signal: abortController.signal,
              })
            : Promise.resolve({ data: [] })
          ).catch(() => ({ data: [] })),
          (isOwnProfile
            ? getDashboardConfessions({
                limit: 8,
                page: 1,
                sortBy: "date",
                order: "desc",
                signal: abortController.signal,
              })
            : Promise.resolve({ data: [] })
          ).catch(() => ({ data: [] })),
        ]);

        const myStories = Array.isArray(myStoriesResult?.data)
          ? myStoriesResult.data
          : [];
        const bookmarkedStories = Array.isArray(bookmarkedResult?.data)
          ? bookmarkedResult.data
          : [];
        const dashboardStories = Array.isArray(dashboardStoriesResult?.data)
          ? dashboardStoriesResult.data
          : [];
        const dashboardConfessions = Array.isArray(
          dashboardConfessionsResult?.data,
        )
          ? dashboardConfessionsResult.data
          : [];

        const storyCards = myStories.map((story) =>
          mapStoryToCard(story, {
            saves: formatCount(Number(story.bookmarkCount || 0)),
          }),
        );

        const savedCards = bookmarkedStories.map((story) =>
          mapStoryToCard(story, {
            saves: "1",
            savesLabel: "Saved",
          }),
        );

        const recentActivity = [
          ...dashboardStories.map((story) => ({
            id: `story-${story._id}`,
            title: story.title || "Untitled Story",
            excerpt:
              story.status === "draft"
                ? "Updated a draft story"
                : "Updated a story",
            likes: formatCount(Number(story.likesCount || 0)),
            saves: formatCount(Number(story.bookmarkCount || 0)),
            date: getRelativeTime(story.updatedAt || story.createdAt),
            genre: story.status === "draft" ? "Draft" : "Story",
            sortTs:
              new Date(story.updatedAt || story.createdAt || 0).getTime() || 0,
            actionLabel: "Edit story",
            actionHref: `/write?storyId=${story._id}&returnTo=/profile`,
          })),
          ...dashboardConfessions.map((confession) => ({
            id: `confession-${confession._id}`,
            title: confession.title || "Untitled Confession",
            excerpt: "Updated a confession",
            likes: formatCount(Number(confession.likesCount || 0)),
            saves: formatCount(Number(confession.bookmarkCount || 0)),
            date: getRelativeTime(confession.updatedAt || confession.createdAt),
            genre: "Confession",
            sortTs:
              new Date(
                confession.updatedAt || confession.createdAt || 0,
              ).getTime() || 0,
            actionLabel: "View dashboard",
            actionHref: "/dashboard",
          })),
        ]
          .sort((left, right) => (right.sortTs || 0) - (left.sortTs || 0))
          .slice(0, 8);

        if (isMounted) {
          setStoryItems(storyCards);
          setSavedItems(savedCards);
          setActivityItems(recentActivity);
        }
      } catch {
        if (isMounted) {
          setStoryItems([]);
          setSavedItems([]);
          setActivityItems([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTabs(false);
        }
      }
    };

    loadTabs();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [isOwnProfile, viewedUserId]);

  const userData = useMemo(() => {
    const username = currentUser?.username || "StoryHub User";
    const email = currentUser?.email || "";
    const stats = profileStats?.stats || {};
    const externalAuthorFallback = viewedUserId
      ? `Author ${viewedUserId.slice(-4).toUpperCase()}`
      : "Unknown Author";
    const displayName =
      profileData?.displayName ||
      (isOwnProfile ? username : externalAuthorFallback);
    const normalizedHandle =
      profileData?.username ||
      (isOwnProfile
        ? email
          ? email.split("@")[0]
          : displayName.replace(/\s+/g, "").toLowerCase()
        : viewedUserId || displayName.replace(/\s+/g, "").toLowerCase());

    return {
      name: displayName,
      handle: `@${normalizedHandle || "storyhub_user"}`,
      followers: String(profileData?.followers ?? 0),
      following: String(profileData?.following ?? 0),
      posts: String(stats.totalPosts ?? profileData?.posts ?? 0),
      bio:
        profileData?.bio ||
        (isOwnProfile
          ? "Welcome to your StoryHub profile. Start writing and sharing your stories."
          : "This user has not completed their profile yet."),
      genres:
        Array.isArray(profileData?.interest) && profileData.interest.length > 0
          ? profileData.interest
          : ["General"],
      avatar: profileData?.profilePicture || "",
      coverImage: profileData?.coverImage || "",
    };
  }, [currentUser, isOwnProfile, profileData, profileStats, viewedUserId]);

  const tabs = isOwnProfile ? ["Stories", "Saved", "Activity"] : ["Stories"];

  const tabContent =
    activeTab === "Stories"
      ? storyItems
      : activeTab === "Saved"
        ? savedItems
        : activityItems;

  const emptyMessage =
    activeTab === "Stories"
      ? isOwnProfile
        ? "You have not published any stories yet."
        : "This user has not published any stories yet."
      : activeTab === "Saved"
        ? "You have not saved any stories yet."
        : "No recent activity found yet.";

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const handleToggleFollowViewedUser = async () => {
    if (isOwnProfile || !viewedUserId || isTogglingFollow) {
      return;
    }

    const previousFollowingState = isFollowingViewedUser;
    const nextFollowingState = !previousFollowingState;

    setIsTogglingFollow(true);
    setIsFollowingViewedUser(nextFollowingState);

    try {
      const payload = previousFollowingState
        ? await unfollowUser(viewedUserId)
        : await followUser(viewedUserId);

      const confirmedFollowing = Boolean(payload?.following);
      setIsFollowingViewedUser(confirmedFollowing);

      window.dispatchEvent(
        new CustomEvent("storyhub:follow-updated", {
          detail: {
            followerId: currentUserId,
            followingId: viewedUserId,
            following: confirmedFollowing,
          },
        }),
      );
    } catch {
      setIsFollowingViewedUser(previousFollowingState);
    } finally {
      setIsTogglingFollow(false);
    }
  };

  const showProfileNotFound =
    !isOwnProfile && !isLoadingProfile && !profileData;

  if (showProfileNotFound) {
    return (
      <div className="flex h-screen bg-[#f3f4f6] text-[#111827] overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-[#f3f4f6]">
          <Navbar title="User Profile" />
          <main className="flex-1 min-h-0">
            <div className="h-full flex items-center justify-center px-4 text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-[#6b7280] tracking-tight">
                Profile not found
              </h1>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <Navbar title="User Profile" />

        <main className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto pt-6 sm:pt-8 lg:pt-10 px-3 sm:px-5 lg:px-6 pb-8 sm:pb-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="max-w-6xl mx-auto">
              {!isOwnProfile ? (
                <div className="mb-4 sm:mb-5 hidden sm:flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                  <h1 className="min-w-0 text-lg sm:text-xl font-semibold text-slate-900 truncate">
                    {userData.name}
                  </h1>
                </div>
              ) : null}

              {!isOwnProfile ? (
                <div className="mb-2 sm:mb-5 sm:hidden -ml-1 -mt-1">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
              ) : null}

              {/* Profile Header Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 relative shadow-sm">
                <div className="h-36 sm:h-48 bg-linear-to-r from-rose-100 to-amber-50 relative overflow-hidden">
                  {userData.coverImage ? (
                    <>
                      <img
                        src={userData.coverImage}
                        alt="Cover"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/15" />
                    </>
                  ) : null}
                </div>
                <div className="px-4 sm:px-8 pb-6 sm:pb-8">
                  {/* Avatar */}
                  <div className="relative -mt-12 sm:-mt-16 mb-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl border-4 border-white overflow-hidden bg-white shadow-xl">
                      {userData.avatar ? (
                        <img
                          src={userData.avatar}
                          className="w-full h-full object-cover"
                          alt="Profile"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                          <User className="w-10 h-10 sm:w-12 sm:h-12" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="min-w-0">
                      <h1 className="text-xl sm:text-2xl font-semibold truncate text-slate-900">
                        {userData.name}
                      </h1>
                      <p className="text-slate-500 truncate font-medium">
                        {userData.handle}
                      </p>
                      <p className="mt-4 text-slate-600 max-w-lg">
                        {userData.bio}
                      </p>
                    </div>
                    {isOwnProfile ? (
                      <div className="flex gap-2">
                        <Link
                          to="/edit-profile"
                          className="px-4 py-2 border border-slate-300 rounded-xl font-medium text-sm hover:bg-slate-100 transition-colors"
                        >
                          Edit Profile
                        </Link>
                        <button className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors">
                          <Share className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleToggleFollowViewedUser}
                        disabled={isLoadingFollowStatus || isTogglingFollow}
                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                          isFollowingViewedUser
                            ? "border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
                            : "bg-rose-500 hover:bg-rose-600 text-white"
                        } ${
                          isLoadingFollowStatus || isTogglingFollow
                            ? "opacity-60 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isLoadingFollowStatus
                          ? "Loading..."
                          : isFollowingViewedUser
                            ? "Following"
                            : "Follow"}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 sm:flex sm:gap-8 mt-8 border-t border-slate-50 pt-6 sm:pt-8">
                    <div>
                      <span className="font-semibold text-slate-900">
                        {userData.posts}
                      </span>{" "}
                      <span className="text-slate-400 text-sm">Posts</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">
                        {userData.followers}
                      </span>{" "}
                      <span className="text-slate-400 text-sm">Followers</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">
                        {userData.following}
                      </span>{" "}
                      <span className="text-slate-400 text-sm">Following</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content: Bio, Genres, Stories/Saved/Activity */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
                {/* Sidebar: Bio & Genres */}
                <div className="md:col-span-4">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-xs font-semibold text-slate-900 tracking-widest uppercase mb-4">
                      Bio
                    </h2>
                    <p className="text-sm text-slate-600 italic leading-relaxed mb-8">
                      {userData.bio}
                    </p>

                    <h2 className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-4">
                      Preferred Genres
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {userData.genres.map((genre) => (
                        <span
                          key={genre}
                          className="px-3 py-1 bg-rose-500 text-white text-[10px] font-semibold rounded-full cursor-default"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stories / Tabs Area */}
                <div className="md:col-span-8">
                  {/* Tabs */}
                  <div className="flex gap-4 sm:gap-8 border-b border-slate-200 mb-6 px-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 text-sm font-semibold tracking-wide transition-colors relative ${
                          activeTab === tab
                            ? "text-slate-900"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {tab}
                        {activeTab === tab && (
                          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  <div className="space-y-4">
                    {isLoadingTabs ? (
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm text-sm text-slate-500">
                        Loading {activeTab.toLowerCase()}...
                      </div>
                    ) : tabContent.length > 0 ? (
                      tabContent.map((story) => (
                        <StoryCard
                          key={story.id}
                          story={story}
                          actionLabel={story.actionLabel}
                          actionHref={story.actionHref}
                        />
                      ))
                    ) : (
                      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm text-sm text-slate-500">
                        {emptyMessage}
                      </div>
                    )}
                  </div>
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
