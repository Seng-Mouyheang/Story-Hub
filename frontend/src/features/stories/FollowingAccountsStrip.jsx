import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import StoryCircle from "./StoryCircle";

export default function FollowingAccountsStrip({ accounts, isLoading }) {
  return (
    <section className="bg-white/95 border border-slate-200 rounded-xl lg:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-sm transition-all duration-300 hover:shadow-md">
      <h2 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6 px-1 sm:px-2 text-slate-900">
        Following accounts
      </h2>

      <div className="flex md:gap-2 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {isLoading ? (
          <div className="flex gap-4 sm:gap-5">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="snap-start flex flex-col items-center gap-2 shrink-0 animate-pulse"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200" />
                <div className="h-3 w-12 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ) : accounts.length > 0 ? (
          accounts.map((account, i) => (
            <div key={i} className="snap-start">
              <StoryCircle {...account} />
            </div>
          ))
        ) : (
          <Link
            to="/explore"
            className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group transition duration-300 ease-out hover:scale-[1.04]"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-slate-300 border-dashed p-1 relative bg-slate-50/80">
              <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-400">
                <Plus size={20} />
              </div>
            </div>
            <span className="text-[11px] mx-auto sm:text-xs font-medium text-slate-700 whitespace-nowrap rounded-md px-1.5 py-0.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
              Add
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
