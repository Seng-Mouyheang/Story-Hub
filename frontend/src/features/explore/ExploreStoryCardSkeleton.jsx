export default function ExploreStoryCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm animate-pulse">
      <div className="h-3 w-20 bg-slate-200 rounded-full mb-4" />
      <div className="h-5 w-3/4 bg-slate-200 rounded-lg mb-2" />
      <div className="h-3 w-1/3 bg-slate-200 rounded-full mb-4" />
      <div className="space-y-2 mb-6">
        <div className="h-3 w-full bg-slate-200 rounded-full" />
        <div className="h-3 w-full bg-slate-200 rounded-full" />
        <div className="h-3 w-2/3 bg-slate-200 rounded-full" />
      </div>
      <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
        <div className="h-3 w-10 bg-slate-200 rounded-full" />
        <div className="h-3 w-14 bg-slate-200 rounded-full" />
      </div>
    </div>
  );
}
