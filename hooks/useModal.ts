import { useEffect } from 'react';

// Global counter to handle nested/stacked modals
let openModalCount = 0;
let savedScrollY = 0;

/**
 * Locks body scroll when a modal is open — iOS/Capacitor compatible.
 *
 * On iOS, `overflow: hidden` alone doesn't prevent scroll when the keyboard
 * appears. The fix is to `position: fixed` the body with a negative `top`
 * equal to the current scroll offset, then restore on close.
 *
 * Uses a global counter so nested modals don't prematurely unlock scroll.
 */
export const useModal = (isOpen: boolean): void => {
  useEffect(() => {
    if (!isOpen) return;

    if (openModalCount === 0) {
      // Save scroll position before locking
      savedScrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    }
    openModalCount++;

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [isOpen]);
};
