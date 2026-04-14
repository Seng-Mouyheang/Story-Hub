export default function ActivityFiltersPanel({
  activityFilters,
  updateFilter,
  resetFilters,
  setShowFilters,
  filterPanelRef,
}) {
  return (
    <div
      ref={filterPanelRef}
      className="fixed inset-x-3 top-24 z-30 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl p-4 sm:absolute sm:right-4 sm:top-full sm:inset-x-auto sm:mt-2 sm:w-80 sm:max-h-[calc(100vh-12rem)]"
    >
      <h4 className="text-sm font-semibold text-slate-700 mb-3">
        Activity Filters
      </h4>

      <div className="space-y-3">
        <label
          htmlFor="dashboard-content-type"
          className="block text-xs font-medium text-slate-500 uppercase tracking-wide"
        >
          Content Type
        </label>
        <select
          id="dashboard-content-type"
          value={activityFilters.contentType}
          onChange={(event) => updateFilter("contentType", event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
        >
          <option value="all">All (Stories & Confessions)</option>
          <option value="story">Stories only</option>
          <option value="confession">Confessions only</option>
        </select>

        <label
          htmlFor="dashboard-sort-by"
          className="block text-xs font-medium text-slate-500 uppercase tracking-wide"
        >
          Sort By
        </label>
        <select
          id="dashboard-sort-by"
          value={activityFilters.sortBy}
          onChange={(event) => updateFilter("sortBy", event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
        >
          <option value="default">All</option>
          <option value="likes">Most Likes</option>
          <option value="comments">Most Comments</option>
        </select>

        <label
          htmlFor="dashboard-sort-order"
          className="block text-xs font-medium text-slate-500 uppercase tracking-wide"
        >
          Sort Order
        </label>
        <select
          id="dashboard-sort-order"
          value={activityFilters.order}
          onChange={(event) => updateFilter("order", event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
        >
          <option value="desc">Latest</option>
          <option value="asc">Oldest</option>
        </select>

        <label
          htmlFor="dashboard-story-status"
          className="block text-xs font-medium text-slate-500 uppercase tracking-wide"
        >
          Story Status
        </label>
        <select
          id="dashboard-story-status"
          value={activityFilters.storyStatus}
          onChange={(event) => updateFilter("storyStatus", event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
          disabled={activityFilters.contentType === "confession"}
        >
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="deleted">Deleted</option>
        </select>

        <label
          htmlFor="dashboard-story-visibility"
          className="block text-xs font-medium text-slate-500 uppercase tracking-wide"
        >
          Story Visibility
        </label>
        <select
          id="dashboard-story-visibility"
          value={activityFilters.storyVisibility}
          onChange={(event) =>
            updateFilter("storyVisibility", event.target.value)
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
          disabled={activityFilters.contentType === "confession"}
        >
          <option value="all">All</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={resetFilters}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          Reset
        </button>
        <button
          onClick={() => setShowFilters(false)}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Done
        </button>
      </div>
    </div>
  );
}
