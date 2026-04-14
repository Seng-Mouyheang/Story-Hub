import {
  BookOpenText,
  ChevronDown,
  MessageSquareLock,
  PenTool,
} from "lucide-react";
import {
  formatCount,
  formatDateOnly,
  formatUpdatedLabel,
  getStatusBadgeClasses,
  getVisibilityBadgeClasses,
} from "./dashboardUtils";

export default function RecentActivityTable({
  activities,
  isLoading,
  canLoadMore,
  isLoadingMore,
  loadMoreActivities,
}) {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <p className="text-slate-500 text-sm md:text-base font-medium">
          Loading your recent activity...
        </p>
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="bg-slate-100 p-6 rounded-full mb-6">
          <PenTool className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
        </div>
        <p className="text-slate-500 text-sm md:text-base font-medium">
          You have no activity yet. Publish your first post to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-245 border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
            <th className="px-4 sm:px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 bg-slate-50/95 backdrop-blur">
              Type
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 bg-slate-50/95 backdrop-blur">
              Title
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 bg-slate-50/95 backdrop-blur">
              Status
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 bg-slate-50/95 backdrop-blur">
              Visibility
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 bg-slate-50/95 backdrop-blur">
              Created
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 bg-slate-50/95 backdrop-blur">
              Updated
            </th>
            <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 text-right bg-slate-50/95 backdrop-blur">
              Likes
            </th>
            <th className="px-4 sm:px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 text-right bg-slate-50/95 backdrop-blur">
              Comments
            </th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr
              key={activity.id}
              className="border-b border-slate-100 last:border-b-0 cursor-pointer transition-all duration-200 hover:border-0 hover:-translate-y-0.5 hover:bg-rose-50/50"
            >
              <td className="px-4 sm:px-8 py-6">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {activity.type === "story" ? (
                    <BookOpenText size={13} />
                  ) : (
                    <MessageSquareLock size={13} />
                  )}
                  <span>
                    {activity.type === "story" ? "Story" : "Confession"}
                  </span>
                </div>
              </td>
              <td className="px-4 py-6">
                <p className="max-w-70 truncate text-sm font-medium text-slate-800">
                  {activity.title}
                </p>
              </td>
              <td className="px-4 py-6 align-top">
                <span
                  className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${getStatusBadgeClasses(
                    activity.status,
                  )}`}
                >
                  {activity.status || "N/A"}
                </span>
              </td>
              <td className="px-4 py-6 align-top">
                <span
                  className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${getVisibilityBadgeClasses(
                    activity.visibility,
                  )}`}
                >
                  {activity.visibility || "N/A"}
                </span>
              </td>
              <td className="px-4 py-6 text-xs text-slate-600 whitespace-nowrap">
                {formatDateOnly(activity.createdAt)}
              </td>
              <td className="px-4 py-6">
                <p className="text-xs text-slate-600 whitespace-nowrap">
                  {formatUpdatedLabel(activity.updatedAt)}
                </p>
              </td>
              <td className="px-4 py-6 text-right text-xs font-medium text-slate-600">
                {formatCount(activity.likesCount)}
              </td>
              <td className="px-4 sm:px-8 py-6 text-right text-xs font-medium text-slate-600">
                {formatCount(activity.commentCount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {canLoadMore && (
        <div className="flex items-center justify-center border-t border-slate-100 px-4 sm:px-8 py-6">
          <button
            onClick={loadMoreActivities}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 text-sm font-semibold text-rose-500 cursor-pointer transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? (
              "Loading..."
            ) : (
              <>
                Load More Stories
                <ChevronDown strokeWidth={2.5} size={16} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
