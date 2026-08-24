import DeleteConfirmModal from "../stories/DeleteConfirmModal";

export default function ConfessionDeleteDialog({
  isOpen,
  titleId,
  isDeleting,
  onCancel,
  onConfirm,
}) {
  return (
    <DeleteConfirmModal
      isOpen={isOpen}
      title="Delete this confession?"
      titleId={titleId}
      onCancel={onCancel}
      onConfirm={onConfirm}
      isBusy={isDeleting}
    />
  );
}
