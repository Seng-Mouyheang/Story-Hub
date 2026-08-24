export { formatCount, getRelativeTime } from "../../lib/format";

export const normalizeId = (value) => String(value || "").trim();

export const parseResponse = async (response) =>
  response.json().catch(() => ({}));

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
