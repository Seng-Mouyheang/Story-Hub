import { useEffect, useState } from "react";
import { getFollowing, getProfileByUserId } from "../../api/profile";
import { normalizeId } from "../../lib/format";

export function useFollowingAccounts({ currentUserId, refreshToken }) {
  const [followingAccounts, setFollowingAccounts] = useState([]);
  const [followingAccountsLoading, setFollowingAccountsLoading] =
    useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadFollowingAccounts = async () => {
      if (!currentUserId) {
        if (isMounted) {
          setFollowingAccounts([]);
          setFollowingAccountsLoading(false);
        }
        return;
      }

      setFollowingAccountsLoading(true);

      try {
        const payload = await getFollowing(currentUserId, {
          limit: 6,
          signal: abortController.signal,
        });

        if (!isMounted) {
          return;
        }

        const followingIds = Array.isArray(payload?.following)
          ? payload.following
          : [];
        const uniqueIds = [
          ...new Set(followingIds.map(normalizeId).filter(Boolean)),
        ].filter((userId) => userId !== currentUserId);

        const accountRows = await Promise.all(
          uniqueIds.map(async (userId) => {
            try {
              const profilePayload = await getProfileByUserId(userId);
              return {
                userId,
                authorId: userId,
                name:
                  profilePayload?.displayName ||
                  `Author ${userId.slice(-4).toUpperCase()}`,
                image: profilePayload?.profilePicture || "",
              };
            } catch {
              return {
                userId,
                authorId: userId,
                name: `Author ${userId.slice(-4).toUpperCase()}`,
                image: "",
              };
            }
          }),
        );

        setFollowingAccounts(accountRows);
      } catch (error) {
        if (!isMounted || abortController.signal.aborted) {
          return;
        }

        console.error("Failed to load following accounts:", error);
        setFollowingAccounts([]);
      } finally {
        if (isMounted) {
          setFollowingAccountsLoading(false);
        }
      }
    };

    loadFollowingAccounts();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [currentUserId, refreshToken]);

  return { followingAccounts, followingAccountsLoading };
}
