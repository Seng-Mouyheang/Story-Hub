const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseJsonResponse = async (response, fallbackMessage) => {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
};

export async function getStories({ limit = 10, cursor = null, signal } = {}) {
  const cursorParam = cursor ? `&cursor=${cursor}` : "";
  const response = await fetch(`/api/stories?limit=${limit}${cursorParam}`, {
    signal,
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Unable to load stories right now.");
}

export async function getStoryById(storyId, signal) {
  if (!storyId) {
    throw new Error("Story ID is required");
  }

  const response = await fetch(`/api/stories/${storyId}`, {
    signal,
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to load story.");
}

export async function createStory(payload) {
  const response = await fetch("/api/stories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response, "Failed to create story.");
}

export async function updateStory(storyId, payload) {
  if (!storyId) {
    throw new Error("Story ID is required");
  }

  const response = await fetch(`/api/stories/${storyId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response, "Failed to update story.");
}

export async function deleteStory(storyId) {
  if (!storyId) {
    throw new Error("Story ID is required");
  }

  const response = await fetch(`/api/stories/${storyId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to delete story.");
}

export async function getStoriesByTag(
  tag,
  { limit = 10, cursor = null, signal } = {},
) {
  if (!tag) {
    throw new Error("Tag is required");
  }

  const cursorParam = cursor ? `&cursor=${cursor}` : "";
  const response = await fetch(
    `/api/stories/tags/${tag}?limit=${limit}${cursorParam}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Failed to fetch stories by tag.");
}

export async function getStoriesByCategories({
  categories = [],
  limit = 10,
  cursor = null,
  signal,
} = {}) {
  const cursorParam = cursor ? `&cursor=${cursor}` : "";
  const categoriesParam = Array.isArray(categories)
    ? categories.join(",")
    : String(categories || "");

  const response = await fetch(
    `/api/stories/categories?limit=${limit}&categories=${encodeURIComponent(categoriesParam)}${cursorParam}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Failed to fetch stories by categories.");
}

export async function getStoriesByTitle(
  query,
  { limit = 10, cursor = null, signal } = {},
) {
  if (!query) {
    throw new Error("Search query is required");
  }

  const cursorParam = cursor ? `&cursor=${cursor}` : "";
  const response = await fetch(
    `/api/stories/search/title?limit=${limit}&q=${encodeURIComponent(query)}${cursorParam}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Failed to search stories by title.");
}

export async function getStoriesByMyInterests({
  limit = 10,
  cursor = null,
  signal,
} = {}) {
  const cursorParam = cursor ? `&cursor=${cursor}` : "";
  const response = await fetch(
    `/api/stories/interests/me?limit=${limit}${cursorParam}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Failed to fetch stories by interests.");
}

export async function getStoriesByAuthor(
  authorId,
  { limit = 10, cursor = null, signal } = {},
) {
  if (!authorId) {
    throw new Error("Author ID is required");
  }

  const cursorParam = cursor ? `&cursor=${cursor}` : "";
  const response = await fetch(
    `/api/stories/author/${authorId}?limit=${limit}${cursorParam}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Failed to fetch stories by author.");
}

export async function getMyStories({ limit = 10, cursor = null, signal } = {}) {
  const cursorParam = cursor ? `&cursor=${cursor}` : "";
  const response = await fetch(`/api/stories/me?limit=${limit}${cursorParam}`, {
    signal,
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to fetch user stories.");
}

export {
  getStoryLikes,
  toggleStoryLike,
  toggleStoryBookmark,
  removeStoryBookmark,
  getStoryBookmarkStatus,
  getMyBookmarkedStories,
  toggleCommentLike,
} from "./storyInteractionsApi";
