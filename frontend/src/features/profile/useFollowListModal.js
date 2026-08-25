import { useCallback, useEffect, useState } from "react";
import {
  getProfileByUserId,
  getFollowers,
  getFollowing,
  getFollowStatus,
  followUser,
  unfollowUser,
} from "../../api/profile";
import { normalizeId } from "../../lib/format";

const FOLLOW_LIST_PAGE_SIZE = 15;

const isValidUserId = (value) => {
  const id = normalizeId(value);
  if (!id) return false;
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return objectIdRegex.test(id) || uuidRegex.test(id);
};

export function useFollowListModal({
  viewedUserId,
  currentUserId,
  setProfileData,
}) {
  const [isFollowListOpen, setIsFollowListOpen] = useState(false);
  const [activeFollowListType, setActiveFollowListType] = useState("followers");
  const [followListItems, setFollowListItems] = useState([]);
  const [followListCursor, setFollowListCursor] = useState(null);
  const [followListHasMore, setFollowListHasMore] = useState(false);
  const [isLoadingFollowList, setIsLoadingFollowList] = useState(false);
  const [followListError, setFollowListError] = useState("");
  const [listActionBusyByUserId, setListActionBusyByUserId] = useState({});
  const [prevViewedUserId, setPrevViewedUserId] = useState(viewedUserId);

  if (viewedUserId !== prevViewedUserId) {
    setPrevViewedUserId(viewedUserId);
    setIsFollowListOpen(false);
    setFollowListItems([]);
    setFollowListCursor(null);
    setFollowListHasMore(false);
    setFollowListError("");
    setListActionBusyByUserId({});
  }

  const buildFollowListAccounts = useCallback(
    async (userIds) => {
      const normalizedCurrentUserId = normalizeId(currentUserId);

      const accountRows = await Promise.all(
        userIds.map(async (userId) => {
          const normalizedUserId = normalizeId(userId);
          const isSelf = normalizedUserId === normalizedCurrentUserId;

          let profilePayload = null;
          try {
            profilePayload = await getProfileByUserId(normalizedUserId);
          } catch {
            // Keep fallback display values if profile metadata fetch fails.
          }

          let following = false;
          if (!isSelf && normalizedCurrentUserId) {
            try {
              const statusPayload = await getFollowStatus(normalizedUserId);
              following = Boolean(statusPayload?.following);
            } catch {
              // Keep default follow status on transient errors.
            }
          }

          const fallbackName = normalizedUserId
            ? `Author ${normalizedUserId.slice(-4).toUpperCase()}`
            : "Unknown User";
          const fallbackHandle =
            normalizedUserId ||
            fallbackName.replace(/\s+/g, "").toLowerCase() ||
            "storyhub_user";

          return {
            userId: normalizedUserId,
            name: profilePayload?.displayName || fallbackName,
            handle: `@${profilePayload?.username || fallbackHandle}`,
            avatar: profilePayload?.profilePicture || "",
            following,
            isSelf,
          };
        }),
      );

      return accountRows;
    },
    [currentUserId],
  );

  const loadFollowList = useCallback(
    async ({ listType, reset = false } = {}) => {
      if (!viewedUserId) {
        return;
      }

      const targetListType =
        listType === "following" ? "following" : "followers";
      const cursor = reset ? null : followListCursor;
      const requestList =
        targetListType === "following" ? getFollowing : getFollowers;

      setIsLoadingFollowList(true);
      setFollowListError("");

      try {
        const payload = await requestList(viewedUserId, {
          cursor,
          limit: FOLLOW_LIST_PAGE_SIZE,
        });

        const rawIds =
          targetListType === "following"
            ? payload?.following || []
            : payload?.followers || [];
        const ids = Array.from(
          new Set(
            rawIds
              .map((value) => normalizeId(value))
              .filter((v) => v && isValidUserId(v)),
          ),
        );

        const rows = await buildFollowListAccounts(ids);

        setFollowListItems((previous) => {
          if (reset) {
            return rows;
          }

          const seen = new Set(
            previous.map((item) => normalizeId(item.userId)),
          );
          const merged = [...previous];

          rows.forEach((row) => {
            const key = normalizeId(row.userId);
            if (!seen.has(key)) {
              merged.push(row);
              seen.add(key);
            }
          });

          return merged;
        });

        setFollowListCursor(payload?.nextCursor || null);
        setFollowListHasMore(Boolean(payload?.hasMore));

        if (reset) {
          const trueCount =
            targetListType === "following"
              ? payload?.totalFollowing
              : payload?.totalFollowers;
          if (typeof trueCount === "number") {
            if (targetListType === "following") {
              setProfileData((prev) =>
                prev ? { ...prev, following: trueCount } : prev,
              );
            } else {
              setProfileData((prev) =>
                prev ? { ...prev, followers: trueCount } : prev,
              );
            }
          }
        }
      } catch (error) {
        setFollowListError(
          error?.message || "Failed to load this follow list right now.",
        );

        if (reset) {
          setFollowListItems([]);
          setFollowListCursor(null);
          setFollowListHasMore(false);
        }
      } finally {
        setIsLoadingFollowList(false);
      }
    },
    [viewedUserId, followListCursor, buildFollowListAccounts, setProfileData],
  );

  const openFollowList = (listType) => {
    const targetListType = listType === "following" ? "following" : "followers";
    setActiveFollowListType(targetListType);
    setFollowListItems([]);
    setFollowListCursor(null);
    setFollowListHasMore(false);
    setFollowListError("");
    setIsFollowListOpen(true);
  };

  const closeFollowList = () => {
    setIsFollowListOpen(false);
    setFollowListError("");
  };

  const handleToggleFollowFromList = async (targetUserId) => {
    const normalizedTargetUserId = normalizeId(targetUserId);
    const normalizedCurrentUserId = normalizeId(currentUserId);

    if (
      !normalizedTargetUserId ||
      normalizedTargetUserId === normalizedCurrentUserId ||
      !normalizedCurrentUserId ||
      listActionBusyByUserId[normalizedTargetUserId]
    ) {
      return;
    }

    const targetItem = followListItems.find(
      (item) => normalizeId(item.userId) === normalizedTargetUserId,
    );
    const previousFollowingState = Boolean(targetItem?.following);
    const nextFollowingState = !previousFollowingState;

    setListActionBusyByUserId((previous) => ({
      ...previous,
      [normalizedTargetUserId]: true,
    }));

    setFollowListItems((previous) =>
      previous.map((item) =>
        normalizeId(item.userId) === normalizedTargetUserId
          ? { ...item, following: nextFollowingState }
          : item,
      ),
    );

    try {
      const payload = previousFollowingState
        ? await unfollowUser(normalizedTargetUserId)
        : await followUser(normalizedTargetUserId);

      const confirmedFollowing =
        typeof payload?.following === "boolean"
          ? payload.following
          : nextFollowingState;
      const eventFollowerId =
        normalizeId(payload?.followerId) || normalizedCurrentUserId;
      const eventFollowingId =
        normalizeId(payload?.followingId) || normalizedTargetUserId;

      setFollowListItems((previous) =>
        previous.map((item) =>
          normalizeId(item.userId) === normalizedTargetUserId
            ? { ...item, following: confirmedFollowing }
            : item,
        ),
      );

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
      setFollowListItems((previous) =>
        previous.map((item) =>
          normalizeId(item.userId) === normalizedTargetUserId
            ? { ...item, following: previousFollowingState }
            : item,
        ),
      );
    } finally {
      setListActionBusyByUserId((previous) => ({
        ...previous,
        [normalizedTargetUserId]: false,
      }));
    }
  };

  useEffect(() => {
    if (!isFollowListOpen || !viewedUserId) {
      return;
    }

    (async () => {
      await loadFollowList({ listType: activeFollowListType, reset: true });
    })();
  }, [activeFollowListType, isFollowListOpen, loadFollowList, viewedUserId]);

  useEffect(() => {
    const handleFollowUpdated = (event) => {
      const normalizedCurrentUserId = normalizeId(currentUserId);
      const followerId = normalizeId(event?.detail?.followerId || "");
      const followingId = normalizeId(event?.detail?.followingId || "");
      const isFollowing = Boolean(event?.detail?.following);

      if (normalizedCurrentUserId && normalizedCurrentUserId === followerId) {
        setFollowListItems((previous) =>
          previous.map((account) =>
            normalizeId(account.userId) === followingId
              ? { ...account, following: isFollowing }
              : account,
          ),
        );
      }
    };

    window.addEventListener("storyhub:follow-updated", handleFollowUpdated);

    return () => {
      window.removeEventListener(
        "storyhub:follow-updated",
        handleFollowUpdated,
      );
    };
  }, [currentUserId]);

  return {
    isFollowListOpen,
    activeFollowListType,
    followListItems,
    followListHasMore,
    isLoadingFollowList,
    followListError,
    listActionBusyByUserId,
    openFollowList,
    closeFollowList,
    loadFollowList,
    handleToggleFollowFromList,
  };
}
