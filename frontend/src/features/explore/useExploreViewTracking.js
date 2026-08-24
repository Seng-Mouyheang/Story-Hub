import { useEffect, useRef } from "react";
import { trackStoryView } from "../../api/story/storyApi";

// Track story views when they come into view on the feed
export function useExploreViewTracking({ recommendedStories, popularStories }) {
  const trackedViewIdsRef = useRef(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const storyId = entry.target.getAttribute("data-story-id");
            if (storyId && !trackedViewIdsRef.current.has(storyId)) {
              trackedViewIdsRef.current.add(storyId);
              trackStoryView(storyId).catch((error) => {
                console.warn("Failed to track view:", error);
              });
            }
          }
        });
      },
      { threshold: 0.1 },
    );

    // Observe all story cards
    const storyCards = document.querySelectorAll("[data-story-id]");
    storyCards.forEach((card) => observer.observe(card));

    return () => {
      observer.disconnect();
    };
  }, [popularStories, recommendedStories]);
}
