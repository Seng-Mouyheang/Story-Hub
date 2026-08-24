import { User } from "lucide-react";
import AuthorRow from "./AuthorRow";

export default function ExploreTopAuthorsSidebar({
  authorsLoading,
  authorsError,
  resolvedAuthors,
  topAuthorsCount,
  followStateByUserId,
  busyFollowIds,
  onToggleFollow,
}) {
  return (
    <aside className="hidden lg:block w-64 shrink-0 h-full">
      <div className="sticky top-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-slate-900">
          Top Authors
        </h2>

        <div className="space-y-2">
          {authorsLoading ? (
            <div className="space-y-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 py-3 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-24 bg-slate-200 rounded-full" />
                      <div className="h-2.5 w-16 bg-slate-200 rounded-full" />
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-slate-200 rounded-full" />
                </div>
              ))}
            </div>
          ) : null}

          {!authorsLoading && authorsError ? (
            <p className="text-xs text-rose-500">{authorsError}</p>
          ) : null}

          {!authorsLoading && !authorsError && resolvedAuthors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-rose-50/60 px-4 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-rose-500 shadow-sm ring-1 ring-rose-100">
                  <User size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    No author recommendations at the moment!
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Add more genre to your interests or like more author's
                    stories to help them surface in the top-author list here!
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {!authorsLoading &&
            !authorsError &&
            resolvedAuthors.slice(0, topAuthorsCount).map((author) => (
              <AuthorRow
                key={author.userId || author.displayName}
                userId={author.userId}
                name={author.displayName}
                role={author.role}
                avatar={author.avatar}
                isFollowing={Boolean(followStateByUserId[author.userId])}
                isBusy={Boolean(busyFollowIds[author.userId])}
                onToggleFollow={() => onToggleFollow(author.userId)}
              />
            ))}
        </div>
      </div>
    </aside>
  );
}
