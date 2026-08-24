import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { getProfileByUserId } from "../../api/profile";
import { getStories } from "../../api/story/storyApi";
import { getRelativeTime, normalizeId } from "../../lib/format";

/**
 * Home's cursor-pagination / infinite-scroll / "caught up" toast / refresh
 * feed logic.
 */
export function useStoryFeed({
  currentUserId,
  showToast,
  hideToast,
  onStoriesLoaded,
}) {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isEndOfFeedVisible, setIsEndOfFeedVisible] = useState(false);

  const endOfFeedRef = useRef(null);
  const feedScrollRef = useRef(null);
  const hasShownEndToastRef = useRef(false);

  const showToastRef = useRef(showToast);
  const onStoriesLoadedRef = useRef(onStoriesLoaded);

  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    onStoriesLoadedRef.current = onStoriesLoaded;
  }, [onStoriesLoaded]);

  const loadStories = useCallback(
    async (signal, paginationCursor = null) => {
      const isInitial = paginationCursor === null;
      if (isInitial) {
        setIsLoadingPosts(true);
        setPostsError("");
        setPosts([]);
        setCursor(null);
        setHasMore(true);
        setIsEndOfFeedVisible(false);
        hasShownEndToastRef.current = false;
      } else {
        setIsLoadingMore(true);
      }

      try {
        const payload = await getStories({
          limit: 10,
          cursor: paginationCursor,
          signal,
        });
        const rawStories = Array.isArray(payload?.data) ? payload.data : [];
        const nextCursor = payload?.nextCursor || null;
        const hasMoreStories = payload?.hasMore || false;
        const uniqueAuthorIds = [
          ...new Set(
            rawStories
              .map((story) => normalizeId(story.authorId))
              .filter(Boolean),
          ),
        ];

        const authorProfiles = await Promise.all(
          uniqueAuthorIds.map(async (authorId) => {
            try {
              const profile = await getProfileByUserId(authorId);
              return [
                authorId,
                {
                  avatar: profile?.profilePicture || "",
                  name:
                    profile?.displayName ||
                    profile?.username ||
                    profile?.name ||
                    `Author ${String(authorId).slice(-4).toUpperCase()}`,
                },
              ];
            } catch {
              return [
                authorId,
                {
                  avatar: "",
                  name: `Author ${String(authorId).slice(-4).toUpperCase()}`,
                },
              ];
            }
          }),
        );

        const authorProfileMap = new Map(authorProfiles);

        const mappedStories = rawStories.map((story) => {
          const authorId = normalizeId(story.authorId);
          const authorProfile = authorProfileMap.get(authorId) || {};
          return {
            id: String(story._id),
            authorId,
            author: authorProfile.name,
            genres:
              Array.isArray(story.genres) && story.genres.length > 0
                ? story.genres.map((item) => String(item).toUpperCase())
                : ["GENERAL"],
            tags: Array.isArray(story.tags)
              ? story.tags
                  .map((item) => String(item || "").trim())
                  .filter(Boolean)
              : [],
            time: getRelativeTime(story.publishedAt || story.createdAt),
            title: story.title || "Untitled Story",
            content: story.content || story.summary || "",
            excerpt:
              story.summary ||
              story.content?.slice(0, 180) ||
              "No preview is available for this story.",
            likesCount: Number(story.likesCount || 0),
            commentCount: Number(story.commentCount || 0),
            canManage: Boolean(currentUserId) && authorId === currentUserId,
            likedByCurrentUser: Boolean(story.likedByCurrentUser),
            followingAuthor: Boolean(story.followedByCurrentUser),
            followBusy: false,
            avatar: authorProfile.avatar || "",
          };
        });

        if (isInitial) {
          setPosts(mappedStories);
        } else {
          setPosts((prev) => [...prev, ...mappedStories]);
        }

        setCursor(nextCursor);
        setHasMore(hasMoreStories);
        onStoriesLoadedRef.current?.(mappedStories);

        return mappedStories;
      } catch (error) {
        if (error.name !== "AbortError") {
          const errorMessage =
            "Unable to load stories right now. Please try again.";

          if (isInitial) {
            setPostsError(errorMessage);
          }

          showToastRef.current?.(errorMessage, "error");
        }
        return [];
      } finally {
        if (!signal?.aborted) {
          if (isInitial) {
            setIsLoadingPosts(false);
          } else {
            setIsLoadingMore(false);
          }
        }
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadStories(controller.signal, null);

    return () => controller.abort();
  }, [loadStories]);

  const handleRefreshFeed = useCallback(() => {
    hasShownEndToastRef.current = false;
    hideToast?.();
    setIsEndOfFeedVisible(false);

    feedScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });

    const controller = new AbortController();
    loadStories(controller.signal, null);
  }, [hideToast, loadStories]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = Boolean(entries[0]?.isIntersecting);
        setIsEndOfFeedVisible(isIntersecting);

        if (!isIntersecting) {
          return;
        }

        if (hasMore && cursor) {
          loadStories(new AbortController().signal, cursor);
          return;
        }

        if (!hasShownEndToastRef.current && posts.length > 0) {
          hasShownEndToastRef.current = true;
          showToast("You're all caught up. Scroll up to refresh.", "info", {
            action: {
              label: "Back to top & refresh",
              icon: RefreshCcw,
              onClick: handleRefreshFeed,
            },
          });
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    const currentEndOfFeedRef = endOfFeedRef.current;

    if (currentEndOfFeedRef) {
      observer.observe(currentEndOfFeedRef);
    }

    return () => {
      if (currentEndOfFeedRef) {
        observer.unobserve(currentEndOfFeedRef);
      }
    };
  }, [cursor, hasMore, handleRefreshFeed, loadStories, posts.length, showToast]);

  return {
    posts,
    setPosts,
    cursor,
    hasMore,
    isLoadingPosts,
    postsError,
    setPostsError,
    isLoadingMore,
    isEndOfFeedVisible,
    endOfFeedRef,
    feedScrollRef,
    loadStories,
    handleRefreshFeed,
  };
}
