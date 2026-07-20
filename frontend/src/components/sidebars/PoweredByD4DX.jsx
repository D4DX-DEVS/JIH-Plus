import React from 'react';
import d4dxLogo from '../../assets/d4dx_logo.png';

const PoweredByD4DX = ({ collapsed = false, dark = false }) => (
  <a
    href="https://d4dx.co/"
    target="_blank"
    rel="noopener noreferrer"
    className={`mb-2 flex items-center rounded-lg py-2 transition-colors ${
      collapsed ? 'justify-center px-2' : 'justify-center gap-2 px-3'
    } ${
      dark
        ? 'text-white/50 hover:bg-white/10 hover:text-white/80'
        : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
    }`}
    title="Powered by D4DX Innovations LLP"
  >
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white shadow-sm ring-1 ring-black/5">
      <img src={d4dxLogo} alt="D4DX" className="h-4 w-4 object-contain" />
    </span>
    <span className={`text-[11px] font-medium ${collapsed ? 'hidden' : ''}`}>
      Powered by <span className="font-bold">D4DX</span>
    </span>
  </a>
);

export default PoweredByD4DX;
