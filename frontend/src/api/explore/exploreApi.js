import {
  getStories,
  getStoriesByCategories,
  getStoriesByMyInterests,
} from "../story/storyApi";
import { getAuthorRecommendations } from "../recommendation";

const normalizeCategory = (category) => String(category || "").trim();

const toCanonicalCategory = (category) =>
  String(category || "")
    .trim()
    .toUpperCase();

const collectGenresFromStories = (stories, genreSet) => {
  (Array.isArray(stories) ? stories : []).forEach((story) => {
    const genres = Array.isArray(story?.genres) ? story.genres : [];

    genres.forEach((genre) => {
      const canonicalGenre = toCanonicalCategory(genre);
      if (canonicalGenre) {
        genreSet.add(canonicalGenre);
      }
    });
  });
};

export async function getExplorePublishedGenres({
  limit = 50,
  maxPages = 3,
  signal,
} = {}) {
  const genreSet = new Set();
  let cursor = null;

  for (let page = 0; page < maxPages; page += 1) {
    const payload = await getStories({ limit, cursor, signal });
    collectGenresFromStories(payload?.data, genreSet);

    if (!payload?.hasMore || !payload?.nextCursor) {
      break;
    }

    cursor = payload.nextCursor;
  }

  return [...genreSet].sort((leftGenre, rightGenre) =>
    leftGenre.localeCompare(rightGenre),
  );
}

export async function getExploreRecommendedStories({
  category,
  limit = 4,
  signal,
  sortBy = "latest",
} = {}) {
  const normalizedCategory = normalizeCategory(category);

  if (normalizedCategory === "Most visited") {
    const payload = await getStories({ limit, signal, sortBy });
    return {
      ...payload,
      data: Array.isArray(payload?.data) ? payload.data : [],
    };
  }

  if (normalizedCategory && normalizedCategory !== "All") {
    return getStoriesByCategories({
      categories: [normalizedCategory],
      limit,
      signal,
      sortBy,
    });
  }

  try {
    return await getStoriesByMyInterests({ limit, signal, sortBy });
  } catch {
    return getStories({ limit, signal });
  }
}

export async function getExplorePopularStories({
  category,
  limit = 4,
  signal,
} = {}) {
  // If a category is provided and not "All", fetch category-specific stories
  if (category && String(category).trim() !== "All") {
    return getStoriesByCategories({
      categories: [String(category).trim()],
      limit,
      signal,
      sortBy: "popular",
    });
  }

  // Global popular (likes-based)
  const payload = await getStories({ limit, signal, sortBy: "popular" });
  return {
    ...payload,
    data: Array.isArray(payload?.data) ? payload.data : [],
  };
}

export async function getExploreAuthors({
  category,
  limit = 10,
  minLikes = 10,
  signal,
} = {}) {
  return getAuthorRecommendations({
    category,
    limit,
    minLikes,
    signal,
  });
}
