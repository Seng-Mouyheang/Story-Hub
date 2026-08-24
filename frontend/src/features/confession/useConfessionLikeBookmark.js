import { useCallback, useEffect, useRef, useState } from "react";

import { parseResponse } from "./confessionUtils";

export function useConfessionLikeBookmark({
  setConfessionFeed,
  showError,
  showSuccess,
}) {
  const [pressedLikeId, setPressedLikeId] = useState(null);
  const [pressedBookmarkId, setPressedBookmarkId] = useState(null);
  const [pendingLikeIds, setPendingLikeIds] = useState(() => new Set());
  const [pendingBookmarkIds, setPendingBookmarkIds] = useState(() => new Set());
  const [gestureLikeBurstId, setGestureLikeBurstId] = useState(null);
  const lastTapRef = useRef({ confessionId: "", time: 0 });
  const pendingLikeIdsRef = useRef(new Set());
  const pendingBookmarkIdsRef = useRef(new Set());
  const pressedLikeTimerRef = useRef(null);
  const pressedBookmarkTimerRef = useRef(null);
  const gestureLikeBurstTimerRef = useRef(null);

  const handleToggleLike = useCallback(
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

        setConfessionFeed((prev) =>
          prev.map((item) =>
            item._id === confessionId || item.id === confessionId
              ? {
                  ...item,
                  likedByCurrentUser: Boolean(payload.likedByCurrentUser),
                  likesCount: Number(payload.likesCount || 0),
                }
              : item,
          ),
        );
      } catch (error) {
        showError(error.message || "Failed to toggle like.");
      } finally {
        pendingLikeIdsRef.current.delete(confessionId);
        setPendingLikeIds((prev) => {
          const next = new Set(prev);
          next.delete(confessionId);
          return next;
        });
      }
    },
    [pendingLikeIds, setConfessionFeed, showError],
  );

  const handleToggleBookmark = useCallback(
    async (confessionId) => {
      if (
        pendingBookmarkIdsRef.current.has(confessionId) ||
        pendingBookmarkIds.has(confessionId)
      ) {
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showError("Please log in to bookmark confessions.");
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
        const response = await fetch(
          `/api/confessions/${confessionId}/toggle-bookmark`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to toggle bookmark.");
        }

        const payload = await parseResponse(response);
        const savedByCurrentUser = Boolean(payload.savedByCurrentUser);

        setConfessionFeed((prev) =>
          prev.map((item) =>
            item._id === confessionId || item.id === confessionId
              ? {
                  ...item,
                  savedByCurrentUser,
                }
              : item,
          ),
        );

        showSuccess(
          savedByCurrentUser
            ? "Confession saved successfully."
            : "Confession removed from saved items.",
        );
      } catch (error) {
        showError(error.message || "Failed to toggle bookmark.");
      } finally {
        pendingBookmarkIdsRef.current.delete(confessionId);
        setPendingBookmarkIds((prev) => {
          const next = new Set(prev);
          next.delete(confessionId);
          return next;
        });
      }
    },
    [pendingBookmarkIds, setConfessionFeed, showError, showSuccess],
  );

  const handleCardLikeGesture = useCallback(
    (confessionId, likedByCurrentUser) => {
      if (likedByCurrentUser) {
        return;
      }

      setGestureLikeBurstId(confessionId);
      if (gestureLikeBurstTimerRef.current) {
        clearTimeout(gestureLikeBurstTimerRef.current);
      }

      gestureLikeBurstTimerRef.current = setTimeout(() => {
        setGestureLikeBurstId((currentId) =>
          currentId === confessionId ? null : currentId,
        );
        gestureLikeBurstTimerRef.current = null;
      }, 450);

      handleToggleLike(confessionId);
    },
    [handleToggleLike],
  );

  useEffect(() => {
    const getCardMeta = (eventTarget) => {
      if (!(eventTarget instanceof Element) || eventTarget.closest("button")) {
        return null;
      }

      const card = eventTarget.closest("[data-confession-card-id]");
      if (!card) {
        return null;
      }

      const confessionId = card.dataset.confessionCardId;
      const likedByCurrentUser = card.dataset.likedByCurrentUser === "true";

      if (!confessionId) {
        return null;
      }

      return {
        confessionId,
        likedByCurrentUser,
      };
    };

    const handleDocumentDoubleClick = (event) => {
      const cardMeta = getCardMeta(event.target);
      if (!cardMeta) {
        return;
      }

      handleCardLikeGesture(cardMeta.confessionId, cardMeta.likedByCurrentUser);
    };

    const handleDocumentTouchEnd = (event) => {
      const cardMeta = getCardMeta(event.target);
      if (!cardMeta) {
        return;
      }

      const now = Date.now();
      const lastTap = lastTapRef.current;

      if (
        lastTap.confessionId === cardMeta.confessionId &&
        now - lastTap.time < 300
      ) {
        lastTapRef.current = { confessionId: "", time: 0 };
        handleCardLikeGesture(
          cardMeta.confessionId,
          cardMeta.likedByCurrentUser,
        );
        return;
      }

      lastTapRef.current = {
        confessionId: cardMeta.confessionId,
        time: now,
      };
    };

    document.addEventListener("dblclick", handleDocumentDoubleClick);
    document.addEventListener("touchend", handleDocumentTouchEnd);

    return () => {
      document.removeEventListener("dblclick", handleDocumentDoubleClick);
      document.removeEventListener("touchend", handleDocumentTouchEnd);
    };
  }, [handleCardLikeGesture]);

  useEffect(
    () => () => {
      if (pressedLikeTimerRef.current) {
        clearTimeout(pressedLikeTimerRef.current);
      }

      if (pressedBookmarkTimerRef.current) {
        clearTimeout(pressedBookmarkTimerRef.current);
      }

      if (gestureLikeBurstTimerRef.current) {
        clearTimeout(gestureLikeBurstTimerRef.current);
      }
    },
    [],
  );

  return {
    pressedLikeId,
    pressedBookmarkId,
    gestureLikeBurstId,
    handleToggleLike,
    handleToggleBookmark,
  };
}
