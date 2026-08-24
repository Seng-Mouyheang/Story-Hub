import { formatCount, getRelativeTime } from "../../lib/format";

export const COLLAPSED_CONTENT_HEIGHT = 120;

export const mapStoryToCard = (story, overrides = {}) => ({
  id: String(story._id),
  title: story.title || "Untitled Story",
  fullContent: story.content || story.summary || "",
  likes: formatCount(Number(story.likesCount || 0)),
  saves: formatCount(Number(story.bookmarkCount || 0)),
  date: getRelativeTime(story.publishedAt || story.createdAt),
  genres:
    Array.isArray(story.genres) && story.genres.length > 0
      ? story.genres.map((g) => String(g).toUpperCase())
      : ["GENERAL"],
  sortTs: new Date(story.publishedAt || story.createdAt || 0).getTime() || 0,
  author: story.authorDisplayName || null,
  authorId: story.authorId ? String(story.authorId) : null,
  ...overrides,
});

export const formatJoinedDate = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return null;
  return `Joined ${d.toLocaleString(undefined, { month: "long", year: "numeric" })}`;
};
