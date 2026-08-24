import { useCallback, useEffect, useState } from "react";
import { followUser, getFollowStatus, unfollowUser } from "../../api/profile";
import { normalizeId } from "../../lib/format";

/**
 * Shared follow/unfollow state used by any page that renders a list of
 * authors with follow buttons (Confession today; Profile/Explore are meant
 * to adopt this in a later batch).
 *
 * - `authorIds`, when provided, is the list of author ids the hook should
 *   keep resolved: any id in the list without a known boolean state gets its
 *   follow status fetched via `getFollowStatus`. Pages that resolve follow
 *   status some other way can omit it and drive `followStateByUserId` via
 *   `setFollowStateByUserId` themselves.
 * - `notify(message, type)` surfaces success/error toasts.
 * - `onUnauthenticated(message)` runs instead of the API call when there's
 *   no signed-in user.
 * - `onExternalFollowUpdate()` runs whenever another page's toggle updates
 *   an author this page also tracks, via the `storyhub:follow-updated`
 *   window event (payload: `{ followerId, followingId, following }`).
 */
export function useFollowState({
  currentUserId,
  authorIds = [],
  notify,
  onUnauthenticated,
  onExternalFollowUpdate,
} = {}) {
  const [followStateByUserId, setFollowStateByUserId] = useState({});
  const [busyFollowIds, setBusyFollowIds] = useState({});

  useEffect(() => {
    let isMounted = true;

    const unresolvedAuthorIds = authorIds.filter(
      (authorId) => typeof followStateByUserId[authorId] !== "boolean",
    );

    if (unresolvedAuthorIds.length === 0) {
      return () => {
        isMounted = false;
      };
    }

    const resolveFollowStatuses = async () => {
      const statusEntries = await Promise.all(
        unresolvedAuthorIds.map(async (authorId) => {
          try {
            const payload = await getFollowStatus(authorId);
            return [authorId, Boolean(payload?.following)];
          } catch {
            return [authorId, false];
          }
        }),
      );

      if (!isMounted) {
        return;
      }

      setFollowStateByUserId((previous) => ({
        ...previous,
        ...Object.fromEntries(statusEntries),
      }));
    };

    resolveFollowStatuses().catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [authorIds, followStateByUserId]);

  const toggleFollow = useCallback(
    async (authorId) => {
      const normalizedTargetUserId = normalizeId(authorId);

      if (!normalizedTargetUserId || normalizedTargetUserId === currentUserId) {
        return;
      }

      if (busyFollowIds[normalizedTargetUserId]) {
        return;
      }

      if (!currentUserId) {
        onUnauthenticated?.("Please log in to follow authors.");
        return;
      }

      const currentlyFollowing = Boolean(
        followStateByUserId[normalizedTargetUserId],
      );

      setBusyFollowIds((previous) => ({
        ...previous,
        [normalizedTargetUserId]: true,
      }));
      setFollowStateByUserId((previous) => ({
        ...previous,
        [normalizedTargetUserId]: !currentlyFollowing,
      }));

      try {
        const followResult = currentlyFollowing
          ? await unfollowUser(normalizedTargetUserId)
          : await followUser(normalizedTargetUserId);

        const confirmedFollowing =
          typeof followResult?.following === "boolean"
            ? followResult.following
            : !currentlyFollowing;
        const eventFollowerId =
          normalizeId(followResult?.followerId) || currentUserId;
        const eventFollowingId =
          normalizeId(followResult?.followingId) || normalizedTargetUserId;

        window.dispatchEvent(
          new CustomEvent("storyhub:follow-updated", {
            detail: {
              followerId: eventFollowerId,
              followingId: eventFollowingId,
              following: confirmedFollowing,
            },
          }),
        );

        setFollowStateByUserId((previous) => ({
          ...previous,
          [normalizedTargetUserId]: confirmedFollowing,
        }));

        notify?.(
          confirmedFollowing
            ? "You are now following this author."
            : "You have unfollowed this author.",
          "success",
        );
      } catch {
        setFollowStateByUserId((previous) => ({
          ...previous,
          [normalizedTargetUserId]: currentlyFollowing,
        }));
        notify?.("Unable to update follow status. Please try again.", "error");
      } finally {
        setBusyFollowIds((previous) => {
          const next = { ...previous };
          delete next[normalizedTargetUserId];
          return next;
        });
      }
    },
    [busyFollowIds, currentUserId, followStateByUserId, onUnauthenticated, notify],
  );

  useEffect(() => {
    const handleFollowUpdated = (event) => {
      const followerId = normalizeId(event?.detail?.followerId || "");
      const followingId = normalizeId(event?.detail?.followingId || "");
      const following = Boolean(event?.detail?.following);

      if (!followingId || followerId !== currentUserId) {
        return;
      }

      setFollowStateByUserId((previous) => ({
        ...previous,
        [followingId]: following,
      }));

      setBusyFollowIds((previous) => {
        const next = { ...previous };
        delete next[followingId];
        return next;
      });

      onExternalFollowUpdate?.();
    };

    window.addEventListener("storyhub:follow-updated", handleFollowUpdated);

    return () => {
      window.removeEventListener(
        "storyhub:follow-updated",
        handleFollowUpdated,
      );
    };
  }, [currentUserId, onExternalFollowUpdate]);

  return {
    followStateByUserId,
    setFollowStateByUserId,
    busyFollowIds,
    toggleFollow,
  };
}
