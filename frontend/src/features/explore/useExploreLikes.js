import { useMemo, useState } from "react";
import { toggleStoryLike } from "../../api/story/storyInteractionsApi";

export function useExploreLikes({ recommendedStories, popularStories, showToast }) {
  const initialLikeStateByStoryId = useMemo(() => {
    const map = {};
    [...recommendedStories, ...popularStories].forEach((story) => {
      map[story.id] = {
        liked: Boolean(story.likedByCurrentUser),
        likes: story.likes,
      };
    });
    return map;
  }, [recommendedStories, popularStories]);

  const [overridesByStoryId, setOverridesByStoryId] = useState({});

  const getLikeState = (storyId) =>
    overridesByStoryId[storyId] ??
    initialLikeStateByStoryId[storyId] ?? { liked: false, likes: 0 };

  const isLiked = (storyId) => getLikeState(storyId).liked;
  const getLikeCount = (storyId) => getLikeState(storyId).likes;

  const toggleLike = async (storyId) => {
    const currentState = getLikeState(storyId);
    const nextState = {
      liked: !currentState.liked,
      likes: currentState.likes + (currentState.liked ? -1 : 1),
    };

    setOverridesByStoryId((prev) => ({ ...prev, [storyId]: nextState }));

    try {
      await toggleStoryLike(storyId);
    } catch {
      // Revert on error
      setOverridesByStoryId((prev) => ({ ...prev, [storyId]: currentState }));
      showToast("Failed to like story. Please try again.", "error");
    }
  };

  return { isLiked, getLikeCount, toggleLike };
}
