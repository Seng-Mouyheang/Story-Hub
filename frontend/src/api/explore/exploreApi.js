import {
  getStories,
  getStoriesByCategories,
  getStoriesByMyInterests,
} from "../story/storyApi";
import { getAuthorRecommendations } from "../recommendation";

const normalizeCategory = (category) => String(category || "").trim();

const collectGenresFromStories = (stories, genreSet) => {
  (Array.isArray(stories) ? stories : []).forEach((story) => {
    const genres = Array.isArray(story?.genres) ? story.genres : [];

    genres.forEach((genre) => {
      const normalizedGenre = String(genre || "").trim();
      if (normalizedGenre) {
        genreSet.add(normalizedGenre);
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
} = {}) {
  const normalizedCategory = normalizeCategory(category);

  if (normalizedCategory === "Most visited") {
    const payload = await getStories({ limit, signal });
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
    });
  }

  try {
    return await getStoriesByMyInterests({ limit, signal });
  } catch {
    return getStories({ limit, signal });
  }
}

export async function getExplorePopularStories({ limit = 4, signal } = {}) {
  const payload = await getStories({ limit, signal });
  const data = Array.isArray(payload?.data) ? [...payload.data] : [];

  data.sort(
    (leftStory, rightStory) =>
      (Number(rightStory?.views) || 0) - (Number(leftStory?.views) || 0) ||
      (Number(rightStory?.likesCount) || 0) -
        (Number(leftStory?.likesCount) || 0),
  );

  return {
    ...payload,
    data,
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
