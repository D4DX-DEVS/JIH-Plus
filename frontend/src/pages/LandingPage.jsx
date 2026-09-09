import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Clock,
  FileBarChart,
  MapPin,
  PhoneCall,
  PieChart,
  Shield,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/branding/BrandLogo';
import d4dxLogo from '../assets/d4dx_logo.png';
import { PUBLIC_HELP_DESK_CONTACTS } from '../data/helpDeskContacts';
import HelpDeskContactList, { HelpDeskBadge } from '../components/helpdesk/HelpDeskContactList';
import { FRANCHISES } from '../tenants/registry';

// Franchises of the JIH Portal (same pages, own database) get a card each,
// right after the master portal. They run under their own router basename, so
// their action is a full page navigation rather than a client-side route.
const franchiseCards = FRANCHISES.map((franchise) => ({
  id: `${franchise.key}-portal`,
  title: franchise.label,
  description: franchise.description,
  mobileDescription: franchise.mobileDescription,
  icon: Shield,
  accent: franchise.accent,
  illustration: 'expansion',
  actions: [
    {
      label: `Access ${franchise.label}`,
      icon: null,
      className: franchise.gradientClass,
      path: `${franchise.basePath}/expansion-portal/login`,
      hard: true,
    },
  ],
}));

const portalCards = [
  {
    id: 'expansion-portal',
    title: 'JIH Portal',
    description: 'Access dashboards for district, area and unit management',
    mobileDescription: 'District, area and unit management',
    icon: Shield,
    accent: 'blue',
    illustration: 'expansion',
    actions: [
      {
        label: 'Access JIH Portal',
        icon: null,
        className: 'from-[#073976] to-[#002349] hover:from-[#0b4d98] hover:to-[#073976]',
        path: '/expansion-portal/login',
      },
    ],
  },
  ...franchiseCards,
  {
    id: 'ihthisabi-report',
    title: 'IHTHISABI Report',
    description: 'Access reporting system for member management',
    mobileDescription: 'Member reporting and submissions',
    icon: FileBarChart,
    accent: 'green',
    illustration: 'report',
    actions: [
      {
        label: 'Access IHTHISABI Report',
        icon: null,
        className: 'from-[#149457] to-[#08733e] hover:from-[#1aa866] hover:to-[#0c8449]',
        path: '/ihthisabi/login',
      },
    ],
  },
  {
    id: 'member-applications',
    title: 'Member Applications',
    description: 'Rukn and Karkun application processing',
    mobileDescription: 'Rukn and Karkun applications',
    icon: Users,
    accent: 'purple',
    illustration: 'members',
    actions: [
      {
        label: 'Access Members Portal',
        icon: null,
        className: 'from-[#7548e8] to-[#4f28cf] hover:from-[#8158ed] hover:to-[#5d35db]',
        path: '/members/login',
      },
    ],
  },
];

// Live portals always render before any "coming soon" card so working actions
// are the first thing a phone user can reach.
const orderedPortalCards = [...portalCards].sort(
  (a, b) => Number(Boolean(a.comingSoon)) - Number(Boolean(b.comingSoon))
);

const accentClasses = {
  blue: {
    iconWrap: 'bg-[#e8f0ff]',
    icon: 'text-[#0d4fb3]',
    glow: 'bg-[#e8f0ff]',
    underline: 'bg-[#1f66d1]',
  },
  purple: {
    iconWrap: 'bg-[#f1eaff]',
    icon: 'text-[#6638dc]',
    glow: 'bg-[#f1eaff]',
    underline: 'bg-[#7548e8]',
  },
  green: {
    iconWrap: 'bg-[#e8f8f0]',
    icon: 'text-[#15945a]',
    glow: 'bg-[#e8f8f0]',
    underline: 'bg-[#15945a]',
  },
  rose: {
    iconWrap: 'bg-[#fdf2f8]',
    icon: 'text-[#be185d]',
    glow: 'bg-[#fce7f3]',
    underline: 'bg-[#db2777]',
  },
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [showHelpDesk, setShowHelpDesk] = useState(false);

  useEffect(() => {
    document.body.style.overflow = showHelpDesk ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showHelpDesk]);

  const handleAction = (action) => {
    if (!action.path) return;
    if (action.hard) {
      // Crosses into a franchise router basename: needs a real navigation.
      window.location.assign(action.path);
      return;
    }
    navigate(action.path);
  };

  return (
    <div className="mobile-readable-content relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#f8f9ff] text-[#10274f]">
      <style>{`
        @keyframes landingFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes landingSlideUp {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }

        .landing-fade-up {
          animation: landingFadeUp 0.55s ease both;
        }

        .landing-mobile-sheet {
          animation: landingSlideUp 0.28s ease both;
        }
      `}</style>


      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-3 sm:px-6 lg:px-8">
        <header className="relative z-20 flex items-center justify-between gap-3 pb-2 sm:justify-end sm:pb-2 sm:pt-2">
          <div className="flex min-w-0 items-center gap-2.5 sm:hidden">
            <BrandLogo alt="JIH Plus Portal" size="xs" />
            <div className="min-w-0">
              <h1 className="text-base font-extrabold leading-tight text-[#10274f]">JIH Plus Portal</h1>
              <p className="text-xs leading-tight text-[#59677f]">Choose the service you need</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHelpDesk(true)}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-white/80 bg-white/85 px-3 py-2 text-xs font-semibold text-[#17325b] shadow-[0_8px_24px_rgba(85,91,144,0.12)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#7d5df1]/35 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <PhoneCall className="h-4 w-4 text-[#7548e8]" />
            <span className="hidden min-[340px]:inline">Help Desk</span>
          </button>
        </header>

        <main className="flex min-h-0 flex-1 flex-col justify-start sm:pt-2 lg:pt-1">
          <section className="landing-fade-up hidden text-center sm:block">
            <BrandLogo alt="JIH Plus Portal" size="sm" className="mx-auto sm:h-12 lg:h-14" />
            <h1
              className="mt-1.5 text-2xl font-bold leading-tight text-[#10274f] sm:mt-2 sm:text-3xl lg:text-[2rem]"
              style={{ fontFamily: 'Cinzel, Georgia, serif', letterSpacing: '0' }}
            >
              JIH Plus Portal
            </h1>
            <div className="mx-auto mt-1.5 flex w-16 items-center justify-center gap-1.5 sm:mt-2">
              <span className="h-1.5 w-6 rounded-full bg-[#7548e8]" />
              <span className="h-1.5 w-3 rounded-full bg-[#7548e8]" />
            </div>
            <p className="mt-1.5 text-xs font-semibold text-[#71809d] sm:mt-2 sm:text-sm">One Portal. Many Possibilities.</p>
          </section>

          <div className="mb-2 mt-2 sm:hidden">
            <h2 className="text-lg font-extrabold leading-tight text-[#10274f]">Select a portal</h2>
            <p className="mt-0.5 text-xs text-[#59677f]">All JIH services in one place</p>
          </div>

          <section className="grid min-h-0 gap-2.5 sm:mt-3 md:mt-4 md:grid-cols-2 md:gap-4 lg:gap-5 xl:mt-5 xl:grid-cols-4">
            {orderedPortalCards.map((card, index) => (
              <PortalCard
                key={card.id}
                card={card}
                index={index}
                onAction={handleAction}
              />
            ))}
          </section>

        </main>

        <footer className="relative z-10 mt-auto pb-1 pt-3 text-center sm:pb-3 md:pb-0">
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/70 bg-white/75 px-3 py-1.5 text-[11px] text-[#6d7892] shadow-[0_8px_24px_rgba(91,98,141,0.1)] backdrop-blur sm:gap-2 sm:px-4 sm:text-xs">
            <span>Powered by</span>
            <img src={d4dxLogo} alt="D4DX Logo" className="h-4 w-auto sm:h-5" />
            <a
              href="https://d4dx.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#10274f] transition-colors duration-200 hover:text-[#7548e8] hover:underline"
            >
              D4DX Innovations LLP
            </a>
          </div>
        </footer>
      </div>

      {showHelpDesk && <HelpDeskModal onClose={() => setShowHelpDesk(false)} />}
    </div>
  );
};

const PortalCard = ({ card, index, onAction }) => {
  const Icon = card.icon;
  const accent = accentClasses[card.accent];
  const disabled = Boolean(card.comingSoon);

  return (
    <article
      className={`landing-fade-up group relative flex flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/[0.86] text-left shadow-[0_10px_30px_rgba(87,91,145,0.12)] backdrop-blur transition duration-300 sm:min-h-[265px] sm:p-5 sm:text-center sm:shadow-[0_18px_50px_rgba(87,91,145,0.16)] lg:min-h-[300px] lg:p-5 ${
        disabled ? 'opacity-80 grayscale-[0.35]' : 'hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(87,91,145,0.22)]'
      }`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onAction(card.actions[0])}
        className="flex min-h-[104px] w-full items-center gap-3 px-3.5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7d5df1]/45 disabled:cursor-not-allowed sm:hidden"
        aria-label={disabled ? `${card.title} coming soon` : `Open ${card.title}`}
      >
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accent.iconWrap}`} aria-hidden="true">
          <Icon className={`h-6 w-6 ${accent.icon}`} strokeWidth={2.3} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-base font-extrabold leading-snug text-[#14305c] [overflow-wrap:anywhere]">{card.title}</span>
          <span className="mt-0.5 block break-words text-xs font-medium leading-relaxed text-[#59677f] [overflow-wrap:anywhere]">{card.mobileDescription || card.description}</span>
        </span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent.iconWrap} ${accent.icon}`} aria-hidden="true">
          {disabled ? <Clock className="h-4 w-4" /> : <ArrowRight className="h-5 w-5" />}
        </span>
      </button>

      <div className="hidden h-full flex-1 flex-col sm:flex">
      {disabled && (
        <span className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-[#10274f] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white shadow-md">
          <Clock className="h-3 w-3" />
          Coming Soon
        </span>
      )}

      <div className={`absolute left-1/2 top-3 h-16 w-16 -translate-x-1/2 rounded-full ${accent.glow} opacity-80 blur-2xl sm:top-5 sm:h-20 sm:w-20`} />

      <div
        className={`relative mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/55 shadow-inner ring-1 ring-white/80 transition duration-300 sm:h-16 sm:w-16 lg:h-[4.5rem] lg:w-[4.5rem] ${
          disabled ? '' : 'group-hover:scale-105'
        }`}
        aria-hidden="true"
      >
        <span className={`flex h-[2.35rem] w-[2.35rem] items-center justify-center rounded-full ${accent.iconWrap} sm:h-[3.25rem] sm:w-[3.25rem] lg:h-[3.75rem] lg:w-[3.75rem]`}>
          <Icon className={`h-5 w-5 ${accent.icon} sm:h-7 sm:w-7 lg:h-8 lg:w-8`} strokeWidth={2.3} />
        </span>
      </div>

      <h2 className="relative mt-2 text-lg font-extrabold leading-tight text-[#14305c] sm:mt-4 lg:text-xl">{card.title}</h2>
      <span className={`mx-auto mt-1.5 h-1 w-10 rounded-full ${accent.underline} sm:mt-3`} />
      <p className="mx-auto mt-1 max-w-[260px] text-xs font-medium leading-4 text-[#68758f] sm:mt-3 sm:leading-5 lg:text-sm">{card.description}</p>

      <div className="hidden md:block">
        <DecorativeIllustration type={card.illustration} accent={card.accent} />
      </div>

      {disabled ? (
        <div className="relative z-10 mt-3 md:mt-auto">
          <div className="flex w-full min-h-[48px] cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#d8dcec] bg-[#eef0f8] px-4 py-2.5 text-xs font-bold text-[#5c6787] lg:text-sm">
            <Clock className="h-4 w-4" />
            <span>Coming Soon</span>
          </div>
        </div>
      ) : (
        <div className="relative z-10 mt-3 space-y-2.5 md:mt-auto">
          {card.actions.map((action) => (
            <PortalActionButton key={action.label} action={action} onClick={() => onAction(action)} />
          ))}
        </div>
      )}
      </div>
    </article>
  );
};

const PortalActionButton = ({ action, onClick }) => {
  const ActionIcon = action.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r px-4 py-2.5 text-xs font-bold text-white shadow-[0_12px_25px_rgba(24,39,91,0.18)] transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#7d5df1]/35 lg:text-sm ${action.className}`}
    >
      {ActionIcon && <ActionIcon className="h-4 w-4" />}
      <span>{action.label}</span>
      <ArrowRight className="ml-auto h-4 w-4" />
    </button>
  );
};

const DecorativeIllustration = ({ type, accent }) => {
  const barColors = {
    blue: ['#dfeaff', '#c9dcff', '#aac7fb', '#8db3f4'],
    purple: ['#eee7ff', '#ddd1ff', '#c5b1fb', '#a88af2'],
    green: ['#e2f8ed', '#ccefdc', '#9cddb9', '#69c990'],
    rose: ['#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6'],
  };

  if (type === 'expansion') {
    return (
      <div className="pointer-events-none relative z-0 mx-auto mb-4 mt-4 h-16 w-full max-w-[230px] opacity-80 lg:h-[4.5rem]">
        <div className="absolute bottom-1 left-1 h-12 w-px bg-[#d9e3f6]" />
        <div className="absolute bottom-1 left-7 flex h-14 items-end gap-2">
          {barColors[accent].map((color, index) => (
            <span key={color} className="w-3.5 rounded-t-md" style={{ height: `${14 + index * 9}px`, backgroundColor: color }} />
          ))}
        </div>
        <Building2 className="absolute bottom-0 left-[92px] h-11 w-11 text-[#d5def5]" />
        <svg className="absolute bottom-5 right-7 h-11 w-24 text-[#cbd8f5]" viewBox="0 0 130 60" fill="none" aria-hidden="true">
          <path d="M4 50 C25 18 42 38 58 24 C75 9 88 26 101 15 C112 6 120 10 126 5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <MapPin className="absolute right-0 top-2 h-6 w-6 text-[#b4c6f3]" />
      </div>
    );
  }

  if (type === 'members') {
    return (
      <div className="pointer-events-none relative z-0 mx-auto mb-4 mt-4 h-16 w-full max-w-[230px] opacity-80 lg:h-[4.5rem]">
        <div className="absolute left-4 top-6 h-9 w-9 rounded-2xl bg-[#efe8ff]" />
        <div className="absolute left-20 top-0 h-14 w-24 rounded-[22px] border border-[#ded1ff] bg-white/60" />
        <UserRound className="absolute left-[105px] top-3 h-8 w-8 text-[#c4b0f7]" />
        <div className="absolute right-5 top-6 h-9 w-9 rounded-2xl bg-[#e5f2ff]" />
        <div className="absolute bottom-1 left-12 h-2.5 w-36 rounded-full bg-[#e7eaf8]" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none relative z-0 mx-auto mb-4 mt-4 h-16 w-full max-w-[230px] opacity-80 lg:h-[4.5rem]">
      <div className="absolute bottom-1 left-9 h-14 w-36 rounded-t-xl border border-[#d5efdf] bg-[#effaf4] shadow-sm" />
      <PieChart className="absolute bottom-5 left-4 h-9 w-9 text-[#75ca94]" />
      <div className="absolute left-24 top-5 space-y-1.5">
        <span className="block h-1.5 w-[4.5rem] rounded-full bg-[#caead7]" />
        <span className="block h-1.5 w-14 rounded-full bg-[#dcf3e5]" />
      </div>
      <BarChart3 className="absolute right-9 top-5 h-10 w-10 text-[#80cf9c]" />
      <span className="absolute bottom-1 left-8 h-3 w-[9.5rem] rounded-b-xl bg-[#d9f0e3]" />
    </div>
  );
};

const HelpDeskModal = ({ onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#101936]/45 p-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="landing-mobile-sheet w-full max-w-md rounded-3xl border border-white/80 bg-[#fbfcff] p-5 shadow-2xl sm:p-6"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-4">
        <HelpDeskBadge />
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1f9] text-[#263758] transition hover:bg-[#e3e7f4]"
          aria-label="Close"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1">
        <HelpDeskContactList contacts={PUBLIC_HELP_DESK_CONTACTS} />
      </div>
    </div>
  </div>
  );
};

export default LandingPage;
