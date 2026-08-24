import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCcw } from "lucide-react";

import { CONFESSION_FEED_LIMIT, parseResponse } from "./confessionUtils";

export function useConfessionFeed({ showError, showToast, hideToast }) {
  const [confessionFeed, setConfessionFeed] = useState([]);
  const [nextCursor, setNextCursor] = useState("");
  const [hasMoreFeed, setHasMoreFeed] = useState(false);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isLoadingMoreFeed, setIsLoadingMoreFeed] = useState(false);
  const [feedError, setFeedError] = useState("");
  const sentinelRef = useRef(null);
  const feedScrollRef = useRef(null);
  const hasShownEndToastRef = useRef(false);

  const loadConfessions = useCallback(
    async ({ cursor = "", append = false } = {}) => {
      if (!append) {
        hasShownEndToastRef.current = false;
      }

      if (append) {
        setIsLoadingMoreFeed(true);
      } else {
        setIsLoadingFeed(true);
      }

      try {
        const params = new URLSearchParams({
          limit: String(CONFESSION_FEED_LIMIT),
        });

        if (cursor) {
          params.set("cursor", cursor);
        }

        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await fetch(`/api/confessions?${params.toString()}`, {
          headers,
        });
        const payload = await parseResponse(response);

        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load confessions.");
        }

        const data = Array.isArray(payload?.data) ? payload.data : [];

        setFeedError("");
        setConfessionFeed((prev) => (append ? [...prev, ...data] : data));
        setNextCursor(payload?.nextCursor || "");
        setHasMoreFeed(Boolean(payload?.hasMore));
      } catch (error) {
        setFeedError(error.message || "Failed to load confessions.");
        showError(error.message || "Failed to load confessions.");
      } finally {
        setIsLoadingFeed(false);
        setIsLoadingMoreFeed(false);
      }
    },
    [showError],
  );

  const handleRefreshConfessions = useCallback(() => {
    hasShownEndToastRef.current = false;
    hideToast();
    feedScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    loadConfessions().catch(() => {});
  }, [hideToast, loadConfessions]);

  useEffect(() => {
    loadConfessions().catch(() => {});
  }, [loadConfessions]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }

        if (hasMoreFeed && !isLoadingMoreFeed && !isLoadingFeed) {
          loadConfessions({ cursor: nextCursor, append: true }).catch(() => {});
          return;
        }

        if (
          !hasMoreFeed &&
          confessionFeed.length > 0 &&
          !isLoadingFeed &&
          !hasShownEndToastRef.current
        ) {
          hasShownEndToastRef.current = true;
          showToast("You're all caught up. Scroll up to refresh.", "info", {
            action: {
              label: "Back to top & refresh",
              icon: RefreshCcw,
              onClick: handleRefreshConfessions,
            },
          });
        }
      },
      { threshold: 0.1 },
    );

    const currentSentinel = sentinelRef.current;

    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [
    hasMoreFeed,
    nextCursor,
    isLoadingMoreFeed,
    isLoadingFeed,
    loadConfessions,
    confessionFeed.length,
    showToast,
    handleRefreshConfessions,
  ]);

  return {
    confessionFeed,
    setConfessionFeed,
    nextCursor,
    hasMoreFeed,
    isLoadingFeed,
    isLoadingMoreFeed,
    feedError,
    sentinelRef,
    feedScrollRef,
    loadConfessions,
    handleRefreshConfessions,
  };
}
