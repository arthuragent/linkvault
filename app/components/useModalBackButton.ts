"use client";

import { useEffect, useRef } from "react";

/**
 * When `open` is true, push a synthetic history entry so the device's
 * back gesture pops it instead of leaving the page. Pop → onClose().
 *
 * When the modal closes by any other means (X button, Escape, action),
 * the cleanup consumes the synthetic entry via history.back() so the
 * back stack stays balanced.
 *
 * Re-render safe: changes to the onClose reference don't re-push.
 */
export function useModalBackButton(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const closingFromPopRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    closingFromPopRef.current = false;
    window.history.pushState({ lvModal: Date.now() }, "");

    const handler = () => {
      closingFromPopRef.current = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", handler);

    return () => {
      window.removeEventListener("popstate", handler);
      if (!closingFromPopRef.current) {
        try {
          window.history.back();
        } catch {
          // ignore
        }
      }
      closingFromPopRef.current = false;
    };
    // onClose is captured via ref to avoid re-pushing on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
