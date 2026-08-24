import { User } from "lucide-react";
import AuthorRow from "./AuthorRow";

export default function TopAuthorsSidebar({
  topAuthors,
  topAuthorsLoading,
  topAuthorsError,
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
          {topAuthorsLoading ? (
            <div className="text-sm text-slate-500 py-3">
              Loading top authors...
            </div>
          ) : topAuthorsError ? (
            <div className="text-sm text-rose-600 py-3">{topAuthorsError}</div>
          ) : topAuthors.length === 0 ? (
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
          ) : (
            topAuthors.map((author) => (
              <AuthorRow
                key={author.authorId}
                {...author}
                isFollowing={Boolean(followStateByUserId[author.authorId])}
                isBusy={Boolean(busyFollowIds[author.authorId])}
                onToggleFollow={() => onToggleFollow(author.authorId)}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
