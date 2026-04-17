import { Loader2, MoreHorizontal } from "lucide-react";

import { getRelativeTime, normalizeId } from "./confessionUtils";

/**
 * @typedef {Object} ConfessionComment
 * @property {string | object} [_id]
 * @property {string | object} [id]
 * @property {string | object} [userId]
 * @property {string} [authorDisplayName]
 * @property {string} [authorProfilePicture]
 * @property {string} [createdAt]
 * @property {string} [content]
 * @property {boolean} [isEdited]
 */

/**
 * @typedef {Object} ConfessionModalCommentItemProps
 * @property {ConfessionComment | null} [comment]
 * @property {string} [currentUserId]
 * @property {string} [activeCommentMenuId]
 * @property {string} [editingCommentId]
 * @property {string} [editCommentContent]
 * @property {boolean} [isSavingEditedComment]
 * @property {string} [deleteTargetCommentId]
 * @property {boolean} [isDeletingComment]
 * @property {(commentId: string) => void} onToggleMenu
 * @property {(comment: ConfessionComment | null) => void} onStartEdit
 * @property {(commentId: string) => void} onDelete
 * @property {() => void} onCancelEdit
 * @property {(value: string) => void} onEditContentChange
 * @property {() => void} onSaveEdit
 * @property {() => void} onCancelDelete
 * @property {() => void} onConfirmDelete
 */

/**
 * @param {ConfessionModalCommentItemProps} props
 */
export default function ConfessionModalCommentItem({
  comment = null,
  currentUserId = "",
  activeCommentMenuId = "",
  editingCommentId = "",
  editCommentContent = "",
  isSavingEditedComment = false,
  deleteTargetCommentId = "",
  isDeletingComment = false,
  onToggleMenu,
  onStartEdit,
  onDelete,
  onCancelEdit,
  onEditContentChange,
  onSaveEdit,
  onCancelDelete,
  onConfirmDelete,
}) {
  const commentId = String(comment?._id || comment?.id || "comment");
  const commentAuthor = comment?.authorDisplayName || "Anonymous";
  const canManageComment =
    Boolean(currentUserId) && normalizeId(comment?.userId) === currentUserId;
  const commentAvatarSrc =
    comment?.authorProfilePicture ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
      commentAuthor,
    )}`;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="mb-2 flex items-start gap-3">
        <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-200 shrink-0">
          <img
            src={commentAvatarSrc}
            alt="commenter avatar"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-700 truncate block">
                {commentAuthor}
              </span>
              <span className="text-[11px] text-slate-400 shrink-0 inline-flex items-center gap-1">
                <span>{getRelativeTime(comment?.createdAt)}</span>
                {comment?.isEdited ? <span>• Edited</span> : null}
              </span>
            </div>

            {canManageComment ? (
              <div className="relative" data-comment-menu>
                <button
                  type="button"
                  onClick={() => onToggleMenu(commentId)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                  aria-label="Comment actions"
                >
                  <MoreHorizontal size={16} />
                </button>

                {activeCommentMenuId === commentId && (
                  <div className="absolute right-0 top-8 w-28 rounded-xl border border-slate-200 bg-white shadow-lg py-1 overflow-hidden z-10">
                    <button
                      type="button"
                      onClick={() => onStartEdit(comment)}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(commentId)}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {editingCommentId === commentId ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editCommentContent}
                onChange={(event) => onEditContentChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-rose-300 resize-none"
                rows={3}
                placeholder="Edit your comment..."
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveEdit}
                  disabled={isSavingEditedComment}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSavingEditedComment ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {isSavingEditedComment ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">
              {comment?.content || "No comment content"}
            </p>
          )}

          {deleteTargetCommentId === commentId && (
            <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
              <p className="text-xs text-rose-700 mb-2">Delete this comment?</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onCancelDelete}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmDelete}
                  disabled={isDeletingComment}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isDeletingComment ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {isDeletingComment ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
