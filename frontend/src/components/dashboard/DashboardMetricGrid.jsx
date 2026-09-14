import React from 'react';
import { ChevronRight } from 'lucide-react';

const TONES = {
  blue: 'bg-[#e4edfb] text-[#1d4fa8]',
  gold: 'bg-[#fdf1dc] text-[#a06a12]',
  green: 'bg-[#e3f4ea] text-[#1e8a4c]',
  violet: 'bg-[#ede6fb] text-[#6a3bd8]',
};

const DashboardMetricGrid = ({ items, label = 'ഡാഷ്ബോർഡ് സംഗ്രഹം' }) => (
  <section
    aria-label={label}
    className={`grid grid-cols-2 gap-2 ${items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}
  >
    {items.map(({ key, label: itemLabel, value, icon: Icon, tone = 'blue', onClick }, index) => {
      const Component = onClick ? 'button' : 'div';
      const displayValue = value ?? '—';
      const iconElement = React.createElement(Icon, {
        className: 'h-[18px] w-[18px]',
        strokeWidth: 1.7,
        'aria-hidden': true,
      });

      return (
        <Component
          key={key}
          type={onClick ? 'button' : undefined}
          onClick={onClick}
          aria-label={onClick ? `${itemLabel}: ${displayValue}. തുറക്കുക` : `${itemLabel}: ${displayValue}`}
          className={`jih-card group flex min-h-[80px] min-w-0 items-center gap-2 p-2.5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4fa8] focus-visible:ring-offset-2 motion-reduce:transition-none sm:min-h-[112px] sm:p-4 ${
            items.length === 3 && index === 2 ? 'col-span-2 sm:col-span-1 ' : ''
          }${
            onClick
              ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,35,65,0.12)] active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100'
              : ''
          }`}
        >
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-14 sm:w-14 ${TONES[tone] || TONES.blue}`}>
            {iconElement}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-bold leading-snug text-[#2a3f66] sm:text-[13px] sm:font-semibold sm:text-slate-600">
              {itemLabel}
            </span>
            <span className="mt-0.5 block text-[18px] font-extrabold leading-none tracking-tight text-[#0f2a5c] sm:text-2xl">
              {displayValue}
            </span>
          </span>

          {onClick && (
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-[#5b6b85] transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              aria-hidden="true"
            />
          )}
        </Component>
      );
    })}
  </section>
);

export default DashboardMetricGrid;
