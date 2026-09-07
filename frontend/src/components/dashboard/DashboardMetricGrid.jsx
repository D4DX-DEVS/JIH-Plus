import React from 'react';
import { ChevronRight } from 'lucide-react';

const TONES = {
  blue: 'bg-blue-50 text-[#0754ad] ring-blue-100',
  gold: 'bg-amber-50 text-[#755e25] ring-amber-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
};

const DashboardMetricGrid = ({ items, label = 'ഡാഷ്ബോർഡ് സംഗ്രഹം' }) => (
  <section
    aria-label={label}
    className={`grid grid-cols-2 gap-2 sm:gap-3 ${items.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}
  >
    {items.map(({ key, label: itemLabel, value, icon: Icon, tone = 'blue', onClick }, index) => {
      const Component = onClick ? 'button' : 'div';
      const displayValue = value ?? '—';
      const iconElement = React.createElement(Icon, {
        className: 'h-[18px] w-[18px] sm:h-5 sm:w-5',
        'aria-hidden': true,
      });

      return (
        <Component
          key={key}
          type={onClick ? 'button' : undefined}
          onClick={onClick}
          aria-label={onClick ? `${itemLabel}: ${displayValue}. തുറക്കുക` : `${itemLabel}: ${displayValue}`}
          className={`group flex min-h-[76px] min-w-0 items-center gap-2.5 rounded-2xl bg-white p-3 text-left shadow-[0_3px_14px_rgba(15,35,65,0.08)] ring-1 ring-slate-200/80 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0754ad] focus-visible:ring-offset-2 motion-reduce:transition-none sm:min-h-[92px] sm:p-4 ${
            items.length === 3 && index === 2 ? 'col-span-2 sm:col-span-1 ' : ''
          }${
            onClick
              ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(15,35,65,0.12)] active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100'
              : ''
          }`}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 sm:h-10 sm:w-10 ${TONES[tone] || TONES.blue}`}>
            {iconElement}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold leading-[1.4] text-slate-600 sm:text-[13px]">
              {itemLabel}
            </span>
            <span className="mt-0.5 block text-[22px] font-extrabold leading-none tracking-tight text-[#002349] sm:text-2xl">
              {displayValue}
            </span>
          </span>

          {onClick && (
            <ChevronRight
              className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              aria-hidden="true"
            />
          )}
        </Component>
      );
    })}
  </section>
);

export default DashboardMetricGrid;
