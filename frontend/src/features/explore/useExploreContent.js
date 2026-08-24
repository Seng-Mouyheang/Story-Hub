import { useEffect, useMemo, useRef, useState } from "react";
import {
  getExploreRecommendedStories,
  getExplorePopularStories,
  getExplorePublishedGenres,
  getExploreAuthors,
} from "../../api/explore";
import { normalizeId } from "../../lib/format";
import { mapStoryCard, TOP_AUTHORS_COUNT } from "./exploreUtils";

export function useExploreContent({ currentUserId, showToast }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [genreFilters, setGenreFilters] = useState(["All"]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [genresError, setGenresError] = useState("");

  const [recommendedStories, setRecommendedStories] = useState([]);
  const [popularStories, setPopularStories] = useState([]);
  const [resolvedAuthors, setResolvedAuthors] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [recommendedError, setRecommendedError] = useState("");
  const [popularError, setPopularError] = useState("");
  const [authorsError, setAuthorsError] = useState("");

  const activeCategoryRef = useRef(activeCategory);
  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  // Load published genres once on mount — clicking a genre should not reload this list
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadGenres = async () => {
      setGenresLoading(true);
      setGenresError("");

      try {
        const publishedGenres = await getExplorePublishedGenres({
          limit: 50,
          maxPages: 3,
          signal: abortController.signal,
        });

        if (!isMounted) {
          return;
        }

        const nextGenres = ["All", ...publishedGenres];
        setGenreFilters(nextGenres);

        if (!nextGenres.includes(activeCategoryRef.current)) {
          setActiveCategory("All");
        }
      } catch (error) {
        if (!isMounted || abortController.signal.aborted) {
          return;
        }

        const errorMsg = error?.message || "Failed to load genres.";
        setGenreFilters(["All"]);
        setGenresError(errorMsg);
        showToast(errorMsg, "error");
      } finally {
        if (isMounted) {
          setGenresLoading(false);
        }
      }
    };

    loadGenres();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [showToast]);

  // Load explore content when active category or current user changes
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadExploreContent = async () => {
      setStoriesLoading(true);
      setAuthorsLoading(true);
      setRecommendedError("");
      setPopularError("");
      setAuthorsError("");

      // Recommended: if no genre selected -> interest-based popular (likes),
      // if genre selected -> latest in that genre
      const recommendedSort =
        activeCategory && activeCategory !== "All" ? "latest" : "popular";

      const [recommendedResult, popularResult, authorsResult] =
        await Promise.allSettled([
          getExploreRecommendedStories({
            category: activeCategory,
            limit: 4,
            signal: abortController.signal,
            sortBy: recommendedSort,
          }),
          getExplorePopularStories({
            category: activeCategory,
            limit: 4,
            signal: abortController.signal,
          }),
          getExploreAuthors({
            limit: TOP_AUTHORS_COUNT,
            minLikes: 10,
            signal: abortController.signal,
          }),
        ]);

      if (!isMounted) {
        return;
      }

      if (recommendedResult.status === "fulfilled") {
        const allRecommended = (recommendedResult.value?.data || []).map(
          mapStoryCard,
        );
        // Filter out stories authored by the current user
        setRecommendedStories(
          allRecommended.filter((story) => story.authorId !== currentUserId),
        );
      } else {
        setRecommendedStories([]);
        const errorMsg =
          recommendedResult.reason?.message ||
          "Failed to load recommended stories.";
        setRecommendedError(errorMsg);
        showToast(errorMsg, "error");
      }

      if (popularResult.status === "fulfilled") {
        setPopularStories((popularResult.value?.data || []).map(mapStoryCard));
      } else {
        setPopularStories([]);
        const errorMsg =
          popularResult.reason?.message || "Failed to load popular stories.";
        setPopularError(errorMsg);
        showToast(errorMsg, "error");
      }

      if (authorsResult.status === "fulfilled") {
        const resolved = (authorsResult.value?.data || []).map((author) => ({
          userId: normalizeId(author?.authorId || null),
          avatar: author?.profilePicture || "",
          displayName: author?.displayName || author?.username || "Unknown",
          role: `Top ${String(
            authorsResult.value?.category ||
              author?.primaryCategory ||
              "recommended",
          ).toLowerCase()} author`,
          popularStoriesInCategory: Number(
            author?.popularStoriesInCategory || 0,
          ),
          totalCategoryLikes: Number(author?.totalCategoryLikes || 0),
        }));

        setResolvedAuthors(resolved);
      } else {
        setResolvedAuthors([]);
        const errorMsg =
          authorsResult.reason?.message ||
          "Failed to load recommended authors.";
        setAuthorsError(errorMsg);
        showToast(errorMsg, "error");
      }

      setStoriesLoading(false);
      setAuthorsLoading(false);
    };

    loadExploreContent();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [activeCategory, currentUserId, showToast]);

  const authorIdsForFollowStatus = useMemo(() => {
    const recommendedAuthorIds = resolvedAuthors
      .map((author) => author.userId)
      .filter(Boolean);

    const storyAuthorIds = [...recommendedStories, ...popularStories]
      .map((story) => story.authorId)
      .filter(Boolean);

    return [...new Set([...recommendedAuthorIds, ...storyAuthorIds])].filter(
      (authorId) => authorId !== currentUserId,
    );
  }, [resolvedAuthors, recommendedStories, popularStories, currentUserId]);

  return {
    topAuthorsCount: TOP_AUTHORS_COUNT,
    activeCategory,
    setActiveCategory,
    genreFilters,
    genresLoading,
    genresError,
    recommendedStories,
    setRecommendedStories,
    popularStories,
    setPopularStories,
    resolvedAuthors,
    storiesLoading,
    authorsLoading,
    recommendedError,
    popularError,
    authorsError,
    authorIdsForFollowStatus,
  };
}
