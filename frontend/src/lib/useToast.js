import { useCallback, useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 3200;
const TOAST_EXIT_MS = 220;
const VALID_TOAST_TYPES = new Set(["success", "error", "info"]);

export function useToast({
  duration = TOAST_DURATION_MS,
  exitDuration = TOAST_EXIT_MS,
} = {}) {
  const [toast, setToast] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const hideTimeoutRef = useRef(null);
  const exitTimeoutRef = useRef(null);
  const remainingRef = useRef(duration);
  const deadlineRef = useRef(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const clearExitTimeout = useCallback(() => {
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    setIsVisible(false);
    clearHideTimeout();

    clearExitTimeout();
    exitTimeoutRef.current = setTimeout(() => {
      setToast(null);
      exitTimeoutRef.current = null;
    }, exitDuration);
  }, [clearExitTimeout, clearHideTimeout, exitDuration]);

  const scheduleHide = useCallback(
    (delay) => {
      clearHideTimeout();
      if (delay <= 0) {
        hideToast();
        return;
      }

      deadlineRef.current = Date.now() + delay;
      hideTimeoutRef.current = setTimeout(() => {
        hideTimeoutRef.current = null;
        hideToast();
      }, delay);
    },
    [clearHideTimeout, hideToast],
  );

  const pauseToast = useCallback(() => {
    if (!toast || !isVisible || isPaused) {
      return;
    }

    clearHideTimeout();
    const remaining = Math.max(0, (deadlineRef.current || 0) - Date.now());
    remainingRef.current = remaining;
    setIsPaused(true);
  }, [clearHideTimeout, isPaused, isVisible, toast]);

  const resumeToast = useCallback(() => {
    if (!toast || !isVisible || !isPaused) {
      return;
    }

    setIsPaused(false);
    scheduleHide(remainingRef.current);
  }, [isPaused, isVisible, scheduleHide, toast]);

  const showToast = useCallback(
    (message, type = "info", options = {}) => {
      if (!message) {
        return;
      }

      if (!VALID_TOAST_TYPES.has(type)) {
        type = "info";
      }

      clearHideTimeout();
      clearExitTimeout();
      remainingRef.current = duration;

      setToast({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        message,
        ...options,
      });
      setIsPaused(false);
      setIsVisible(false);

      requestAnimationFrame(() => {
        setIsVisible(true);
      });

      scheduleHide(duration);
    },
    [clearExitTimeout, clearHideTimeout, duration, scheduleHide],
  );

  useEffect(
    () => () => {
      clearHideTimeout();
      clearExitTimeout();
    },
    [clearExitTimeout, clearHideTimeout],
  );

  return {
    toast,
    isVisible,
    isPaused,
    duration,
    showToast,
    hideToast,
    pauseToast,
    resumeToast,
  };
}
