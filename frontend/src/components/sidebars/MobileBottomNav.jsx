import React, { useEffect, useRef, useState } from 'react';
import { LogOut, X } from 'lucide-react';
import PoweredByD4DX from './PoweredByD4DX';

// Tinted icon squares for the "More" rows, cycled by position so a long list
// stays scannable without every sidebar having to pick colours.
const ROW_TONES = [
  'bg-[#e4edfb] text-[#1d4fa8]',
  'bg-[#e3f4ea] text-[#1e8a4c]',
  'bg-[#ede6fb] text-[#6a3bd8]',
  'bg-[#fdf1dc] text-[#a06a12]',
  'bg-[#e0f3f2] text-[#178582]',
  'bg-[#fbe6ee] text-[#b8244f]',
];

/**
 * Shared mobile bottom navigation for the expansion portal.
 * Rendered by each role sidebar and hidden on lg+ (where the sidebar is visible).
 *
 * `items`: [{ key, label, icon, active, onClick, action }]. Keep to <= 5 entries.
 * An item with `action: 'more'` toggles this component's own "More" sheet
 * instead of calling `onClick`, and renders active while the sheet is open.
 *
 * `moreItems`: [{ key, label, description, icon, active, count, onClick }] —
 * destinations the bar itself doesn't carry, shown in the sheet above a Logout
 * row and PoweredByD4DX. `onLogout` fires when that row is tapped.
 */
const MobileBottomNav = ({ items, hidden = false, moreItems = [], onLogout }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreSheetRef = useRef(null);
  const moreButtonRef = useRef(null);
  const returnFocusRef = useRef(null);
  const hasActiveMoreItem = moreItems.some((item) => item.active);

  const closeMore = (restoreFocus = true) => {
    setMoreOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => {
        const target = returnFocusRef.current || moreButtonRef.current;
        if (target?.isConnected) target.focus();
      });
    }
  };

  useEffect(() => {
    if (!moreOpen) return undefined;

    const sheet = moreSheetRef.current;
    const focusableSelector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
    requestAnimationFrame(() => sheet?.querySelector(focusableSelector)?.focus());

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMore();
        return;
      }

      if (event.key !== 'Tab' || !sheet) return;
      const focusable = Array.from(sheet.querySelectorAll(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [moreOpen]);

  if (!items || items.length === 0) return null;
  // Hide while a page-level mobile drawer is open elsewhere, so it doesn't
  // get covered and "More" cleanly reveals this bar's own sheet.
  if (hidden) return null;

  const handleItemClick = (item) => {
    if (item.action === 'more') {
      if (moreOpen) {
        closeMore();
      } else {
        returnFocusRef.current = document.activeElement;
        setMoreOpen(true);
      }
      return;
    }
    closeMore(false);
    item.onClick?.();
  };

  const handleMoreItemClick = (item) => {
    closeMore(false);
    item.onClick?.();
  };

  const handleLogoutClick = () => {
    closeMore(false);
    onLogout?.();
  };

  return (
    <>
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-[#101936]/45"
          onClick={() => closeMore()}
          aria-hidden="true"
        />
      )}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-white shadow-[0_-10px_30px_rgba(15,35,65,0.10)] ih-mobile-nav-safe">
        {moreOpen && (
          <div
            ref={moreSheetRef}
            id="jih-mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="കൂടുതൽ ഓപ്ഷനുകൾ"
            className="ih-more-sheet max-h-[70vh] overflow-y-auto bg-white px-4 pb-2 pt-3"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[16px] font-extrabold leading-tight text-[#0f2a5c]">കൂടുതൽ ഓപ്ഷനുകൾ</p>
                <p className="mt-0.5 text-[12px] leading-snug text-[#5b6b85]">നിങ്ങൾക്ക് വേണ്ട സേവനം തിരഞ്ഞെടുക്കുക</p>
              </div>
              <button
                type="button"
                onClick={() => closeMore()}
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef2f8] text-[#1f3560] transition-colors hover:bg-[#e3e9f4]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {moreItems.length > 0 && (
              <div>
                {moreItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleMoreItemClick(item)}
                      style={item.active ? { borderColor: '#bcd0f0' } : undefined}
                      className={`flex w-full min-h-[52px] items-center gap-2.5 rounded-xl px-2.5 text-left transition-colors ${
                        item.active ? 'bg-[#e9f0fb]' : 'bg-white active:bg-[#f4f7fc]'
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ROW_TONES[index % ROW_TONES.length]}`}>
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-[14px] font-bold leading-snug text-[#0f2a5c] [overflow-wrap:anywhere]">{item.label}</span>
                        {item.description && (
                          <span className="mt-0.5 block text-[12px] leading-snug text-[#5b6b85]">{item.description}</span>
                        )}
                      </span>
                      {item.count > 0 && (
                        <span className="shrink-0 rounded-full bg-[#e4edfb] px-2 py-0.5 text-[11px] font-bold text-[#1d4fa8]">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-2 border-t border-[#e6ecf5] pt-2">
              <button
                onClick={handleLogoutClick}
                className="flex w-full min-h-[48px] items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] font-bold text-red-600 transition-colors active:bg-red-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} />
                </span>
                <span>Logout</span>
              </button>
              <PoweredByD4DX />
            </div>
          </div>
        )}

        <nav
          className="grid gap-1 px-2 pb-1 pt-1"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.action === 'more' ? moreOpen || hasActiveMoreItem : item.active;
            return (
              <button
                key={item.key}
                ref={item.action === 'more' ? moreButtonRef : undefined}
                onClick={() => handleItemClick(item)}
                className={`flex min-h-[50px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[12px] font-semibold leading-tight transition-all duration-200 ${
                  active
                    ? 'bg-[#14346b] text-white shadow-[0_8px_18px_rgba(20,52,107,0.28)]'
                    : 'text-[#5b6b85] hover:bg-[#f1f4fa] hover:text-[#0f2a5c]'
                }`}
                aria-current={active ? 'page' : undefined}
                aria-haspopup={item.action === 'more' ? 'dialog' : undefined}
                aria-expanded={item.action === 'more' ? moreOpen : undefined}
                aria-controls={item.action === 'more' ? 'jih-mobile-more-sheet' : undefined}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? '' : 'text-[#1f3560]'}`} strokeWidth={1.9} />
                <span className="max-w-full break-words text-center [overflow-wrap:anywhere]">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default MobileBottomNav;
