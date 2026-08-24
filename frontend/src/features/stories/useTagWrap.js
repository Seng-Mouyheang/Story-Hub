import { useEffect, useRef, useState } from "react";

export default function useTagWrap(tags) {
  const [areTagsWrapped, setAreTagsWrapped] = useState(false);
  const [firstRowTagCount, setFirstRowTagCount] = useState(4);
  const tagMeasurementRef = useRef(null);

  useEffect(() => {
    const measurementElement = tagMeasurementRef.current;

    if (!measurementElement) {
      return undefined;
    }

    const updateTagWrapState = () => {
      const tagElements = Array.from(
        measurementElement.querySelectorAll('[data-tag-chip="true"]'),
      );

      if (tagElements.length === 0) {
        setAreTagsWrapped(false);
        setFirstRowTagCount(4);
        return;
      }

      const firstRowTop = tagElements[0].offsetTop;
      const calculatedFirstRowCount = tagElements.filter(
        (tagElement) => tagElement.offsetTop <= firstRowTop + 1,
      ).length;
      const safeFirstRowCount = Math.max(calculatedFirstRowCount, 1);

      setFirstRowTagCount(safeFirstRowCount);
      setAreTagsWrapped(safeFirstRowCount < tagElements.length);
    };

    const frameId = requestAnimationFrame(() => {
      updateTagWrapState();
    });

    if (typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(frameId);
    }

    const observer = new ResizeObserver(() => {
      updateTagWrapState();
    });

    observer.observe(measurementElement);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [tags]);

  return { tagMeasurementRef, areTagsWrapped, firstRowTagCount };
}
