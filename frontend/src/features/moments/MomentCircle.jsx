import { User } from "lucide-react";

export default function MomentCircle({ name, image, hasUnseen, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 shrink-0 p-2 cursor-pointer group transition-transform duration-300 ease-out hover:scale-[1.04] active:scale-95 active:duration-100"
    >
      <div
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2px] transition-colors duration-300 ${
          hasUnseen
            ? "bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400"
            : "bg-slate-200"
        }`}
      >
        <div className="w-full h-full rounded-full bg-white p-[2px]">
          <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
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
        </div>
      </div>

      <span className="block w-full max-w-16 sm:max-w-20 text-center text-[11px] sm:text-xs font-medium text-slate-700 truncate rounded-md px-1.5 py-1.5 -my-0.5 transition-colors duration-150 hover:bg-slate-100">
        {name}
      </span>
    </button>
  );
}
