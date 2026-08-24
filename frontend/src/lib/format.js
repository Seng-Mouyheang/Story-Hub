export const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.$oid === "string") return value.$oid;
    if (typeof value.toString === "function") return value.toString();
  }

  return String(value);
};

export const formatCount = (value) => {
  if (value == null || Number.isNaN(Number(value))) {
    return "0";
  }

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }

  return String(value);
};

const RELATIVE_TIME_STEPS = [
  { limitMinutes: 1, toLabel: () => "Just now" },
  {
    limitMinutes: 60,
    toLabel: (minutes) => `${minutes} minute${minutes > 1 ? "s" : ""} ago`,
  },
  {
    limitMinutes: 24 * 60,
    toLabel: (minutes) => {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    },
  },
  {
    limitMinutes: 7 * 24 * 60,
    toLabel: (minutes) => {
      const days = Math.floor(minutes / (24 * 60));
      return `${days} day${days > 1 ? "s" : ""} ago`;
    },
  },
  {
    limitMinutes: 5 * 7 * 24 * 60,
    toLabel: (minutes) => {
      const weeks = Math.floor(minutes / (7 * 24 * 60));
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    },
  },
  {
    limitMinutes: 365 * 24 * 60,
    toLabel: (minutes) => {
      const months = Math.floor(minutes / (30 * 24 * 60));
      return `${months} month${months > 1 ? "s" : ""} ago`;
    },
  },
];

export const getRelativeTime = (dateString) => {
  const sourceDate = new Date(dateString);

  if (Number.isNaN(sourceDate.getTime())) {
    return "Recently";
  }

  const diffMs = Date.now() - sourceDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 0) {
    return "Recently";
  }

  for (const step of RELATIVE_TIME_STEPS) {
    if (diffMinutes < step.limitMinutes) {
      return step.toLabel(diffMinutes);
    }
  }

  const diffYears = Math.floor(diffMinutes / (365 * 24 * 60));
  return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
};

export const createEmptyRepliesState = () => ({
  open: false,
  loaded: false,
  loading: false,
  loadingMore: false,
  error: "",
  items: [],
  nextCursor: null,
  hasMore: false,
});

export const createEmptyCommentState = () => ({
  open: false,
  loaded: false,
  loading: false,
  loadingMore: false,
  error: "",
  items: [],
  nextCursor: null,
  hasMore: false,
  input: "",
  originalInput: "",
  editingCommentId: null,
  replyingToCommentId: null,
  replyingToAuthor: "",
  submitting: false,
  repliesByComment: {},
});
