export default function StatsCard({ title, value, subtitle }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between min-h-40 shadow-sm">
      <div>
        <h2 className="text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase">
          {title}
        </h2>
        <div className="mt-4 text-5xl sm:text-[64px] leading-tight font-light text-rose-500">
          {value}
        </div>
      </div>
      <div className="text-xs text-slate-400 font-medium tracking-tight">
        {subtitle}
      </div>
    </div>
  );
}
