import ModalDialog from "../../components/ModalDialog";

export default function DeleteConfirmModal({
  isOpen,
  title = "Delete this item?",
  titleId,
  message = "This action cannot be undone.",
  onCancel,
  onConfirm,
  isBusy = false,
  confirmLabel = "Delete",
  busyLabel = "Deleting...",
}) {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={() => {
        if (isBusy) {
          return;
        }
        onCancel();
      }}
      title={title}
      titleId={titleId}
      closeLabel={`Close ${title.replace(/\?$/, "").toLowerCase()} dialog`}
      widthClassName="max-w-sm"
    >
      <div className="p-5">
        <p className="text-sm text-slate-500 mb-5">{message}</p>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-rose-500 text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          >
            {isBusy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
