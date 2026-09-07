import React from 'react';
import BrandLogo from '../branding/BrandLogo';

/**
 * Shared mobile top bar for every expansion-portal page.
 * Keeps the logo / page-title styling identical everywhere so pages no longer
 * each invent their own header. Hidden on lg+ where the sidebar is permanently
 * visible. The sidebar drawer is opened from the bottom nav's "More" entry, so
 * this bar deliberately carries no hamburger.
 *
 * `actions` renders trailing controls (refresh, create, ...) on the right.
 */
const MobileTopBar = ({ title, actions = null }) => (
  <header className="app-mobile-header lg:hidden z-30 flex-shrink-0 border-b border-gray-200 bg-white/95 backdrop-blur shadow-sm">
    <div className="flex min-h-[4.125rem] items-center gap-2 px-3 py-2.5">
      <BrandLogo alt="JIH" size="sm" />
      {title ? (
        <h1 className="min-w-0 flex-1 break-words text-base font-extrabold leading-snug text-[#002349] [overflow-wrap:anywhere]">{title}</h1>
      ) : (
        <div className="flex-1" />
      )}
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  </header>
);

export default MobileTopBar;
