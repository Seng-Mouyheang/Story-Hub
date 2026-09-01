import { useCallback, useEffect, useRef, useState } from "react";
import { getMomentViewers } from "../../api/moment/momentViewsApi";
import { createEmptyRepliesState } from "../../lib/format";

/**
 * Fetch/pagination state for the "who viewed my story" panel. Author-only,
 * scoped to a single moment at a time (mirrors useMomentComments' single
 * `activeMomentId` design, since the viewer only shows one moment).
 */
export function useMomentViewers() {
  const [activeMomentId, setActiveMomentId] = useState(null);
  const [viewersState, setViewersState] = useState(createEmptyRepliesState());
  const [totalCount, setTotalCount] = useState(0);

  const viewersListRef = useRef(null);
  const viewersListSentinelRef = useRef(null);
  const activeMomentIdRef = useRef(null);
  // Bumped at the start of every fetch so a same-moment reopen or a rapid
  // double-open (e.g. two click events landing before React re-renders and
  // isViewersPanelOpen reflects the first one) can't have its earlier,
  // slower request resolve later and clobber the newer one's state — the
  // activeMomentIdRef check alone only catches a *different* moment.
  const requestGenerationRef = useRef(0);

  const fetchViewers = useCallback(
    async (momentId, cursor = null, append = false) => {
      const generation = (requestGenerationRef.current += 1);
      const isStale = () =>
        activeMomentIdRef.current !== momentId ||
        requestGenerationRef.current !== generation;

      setViewersState((prev) => ({
        ...prev,
        loading: !append,
        loadingMore: append,
        error: "",
      }));

      try {
        const payload = await getMomentViewers(momentId, { limit: 20, cursor });

        if (isStale()) {
          return;
        }

        const viewers = Array.isArray(payload?.viewers) ? payload.viewers : [];

        if (!append && typeof payload?.totalCount === "number") {
          setTotalCount(payload.totalCount);
        }

        setViewersState((prev) => ({
          ...prev,
          open: true,
          loading: false,
          loadingMore: false,
          error: "",
          loaded: true,
          items: append ? [...(prev.items || []), ...viewers] : viewers,
          nextCursor: payload?.nextCursor || null,
          hasMore: Boolean(payload?.hasMore),
        }));
      } catch {
        if (isStale()) {
          return;
        }

        setViewersState((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
          error: "Unable to load viewers.",
        }));
      }
    },
    [],
  );

  const handleOpenViewers = useCallback(
    (momentId) => {
      activeMomentIdRef.current = momentId;
      setActiveMomentId(momentId);
      setViewersState(createEmptyRepliesState());
      setTotalCount(0);
      fetchViewers(momentId);
    },
    [fetchViewers],
  );

  const handleCloseViewers = useCallback(() => {
    activeMomentIdRef.current = null;
    setActiveMomentId(null);
  }, []);

  const handleLoadMoreViewers = useCallback(() => {
    if (!activeMomentId || !viewersState.hasMore || !viewersState.nextCursor) {
      return;
    }

    fetchViewers(activeMomentId, viewersState.nextCursor, true);
  }, [
    activeMomentId,
    viewersState.hasMore,
    viewersState.nextCursor,
    fetchViewers,
  ]);

  useEffect(() => {
    if (!activeMomentId) {
      return undefined;
    }

    const sentinel = viewersListSentinelRef.current;
    const root = viewersListRef.current;

    if (
      !sentinel ||
      !root ||
      !viewersState.hasMore ||
      viewersState.loading ||
      viewersState.loadingMore
    ) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          handleLoadMoreViewers();
        }
      },
      { root, rootMargin: "0px 0px 120px 0px", threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    activeMomentId,
    viewersState.hasMore,
    viewersState.loading,
    viewersState.loadingMore,
    handleLoadMoreViewers,
  ]);

  return {
    activeMomentId,
    viewersState,
    totalCount,
    viewersListRef,
    viewersListSentinelRef,
    handleOpenViewers,
    handleCloseViewers,
    handleLoadMoreViewers,
  };
}
