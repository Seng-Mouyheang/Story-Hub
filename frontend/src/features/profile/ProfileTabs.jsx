import ProfileStoryCard from "./ProfileStoryCard";

export default function ProfileTabs({
  tabs,
  activeTab,
  setActiveTab,
  isLoadingTabs,
  tabContent,
  emptyMessage,
}) {
  return (
    <div className="md:col-span-8">
      <div className="flex gap-4 sm:gap-8 border-b border-slate-200 mb-6 px-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold tracking-wide transition-colors relative ${
              activeTab === tab
                ? "text-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoadingTabs ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm text-sm text-slate-500">
            Loading {activeTab.toLowerCase()}...
          </div>
        ) : tabContent.length > 0 ? (
          tabContent.map((story) => (
            <ProfileStoryCard
              key={story.id}
              story={story}
              actionLabel={story.actionLabel}
              actionHref={story.actionHref}
            />
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
