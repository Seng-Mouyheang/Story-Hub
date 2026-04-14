export const DASHBOARD_FILTERS_STORAGE_KEY = "dashboardActivityFilters";

export const DEFAULT_ACTIVITY_FILTERS = {
  contentType: "all",
  sortBy: "date",
  order: "desc",
  storyStatus: "all",
  storyVisibility: "all",
};

export const getSavedDashboardFilters = () => {
  try {
    const raw = localStorage.getItem(DASHBOARD_FILTERS_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_ACTIVITY_FILTERS;
    }

    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_ACTIVITY_FILTERS,
      ...(typeof parsed === "object" && parsed !== null ? parsed : {}),
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
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString();
};

export const formatUpdatedLabel = (value) => {
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
  const params = new URLSearchParams({ limit, page: String(page) });

  if (sortBy) params.set("sortBy", sortBy);
  if (order) params.set("order", order);

  Object.entries(extra).forEach(([key, val]) => {
    if (val !== null && val !== undefined) params.set(key, val);
  });

  return params.toString();
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
  updatedAt: item?.updatedAt || item?.createdAt || null,
  status: item?.status || null,
  visibility: item?.visibility || null,
});

export const normalizePayloadItems = (payload, type) =>
  Array.isArray(payload?.data)
    ? payload.data.map((item) => normalizeActivityItem(item, type))
    : [];
