import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export default function GenrePicker({
  id,
  value,
  onChange,
  options,
  placeholder,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectOption = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="w-full flex items-center justify-between pl-3 pr-2 py-2.5 border border-slate-300 rounded-lg text-xs text-slate-700 outline-none hover:border-rose-300 hover:bg-rose-50 focus:border-rose-300 focus:ring-2 focus:ring-rose-100 transition-colors bg-white"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={value ? "text-slate-700" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {isOpen ? (
        <div className="absolute z-40 mt-1 w-full rounded-lg border border-rose-200 bg-white shadow-lg max-h-56 overflow-auto">
          {options.map((option) => {
            const isSelected = option === value;

            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => selectOption(option)}
                className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center justify-between ${
                  isSelected
                    ? "bg-rose-100 text-rose-700 font-semibold"
                    : "text-slate-700 hover:bg-rose-50"
                }`}
              >
                <span>{option}</span>
                {isSelected ? (
                  <Check size={13} className="text-rose-600" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
