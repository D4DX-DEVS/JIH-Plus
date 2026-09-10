import React from 'react';

/**
 * Decorative canvas shared by the landing page and every login page: a soft
 * blue wash, a faint arabesque medallion cut off by the top-right corner and a
 * mosque skyline rising out of layered hills along the bottom. Purely visual —
 * it sits behind the content, ignores the pointer and is hidden from readers.
 *
 * Mount it as the first child of a `relative` page wrapper. The wrapper grows
 * with its content, so the skyline always stays at the bottom of the page.
 */
const PortalBackdrop = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafe] via-[#f5f8fd] to-[#eef3fb]" />

    {/* Arabesque medallion, top-right */}
    <svg
      className="absolute -right-16 -top-14 h-60 w-60 text-[#c5d3ec] sm:-right-24 sm:-top-24 sm:h-[26rem] sm:w-[26rem]"
      viewBox="0 0 260 260"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <g opacity="0.85">
        <circle cx="130" cy="130" r="112" />
        <circle cx="130" cy="130" r="94" strokeDasharray="3 7" />
        <circle cx="130" cy="130" r="70" />
        <rect x="74" y="74" width="112" height="112" rx="8" />
        <rect x="74" y="74" width="112" height="112" rx="8" transform="rotate(45 130 130)" />
        <circle cx="130" cy="130" r="34" />
        <circle cx="130" cy="130" r="13" />
        <path d="M130 96 l10 24 24 10 -24 10 -10 24 -10 -24 -24 -10 24 -10z" />
      </g>
      {/* Hanging lanterns */}
      <g opacity="0.75">
        <path d="M130 242 v16 M130 262 l-5 9 h10z" />
        <path d="M62 218 v18 M62 240 l-5 9 h10z" />
        <path d="M198 218 v18 M198 240 l-5 9 h10z" />
      </g>
    </svg>

    {/* Mosque skyline, bottom */}
    <svg
      className="absolute bottom-0 left-0 h-[220px] w-full sm:h-[260px] lg:h-[300px]"
      viewBox="0 0 430 230"
      preserveAspectRatio="xMidYMax slice"
    >
      {/* Back hill */}
      <path d="M0 168 C70 140 130 150 200 158 C280 168 340 130 430 122 L430 230 L0 230 Z" fill="#e8eef9" />

      {/* Palms */}
      <g fill="none" stroke="#cfdbf0" strokeLinecap="round">
        <path d="M92 190 C96 166 100 146 108 126" strokeWidth="5" />
        <g strokeWidth="6">
          <path d="M108 126 C120 116 134 118 142 128" />
          <path d="M108 126 C116 112 128 106 140 108" />
          <path d="M108 126 C100 110 90 104 78 108" />
          <path d="M108 126 C94 116 82 120 74 132" />
          <path d="M108 126 C108 112 112 102 118 96" />
        </g>
        <path d="M46 196 C50 182 54 170 60 158" strokeWidth="4" />
        <g strokeWidth="5">
          <path d="M60 158 C68 150 78 152 84 160" />
          <path d="M60 158 C66 146 76 142 86 144" />
          <path d="M60 158 C54 146 46 142 38 146" />
          <path d="M60 158 C50 152 42 156 36 166" />
        </g>
        <path d="M402 190 C398 166 396 146 388 122" strokeWidth="5" />
        <g strokeWidth="6">
          <path d="M388 122 C376 112 362 114 354 124" />
          <path d="M388 122 C380 108 368 102 356 104" />
          <path d="M388 122 C396 106 406 100 418 104" />
          <path d="M388 122 C402 112 414 116 422 128" />
          <path d="M388 122 C388 108 384 98 378 92" />
        </g>
      </g>

      {/* Mosque */}
      <g fill="#c9d6ee">
        <rect x="222" y="98" width="9" height="90" rx="2" />
        <path d="M217 100 h19 l-9.5 -16 z" />
        <rect x="216" y="114" width="21" height="4" rx="2" />
        <rect x="379" y="98" width="9" height="90" rx="2" />
        <path d="M374 100 h19 l-9.5 -16 z" />
        <rect x="373" y="114" width="21" height="4" rx="2" />
        <rect x="246" y="120" width="6" height="68" rx="2" />
        <rect x="358" y="120" width="6" height="68" rx="2" />
        <rect x="232" y="150" width="146" height="40" rx="3" />
        <path d="M254 152 a14 14 0 0 1 28 0 z" />
        <path d="M328 152 a14 14 0 0 1 28 0 z" />
        <path d="M268 152 a37 37 0 0 1 74 0 z" />
        <rect x="303" y="104" width="4" height="12" rx="1" />
        <circle cx="305" cy="101" r="3.5" />
      </g>
      <path d="M297 190 v-16 a8 8 0 0 1 16 0 v16 z" fill="#f2f6fd" />

      {/* Crescent moon and birds */}
      <path d="M350 54 A14 14 0 1 0 350 82 A16 16 0 0 1 350 54 Z" fill="#c9d6ee" />
      <g fill="none" stroke="#c9d6ee" strokeWidth="1.6" strokeLinecap="round">
        <path d="M290 46 q4 -4 8 0 q4 -4 8 0" />
        <path d="M318 34 q3 -3 6 0 q3 -3 6 0" />
      </g>

      {/* Front hills */}
      <path d="M0 196 C60 176 120 200 190 190 C260 180 320 200 430 178 L430 230 L0 230 Z" fill="#d6e0f3" />
      <path d="M0 214 C80 196 150 222 230 212 C300 204 360 222 430 206 L430 230 L0 230 Z" fill="#c1d1ec" />
    </svg>
  </div>
);

export default PortalBackdrop;
