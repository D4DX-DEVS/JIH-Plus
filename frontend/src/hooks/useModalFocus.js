import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function useModalFocus(open, onClose) {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    const prior = document.activeElement;
    const priorBodyOverflow = document.body.style.overflow;
    const scrollRegions = Array.from(document.querySelectorAll('[data-app-scroll]'));
    const priorRegionOverflow = scrollRegions.map((region) => region.style.overflow);
    triggerRef.current = prior;
    document.body.style.overflow = 'hidden';
    scrollRegions.forEach((region) => {
      region.style.overflow = 'hidden';
    });
    requestAnimationFrame(() => dialog?.querySelector(FOCUSABLE)?.focus());

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll(FOCUSABLE));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = priorBodyOverflow;
      scrollRegions.forEach((region, index) => {
        region.style.overflow = priorRegionOverflow[index];
      });
      requestAnimationFrame(() => {
        const target = triggerRef.current || prior;
        if (target?.isConnected) target.focus();
      });
    };
  }, [open, onClose]);

  return { dialogRef, triggerRef };
}
