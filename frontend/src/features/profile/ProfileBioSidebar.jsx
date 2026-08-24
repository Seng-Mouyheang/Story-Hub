export default function ProfileBioSidebar({ userData }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-xs font-semibold text-slate-900 tracking-widest uppercase mb-4">
        Bio
      </h2>
      <p className="text-sm text-slate-600 italic leading-relaxed mb-8">
        {userData.bio}
      </p>

      <h2 className="text-xs font-semibold text-slate-500 tracking-widest uppercase mb-4">
        Preferred Genres
      </h2>
      <div className="flex flex-wrap gap-2">
        {userData.genres.map((genre) => (
          <span
            key={genre}
            className="px-3 py-1 bg-rose-500 text-white text-[10px] font-semibold rounded-full cursor-default"
          >
            {genre}
          </span>
        ))}
      </div>
    </div>
  );
}
