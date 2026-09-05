import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import PoweredByD4DX from './PoweredByD4DX';

/**
 * Shared mobile bottom navigation for the expansion portal.
 * Rendered by each role sidebar and hidden on lg+ (where the sidebar is visible).
 *
 * `items`: [{ key, label, icon, active, onClick, action }]. Keep to <= 5 entries.
 * An item with `action: 'more'` toggles this component's own "More" sheet
 * instead of calling `onClick`, and renders active while the sheet is open.
 *
 * `moreItems`: [{ key, label, icon, active, count, onClick }] — destinations
 * the bar itself doesn't carry, shown in the sheet above a Logout row and
 * PoweredByD4DX. `onLogout` fires when that row is tapped.
 */
const MobileBottomNav = ({ items, hidden = false, moreItems = [], onLogout }) => {
  const [moreOpen, setMoreOpen] = useState(false);

  if (!items || items.length === 0) return null;
  // Hide while a page-level mobile drawer is open elsewhere, so it doesn't
  // get covered and "More" cleanly reveals this bar's own sheet.
  if (hidden) return null;

  const handleItemClick = (item) => {
    if (item.action === 'more') {
      setMoreOpen((prev) => !prev);
      return;
    }
    setMoreOpen(false);
    item.onClick?.();
  };

  const handleMoreItemClick = (item) => {
    setMoreOpen(false);
    item.onClick?.();
  };

  const handleLogoutClick = () => {
    setMoreOpen(false);
    onLogout?.();
  };

  return (
    <>
      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-gray-900/40"
          onClick={() => setMoreOpen(false)}
        />
      )}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur shadow-[0_-8px_24px_rgba(15,23,42,0.08)] ih-mobile-nav-safe">
        {moreOpen && (
          <div className="ih-more-sheet max-h-[60vh] overflow-y-auto border-b border-gray-200 bg-white px-3 pb-2 pt-3">
            {moreItems.length > 0 && (
              <div className="space-y-1">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleMoreItemClick(item)}
                      className={`flex w-full min-h-[52px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors ${
                        item.active ? 'bg-[#002349] text-white' : 'text-gray-700 active:bg-gray-100'
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${item.active ? 'text-white' : 'text-gray-400'}`} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.count > 0 && (
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            item.active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-2 border-t border-gray-100 pt-2">
              <button
                onClick={handleLogoutClick}
                className="flex w-full min-h-[52px] items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-red-600 transition-colors active:bg-red-50"
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" />
                <span>Logout</span>
              </button>
              <PoweredByD4DX />
            </div>
          </div>
        )}

        <nav
          className="grid gap-1 px-2 py-1.5"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.action === 'more' ? moreOpen : item.active;
            return (
              <button
                key={item.key}
                onClick={() => handleItemClick(item)}
                className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-all duration-200 ${
                  active ? 'bg-[#002349] text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className={`h-5 w-5 shrink-0 ${active ? 'scale-110' : ''}`} />
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default MobileBottomNav;
