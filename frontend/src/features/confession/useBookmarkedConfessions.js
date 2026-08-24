import { useCallback, useEffect, useRef, useState } from "react";
import {
  getBookmarkedConfessions,
  removeConfessionBookmark,
} from "../../api/confession/confessionBookmarkApi";
import { normalizeId } from "../../lib/format";
import { parseResponse } from "./confessionUtils";
import { useOutsideClickCloser } from "./useOutsideClickCloser";

export function useBookmarkedConfessions({
  showError,
  showSuccess,
  navigate,
  currentUserId,
}) {
  const [confessions, setConfessions] = useState([]);
  const [isLoadingConfessions, setIsLoadingConfessions] = useState(true);
  const [confessionError, setConfessionError] = useState("");
  const [expandedConfessionIds, setExpandedConfessionIds] = useState({});
  const [menuConfessionId, setMenuConfessionId] = useState("");
  const [deleteTargetConfessionId, setDeleteTargetConfessionId] =
    useState("");
  const [isDeletingConfession, setIsDeletingConfession] = useState(false);

  const [pressedLikeId, setPressedLikeId] = useState(null);
  const [pressedBookmarkId, setPressedBookmarkId] = useState(null);
  const [pendingLikeIds, setPendingLikeIds] = useState(() => new Set());
  const [pendingBookmarkIds, setPendingBookmarkIds] = useState(
    () => new Set(),
  );
  const pendingLikeIdsRef = useRef(new Set());
  const pendingBookmarkIdsRef = useRef(new Set());
  const pressedLikeTimerRef = useRef(null);
  const pressedBookmarkTimerRef = useRef(null);

  const loadBookmarkedConfessions = useCallback(async () => {
    setConfessionError("");
    setIsLoadingConfessions(true);

    try {
      const payload = await getBookmarkedConfessions({ limit: 20 });
      const data = Array.isArray(payload?.data) ? payload.data : [];

      setConfessions(
        data.map((item) => ({
          ...item,
          _id: String(item?._id || item?.id || ""),
          id: String(item?._id || item?.id || ""),
          authorId: normalizeId(item?.authorId),
          authorDisplayName:
            item?.authorDisplayName || item?.author || "Unknown Author",
          authorProfilePicture: item?.authorProfilePicture || null,
          createdAt: item?.publishedAt || item?.createdAt,
          likesCount: Number(item?.likesCount || 0),
          commentCount: Number(item?.commentCount || 0),
          likedByCurrentUser: Boolean(item?.likedByCurrentUser),
          savedByCurrentUser: true,
          isAnonymous: Boolean(item?.isAnonymous),
          visibility: item?.visibility || "public",
          tags: Array.isArray(item?.tags) ? item.tags : [],
        })),
      );
    } catch (error) {
      setConfessionError(
        error?.message || "Unable to load bookmarked confessions right now.",
      );
    } finally {
      setIsLoadingConfessions(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarkedConfessions();
  }, [loadBookmarkedConfessions]);

  const handleToggleExpandedConfession = useCallback((confessionId) => {
    setExpandedConfessionIds((prev) => ({
      ...prev,
      [confessionId]: !prev[confessionId],
    }));
  }, []);

  const handleToggleConfessionMenu = useCallback((confessionId) => {
    setMenuConfessionId((currentId) =>
      currentId === confessionId ? "" : confessionId,
    );
  }, []);

  const handleEditConfession = useCallback(
    (confession) => {
      const confessionId = String(confession?._id || confession?.id || "");
      setMenuConfessionId("");
      navigate(`/confession?editId=${confessionId}&returnTo=/bookmarks`);
    },
    [navigate],
  );

  const handleDeleteConfession = useCallback(
    (confessionId) => {
      const normalizedConfessionId = String(confessionId || "");
      const currentConfession = confessions.find(
        (item) =>
          String(item?._id || item?.id || "") === normalizedConfessionId,
      );

      if (
        !currentConfession ||
        normalizeId(currentConfession.authorId) !== currentUserId
      ) {
        showError("Only the owner can delete this confession.");
        return;
      }

      setMenuConfessionId("");
      setDeleteTargetConfessionId(normalizedConfessionId);
    },
    [confessions, currentUserId, showError],
  );

  const handleConfirmDeleteConfession = useCallback(async () => {
    if (!deleteTargetConfessionId || isDeletingConfession) {
      return;
    }

    setIsDeletingConfession(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/confessions/${deleteTargetConfessionId}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      const payload = await parseResponse(response);
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to delete confession.");
      }

      setConfessions((prev) =>
        prev.filter(
          (item) =>
            String(item?._id || item?.id || "") !== deleteTargetConfessionId,
        ),
      );
      showSuccess("Confession deleted.");
    } catch (error) {
      showError(error.message || "Failed to delete confession.");
    } finally {
      setIsDeletingConfession(false);
      setDeleteTargetConfessionId("");
    }
  }, [deleteTargetConfessionId, isDeletingConfession, showError, showSuccess]);

  const handleToggleConfessionLike = useCallback(
    async (confessionId) => {
      if (
        pendingLikeIdsRef.current.has(confessionId) ||
        pendingLikeIds.has(confessionId)
      ) {
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showError("Please log in to like confessions.");
        return;
      }

      pendingLikeIdsRef.current.add(confessionId);
      setPendingLikeIds((prev) => {
        const next = new Set(prev);
        next.add(confessionId);
        return next;
      });

      setPressedLikeId(confessionId);
      if (pressedLikeTimerRef.current) {
        clearTimeout(pressedLikeTimerRef.current);
      }

      pressedLikeTimerRef.current = setTimeout(() => {
        setPressedLikeId((currentId) =>
          currentId === confessionId ? null : currentId,
        );
        pressedLikeTimerRef.current = null;
      }, 150);

      try {
        const response = await fetch(
          `/api/confessions/${confessionId}/toggle-like`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to toggle like.");
        }

        const payload = await parseResponse(response);

        setConfessions((prev) =>
          prev.map((item) =>
            String(item?._id || item?.id || "") === String(confessionId)
              ? {
                  ...item,
                  likedByCurrentUser: Boolean(payload?.likedByCurrentUser),
                  likesCount: Number(payload?.likesCount || 0),
                }
              : item,
          ),
        );
      } catch {
        showError("Failed to toggle like.");
      } finally {
        pendingLikeIdsRef.current.delete(confessionId);
        setPendingLikeIds((prev) => {
          const next = new Set(prev);
          next.delete(confessionId);
          return next;
        });
      }
    },
    [pendingLikeIds, showError],
  );

  const handleUnsaveConfession = useCallback(
    async (confessionId) => {
      if (
        pendingBookmarkIdsRef.current.has(confessionId) ||
        pendingBookmarkIds.has(confessionId)
      ) {
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showError("Please log in to manage confession bookmarks.");
        return;
      }

      pendingBookmarkIdsRef.current.add(confessionId);
      setPendingBookmarkIds((prev) => {
        const next = new Set(prev);
        next.add(confessionId);
        return next;
      });

      setPressedBookmarkId(confessionId);
      if (pressedBookmarkTimerRef.current) {
        clearTimeout(pressedBookmarkTimerRef.current);
      }

      pressedBookmarkTimerRef.current = setTimeout(() => {
        setPressedBookmarkId((currentId) =>
          currentId === confessionId ? null : currentId,
        );
        pressedBookmarkTimerRef.current = null;
      }, 150);

      try {
        await removeConfessionBookmark(confessionId);
        setConfessions((prev) =>
          prev.filter(
            (item) =>
              String(item?._id || item?.id || "") !== String(confessionId),
          ),
        );
        showSuccess("Confession removed from bookmarks.");
      } catch {
        showError("Failed to remove confession bookmark.");
      } finally {
        pendingBookmarkIdsRef.current.delete(confessionId);
        setPendingBookmarkIds((prev) => {
          const next = new Set(prev);
          next.delete(confessionId);
          return next;
        });
      }
    },
    [pendingBookmarkIds, showError, showSuccess],
  );

  useOutsideClickCloser(
    Boolean(menuConfessionId),
    () => setMenuConfessionId(""),
    "[data-confession-menu]",
  );

  useEffect(
    () => () => {
      if (pressedLikeTimerRef.current) {
        clearTimeout(pressedLikeTimerRef.current);
      }

      if (pressedBookmarkTimerRef.current) {
        clearTimeout(pressedBookmarkTimerRef.current);
      }
    },
    [],
  );

  return {
    confessions,
    setConfessions,
    isLoadingConfessions,
    confessionError,
    expandedConfessionIds,
    handleToggleExpandedConfession,
    menuConfessionId,
    handleToggleConfessionMenu,
    handleEditConfession,
    handleDeleteConfession,
    handleConfirmDeleteConfession,
    deleteTargetConfessionId,
    setDeleteTargetConfessionId,
    isDeletingConfession,
    pendingLikeIds,
    pendingBookmarkIds,
    pressedLikeId,
    pressedBookmarkId,
    handleToggleConfessionLike,
    handleUnsaveConfession,
  };
}
