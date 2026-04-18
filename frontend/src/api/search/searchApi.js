// src/api/search/searchApi.js

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

export async function globalSearch(query, { limit = 8, signal } = {}) {
  if (!query || !query.trim()) {
    return {
      query: "",
      isTagSearch: false,
      accounts: [],
      stories: [],
      confessions: [],
    };
  }
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const response = await fetch(`/api/search?${params.toString()}`, {
    signal,
    headers: getAuthHeaders(),
  });
  return parseJsonResponse(response, "Failed to perform search.");
}
