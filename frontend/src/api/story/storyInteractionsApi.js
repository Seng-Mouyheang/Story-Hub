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

export async function getStoryLikes(storyId) {
  if (!storyId) {
    throw new Error("Story ID is required");
  }

  const response = await fetch(`/api/stories/${storyId}/likes`, {
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to fetch likes.");
}

export async function toggleStoryLike(storyId) {
  if (!storyId) {
    throw new Error("Story ID is required");
  }

  const response = await fetch(`/api/stories/${storyId}/toggle-like`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to toggle reaction.");
}

export async function toggleStoryBookmark(storyId) {
  if (!storyId) {
    throw new Error("Story ID is required");
  }

  const response = await fetch(`/api/stories/${storyId}/toggle-bookmark`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to toggle bookmark.");
}

export async function removeStoryBookmark(storyId) {
  if (!storyId) {
    throw new Error("Story ID is required");
  }

  const response = await fetch(`/api/stories/${storyId}/bookmark`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to remove bookmark.");
}

export async function getStoryBookmarkStatus(storyId) {
  if (!storyId) {
    throw new Error("Story ID is required");
  }

  const response = await fetch(`/api/stories/${storyId}/bookmark-status`, {
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to fetch bookmark status.");
}

export async function getMyBookmarkedStories({
  limit = 10,
  cursor = null,
  signal,
} = {}) {
  const cursorParam = cursor ? `&cursor=${cursor}` : "";
  const response = await fetch(
    `/api/stories/bookmarks/me?limit=${limit}${cursorParam}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Failed to fetch bookmarked stories.");
}

export async function toggleCommentLike(commentId) {
  if (!commentId) {
    throw new Error("Comment ID is required");
  }

  const response = await fetch(
    `/api/stories/comments/${commentId}/toggle-like`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Failed to toggle comment like.");
}
