import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../branding/BrandLogo';
import PortalBackdrop from '../branding/PortalBackdrop';
import { DISPLAY_CAPS, DISPLAY_SERIF } from '../branding/displayFonts';

/**
 * The one login-page frame every portal shares: decorative backdrop, the
 * "All portals" return link, centred logo, a serif title (all-caps Cinzel for
 * the JIH portals, Playfair for the rest) and a subtitle. The form goes in
 * `children`; the bottom padding keeps it clear of the skyline.
 */
export default function AuthShell({ title, subtitle, caps = false, children }) {
  const navigate = useNavigate();

  return (
    <div className="mobile-readable-content relative min-h-screen overflow-x-hidden text-[#10274f]">
      <PortalBackdrop />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-[190px] pt-3 sm:max-w-lg sm:px-6 sm:pb-[260px] sm:pt-5 lg:pb-[300px]">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="-ml-2 inline-flex min-h-[44px] items-center gap-2 self-start rounded-xl px-2 text-[17px] font-bold text-[#10274f] transition hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a5fc4]/40"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
          All portals
        </button>

        <header className="mt-5 text-center sm:mt-8">
          <BrandLogo alt="JIH Logo" size="xl" className="mx-auto" />
          <h1
            className={`mt-4 leading-tight text-[#0f2a5c] ${
              caps ? 'text-[22px] font-semibold uppercase tracking-wide sm:text-[28px]' : 'text-[28px] font-bold sm:text-4xl'
            }`}
            style={caps ? DISPLAY_CAPS : DISPLAY_SERIF}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-base text-[#5b6b85]">{subtitle}</p>}
        </header>

        <div className="mt-6 sm:mt-8">{children}</div>
      </div>
    </div>
  );
}
