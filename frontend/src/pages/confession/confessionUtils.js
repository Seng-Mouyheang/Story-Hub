export const normalizeId = (value) => String(value || "").trim();

export const parseResponse = async (response) =>
  response.json().catch(() => ({}));

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

export const CONFESSION_FEED_LIMIT = 8;
export const CONFESSION_CONTENT_PREVIEW_LIMIT = 280;

export const extractTagsFromContent = (content) => {
  const matches = content.match(/#\w+/g) || [];
  const uniqueByLowercase = new Map();

  for (const rawTag of matches) {
    const cleanedTag = rawTag.slice(1).trim();

    if (!cleanedTag) {
      continue;
    }

    const normalizedKey = cleanedTag.toLowerCase();

    if (!uniqueByLowercase.has(normalizedKey)) {
      uniqueByLowercase.set(normalizedKey, cleanedTag);
    }
  }

  return Array.from(uniqueByLowercase.values());
};

export const stripTagsFromContent = (content) =>
  (content || "")
    .replaceAll(/#\w+/g, "")
    .replaceAll(/[ \t]{2,}/g, " ")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();

export const getConfessionContentPreview = (content, isExpanded) => {
  const safeContent = content || "No confession content";
  const isLongContent = safeContent.length > CONFESSION_CONTENT_PREVIEW_LIMIT;

  if (!isLongContent || isExpanded) {
    return {
      visibleContent: safeContent,
      isLongContent,
    };
  }

  return {
    visibleContent: `${safeContent.slice(0, CONFESSION_CONTENT_PREVIEW_LIMIT)}...`,
    isLongContent,
  };
};
