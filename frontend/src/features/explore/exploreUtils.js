import { formatCount, normalizeId } from "../../lib/format";

export const TOP_AUTHORS_COUNT = 6;

export const mapStoryCard = (story) => ({
  id: story?._id || story?.storyId || story?.id || story?.title,
  authorId: normalizeId(
    story?.authorId || story?.author?._id || story?.author?.userId || null,
  ),
  title: story?.title || "Untitled story",
  tags:
    Array.isArray(story?.genres) && story.genres.length > 0
      ? story.genres
      : Array.isArray(story?.tags) && story.tags.length > 0
        ? story.tags
        : ["Story"],
  excerpt:
    story?.summary || story?.content?.slice(0, 140) || "No summary available.",
  likes: Number(story?.likesCount) || 0,
  likedByCurrentUser: !!story?.likedByCurrentUser,
  views: formatCount(story?.views),
  author: story?.authorDisplayName || story?.author?.displayName || "Unknown",
});
