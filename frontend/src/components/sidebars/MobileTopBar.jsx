import React from 'react';
import jihLogo from '../../assets/LogoColor.png';

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
  <header className="lg:hidden sticky top-0 z-30 flex-shrink-0 border-b border-gray-200 bg-white/95 backdrop-blur shadow-sm">
    <div className="flex items-center gap-2 px-4 py-2.5">
      <img src={jihLogo} alt="JIH" className="h-7 w-auto flex-shrink-0" />
      {title ? (
        <h1 className="min-w-0 flex-1 truncate text-base font-extrabold text-[#002349]">{title}</h1>
      ) : (
        <div className="flex-1" />
      )}
      {actions && <div className="flex flex-shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  </header>
);

export default MobileTopBar;
