import { Link } from "react-router-dom";
import { Plus, User } from "lucide-react";

export default function StoryCircle({ name, authorId, isAdd = false, image }) {
  const content = (
    <>
      <div
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 ${
          isAdd ? "border-slate-300 border-dashed p-1" : "border-rose-300 p-1"
        } relative`}
      >
        <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
              <User size={30} />
            </div>
          )}
        </div>

        {isAdd && (
          <div className="absolute bottom-0 right-0 bg-slate-900 text-white rounded-full p-1 border-2 border-white shadow-sm">
            <Plus size={12} />
          </div>
        )}
      </div>

      <span className="block w-full max-w-16 sm:max-w-20 text-center text-[11px] sm:text-xs font-medium text-slate-700 truncate rounded-md px-1.5 py-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">
        {name}
      </span>
    </>
  );

  return (
    <div className="flex flex-col items-center gap-2 shrink-0 p-2 cursor-pointer group transition duration-300 ease-out hover:scale-[1.04]">
      {isAdd ? (
        content
      ) : (
        <Link
          to={authorId ? `/profile/${authorId}` : "/profile"}
          state={{ from: "/" }}
        >
          {content}
        </Link>
      )}
    </div>
  );
}
