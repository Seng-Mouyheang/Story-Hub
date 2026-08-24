import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteStory } from "../../api/story/storyApi";

export function useExploreStoryMenu({ showToast, onStoryDeleted }) {
  const navigate = useNavigate();
  const [menuStoryId, setMenuStoryId] = useState(null);
  const [deletingStoryId, setDeletingStoryId] = useState(null);

  const toggleMenu = (storyId) => {
    setMenuStoryId((prev) => (prev === storyId ? null : storyId));
  };

  const handleEditStory = (storyId) => {
    setMenuStoryId(null);
    navigate(`/write?storyId=${storyId}&returnTo=/explore`);
  };

  const handleDeleteStory = async (storyId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this story? This action cannot be undone.",
      )
    )
      return;

    setDeletingStoryId(storyId);
    try {
      await deleteStory(storyId);
      onStoryDeleted?.(storyId);
      setMenuStoryId(null);
      showToast("Story deleted successfully.", "success");
    } catch {
      showToast("Failed to delete story. Please try again.", "error");
    } finally {
      setDeletingStoryId(null);
    }
  };

  return {
    menuStoryId,
    toggleMenu,
    deletingStoryId,
    handleEditStory,
    handleDeleteStory,
  };
}
