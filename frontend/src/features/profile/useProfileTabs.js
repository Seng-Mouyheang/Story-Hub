import { useEffect, useState } from "react";
import { getMyStories, getStoriesByAuthor } from "../../api/story/storyApi";
import { getMyBookmarkedStories } from "../../api/story/storyInteractionsApi";
import {
  getDashboardStories,
  getDashboardConfessions,
} from "../../api/dashboard/dashboardApi";
import { formatCount, getRelativeTime } from "../../lib/format";
import { mapStoryToCard } from "./profileUtils";

export function useProfileTabs({ isOwnProfile, viewedUserId }) {
  const [activeTab, setActiveTab] = useState("Stories");
  const [storyItems, setStoryItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [activityItems, setActivityItems] = useState([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(true);
  const [prevIsOwnProfile, setPrevIsOwnProfile] = useState(isOwnProfile);

  if (isOwnProfile !== prevIsOwnProfile) {
    setPrevIsOwnProfile(isOwnProfile);
    if (!isOwnProfile) {
      setActiveTab("Stories");
    }
  }

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
            saves: formatCount(Number(story.bookmarkCount || 0)),
          }),
        );

        const recentActivity = [
          ...dashboardStories.map((story) => ({
            id: `story-${story._id}`,
            title: story.title || "Untitled Story",
            fullContent: story.content || story.summary || "",
            likes: formatCount(Number(story.likesCount || 0)),
            saves: formatCount(Number(story.bookmarkCount || 0)),
            date: getRelativeTime(story.updatedAt || story.createdAt),
            genre: story.status === "draft" ? "Draft" : "Story",
            sortTs:
              new Date(story.updatedAt || story.createdAt || 0).getTime() || 0,
            author: story.authorDisplayName || null,
            authorId: story.authorId ? String(story.authorId) : null,
            actionLabel: "Edit story",
            actionHref: `/write?storyId=${story._id}&returnTo=/profile`,
          })),
          ...dashboardConfessions.map((confession) => ({
            id: `confession-${confession._id}`,
            title: confession.title || "Untitled Confession",
            fullContent: confession.content || "",
            likes: formatCount(Number(confession.likesCount || 0)),
            saves: formatCount(Number(confession.bookmarkCount || 0)),
            date: getRelativeTime(confession.updatedAt || confession.createdAt),
            genre: "Confession",
            sortTs:
              new Date(
                confession.updatedAt || confession.createdAt || 0,
              ).getTime() || 0,
            author: confession.authorDisplayName || null,
            authorId: confession.authorId ? String(confession.authorId) : null,
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

  return {
    activeTab,
    setActiveTab,
    tabs,
    tabContent,
    emptyMessage,
    isLoadingTabs,
  };
}
