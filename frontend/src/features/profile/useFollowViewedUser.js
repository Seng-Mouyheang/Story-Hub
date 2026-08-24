import { useEffect, useState } from "react";
import { followUser, getFollowStatus, unfollowUser } from "../../api/profile";
import { normalizeId } from "../../lib/format";

export function useFollowViewedUser({ viewedUserId, currentUserId, isOwnProfile }) {
  const [isFollowingViewedUser, setIsFollowingViewedUser] = useState(false);
  const [isLoadingFollowStatus, setIsLoadingFollowStatus] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

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
    const handleFollowUpdated = (event) => {
      const normalizedViewedUserId = String(viewedUserId || "").trim();
      const normalizedCurrentUserId = String(currentUserId || "").trim();
      const followerId = String(event?.detail?.followerId || "").trim();
      const followingId = String(event?.detail?.followingId || "").trim();
      const isFollowing = Boolean(event?.detail?.following);

      if (!normalizedViewedUserId) {
        return;
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

      const confirmedFollowing =
        typeof payload?.following === "boolean"
          ? payload.following
          : nextFollowingState;
      const eventFollowerId = normalizeId(payload?.followerId) || currentUserId;
      const eventFollowingId =
        normalizeId(payload?.followingId) || viewedUserId;

      setIsFollowingViewedUser(confirmedFollowing);

      window.dispatchEvent(
        new CustomEvent("storyhub:follow-updated", {
          detail: {
            followerId: eventFollowerId,
            followingId: eventFollowingId,
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

  return {
    isFollowingViewedUser,
    isLoadingFollowStatus,
    isTogglingFollow,
    handleToggleFollowViewedUser,
  };
}
