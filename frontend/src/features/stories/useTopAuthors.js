import { useEffect, useState } from "react";
import { getFollowStatus } from "../../api/profile";
import { getAuthorRecommendations } from "../../api/recommendation";
import { normalizeId } from "../../lib/format";

export function useTopAuthors({
  currentUserId,
  refreshToken,
  setFollowStateByUserId,
}) {
  const [topAuthors, setTopAuthors] = useState([]);
  const [topAuthorsLoading, setTopAuthorsLoading] = useState(true);
  const [topAuthorsError, setTopAuthorsError] = useState("");

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadTopAuthors = async () => {
      if (!currentUserId) {
        if (isMounted) {
          setTopAuthors([]);
          setTopAuthorsError("");
          setTopAuthorsLoading(false);
        }
        return;
      }

      setTopAuthorsLoading(true);
      setTopAuthorsError("");

      try {
        const payload = await getAuthorRecommendations({
          limit: 4,
          minLikes: 10,
          signal: abortController.signal,
        });

        if (!isMounted) {
          return;
        }

        const resolvedAuthors = (
          Array.isArray(payload?.data) ? payload.data : []
        )
          .map((author) => {
            const authorId = normalizeId(author?.authorId || "");

            return {
              authorId,
              name: author?.displayName || author?.username || "Unknown author",
              role: `Top ${String(
                payload?.category ||
                  author?.authorInterests?.[0] ||
                  "recommended",
              ).toLowerCase()} author`,
              avatar: author?.profilePicture || "",
            };
          })
          .filter(
            (author) =>
              Boolean(author.authorId) && author.authorId !== currentUserId,
          );

        const followStatusEntries = await Promise.all(
          resolvedAuthors.map(async (author) => {
            try {
              const statusPayload = await getFollowStatus(author.authorId);
              return [author.authorId, Boolean(statusPayload?.following)];
            } catch {
              return [author.authorId, false];
            }
          }),
        );

        if (!isMounted) {
          return;
        }

        const followStatusMap = new Map(followStatusEntries);

        setTopAuthors(resolvedAuthors);
        setFollowStateByUserId((previous) => ({
          ...previous,
          ...Object.fromEntries(followStatusMap),
        }));
      } catch (error) {
        if (!isMounted || abortController.signal.aborted) {
          return;
        }

        setTopAuthors([]);
        setTopAuthorsError(
          error?.message || "Failed to load recommended authors.",
        );
      } finally {
        if (isMounted) {
          setTopAuthorsLoading(false);
        }
      }
    };

    loadTopAuthors();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [currentUserId, refreshToken, setFollowStateByUserId]);

  return { topAuthors, topAuthorsLoading, topAuthorsError };
}
