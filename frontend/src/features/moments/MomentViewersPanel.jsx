import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Eye, Heart, User, X } from "lucide-react";
import { formatCount, getRelativeTime } from "../../lib/format";

// Right-docked panel on sm:+ (mirrors MomentCommentPanel), bottom sheet on
// mobile. Author-only: lists who has viewed the current story, most recent
// first, with a heart badge for viewers who also liked it.
const MomentViewersPanel = ({
  isDimmed,
  isClosing,
  viewersState,
  totalCount,
  viewersListRef,
  viewersListSentinelRef,
  onClose,
}) => {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!viewersState) {
    return null;
  }

  const viewers = Array.isArray(viewersState.items) ? viewersState.items : [];
  const isEntered = entered && !isClosing;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-black/40 sm:bg-transparent sm:pointer-events-none"
      onClick={onClose}
    >
      <div
        className={`pointer-events-auto fixed inset-x-0 bottom-0 h-[75vh] rounded-t-2xl sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-1/2 sm:h-[90vh] sm:w-[440px] sm:rounded-2xl bg-white flex flex-col shadow-xl sm:border overflow-hidden transition-transform duration-300 ${
          isEntered ? "ease-out" : "ease-in"
        } ${isDimmed ? "sm:border-black/60" : "sm:border-slate-200"} ${
          isEntered
            ? "translate-y-0 sm:-translate-y-1/2 sm:translate-x-0"
            : "translate-y-full sm:-translate-y-1/2 sm:translate-x-full"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {isDimmed && (
          <div className="absolute -inset-px z-20 rounded-t-2xl sm:rounded-2xl bg-black/60" />
        )}

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Eye size={16} className="text-slate-500" />
            {totalCount > 0
              ? `${formatCount(totalCount)} ${totalCount === 1 ? "viewer" : "viewers"}`
              : "Viewers"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 cursor-pointer hover:text-slate-700"
            aria-label="Close viewers"
          >
            <X size={18} />
          </button>
        </div>

        <div
          ref={viewersListRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {viewersState.loading && viewers.length === 0 && (
            <div className="space-y-3">
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 animate-pulse"
                >
                  <div className="h-9 w-9 rounded-full bg-slate-200" />
                  <div className="h-3 w-1/3 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          )}

          {!viewersState.loading && viewersState.error && (
            <p className="text-xs text-rose-600">{viewersState.error}</p>
          )}

          {!viewersState.loading &&
            !viewersState.error &&
            viewers.length === 0 && (
              <p className="text-xs text-gray-500">
                No one has viewed this story yet.
              </p>
            )}

          {viewers.map((viewer) => (
            <div
              key={viewer.userId}
              className="flex items-center gap-3 py-2 rounded-xl hover:bg-slate-50 -mx-2 px-2"
            >
              <Link
                to={`/profile/${viewer.userId}`}
                className="w-9 h-9 shrink-0 rounded-full bg-slate-200 overflow-hidden block transition-all duration-150 hover:ring-2 hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                aria-label={`View ${viewer.displayName || "user"} profile`}
              >
                {viewer.profilePicture ? (
                  <img
                    src={viewer.profilePicture}
                    alt={viewer.displayName || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                    <User size={14} />
                  </div>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  to={`/profile/${viewer.userId}`}
                  className="text-sm font-medium text-slate-800 truncate block hover:underline"
                >
                  {viewer.displayName || "Anonymous"}
                </Link>
                <span className="text-[11px] text-slate-400">
                  {getRelativeTime(viewer.viewedAt)}
                </span>
              </div>

              {viewer.liked && (
                <Heart
                  size={16}
                  className="shrink-0 text-rose-500"
                  fill="currentColor"
                  aria-label="Liked this story"
                />
              )}
            </div>
          ))}

          <div ref={viewersListSentinelRef} className="h-1" />

          {viewersState.loadingMore && (
            <div className="text-center text-xs text-slate-500">
              Loading more viewers...
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default MomentViewersPanel;
