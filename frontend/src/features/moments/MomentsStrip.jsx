import MomentCircle from "./MomentCircle";
import YourMomentCircle from "./YourMomentCircle";

export default function MomentsStrip({
  momentGroups,
  isLoading,
  currentUserId,
  currentUserImage,
  onOpenComposer,
  onOpenViewer,
}) {
  const ownGroup = momentGroups.find(
    (group) => group.authorId === currentUserId,
  );
  const otherGroups = momentGroups.filter(
    (group) => group.authorId !== currentUserId,
  );

  return (
    <section className="bg-white/95 border border-slate-200 rounded-xl lg:rounded-3xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-sm transition-all duration-300 hover:shadow-md">
      <h2 className="text-xl sm:text-2xl font-semibold mb-5 sm:mb-6 px-1 sm:px-2 text-slate-900">
        Stories
      </h2>

      <div className="flex md:gap-2 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {isLoading ? (
          <div className="flex gap-4 sm:gap-5">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="snap-start flex flex-col items-center gap-2 shrink-0 animate-pulse"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200" />
                <div className="h-3 w-12 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="snap-start">
              <YourMomentCircle
                image={currentUserImage}
                hasActiveMoments={Boolean(ownGroup)}
                hasUnseen={Boolean(ownGroup?.hasUnseen)}
                onOpenComposer={onOpenComposer}
                onOpenViewer={() => ownGroup && onOpenViewer(ownGroup.authorId)}
              />
            </div>

            {otherGroups.map((group) => (
              <div key={group.authorId} className="snap-start">
                <MomentCircle
                  name={group.name}
                  image={group.image}
                  hasUnseen={group.hasUnseen}
                  onClick={() => onOpenViewer(group.authorId)}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
