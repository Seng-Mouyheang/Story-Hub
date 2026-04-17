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

export async function getUserStats(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const response = await fetch(`/api/profile/${userId}/stats`, {
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to fetch user statistics.");
}

export async function searchAccounts(query, { limit = 20, signal } = {}) {
  const trimmedQuery = String(query || "").trim();

  if (!trimmedQuery) {
    return { data: [] };
  }

  const searchParams = new URLSearchParams({
    q: trimmedQuery,
    limit: String(limit),
  });

  const response = await fetch(`/api/profile/search/accounts?${searchParams}`, {
    signal,
  });

  return parseJsonResponse(response, "Failed to search accounts.");
}

export async function getFollowers(
  userId,
  { cursor = null, limit = 20, signal } = {},
) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const searchParams = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  const response = await fetch(
    `/api/profile/${userId}/followers?${searchParams}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Failed to fetch followers.");
}

export async function getFollowing(
  userId,
  { cursor = null, limit = 20, signal } = {},
) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const searchParams = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  const response = await fetch(
    `/api/profile/${userId}/following?${searchParams}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );

  return parseJsonResponse(response, "Failed to fetch following.");
}

export async function getFollowStatus(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const response = await fetch(`/api/profile/${userId}/follow/status`, {
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to fetch follow status.");
}

export async function followUser(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const response = await fetch(`/api/profile/${userId}/follow`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to follow user.");
}

export async function unfollowUser(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const response = await fetch(`/api/profile/${userId}/follow`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to unfollow user.");
}
