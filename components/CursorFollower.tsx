"use client";

import { useEffect, useRef, useState } from "react";

const CursorFollower = () => {
  const circleRef = useRef<HTMLDivElement>(null);
  const [isPointerFine, setIsPointerFine] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(pointer: fine)");
    const updatePointerState = () => setIsPointerFine(mediaQuery.matches);

    updatePointerState();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updatePointerState);
      return () => mediaQuery.removeEventListener("change", updatePointerState);
    }

    mediaQuery.addListener(updatePointerState);
    return () => mediaQuery.removeListener(updatePointerState);
  }, []);

  useEffect(() => {
    if (!isPointerFine) {
      return;
    }

    const circle = circleRef.current;
    if (!circle) {
      return;
    }

    circle.dataset.active = "false";

    let animationFrame = 0;

    const handleMove = (event: PointerEvent) => {
      if (!circle) {
        return;
      }

      const updatePosition = () => {
        circle.style.setProperty("--cursor-x", `${event.clientX}px`);
        circle.style.setProperty("--cursor-y", `${event.clientY}px`);
        circle.dataset.active = "true";
      };

      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updatePosition);
    };

    const handleHide = () => {
      if (!circle) {
        return;
      }
      circle.dataset.active = "false";
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerleave", handleHide);
    window.addEventListener("blur", handleHide);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerleave", handleHide);
      window.removeEventListener("blur", handleHide);
    };
  }, [isPointerFine]);

  if (!isPointerFine) {
    return null;
  }

  return (
    <div
      ref={circleRef}
      role="presentation"
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-50 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary opacity-0 transition-opacity duration-300 data-[active=true]:opacity-100"
      style={{
        transform:
          "translate3d(var(--cursor-x, 50vw), var(--cursor-y, 50vh), 0)",
      }}
    />
  );
};

export default CursorFollower;
