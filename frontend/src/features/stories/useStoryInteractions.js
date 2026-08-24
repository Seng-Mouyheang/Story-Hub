import { useCallback } from "react";
import {
  removeStoryBookmark,
  toggleStoryBookmark,
  toggleStoryLike,
} from "../../api/story/storyInteractionsApi";
import { useFollowState } from "../social/useFollowState";

/**
 * Shared like/bookmark/follow toggle logic used by Home.jsx and
 * Bookmarks.jsx.
 *
 * - `setItems` updates whichever list state the page keeps (`posts` or
 *   `stories`) by id.
 * - `savedStoryIds`/`setSavedStoryIds`, when provided, put bookmarking in
 *   "toggle" mode (Home: stories stay in the feed, only membership in the
 *   saved set flips). When omitted, bookmarking runs in "remove only" mode
 *   (Bookmarks: unsaving always calls the API and the caller is expected to
 *   drop the story from its list via `onUnsaved`).
 * - `onUnauthenticated(message)` is called instead of the API call when
 *   there's no auth token; Home ignores the message and redirects to
 *   /login, Bookmarks surfaces the message as a toast.
 */
export function useStoryInteractions({
  currentUserId,
  setItems,
  notify,
  onUnauthenticated,
  onLikeError,
  onUnsaved,
  savedStoryIds,
  setSavedStoryIds,
  requireAuthForSave = true,
  onExternalFollowUpdate,
}) {
  const {
    followStateByUserId,
    setFollowStateByUserId,
    busyFollowIds,
    toggleFollow: handleToggleFollowAuthor,
  } = useFollowState({
    currentUserId,
    notify,
    onUnauthenticated,
    onExternalFollowUpdate,
  });

  const requireToken = useCallback(
    (defaultMessage) => {
      const token = localStorage.getItem("token");
      if (!token) {
        onUnauthenticated?.(defaultMessage);
        return false;
      }
      return true;
    },
    [onUnauthenticated],
  );

  const handleToggleLike = useCallback(
    async (storyId) => {
      if (!requireToken("Please log in to react to stories.")) {
        return;
      }

      try {
        const payload = await toggleStoryLike(storyId);
        setItems((prev) =>
          prev.map((item) =>
            item.id === storyId
              ? {
                  ...item,
                  likedByCurrentUser: Boolean(payload.likedByCurrentUser),
                  likesCount: Number(payload.likesCount || 0),
                }
              : item,
          ),
        );
      } catch {
        const errorMessage = "Failed to update reaction. Please try again.";
        onLikeError?.(errorMessage);
        notify?.(errorMessage, "error");
      }
    },
    [requireToken, setItems, onLikeError, notify],
  );

  const handleToggleSave = useCallback(
    async (storyId) => {
      if (requireAuthForSave && !requireToken("Please log in to save stories.")) {
        return;
      }

      const isToggleMode = Boolean(savedStoryIds);

      try {
        if (!isToggleMode) {
          await removeStoryBookmark(storyId);
          onUnsaved?.(storyId);
          notify?.("Story removed from bookmarks.", "success");
          return;
        }

        const isAlreadySaved = savedStoryIds.has(storyId);

        if (isAlreadySaved) {
          await removeStoryBookmark(storyId);
        } else {
          await toggleStoryBookmark(storyId);
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

        notify?.(
          isAlreadySaved
            ? "Removed story from saved items."
            : "Story saved successfully.",
          "success",
        );
      } catch (error) {
        console.error("Failed to toggle bookmark:", error);
        notify?.(
          isToggleMode
            ? "Failed to update bookmark. Please try again."
            : "Failed to remove bookmark.",
          "error",
        );
      }
    },
    [
      requireAuthForSave,
      requireToken,
      savedStoryIds,
      setSavedStoryIds,
      onUnsaved,
      notify,
    ],
  );

  return {
    followStateByUserId,
    setFollowStateByUserId,
    busyFollowIds,
    handleToggleLike,
    handleToggleSave,
    handleToggleFollowAuthor,
  };
}
