import React from 'react';
import BrandLogo from '../branding/BrandLogo';
import TopBarArt from '../branding/TopBarArt';

/**
 * Shared mobile top bar for every expansion-portal page.
 * Keeps the logo / page-title styling identical everywhere so pages no longer
 * each invent their own header. Hidden on lg+ where the sidebar is permanently
 * visible. The sidebar drawer is opened from the bottom nav's "More" entry, so
 * this bar deliberately carries no hamburger.
 *
 * `subtitle` is the one-line tagline under the title; `actions` renders
 * trailing controls (bell, avatar, refresh, ...) on the right.
 *
 * The logo is 28px tall and the 16px title line is 20px, so the title block
 * gets `mt-1` and the actions sit in an `h-7` band: title line and controls
 * are centred on the logo whether or not a subtitle follows.
 */
const MobileTopBar = ({ title, subtitle = null, actions = null }) => (
  <header className="app-mobile-header jih-mobile-header relative z-30 flex-shrink-0 overflow-hidden lg:hidden">
    <TopBarArt />
    <div className="relative flex items-start gap-2.5 px-4 pb-7 pt-2">
      <BrandLogo alt="JIH" size="xs" />
      {title ? (
        <div className="mt-1 min-w-0 flex-1">
          <h1 className="break-words text-[16px] font-extrabold leading-tight text-[#0f2a5c] [overflow-wrap:anywhere]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[12px] leading-snug text-[#5b6b85]">{subtitle}</p>}
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {actions && <div className="flex h-7 flex-shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  </header>
);

export default MobileTopBar;
