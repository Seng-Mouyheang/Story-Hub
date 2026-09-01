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

export async function getMomentsFeed(signal) {
  const response = await fetch("/api/moments/feed", {
    signal,
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Unable to load stories right now.");
}

export async function getMomentsByAuthor(authorId, signal) {
  const response = await fetch(`/api/moments/author/${authorId}`, {
    signal,
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Unable to load this story.");
}

export async function createMoment(payload) {
  const response = await fetch("/api/moments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response, "Failed to post story.");
}

export async function markMomentViewed(momentId) {
  const response = await fetch(`/api/moments/${momentId}/view`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to update story.");
}

export async function toggleMomentComments(momentId) {
  const response = await fetch(`/api/moments/${momentId}/toggle-comments`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to update story.");
}

export async function deleteMoment(momentId) {
  const response = await fetch(`/api/moments/${momentId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to delete story.");
}
