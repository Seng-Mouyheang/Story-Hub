import { X } from "lucide-react";
import ModalDialog from "../../components/ModalDialog";

export default function ProfileImagePreviewModal({ image, isOpen, onClose }) {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="profile-image-preview-title"
      closeLabel="Close image preview"
      bare
      backdropClassName="bg-slate-950/80 backdrop-blur-sm"
      panelClassName={`relative z-10 w-full ${
        image?.kind === "cover" ? "max-w-[min(96vw,1600px)]" : "max-w-3xl"
      }`}
    >
      {image ? (
        <>
          <button
            type="button"
            onClick={onClose}
            className="fixed right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white/85 backdrop-blur-sm transition-all duration-200 ease-out hover:bg-black/65 hover:text-white sm:right-6 sm:top-6 cursor-pointer"
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative flex items-center justify-center">
            <img
              src={image.src}
              alt={image.alt}
              className={`max-h-[85vh] rounded-3xl object-contain shadow-[0_20px_80px_rgba(0,0,0,0.5)] ${
                image.kind === "cover" ? "w-full" : "w-auto max-w-full"
              }`}
            />
          </div>
        </>
      ) : null}
    </ModalDialog>
  );
}
