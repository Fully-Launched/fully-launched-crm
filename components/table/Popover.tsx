"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const GAP = 4;
const MARGIN = 8;

// Dropdown panel rendered into document.body with position: fixed, anchored
// to its trigger. Portaled so an ancestor's overflow (e.g. the Table view's
// overflow-x-auto wrapper, which also clips vertically) can't cut it off.
// Opens below the anchor, flips above when there's more room there, and is
// clamped horizontally to the viewport. Closes on a mousedown outside both
// the anchor and the panel.
export default function Popover({
  anchorRef,
  open,
  onClose,
  className = "",
  children,
}: {
  anchorRef: RefObject<HTMLElement>;
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    function place() {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const a = anchor.getBoundingClientRect();
      const { offsetWidth: w, offsetHeight: h } = panel;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const spaceBelow = vh - a.bottom;
      const top =
        spaceBelow < h + GAP + MARGIN && a.top > spaceBelow
          ? Math.max(MARGIN, a.top - GAP - h)
          : a.bottom + GAP;
      const left = Math.max(MARGIN, Math.min(a.left, vw - w - MARGIN));
      setPos({ top, left });
    }

    place();
    // Capture phase so scrolling any ancestor (not just the window) — e.g.
    // the table's horizontal scroll — keeps the panel attached.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      if (
        anchorRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, anchorRef, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        // Measured on the first layout pass, then placed before paint.
        visibility: pos ? "visible" : "hidden",
      }}
      className={`z-40 rounded-md border border-neutral-200 bg-white shadow-lg ${className}`}
    >
      {children}
    </div>,
    document.body
  );
}
