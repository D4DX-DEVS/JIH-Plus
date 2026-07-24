import React from 'react';

/**
 * Shared mobile bottom navigation for the expansion portal.
 * Rendered by each role sidebar and hidden on lg+ (where the sidebar is visible).
 * `items`: [{ key, label, icon, active, onClick }]. Keep to <= 5 entries; the last
 * is typically a "More" entry that opens the full sidebar drawer.
 */
const MobileBottomNav = ({ items, hidden = false }) => {
  if (!items || items.length === 0) return null;
  // Hide while the sidebar drawer is open so it doesn't cover the drawer's
  // logout button, and so "More" cleanly reveals the full menu.
  if (hidden) return null;

  return (
    <nav
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur shadow-[0_-8px_24px_rgba(15,23,42,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className="grid gap-1 px-2 py-1.5"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-all duration-200 ${
                item.active
                  ? 'bg-[#002349] text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-current={item.active ? 'page' : undefined}
            >
              <Icon className={`h-5 w-5 shrink-0 ${item.active ? 'scale-110' : ''}`} />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
