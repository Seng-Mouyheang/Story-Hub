import PropTypes from "prop-types";
import { AlertTriangle, CheckCircle2, RefreshCcw, X } from "lucide-react";

const toastStyles = {
  border: {
    success: "border-emerald-200",
    error: "border-rose-200",
    info: "border-slate-200",
  },
  icon: {
    success: "text-emerald-500",
    error: "text-rose-500",
    info: "text-slate-500",
  },
  title: {
    success: "text-emerald-600",
    error: "text-rose-600",
    info: "text-slate-900",
  },
  progress: {
    success: "bg-emerald-500/70",
    error: "bg-rose-500/70",
    info: "bg-slate-900/70",
  },
};

const toastTitle = {
  success: "Success",
  error: "Error",
  info: "Feed updated",
};

const toastIcon = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: RefreshCcw,
};

export default function Toast({
  toast,
  isVisible,
  isPaused,
  onClose,
  onPause,
  onResume,
}) {
  if (!toast) {
    return null;
  }

  const action = toast.action;
  const ActionIcon = action?.icon;
  const Icon = toastIcon[toast.type] || RefreshCcw;
  const ariaLive = toast.type === "error" ? "assertive" : "polite";
  const role = toast.type === "error" ? "alert" : "status";

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-9999 w-[min(92vw,360px)]">
      <div
        className={`pointer-events-auto overflow-hidden rounded-2xl border bg-white/95 shadow-2xl backdrop-blur transition-all duration-200 ease-out ${
          isVisible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
        } ${toastStyles.border[toast.type]}`}
        role={role}
        aria-live={ariaLive}
      >
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={`mt-0.5 shrink-0 ${toastStyles.icon[toast.type]}`}
              >
                <Icon size={18} />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-[13px] font-semibold ${toastStyles.title[toast.type]}`}
                >
                  {toastTitle[toast.type]}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-slate-600 wrap-break-word">
                  {toast.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              onFocus={onPause}
              onBlur={onResume}
              className="shrink-0 rounded-full p-1 text-slate-400 cursor-pointer transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
          {action?.label && (
            <button
              type="button"
              onClick={action.onClick}
              onFocus={onPause}
              onBlur={onResume}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white cursor-pointer transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              aria-label={action.label}
            >
              {ActionIcon ? <ActionIcon size={12} /> : null}
              {action.label}
            </button>
          )}
        </div>
        <div className="h-1 overflow-hidden bg-slate-100">
          <div
            key={toast.id}
            className={`h-full origin-left ${toastStyles.progress[toast.type]}`}
            style={{
              animation: `toastCountDown 3200ms linear forwards`,
              animationPlayState: isPaused ? "paused" : "running",
            }}
          />
        </div>
      </div>
    </div>
  );
}

Toast.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(["success", "error", "info"]).isRequired,
    message: PropTypes.string.isRequired,
    action: PropTypes.shape({
      label: PropTypes.string,
      icon: PropTypes.elementType,
      onClick: PropTypes.func,
    }),
  }),
  isVisible: PropTypes.bool.isRequired,
  isPaused: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onPause: PropTypes.func.isRequired,
  onResume: PropTypes.func.isRequired,
};
