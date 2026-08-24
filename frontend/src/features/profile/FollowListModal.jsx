import { Link } from "react-router-dom";
import { User } from "lucide-react";
import ModalDialog from "../../components/ModalDialog";
import { normalizeId } from "../../lib/format";

export default function FollowListModal({
  isOpen,
  listType,
  items,
  hasMore,
  isLoading,
  error,
  busyByUserId,
  onClose,
  onToggleFollow,
  onLoadMore,
}) {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={listType === "followers" ? "Followers" : "Following"}
      titleId="profile-follow-list-title"
      closeLabel="Close"
      widthClassName="max-w-md"
    >
      <div className="max-h-[70vh] overflow-y-auto px-3 sm:px-4 py-2 space-y-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {isLoading && items.length === 0 ? (
          <p className="text-sm text-slate-500 px-2 py-3">Loading list...</p>
        ) : error ? (
          <p className="text-sm text-rose-600 px-2 py-3">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500 px-2 py-3">
            No users found in this list yet.
          </p>
        ) : (
          items.map((account) => {
            const isBusy = Boolean(busyByUserId[normalizeId(account.userId)]);

            return (
              <div
                key={account.userId}
                className="flex items-center justify-between gap-3 rounded-xl px-2 sm:px-1 py-2"
              >
                <Link
                  to={`/profile/${account.userId}`}
                  state={{ from: "/profile" }}
                  onClick={onClose}
                  className="min-w-0 flex items-center gap-3 flex-1"
                >
                  <div className="h-11 w-11 rounded-full overflow-hidden bg-slate-100 shrink-0">
                    {account.avatar ? (
                      <img
                        src={account.avatar}
                        alt={account.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-300">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 leading-tight">
                      {account.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {account.handle}
                    </p>
                  </div>
                </Link>

                {account.isSelf ? null : (
                  <button
                    type="button"
                    onClick={() => onToggleFollow(account.userId)}
                    disabled={isBusy}
                    className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      account.following
                        ? "border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
                        : "bg-rose-500 text-white hover:bg-rose-600"
                    } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {isBusy
                      ? "Loading..."
                      : account.following
                        ? "Following"
                        : "Follow"}
                  </button>
                )}
              </div>
            );
          })
        )}

        {hasMore ? (
          <div className="pt-2 px-1 pb-2">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Loading..." : "Load more"}
            </button>
          </div>
        ) : null}
      </div>
    </ModalDialog>
  );
}
