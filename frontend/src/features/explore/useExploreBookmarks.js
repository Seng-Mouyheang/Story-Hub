import { useEffect, useState } from "react";
import {
  getMyBookmarkedStories,
  removeStoryBookmark,
  toggleStoryBookmark,
} from "../../api/story/storyInteractionsApi";
import { normalizeId } from "../../lib/format";

export function useExploreBookmarks({ currentUserId, showToast }) {
  const [savedStoryIds, setSavedStoryIds] = useState(new Set());

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadSavedStories = async () => {
      if (!currentUserId) {
        if (isMounted) {
          setSavedStoryIds(new Set());
        }
        return;
      }

      try {
        const payload = await getMyBookmarkedStories({
          signal: abortController.signal,
        });

        if (!isMounted) {
          return;
        }

        const bookmarkedIds = Array.isArray(payload?.data)
          ? payload.data
              .map((story) => normalizeId(story?._id || story?.id || ""))
              .filter(Boolean)
          : [];

        setSavedStoryIds(new Set(bookmarkedIds));
      } catch (error) {
        if (!isMounted || abortController.signal.aborted) {
          return;
        }

        console.error("Failed to load bookmarked stories:", error);
        setSavedStoryIds(new Set());
      }
    };

    loadSavedStories();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [currentUserId]);

  const toggleSave = async (storyId) => {
    try {
      const isAlreadySaved = savedStoryIds.has(storyId);
      if (isAlreadySaved) {
        await removeStoryBookmark(storyId);
        showToast("Story removed from bookmarks.", "success");
      } else {
        await toggleStoryBookmark(storyId);
        showToast("Story added to bookmarks.", "success");
      }
      setSavedStoryIds((prev) => {
        const next = new Set(prev);
        if (next.has(storyId)) {
          next.delete(storyId);
        } else {
          next.add(storyId);
        }
        return next;
      });
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
      showToast("Failed to save story. Please try again.", "error");
    }
  };

  return { savedStoryIds, toggleSave };
}
