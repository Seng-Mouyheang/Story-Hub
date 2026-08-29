import { useCallback, useEffect, useState } from "react";
import { getMomentsFeed } from "../../api/moment/momentApi";

export function useMomentsFeed({ currentUserId, refreshToken }) {
  const [momentGroups, setMomentGroups] = useState([]);
  const [momentsLoading, setMomentsLoading] = useState(true);
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadMoments = async () => {
      if (!currentUserId) {
        if (isMounted) {
          setMomentGroups([]);
          setMomentsLoading(false);
        }
        return;
      }

      setMomentsLoading(true);

      try {
        const payload = await getMomentsFeed(abortController.signal);

        if (!isMounted) {
          return;
        }

        setMomentGroups(Array.isArray(payload?.groups) ? payload.groups : []);
      } catch (error) {
        if (!isMounted || abortController.signal.aborted) {
          return;
        }

        console.error("Failed to load stories:", error);
        setMomentGroups([]);
      } finally {
        if (isMounted) {
          setMomentsLoading(false);
        }
      }
    };

    loadMoments();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [currentUserId, refreshToken, reloadCounter]);

  const reloadMoments = useCallback(() => {
    setReloadCounter((count) => count + 1);
  }, []);

  // Patches viewed state in place instead of refetching the whole feed, so
  // closing the story viewer doesn't flash the strip back to a loading
  // skeleton just to reflect a couple of now-seen moments.
  const markMomentsViewed = useCallback((momentIds) => {
    if (!momentIds || momentIds.size === 0) {
      return;
    }

    setMomentGroups((groups) =>
      groups.map((group) => {
        if (!group.moments.some((moment) => momentIds.has(moment.id))) {
          return group;
        }

        const moments = group.moments.map((moment) =>
          momentIds.has(moment.id) ? { ...moment, viewed: true } : moment,
        );

        return {
          ...group,
          moments,
          hasUnseen: moments.some((moment) => !moment.viewed),
        };
      }),
    );
  }, []);

  // Same idea for deletes — drop the moment (and the author's whole story
  // group if that was their last one) from local state directly.
  const removeMoment = useCallback((momentId) => {
    setMomentGroups((groups) =>
      groups
        .map((group) => ({
          ...group,
          moments: group.moments.filter((moment) => moment.id !== momentId),
        }))
        .filter((group) => group.moments.length > 0),
    );
  }, []);

  // Same idea for likes — MomentViewer keeps its own local copy of the group
  // while open, so patch the shared feed state here too or the like resets
  // to unliked the next time the viewer is reopened.
  const patchMomentLike = useCallback(
    (momentId, { likedByCurrentUser, likesCount }) => {
      setMomentGroups((groups) =>
        groups.map((group) => {
          if (!group.moments.some((moment) => moment.id === momentId)) {
            return group;
          }

          return {
            ...group,
            moments: group.moments.map((moment) =>
              moment.id === momentId
                ? { ...moment, likedByCurrentUser, likesCount }
                : moment,
            ),
          };
        }),
      );
    },
    [],
  );

  // Same idea for comment counts — MomentViewer keeps its own local copy of
  // the group while open, so patch the shared feed state here too or the
  // count resets to stale once the viewer is reopened or swiped away from.
  const patchMomentCommentCount = useCallback((momentId, delta) => {
    setMomentGroups((groups) =>
      groups.map((group) => {
        if (!group.moments.some((moment) => moment.id === momentId)) {
          return group;
        }

        return {
          ...group,
          moments: group.moments.map((moment) =>
            moment.id === momentId
              ? {
                  ...moment,
                  commentCount: Math.max(
                    0,
                    Number(moment.commentCount || 0) + delta,
                  ),
                }
              : moment,
          ),
        };
      }),
    );
  }, []);

  return {
    momentGroups,
    momentsLoading,
    reloadMoments,
    markMomentsViewed,
    removeMoment,
    patchMomentLike,
    patchMomentCommentCount,
  };
}
