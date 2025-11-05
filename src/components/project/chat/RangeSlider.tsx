"use client";

import { useRef } from "react";

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
}: RangeSliderProps) {
  const sliderRef = useRef<HTMLInputElement>(null);
  const startScrollXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLInputElement>) => {
    // Let the slider handle its own touch events natively - don't prevent default
    e.stopPropagation();
    startScrollXRef.current = window.scrollX;
    isDraggingRef.current = true;

    // Lock horizontal scroll position periodically without interfering with slider
    const scrollLockInterval = setInterval(() => {
      if (isDraggingRef.current) {
        const currentScrollX = window.scrollX;
        // Only lock if scroll position changed (prevent unnecessary work)
        if (Math.abs(currentScrollX - startScrollXRef.current) > 0) {
          window.scrollTo(startScrollXRef.current, window.scrollY);
        }
      } else {
        clearInterval(scrollLockInterval);
      }
    }, 16); // ~60fps

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      clearInterval(scrollLockInterval);
      document.removeEventListener("touchend", handleTouchEnd);
    };

    document.addEventListener("touchend", handleTouchEnd, { once: true });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
    // Prevent horizontal scrolling while dragging the slider
    const startX = e.clientX;
    const startScrollX = window.scrollX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Only prevent if we're moving horizontally (slider drag)
      const deltaX = Math.abs(moveEvent.clientX - startX);
      const deltaY = Math.abs(moveEvent.clientY - e.clientY);
      if (deltaX > deltaY) {
        // Prevent horizontal scroll during slider drag
        window.scrollTo(startScrollX, window.scrollY);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp, { once: true });
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-900 dark:text-white">
        {label} — {value}
      </label>
      <input
        ref={sliderRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onFocus={(e) => e.target.blur()}
        onTouchStart={handleTouchStart}
        onMouseDown={handleMouseDown}
        disabled={disabled}
        style={{ touchAction: "pan-y" }}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
      />
    </div>
  );
}

