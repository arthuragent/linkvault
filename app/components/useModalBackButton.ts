"use client";

import { useEffect, useRef } from "react";

// One global stack across all modals on the page. We push a single synthetic
// history entry whenever at least one modal is open; back pops the entry and
// closes the topmost modal. When a modal opens on top of another (e.g. Edit
// from the long-press action menu, or AddCategoryModal stacked on the save
// modal), we reuse the existing synthetic entry instead of pushing another —
// otherwise the old modal's cleanup-back() would close the brand-new one.

type ModalEntry = {
  id: number;
  close: () => void;
  closedByPop: { current: boolean };
};

const stack: ModalEntry[] = [];
let synthInPlace = false;
let listenerInstalled = false;
let nextId = 1;

function installListener() {
  if (listenerInstalled || typeof window === "undefined") return;
  listenerInstalled = true;
  window.addEventListener("popstate", () => {
    synthInPlace = false;
    const top = stack.pop();
    if (!top) return;
    top.closedByPop.current = true;
    top.close();
    // If more modals are still mounted, restore the synthetic entry so the
    // next back press closes the next-topmost one.
    if (stack.length > 0) {
      try {
        window.history.pushState({ lvModal: "shared" }, "");
        synthInPlace = true;
      } catch {
        // ignore
      }
    }
  });
}

export function useModalBackButton(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    installListener();

    const id = nextId++;
    const closedByPop = { current: false };
    const entry: ModalEntry = {
      id,
      close: () => onCloseRef.current(),
      closedByPop,
    };
    stack.push(entry);

    if (!synthInPlace) {
      try {
        window.history.pushState({ lvModal: id }, "");
        synthInPlace = true;
      } catch {
        // ignore
      }
    }

    return () => {
      const idx = stack.findIndex((m) => m.id === id);
      if (idx >= 0) stack.splice(idx, 1);

      if (closedByPop.current) return;

      // Defer to the next microtask so a sibling modal mounting in the same
      // render commit (the "transition" case) can claim the synthetic entry
      // before we try to pop it.
      queueMicrotask(() => {
        if (stack.length === 0 && synthInPlace) {
          synthInPlace = false;
          try {
            window.history.back();
          } catch {
            // ignore
          }
        }
      });
    };
    // onClose is captured via ref so its identity doesn't re-trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
