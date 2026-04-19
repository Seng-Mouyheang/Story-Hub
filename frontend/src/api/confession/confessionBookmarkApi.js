// confessionBookmarkApi.js
// API functions for confession bookmarks

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

export async function getBookmarkedConfessions({
  limit = 10,
  cursor,
  signal,
} = {}) {
  let safeLimit = parseInt(limit, 10);
  if (isNaN(safeLimit) || safeLimit < 1) safeLimit = 10;
  if (safeLimit > 50) safeLimit = 50;
  const params = new URLSearchParams();
  params.append("limit", safeLimit);
  if (typeof cursor === "string" && cursor.trim() !== "") {
    params.append("cursor", cursor.trim());
  }
  const res = await fetch(
    `/api/confessions/bookmarks/me?${params.toString()}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
      signal,
    },
  );
  return parseJsonResponse(res, "Failed to fetch bookmarked confessions");
}

export async function toggleConfessionBookmark(confessionId) {
  const res = await fetch(`/api/confessions/${confessionId}/toggle-bookmark`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });
  return parseJsonResponse(res, "Failed to toggle bookmark");
}

export async function removeConfessionBookmark(confessionId) {
  const res = await fetch(`/api/confessions/${confessionId}/bookmark`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
  });
  return parseJsonResponse(res, "Failed to remove bookmark");
}

export async function getConfessionBookmarkStatus(confessionId) {
  const res = await fetch(`/api/confessions/${confessionId}/bookmark-status`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  return parseJsonResponse(res, "Failed to get bookmark status");
}
