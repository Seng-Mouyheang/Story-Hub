export const DASHBOARD_FILTERS_STORAGE_KEY = "dashboardActivityFilters";

export const DEFAULT_ACTIVITY_FILTERS = {
  contentType: "all",
  sortBy: "updated_desc",
  storyStatus: "all",
  storyShow: "active",
  storyVisibility: "all",
};

const VALID_SORT_BY_VALUES = new Set([
  "updated_desc",
  "updated_asc",
  "title_desc",
  "title_asc",
  "likes_desc",
  "likes_asc",
  "comments_desc",
  "comments_asc",
]);

const normalizeSortByValue = (sortBy, order) => {
  if (typeof sortBy === "string" && VALID_SORT_BY_VALUES.has(sortBy)) {
    return sortBy;
  }

  const normalizedOrder = order === "asc" ? "asc" : "desc";

  if (sortBy === "likes") {
    return `likes_${normalizedOrder}`;
  }

  if (sortBy === "comments") {
    return `comments_${normalizedOrder}`;
  }

  if (sortBy === "title") {
    return `title_${normalizedOrder}`;
  }

  return `updated_${normalizedOrder}`;
};

export const getSavedDashboardFilters = () => {
  try {
    const raw = localStorage.getItem(DASHBOARD_FILTERS_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_ACTIVITY_FILTERS;
    }

    const parsed = JSON.parse(raw);

    const parsedObject =
      typeof parsed === "object" && parsed !== null ? parsed : {};
    const normalizedSortBy = normalizeSortByValue(
      parsedObject.sortBy,
      parsedObject.order,
    );

    return {
      ...DEFAULT_ACTIVITY_FILTERS,
      ...parsedObject,
      sortBy: normalizedSortBy,
    };
  } catch {
    return DEFAULT_ACTIVITY_FILTERS;
  }
};

export const formatCount = (value) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return String(value);
};

export const formatDateOnly = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    (typeof value !== "string" &&
      typeof value !== "number" &&
      !(value instanceof Date))
  ) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString();
};

export const formatUpdatedLabel = (value) => {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const sourceDate = new Date(value);

  if (Number.isNaN(sourceDate.getTime())) {
    return "N/A";
  }

  const now = new Date();
  const sourceDateStart = new Date(sourceDate);
  sourceDateStart.setHours(0, 0, 0, 0);
  const nowStart = new Date(now);
  nowStart.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (nowStart.getTime() - sourceDateStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays >= 2 && diffDays <= 9) {
    return `${diffDays} days ago`;
  }

  if (diffDays <= 13) {
    return "A week ago";
  }

  if (diffDays <= 20) {
    return "2 week ago";
  }

  if (diffDays <= 27) {
    return "3 week ago";
  }

  if (diffDays <= 31) {
    return "A month ago";
  }

  return sourceDate.toLocaleDateString();
};

export const getStatusBadgeClasses = (status) => {
  const value = String(status || "").toLowerCase();

  if (value === "published") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }

  if (value === "draft") {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600";
};

export const getVisibilityBadgeClasses = (visibility) => {
  const value = String(visibility || "").toLowerCase();

  if (value === "public") {
    return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
  }

  if (value === "private") {
    return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
  }

  return "bg-slate-100 text-slate-600";
};

export const buildFetchParams = (config) => {
  const { limit = "8", page, sortBy, order, ...extra } = config;
  const params = new URLSearchParams({ limit: String(limit) });
  const pageValue = page ?? "1";

  params.set("page", String(pageValue));

  if (sortBy) params.set("sortBy", sortBy);
  if (order) params.set("order", order);

  Object.entries(extra).forEach(([key, val]) => {
    if (val !== null && val !== undefined) params.set(key, val);
  });

  return params.toString();
};

export const getSortConfig = (sortBy) => {
  switch (sortBy) {
    case "updated_asc":
      return { apiSortBy: "date", order: "asc", metric: "updated" };
    case "likes_desc":
      return { apiSortBy: "likes", order: "desc", metric: "likes" };
    case "likes_asc":
      return { apiSortBy: "likes", order: "asc", metric: "likes" };
    case "title_desc":
      return { apiSortBy: "title", order: "desc", metric: "title" };
    case "title_asc":
      return { apiSortBy: "title", order: "asc", metric: "title" };
    case "comments_desc":
      return { apiSortBy: "comments", order: "desc", metric: "comments" };
    case "comments_asc":
      return { apiSortBy: "comments", order: "asc", metric: "comments" };
    default:
      return { apiSortBy: "date", order: "desc", metric: "updated" };
  }
};

export const getStoryQueryFilters = (activityFilters) => {
  const storyStatus = activityFilters?.storyStatus || "all";
  const storyShow = activityFilters?.storyShow || "active";

  return {
    status:
      storyStatus === "published" || storyStatus === "draft"
        ? storyStatus
        : "all",
    deleted: storyShow === "deleted" ? "deleted" : "active",
    visibility: activityFilters?.storyVisibility || "all",
  };
};

const compareDateValues = (a, b) => {
  const dateA = new Date(a || 0).getTime();
  const dateB = new Date(b || 0).getTime();

  return dateA - dateB;
};

export const sortMergedActivities = (activities, activityFilters) => {
  const { metric, order } = getSortConfig(activityFilters?.sortBy);
  const direction = order === "asc" ? 1 : -1;

  return [...activities].sort((left, right) => {
    if (metric === "likes") {
      const value = (left.likesCount - right.likesCount) * direction;
      if (value !== 0) return value;
    }

    if (metric === "comments") {
      const value = (left.commentCount - right.commentCount) * direction;
      if (value !== 0) return value;
    }

    if (metric === "title") {
      const value =
        String(left.title || "").localeCompare(
          String(right.title || ""),
          undefined,
          { sensitivity: "base" },
        ) * direction;
      if (value !== 0) return value;
    }

    const updatedValue =
      compareDateValues(left.updatedAt, right.updatedAt) * direction;
    if (updatedValue !== 0) return updatedValue;

    return compareDateValues(left.createdAt, right.createdAt) * direction;
  });
};

const sanitizeActivityIdPart = (value) =>
  String(value)
    .trim()
    .replaceAll(/[^a-zA-Z0-9_-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

const buildActivityFallbackId = (item, type) => {
  const stableParts = [
    type,
    item?.createdAt,
    item?.title,
    item?.authorId,
    item?.slug,
    item?.visibility,
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map(sanitizeActivityIdPart)
    .filter(Boolean);

  return stableParts.length > 0
    ? stableParts.join("-")
    : `${sanitizeActivityIdPart(type)}-activity`;
};

export const normalizeActivityItem = (item, type) => ({
  id: String(item?._id || buildActivityFallbackId(item, type)),
  type,
  title:
    item?.title ||
    (type === "story" ? "Untitled Story" : "Untitled Confession"),
  likesCount: Number(item?.likesCount || 0),
  commentCount: Number(item?.commentCount || 0),
  createdAt: item?.createdAt || null,
  updatedAt: item?.updatedAt ?? null,
  status: item?.status || null,
  visibility: item?.visibility || null,
});

export const normalizePayloadItems = (payload, type) =>
  Array.isArray(payload?.data)
    ? payload.data.map((item) => normalizeActivityItem(item, type))
    : [];
