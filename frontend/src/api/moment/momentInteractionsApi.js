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

export async function getMomentLikes(momentId) {
  if (!momentId) {
    throw new Error("Story ID is required");
  }

  const response = await fetch(`/api/moments/${momentId}/likes`, {
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to fetch likes.");
}

export async function toggleMomentLike(momentId) {
  if (!momentId) {
    throw new Error("Story ID is required");
  }

  const response = await fetch(`/api/moments/${momentId}/toggle-like`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to toggle reaction.");
}

export async function toggleMomentCommentLike(commentId) {
  if (!commentId) {
    throw new Error("Comment ID is required");
  }

  const response = await fetch(
    `/api/moments/comments/${commentId}/toggle-like`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Failed to toggle comment like.");
}
