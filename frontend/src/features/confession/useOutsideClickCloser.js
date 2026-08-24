import React from "react";

export const useOutsideClickCloser = (isActive, onClose, containerSelector) => {
  React.useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(containerSelector)
      ) {
        return;
      }

      onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isActive, onClose, containerSelector]);
};
