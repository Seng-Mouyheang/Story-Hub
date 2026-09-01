import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AlertTriangle, Heart, MoreHorizontal, User, X } from "lucide-react";
import {
  formatCount,
  getRelativeTime,
  normalizeId,
  createEmptyRepliesState,
} from "../../lib/format";

const COMMENT_CHARACTER_LIMIT = 2200;

// Right-docked panel on sm:+ (YouTube Reels style), bottom sheet on mobile.
const MomentCommentPanel = ({
  momentId,
  commentsDisabled,
  isDimmed,
  isClosing,
  commentState,
  activeMenuCommentId,
  currentUserId,
  commentActionFeedback,
  pendingCommentLikeIds,
  commentLikePulseIds,
  commentListRef,
  commentListSentinelRef,
  commentInputRef,
  onClose,
  onToggleCommentLike,
  onToggleCommentMenu,
  onEditComment,
  onDeleteComment,
  onStartReply,
  onToggleReplies,
  onLoadMoreReplies,
  onCancelCommentComposer,
  onCommentInputChange,
  onSubmitComment,
}) => {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!momentId || !commentState) {
    return null;
  }

  const comments = Array.isArray(commentState.items) ? commentState.items : [];
  const isEditMode = Boolean(commentState.editingCommentId);
  const hasInputChanged =
    commentState.input?.trim() !== (commentState.originalInput || "").trim();
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
          <h3 className="font-semibold text-slate-900">Comments</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 cursor-pointer hover:text-slate-700"
            aria-label="Close comments"
          >
            <X size={18} />
          </button>
        </div>

        <div
          ref={commentListRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {commentState.loading && comments.length > 0 && (
            <p className="text-xs text-slate-500">Loading comments...</p>
          )}

          {commentState.loading && comments.length === 0 && (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="rounded-xl bg-slate-100 p-3 space-y-3 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-1/3 rounded-full bg-slate-200" />
                      <div className="h-2 w-1/4 rounded-full bg-slate-200" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 rounded-full bg-slate-200" />
                    <div className="h-3 rounded-full bg-slate-200 w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!commentState.loading && commentState.error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm shadow-rose-100 ring-1 ring-rose-100">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0 text-rose-500">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <p className="font-semibold text-rose-700">Comment error</p>
                  <p className="text-[11px] text-rose-600 mt-1">
                    {commentState.error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!commentState.loading &&
            !commentState.error &&
            comments.length === 0 && (
              <p className="text-xs text-gray-500">
                No comments yet. Be the first to comment.
              </p>
            )}

          {comments.map((comment) => {
            const commentId = String(comment._id || comment.id || "");
            const commentOwnerId = normalizeId(comment.userId);
            const canManageComment =
              Boolean(currentUserId) && commentOwnerId === currentUserId;
            const isCommentLikePending = Boolean(
              pendingCommentLikeIds[commentId],
            );
            const commentLikesCount = Number(comment?.likesCount || 0);
            const replyCount = Number(comment?.replyCount || 0);
            const replyState =
              commentState.repliesByComment?.[commentId] ||
              createEmptyRepliesState();

            return (
              <div key={commentId} className="rounded-xl bg-gray-50 px-3 py-2">
                <div className="flex items-start gap-3">
                  {commentOwnerId ? (
                    <Link
                      to={`/profile/${commentOwnerId}`}
                      className="w-8 h-8 shrink-0 rounded-full bg-slate-200 overflow-hidden block transition-all duration-150 hover:ring-2 hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                      aria-label={`View ${comment.authorDisplayName || "user"} profile`}
                    >
                      {comment.authorProfilePicture ? (
                        <img
                          src={comment.authorProfilePicture}
                          alt={comment.authorDisplayName || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                          <User size={14} />
                        </div>
                      )}
                    </Link>
                  ) : (
                    <div className="w-8 h-8 shrink-0 rounded-full bg-slate-200 overflow-hidden">
                      {comment.authorProfilePicture ? (
                        <img
                          src={comment.authorProfilePicture}
                          alt={comment.authorDisplayName || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                          <User size={14} />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {commentOwnerId ? (
                          <Link
                            to={`/profile/${commentOwnerId}`}
                            className="text-xs font-semibold text-slate-700 truncate block rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                          >
                            {comment.authorDisplayName || "Anonymous"}
                          </Link>
                        ) : (
                          <span className="text-xs font-semibold text-slate-700 truncate block">
                            {comment.authorDisplayName || "Anonymous"}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 shrink-0 inline-flex items-center gap-1">
                          <span>{getRelativeTime(comment?.createdAt)}</span>
                          {comment?.isEdited ? <span>• Edited</span> : null}
                        </span>
                      </div>

                      {canManageComment ? (
                        <div className="relative shrink-0" data-comment-menu>
                          <button
                            type="button"
                            onClick={() => onToggleCommentMenu(commentId)}
                            className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors duration-200"
                            aria-label="Comment actions"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {activeMenuCommentId === commentId && (
                            <div className="absolute right-0 top-6 z-10 w-28 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                              <button
                                type="button"
                                onClick={() => onEditComment(momentId, comment)}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onDeleteComment(momentId, commentId)
                                }
                                className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 cursor-pointer hover:bg-rose-50"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">
                      {comment?.content || "No comment content"}
                    </p>

                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleCommentLike(momentId, commentId)}
                        className={`inline-flex items-center cursor-pointer gap-1.5 rounded-full py-1 text-xs font-medium transition-transform duration-200 ease-out ${
                          comment?.likedByCurrentUser
                            ? "text-rose-600"
                            : "text-slate-500 hover:text-rose-500"
                        } ${
                          isCommentLikePending
                            ? "scale-110"
                            : commentLikePulseIds[commentId]
                              ? "scale-110"
                              : "scale-100"
                        }`}
                        aria-label={
                          comment?.likedByCurrentUser
                            ? "Unlike comment"
                            : "Like comment"
                        }
                      >
                        <Heart
                          size={14}
                          fill={
                            comment?.likedByCurrentUser
                              ? "currentColor"
                              : "none"
                          }
                        />
                        <span>{formatCount(commentLikesCount)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartReply(momentId, comment)}
                        className="text-xs font-medium text-slate-500 cursor-pointer transition-colors hover:text-slate-700"
                      >
                        Reply
                      </button>
                      {replyCount > 0 && (
                        <button
                          type="button"
                          onClick={() => onToggleReplies(commentId)}
                          className="text-xs font-medium text-slate-500 cursor-pointer transition-colors hover:text-slate-700"
                        >
                          {replyState.open
                            ? `Hide replies (${formatCount(replyCount)})`
                            : `View replies (${formatCount(replyCount)})`}
                        </button>
                      )}
                    </div>

                    {commentActionFeedback[commentId] && (
                      <p
                        className={`text-[11px] mt-1 ${
                          commentActionFeedback[commentId]?.startsWith("Failed")
                            ? "text-rose-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {commentActionFeedback[commentId]}
                      </p>
                    )}

                    {replyState.open && (
                      <div className="mt-3 space-y-2 border-l border-slate-200 pl-3">
                        {replyState.loading &&
                          replyState.items.length === 0 && (
                            <p className="text-[11px] text-slate-500">
                              Loading replies...
                            </p>
                          )}

                        {replyState.loadingMore && (
                          <p className="text-[11px] text-slate-500">
                            Loading more replies...
                          </p>
                        )}

                        {!replyState.loading && replyState.error && (
                          <p className="text-[11px] text-rose-500">
                            {replyState.error}
                          </p>
                        )}

                        {(replyState.items || []).map((reply) => {
                          const replyId = String(reply._id || reply.id || "");
                          const replyOwnerId = normalizeId(reply?.userId);
                          const canManageReply =
                            Boolean(currentUserId) &&
                            replyOwnerId === currentUserId;
                          const isReplyLikePending = Boolean(
                            pendingCommentLikeIds[replyId],
                          );

                          return (
                            <div
                              key={replyId}
                              className="rounded-xl bg-white px-3 py-2"
                            >
                              <div className="flex items-start gap-3">
                                {replyOwnerId ? (
                                  <Link
                                    to={`/profile/${replyOwnerId}`}
                                    className="w-7 h-7 shrink-0 rounded-full bg-slate-200 overflow-hidden block transition-all duration-150 hover:ring-2 hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                                    aria-label={`View ${reply.authorDisplayName || "user"} profile`}
                                  >
                                    {reply.authorProfilePicture ? (
                                      <img
                                        src={reply.authorProfilePicture}
                                        alt={reply.authorDisplayName || "User"}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                        <User size={12} />
                                      </div>
                                    )}
                                  </Link>
                                ) : (
                                  <div className="w-7 h-7 shrink-0 rounded-full bg-slate-200 overflow-hidden">
                                    {reply.authorProfilePicture ? (
                                      <img
                                        src={reply.authorProfilePicture}
                                        alt={reply.authorDisplayName || "User"}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                        <User size={12} />
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      {replyOwnerId ? (
                                        <Link
                                          to={`/profile/${replyOwnerId}`}
                                          className="text-xs font-semibold text-slate-700 truncate block rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                                        >
                                          {reply.authorDisplayName ||
                                            "Anonymous"}
                                        </Link>
                                      ) : (
                                        <span className="text-xs font-semibold text-slate-700 truncate block">
                                          {reply.authorDisplayName ||
                                            "Anonymous"}
                                        </span>
                                      )}
                                      <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                                        <span>
                                          {getRelativeTime(reply?.createdAt)}
                                        </span>
                                        {reply?.isEdited ? (
                                          <span>• Edited</span>
                                        ) : null}
                                      </span>
                                    </div>

                                    {canManageReply ? (
                                      <div
                                        className="relative shrink-0"
                                        data-comment-menu
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onToggleCommentMenu(replyId)
                                          }
                                          className="text-slate-400 cursor-pointer hover:text-slate-600 transition-colors duration-200"
                                          aria-label="Reply actions"
                                        >
                                          <MoreHorizontal size={14} />
                                        </button>

                                        {activeMenuCommentId === replyId && (
                                          <div className="absolute right-0 top-6 z-10 w-28 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                onEditComment(momentId, reply)
                                              }
                                              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                onDeleteComment(
                                                  momentId,
                                                  replyId,
                                                )
                                              }
                                              className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 cursor-pointer hover:bg-rose-50"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ) : null}
                                  </div>

                                  <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                                    {reply?.content || "No reply content"}
                                  </p>

                                  <div className="mt-2 flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onToggleCommentLike(momentId, replyId)
                                      }
                                      className={`inline-flex items-center cursor-pointer gap-1.5 rounded-full py-1 text-xs font-medium transition-transform duration-200 ease-out ${
                                        reply?.likedByCurrentUser
                                          ? "text-rose-600"
                                          : "text-slate-500 hover:text-rose-500"
                                      } ${
                                        isReplyLikePending
                                          ? "scale-110"
                                          : commentLikePulseIds[replyId]
                                            ? "scale-110"
                                            : "scale-100"
                                      }`}
                                      aria-label={
                                        reply?.likedByCurrentUser
                                          ? "Unlike reply"
                                          : "Like reply"
                                      }
                                    >
                                      <Heart
                                        size={14}
                                        fill={
                                          reply?.likedByCurrentUser
                                            ? "currentColor"
                                            : "none"
                                        }
                                      />
                                      <span>
                                        {formatCount(
                                          Number(reply?.likesCount || 0),
                                        )}
                                      </span>
                                    </button>
                                  </div>

                                  {commentActionFeedback[replyId] && (
                                    <p
                                      className={`text-[11px] mt-1 ${
                                        commentActionFeedback[
                                          replyId
                                        ]?.startsWith("Failed")
                                          ? "text-rose-600"
                                          : "text-emerald-600"
                                      }`}
                                    >
                                      {commentActionFeedback[replyId]}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {replyState.hasMore && (
                          <button
                            type="button"
                            onClick={() => onLoadMoreReplies(commentId)}
                            className="text-xs font-semibold text-rose-600 cursor-pointer hover:text-rose-700"
                          >
                            View replies (
                            {formatCount(
                              Math.max(
                                0,
                                replyCount - (replyState.items || []).length,
                              ),
                            )}
                            )
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div ref={commentListSentinelRef} className="h-1" />

          {commentState.loadingMore && (
            <div className="text-center text-xs text-slate-500">
              Loading more comments...
            </div>
          )}
        </div>

        {commentsDisabled && !commentState.editingCommentId ? (
          <div className="px-5 py-4 border-t border-slate-100 shrink-0 text-center text-sm text-slate-400">
            Comments are off for this story.
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSubmitComment(momentId);
            }}
            className="px-5 py-4 border-t border-slate-100 shrink-0"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                {commentState.editingCommentId && (
                  <p className="text-xs text-sky-600 whitespace-nowrap">
                    Editing comment
                  </p>
                )}
                {!commentState.editingCommentId &&
                  commentState.replyingToCommentId && (
                    <p className="text-xs text-rose-600 whitespace-nowrap">
                      Replying to {commentState.replyingToAuthor || "user"}
                    </p>
                  )}
                {!commentState.editingCommentId &&
                  !commentState.replyingToCommentId &&
                  commentState.input.length === COMMENT_CHARACTER_LIMIT && (
                    <p className="text-xs text-rose-500">
                      Comments can't be over {COMMENT_CHARACTER_LIMIT}{" "}
                      characters.
                    </p>
                  )}
              </div>
              {commentState.input?.length > 0 && (
                <p
                  className={`shrink-0 text-[11px] font-medium ${
                    commentState.input.length >= COMMENT_CHARACTER_LIMIT * 0.9
                      ? "text-rose-600"
                      : "text-slate-400"
                  }`}
                >
                  {commentState.input.length}/{COMMENT_CHARACTER_LIMIT}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <textarea
                ref={commentInputRef}
                rows={1}
                maxLength={COMMENT_CHARACTER_LIMIT}
                value={commentState.input || ""}
                onChange={(event) => {
                  if (event.target) {
                    event.target.style.height = "auto";
                    event.target.style.height = `${event.target.scrollHeight}px`;
                  }
                  onCommentInputChange(event.target.value);
                }}
                placeholder={
                  commentState.editingCommentId
                    ? "Edit your comment..."
                    : commentState.replyingToCommentId
                      ? `Write a reply to ${commentState.replyingToAuthor || "this comment"}...`
                      : "Write a comment..."
                }
                className={`flex-1 ${
                  commentState.editingCommentId ? "min-h-18" : "min-h-10"
                } max-h-40 overflow-y-auto rounded-xl border border-slate-200 pl-5 pr-2 py-2 text-sm outline-none focus:border-rose-300 custom-scrollbar`}
              />
              <div className="flex flex-col items-end gap-2">
                {(commentState.editingCommentId ||
                  commentState.replyingToCommentId) && (
                  <button
                    type="button"
                    onClick={onCancelCommentComposer}
                    className="rounded-xl border border-slate-200 text-slate-600 px-3 py-2 text-xs cursor-pointer font-semibold"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={
                    commentState.submitting ||
                    !commentState.input?.trim() ||
                    (isEditMode && !hasInputChanged)
                  }
                  className="rounded-xl bg-rose-500 text-white px-3 py-2 text-xs font-semibold cursor-pointer disabled:bg-rose-300 disabled:text-white disabled:cursor-not-allowed"
                >
                  {commentState.submitting
                    ? commentState.editingCommentId
                      ? "Updating..."
                      : commentState.replyingToCommentId
                        ? "Replying..."
                        : "Posting..."
                    : commentState.editingCommentId
                      ? "Update"
                      : commentState.replyingToCommentId
                        ? "Reply"
                        : "Post"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default MomentCommentPanel;
