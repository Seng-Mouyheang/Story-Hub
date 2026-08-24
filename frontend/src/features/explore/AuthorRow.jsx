import { Link } from "react-router-dom";
import { User } from "lucide-react";

export default function AuthorRow({
  userId,
  name,
  role,
  avatar,
  isFollowing,
  isBusy,
  onToggleFollow,
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to={userId ? `/profile/${userId}` : "/profile"}
          state={{ from: "/explore" }}
          className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 transition-all duration-150 hover:ring-2 hover:ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          aria-label={`View ${name} profile`}
        >
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-4 h-4 text-slate-400" />
          )}
        </Link>

        <div className="min-w-0">
          <Link
            to={userId ? `/profile/${userId}` : "/profile"}
            state={{ from: "/explore" }}
            className="font-semibold text-sm text-slate-900 truncate rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            {name}
          </Link>
          <p className="text-[10px] text-rose-500 font-medium">{role}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleFollow}
        disabled={isBusy}
        className={`text-[10px] font-semibold px-3 sm:px-4 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap ${
          isFollowing
            ? "border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
            : "bg-rose-500 hover:bg-rose-600 text-white"
        } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
    </div>
  );
}
