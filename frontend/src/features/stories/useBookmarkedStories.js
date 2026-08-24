import { useCallback, useEffect, useState } from "react";
import { getMyBookmarkedStories } from "../../api/story/storyInteractionsApi";
import { deleteStory } from "../../api/story/storyApi";
import { getProfileByUserId } from "../../api/profile";
import { normalizeId } from "../../lib/format";
import { getRelativeTime as getSharedRelativeTime } from "../confession/confessionUtils";
import { useOutsideClickCloser } from "../confession/useOutsideClickCloser";

export function useBookmarkedStories({
  showError,
  showSuccess,
  navigate,
  currentUserId,
}) {
  const [stories, setStories] = useState([]);
  const [isLoadingStories, setIsLoadingStories] = useState(true);
  const [storyError, setStoryError] = useState("");
  const [expandedStoryIds, setExpandedStoryIds] = useState({});
  const [menuStoryId, setMenuStoryId] = useState("");
  const [deleteTargetStoryId, setDeleteTargetStoryId] = useState("");
  const [isDeletingStory, setIsDeletingStory] = useState(false);

  const loadBookmarkedStories = useCallback(async () => {
    setStoryError("");
    setIsLoadingStories(true);

    try {
      const backendResult = await getMyBookmarkedStories({ limit: 20 });
      const backendStories = Array.isArray(backendResult?.data)
        ? backendResult.data
        : [];

      if (backendStories.length === 0) {
        setStories([]);
        return;
      }

      const uniqueAuthorIds = [
        ...new Set(
          backendStories
            .map((story) => normalizeId(story.authorId))
            .filter(Boolean),
        ),
      ];

      const profiles = {};
      const profileResponses = await Promise.allSettled(
        uniqueAuthorIds.map((authorId) => getProfileByUserId(authorId)),
      );

      profileResponses.forEach((response, index) => {
        if (response.status === "fulfilled" && response.value) {
          profiles[uniqueAuthorIds[index]] = response.value;
        }
      });

      const mappedStories = backendStories.map((story) => {
        const authorId = normalizeId(story.authorId);
        const profile = profiles[authorId];

        return {
          id: String(story._id),
          authorId,
          author:
            profile?.displayName ||
            story.authorDisplayName ||
            story.author ||
            "Anonymous Author",
          avatar: profile?.profilePicture || null,
          genres:
            Array.isArray(story.genres) && story.genres.length > 0
              ? story.genres.map((genre) => String(genre).toUpperCase())
              : ["GENERAL"],
          tags: Array.isArray(story.tags) ? story.tags : [],
          time: getSharedRelativeTime(story.publishedAt || story.createdAt),
          title: story.title || "Untitled Story",
          content:
            story.summary ||
            story.content ||
            "No preview is available for this story.",
          likesCount: Number(story.likesCount || 0),
          commentCount: Number(story.commentCount || 0),
          likedByCurrentUser: Boolean(story.likedByCurrentUser),
        };
      });

      setStories(mappedStories);
    } catch {
      setStoryError("Unable to load bookmarked stories right now.");
    } finally {
      setIsLoadingStories(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarkedStories();
  }, [loadBookmarkedStories]);

  const handleToggleExpandedStory = useCallback((storyId) => {
    setExpandedStoryIds((prev) => ({
      ...prev,
      [storyId]: !prev[storyId],
    }));
  }, []);

  const handleToggleStoryMenu = useCallback((storyId) => {
    setMenuStoryId((currentId) => (currentId === storyId ? "" : storyId));
  }, []);

  const handleEditStory = useCallback(
    (storyId) => {
      setMenuStoryId("");
      navigate(`/write?storyId=${storyId}&returnTo=/bookmarks`);
    },
    [navigate],
  );

  const handleDeleteStory = useCallback(
    (storyId) => {
      const story = stories.find((item) => item.id === storyId);
      if (!story || story?.authorId !== currentUserId) {
        showError("Only the owner can delete this story.");
        return;
      }
      setMenuStoryId("");
      setDeleteTargetStoryId(storyId);
    },
    [currentUserId, showError, stories],
  );

  const handleConfirmDeleteStory = useCallback(async () => {
    if (!deleteTargetStoryId || isDeletingStory) {
      return;
    }

    setIsDeletingStory(true);
    try {
      await deleteStory(deleteTargetStoryId);
      setStories((prev) =>
        prev.filter((item) => item.id !== deleteTargetStoryId),
      );
      showSuccess("Story deleted.");
    } catch {
      showError("Failed to delete story.");
    } finally {
      setIsDeletingStory(false);
      setDeleteTargetStoryId("");
    }
  }, [deleteTargetStoryId, isDeletingStory, showError, showSuccess]);

  useOutsideClickCloser(
    Boolean(menuStoryId),
    () => setMenuStoryId(""),
    "[data-story-menu]",
  );

  return {
    stories,
    setStories,
    isLoadingStories,
    storyError,
    expandedStoryIds,
    setExpandedStoryIds,
    handleToggleExpandedStory,
    menuStoryId,
    handleToggleStoryMenu,
    handleEditStory,
    handleDeleteStory,
    handleConfirmDeleteStory,
    deleteTargetStoryId,
    setDeleteTargetStoryId,
    isDeletingStory,
  };
}
