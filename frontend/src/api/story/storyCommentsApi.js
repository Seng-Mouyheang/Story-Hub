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

export async function getStoryComments(
  storyId,
  { limit = 10, cursor = null, signal } = {},
) {
  if (!storyId) {
    throw new Error("Story ID is required");
  }

  const cursorParam = cursor ? `&cursor=${cursor}` : "";
  const response = await fetch(
    `/api/stories/${storyId}/comments?limit=${limit}${cursorParam}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Unable to load comments.");
}

export async function addStoryComment(storyId, payload) {
  if (!storyId) {
    throw new Error("Story ID is required");
  }

  const response = await fetch(`/api/stories/${storyId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response, "Failed to post comment.");
}

export async function updateStoryComment(commentId, payload) {
  if (!commentId) {
    throw new Error("Comment ID is required");
  }

  const response = await fetch(`/api/stories/comments/${commentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response, "Failed to update comment.");
}

export async function deleteStoryComment(commentId) {
  if (!commentId) {
    throw new Error("Comment ID is required");
  }

  const response = await fetch(`/api/stories/comments/${commentId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to delete comment.");
}

export async function getCommentReplies(
  commentId,
  { limit = 10, cursor = null, signal } = {},
) {
  if (!commentId) {
    throw new Error("Comment ID is required");
  }

  const cursorParam = cursor ? `&cursor=${cursor}` : "";
  const response = await fetch(
    `/api/stories/comments/${commentId}/replies?limit=${limit}${cursorParam}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Failed to fetch replies.");
}
