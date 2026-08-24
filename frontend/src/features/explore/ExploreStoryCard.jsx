import { Link } from "react-router-dom";
import { Bookmark, Heart, Eye, MoreHorizontal } from "lucide-react";
import ExpandableChipList from "../../components/ExpandableChipList";

export default function ExploreStoryCard({
  story,
  currentUserId,
  onOpenStory,
  isMenuOpen,
  onToggleMenu,
  onEditStory,
  onDeleteStory,
  isDeleting,
  isFollowing,
  isFollowBusy,
  onToggleFollow,
  isSaved,
  onToggleSave,
  isLiked,
  likeCount,
  onToggleLike,
}) {
  const isOwnStory = Boolean(
    story.authorId && currentUserId && story.authorId === currentUserId,
  );

  return (
    <div
      data-story-id={story.id}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onOpenStory(story.id);
        }
      }}
      onClick={() => onOpenStory(story.id)}
      className="cursor-pointer bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md h-full flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <ExpandableChipList
            idPrefix={`explore-genre-${story.id}`}
            items={story.tags}
            limit={5}
          />
        </div>

        <div className="flex items-center gap-2 text-slate-500 shrink-0">
          {story.authorId && !isOwnStory ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFollow(story.authorId);
              }}
              disabled={isFollowBusy}
              className={`text-[10px] font-semibold px-3 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap ${
                isFollowing
                  ? "border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
                  : "bg-rose-500 hover:bg-rose-600 text-white"
              } ${isFollowBusy ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          ) : null}

          {isOwnStory && (
            <div className="relative">
              <button
                type="button"
                aria-label="Story actions"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu(story.id);
                }}
                className={
                  isMenuOpen
                    ? "text-rose-500"
                    : "text-slate-400 hover:text-slate-600"
                }
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-8 z-10 w-32 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditStory(story.id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteStory(story.id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave(story.id);
            }}
            className={
              isSaved ? "text-rose-500" : "text-slate-500 hover:text-rose-500"
            }
            aria-label={isSaved ? "Unsave story" : "Save story"}
          >
            <Bookmark
              className="w-5 h-5"
              fill={isSaved ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>

      <h4 className="font-semibold text-lg sm:text-xl mb-2 text-slate-900">
        {story.title}
      </h4>

      <p className="text-[11px] font-medium text-slate-400 mb-3">
        By{" "}
        <Link
          to={story.authorId ? `/profile/${story.authorId}` : "/profile"}
          state={{ from: "/explore" }}
          onClick={(e) => e.stopPropagation()}
          className="text-slate-500 rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          {story.author}
        </Link>
      </p>

      <p className="text-slate-600 text-sm leading-relaxed mb-6 italic">
        {story.excerpt}
      </p>

      <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col items-end gap-1">
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-slate-500 text-[10px] font-medium">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(story.id);
            }}
            className={
              isLiked
                ? "flex items-center gap-1 text-rose-500"
                : "flex items-center gap-1 text-slate-500 hover:text-rose-500"
            }
            aria-label={isLiked ? "Unlike story" : "Like story"}
          >
            <Heart className="w-3 h-3" fill={isLiked ? "currentColor" : "none"} />
            <span>{likeCount}</span>
          </button>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {story.views} views
          </span>
        </div>
      </div>
    </div>
  );
}
