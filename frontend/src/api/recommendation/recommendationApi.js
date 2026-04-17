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

export async function getAuthorRecommendations({
  category,
  categories,
  limit = 10,
  minLikes = 10,
  signal,
} = {}) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    minLikes: String(minLikes),
  });

  const normalizedCategory = String(category || "").trim();
  if (normalizedCategory) {
    searchParams.set("category", normalizedCategory);
  }

  if (Array.isArray(categories) && categories.length > 0) {
    searchParams.set(
      "categories",
      categories
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(","),
    );
  }

  const response = await fetch(`/api/recommendations/authors?${searchParams}`, {
    signal,
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to load recommended authors.");
}
