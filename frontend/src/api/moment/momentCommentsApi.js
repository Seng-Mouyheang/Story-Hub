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

export async function getMomentComments(
  momentId,
  { limit = 10, cursor = null, signal } = {},
) {
  if (!momentId) {
    throw new Error("Story ID is required");
  }

  const cursorParam = cursor ? `&cursor=${cursor}` : "";
  const response = await fetch(
    `/api/moments/${momentId}/comments?limit=${limit}${cursorParam}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Unable to load comments.");
}

export async function addMomentComment(momentId, payload) {
  if (!momentId) {
    throw new Error("Story ID is required");
  }

  const response = await fetch(`/api/moments/${momentId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response, "Failed to post comment.");
}

export async function updateMomentComment(commentId, payload) {
  if (!commentId) {
    throw new Error("Comment ID is required");
  }

  const response = await fetch(`/api/moments/comments/${commentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response, "Failed to update comment.");
}

export async function deleteMomentComment(commentId) {
  if (!commentId) {
    throw new Error("Comment ID is required");
  }

  const response = await fetch(`/api/moments/comments/${commentId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to delete comment.");
}

export async function getMomentCommentReplies(
  commentId,
  { limit = 10, cursor = null, signal } = {},
) {
  if (!commentId) {
    throw new Error("Comment ID is required");
  }

  const cursorParam = cursor ? `&cursor=${cursor}` : "";
  const response = await fetch(
    `/api/moments/comments/${commentId}/replies?limit=${limit}${cursorParam}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Failed to fetch replies.");
}
