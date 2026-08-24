import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const PREFERRED_FOCUS_SELECTOR = [
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

const getFocusableElements = (container) => {
  if (!(container instanceof HTMLElement)) {
    return [];
  }

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element instanceof HTMLElement &&
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true",
  );
};

const moveFocusIntoDialog = (container) => {
  const preferredFocusableElement =
    container instanceof HTMLElement
      ? container.querySelector(PREFERRED_FOCUS_SELECTOR)
      : null;

  if (preferredFocusableElement instanceof HTMLElement) {
    preferredFocusableElement.focus();
    return;
  }

  if (container instanceof HTMLElement) {
    container.focus();
  }
};

export default function ModalDialog({
  isOpen,
  onClose,
  title,
  titleId,
  closeLabel,
  widthClassName = "max-w-xl",
  bare = false,
  backdropClassName = "bg-slate-900/40 backdrop-blur-[2px]",
  panelClassName,
  children,
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    requestAnimationFrame(() => {
      moveFocusIntoDialog(dialogRef.current);
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(dialogRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement =
        focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstFocusableElement) {
        event.preventDefault();
        lastFocusableElement.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className={`absolute inset-0 ${backdropClassName}`}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={
          panelClassName ||
          `relative z-10 w-full ${widthClassName} rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden`
        }
      >
        {!bare && (
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h4
              id={titleId}
              className="text-sm sm:text-base font-semibold text-slate-900 truncate pr-4"
            >
              {title}
            </h4>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label={closeLabel}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
