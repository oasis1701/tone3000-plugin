import { useEffect, useState, type RefObject } from 'react';

/**
 * Keyboard focus discipline for the full-screen takeovers (Settings, tone
 * browser, block card, tuner) and other surfaces that replace what had the
 * keyboard: without it, closing one leaves focus on `body`, where the next
 * Tab restarts from the top and, in a DAW, Space/Enter go to the host.
 */

/**
 * Remembers what had focus when the surface mounted and gives it back when
 * the surface unmounts (if it is still on the page). Captured during the
 * first render, before any `autoFocus` inside the surface has moved focus.
 * `rootRef` is the surface's own element: the restore only runs once it
 * has really left the DOM, which also keeps StrictMode's simulated
 * unmount/remount in development from bouncing focus out of the surface.
 */
export function useRestoreFocus(rootRef: RefObject<HTMLElement | null>): void {
  const [previous] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  );
  useEffect(
    () => () => {
      if (rootRef.current?.isConnected) return;
      if (previous?.isConnected) previous.focus();
    },
    [previous, rootRef]
  );
}

/**
 * Escape closes the surface, unless a popover inside it (a menu, a picker's
 * list, a nested dialog) is open: that one takes the key (see
 * useDismissable), and a second Escape then reaches the surface. Inline
 * editors that own Escape stop propagation before it gets here.
 */
export function useEscapeToClose(
  rootRef: RefObject<HTMLElement | null>,
  onClose: () => void
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (root.querySelector('[role="menu"], [role="listbox"], [role="dialog"] [role="dialog"]'))
        return;
      e.preventDefault();
      onClose();
    };
    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, [rootRef, onClose]);
}
