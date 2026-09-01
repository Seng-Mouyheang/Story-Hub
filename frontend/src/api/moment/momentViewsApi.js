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

export async function getMomentViewers(momentId, { limit = 20, cursor } = {}) {
  if (!momentId) {
    throw new Error("Story ID is required");
  }

  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(
    `/api/moments/${momentId}/viewers?${params.toString()}`,
    { headers: getAuthHeaders() },
  );

  return parseJsonResponse(response, "Failed to fetch viewers.");
}
