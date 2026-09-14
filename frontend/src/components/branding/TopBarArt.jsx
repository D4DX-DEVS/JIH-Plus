import React from 'react';

/**
 * Decorative art for the mobile top bar: a faint mosque skyline with palms and
 * a crescent on the right, and a wave along the bottom edge that lets the
 * tinted header flow into the white page. Purely visual — it sits behind the
 * bar's content, ignores the pointer and is hidden from readers.
 */
const TopBarArt = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute inset-0 bg-gradient-to-b from-[#e9f0fb] to-[#f2f6fd]" />

    {/* Skyline, bottom-right */}
    <svg className="absolute bottom-2.5 right-0 h-[66px] w-[172px]" viewBox="0 0 240 92" fill="none">
      <path d="M0 78 C60 70 120 82 240 72 L240 92 L0 92 Z" fill="#dde7f6" />

      <g fill="#c9d6ee">
        <rect x="62" y="34" width="7" height="46" rx="2" />
        <path d="M58 36 h15 l-7.5 -13 z" />
        <rect x="61" y="46" width="9" height="3" rx="1.5" />
        <rect x="171" y="34" width="7" height="46" rx="2" />
        <path d="M167 36 h15 l-7.5 -13 z" />
        <rect x="170" y="46" width="9" height="3" rx="1.5" />
        <rect x="80" y="50" width="5" height="30" rx="1.5" />
        <rect x="155" y="50" width="5" height="30" rx="1.5" />
        <rect x="72" y="62" width="96" height="20" rx="2" />
        <path d="M86 63 a10 10 0 0 1 20 0 z" />
        <path d="M134 63 a10 10 0 0 1 20 0 z" />
        <path d="M96 63 a24 24 0 0 1 48 0 z" />
        <rect x="118.5" y="30" width="3" height="10" rx="1" />
        <circle cx="120" cy="28" r="2.5" />
      </g>
      <path d="M115 82 v-9 a5 5 0 0 1 10 0 v9 z" fill="#f2f6fd" />

      {/* Crescent and birds */}
      <path d="M150 8 A9 9 0 1 0 150 26 A10.5 10.5 0 0 1 150 8 Z" fill="#c9d6ee" />
      <g stroke="#c9d6ee" strokeWidth="1.4" strokeLinecap="round">
        <path d="M186 14 q3 -3 6 0 q3 -3 6 0" />
        <path d="M200 8 q2.5 -2.5 5 0 q2.5 -2.5 5 0" />
      </g>

      {/* Palms */}
      <g stroke="#cfdbf0" strokeLinecap="round">
        <path d="M22 84 C26 66 30 54 36 42" strokeWidth="4" />
        <g strokeWidth="5">
          <path d="M36 42 C46 34 58 36 64 44" />
          <path d="M36 42 C42 30 52 26 62 28" />
          <path d="M36 42 C28 30 20 26 10 30" />
          <path d="M36 42 C24 34 14 38 8 48" />
          <path d="M36 42 C36 30 40 22 46 18" />
        </g>
        <path d="M222 84 C218 64 216 50 208 34" strokeWidth="4" />
        <g strokeWidth="5">
          <path d="M208 34 C198 26 186 28 180 36" />
          <path d="M208 34 C202 22 192 18 182 20" />
          <path d="M208 34 C216 20 226 16 236 20" />
          <path d="M208 34 C220 26 230 30 236 40" />
          <path d="M208 34 C208 22 204 14 198 10" />
        </g>
      </g>
    </svg>

    {/* Wave edge into the white page */}
    <svg className="absolute bottom-0 left-0 h-6 w-full" viewBox="0 0 430 32" preserveAspectRatio="none">
      <path d="M0 14 C70 0 150 30 230 16 C310 2 370 24 430 8 L430 32 L0 32 Z" fill="#dfe9f7" />
      <path d="M0 22 C80 8 160 34 240 20 C320 6 380 26 430 16 L430 32 L0 32 Z" fill="#ffffff" />
    </svg>
  </div>
);

export default TopBarArt;
