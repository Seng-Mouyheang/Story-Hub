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

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export async function getDashboardStats({ signal } = {}) {
  const response = await fetch("/api/dashboard/stats", {
    signal,
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to fetch dashboard stats.");
}

export async function getDashboardStories({
  status = "all",
  visibility = "all",
  deleted = "active",
  sortBy = "date",
  order = "desc",
  page = 1,
  signal,
  limit = 5,
} = {}) {
  const queryString = buildQueryString({
    status,
    visibility,
    deleted,
    sortBy,
    order,
    page,
    limit,
  });

  const response = await fetch(`/api/dashboard/stories${queryString}`, {
    signal,
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to fetch dashboard stories.");
}

export async function getDashboardConfessions({
  deleted = "active",
  visibility = "all",
  sortBy = "date",
  order = "desc",
  page = 1,
  signal,
  limit = 5,
} = {}) {
  const queryString = buildQueryString({
    deleted,
    visibility,
    sortBy,
    order,
    page,
    limit,
  });

  const response = await fetch(`/api/dashboard/confessions${queryString}`, {
    signal,
    headers: getAuthHeaders(),
  });

  return parseJsonResponse(response, "Failed to fetch dashboard confessions.");
}
