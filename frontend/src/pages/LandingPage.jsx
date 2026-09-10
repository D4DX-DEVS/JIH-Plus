import React, { useEffect, useState } from 'react';
import { ArrowRight, FileBarChart, Headset, Shield, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../components/branding/BrandLogo';
import PortalBackdrop from '../components/branding/PortalBackdrop';
import { DISPLAY_SERIF } from '../components/branding/displayFonts';
import d4dxLogo from '../assets/d4dx_logo.png';
import { PUBLIC_HELP_DESK_CONTACTS } from '../data/helpDeskContacts';
import HelpDeskContactList, { HelpDeskBadge } from '../components/helpdesk/HelpDeskContactList';
import { FRANCHISES } from '../tenants/registry';

// Franchises of the JIH Portal (same pages, own database) get a card each,
// right after the master portal. They run under their own router basename, so
// opening one is a full page navigation rather than a client-side route.
const franchiseCards = FRANCHISES.map((franchise) => ({
  id: `${franchise.key}-portal`,
  title: franchise.label,
  description: franchise.description,
  icon: Shield,
  accent: franchise.accent,
  path: `${franchise.basePath}/expansion-portal/login`,
  hard: true,
}));

const portalCards = [
  {
    id: 'expansion-portal',
    title: 'JIH Portal',
    description: 'District, area and unit management',
    icon: Shield,
    accent: 'blue',
    path: '/expansion-portal/login',
  },
  ...franchiseCards,
  {
    id: 'ihthisabi-report',
    title: 'IHTHISABI Report',
    description: 'Member reporting and submissions',
    icon: FileBarChart,
    accent: 'green',
    path: '/ihthisabi/login',
  },
  {
    id: 'member-applications',
    title: 'Member Applications',
    description: 'Rukn and Karkun applications',
    icon: Users,
    accent: 'purple',
    path: '/members/login',
  },
];

const ACCENTS = {
  blue: { tint: 'bg-[#e4edfb]', icon: 'text-[#1d4fa8]', wave: '#e3ecfa' },
  rose: { tint: 'bg-[#fbe6ee]', icon: 'text-[#b8244f]', wave: '#fbe4ec' },
  green: { tint: 'bg-[#e3f4ea]', icon: 'text-[#1e8a4c]', wave: '#e2f3e9' },
  purple: { tint: 'bg-[#ede6fb]', icon: 'text-[#6a3bd8]', wave: '#ece5fa' },
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

  const openPortal = (card) => {
    if (card.hard) {
      // Crosses into a franchise router basename: needs a real navigation.
      window.location.assign(card.path);
      return;
    }
    navigate(card.path);
  };

  return (
    <div className="mobile-readable-content relative min-h-screen overflow-x-hidden text-[#10274f]">
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

      <PortalBackdrop />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-4 sm:max-w-3xl sm:px-6 sm:pb-36 sm:pt-6 lg:max-w-4xl lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo alt="JIH Plus Portal" size="md" />
            <div className="min-w-0">
              <h1 className="text-[19px] font-extrabold leading-tight sm:text-2xl">JIH Plus Portal</h1>
              <p className="mt-0.5 text-[13px] text-[#5b6b85] sm:text-[15px]">Choose the service you need</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHelpDesk(true)}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-[#dfe5f0] bg-white/90 px-4 py-2 text-[15px] font-bold text-[#1f3560] shadow-[0_8px_24px_rgba(30,56,110,0.08)] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a5fc4]/40"
          >
            <Headset className="h-5 w-5 text-[#2a5fc4]" strokeWidth={2} />
            <span className="hidden min-[360px]:inline">Help Desk</span>
          </button>
        </header>

        <section className="landing-fade-up mt-8 sm:mt-10">
          <h2 className="text-[30px] font-bold leading-tight text-[#0f2a5c] sm:text-4xl" style={DISPLAY_SERIF}>
            Select a portal
          </h2>
          <p className="mt-1.5 text-base text-[#5b6b85] sm:text-lg">All JIH services in one place</p>
        </section>

        <section className="mt-5 grid gap-3.5 sm:mt-6 md:grid-cols-2 md:gap-5">
          {portalCards.map((card, index) => (
            <PortalCard key={card.id} card={card} index={index} onOpen={openPortal} />
          ))}
        </section>

        <footer className="mt-auto pt-12 text-center sm:pt-16">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-[#dfe5f0] bg-white/90 px-4 py-2.5 text-sm text-[#5b6b85] shadow-[0_8px_24px_rgba(30,56,110,0.08)]">
            <span>Powered by</span>
            <img src={d4dxLogo} alt="D4DX Logo" className="h-5 w-auto" />
            <a
              href="https://d4dx.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#10274f] transition-colors hover:underline"
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

const PortalCard = ({ card, index, onOpen }) => {
  const Icon = card.icon;
  const accent = ACCENTS[card.accent] || ACCENTS.blue;

  return (
    <button
      type="button"
      onClick={() => onOpen(card)}
      style={{ animationDelay: `${index * 80}ms` }}
      aria-label={`Open ${card.title}`}
      className="landing-fade-up group relative flex min-h-[92px] w-full items-center gap-[14px] overflow-hidden rounded-[22px] border border-[#e3e8f2] bg-white/90 px-3.5 py-3.5 text-left shadow-[0_10px_30px_rgba(30,56,110,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(30,56,110,0.14)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a5fc4]/40 sm:px-5 sm:py-5"
    >
      <svg className="pointer-events-none absolute bottom-0 right-0 h-12 w-3/4" viewBox="0 0 300 48" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 48 C60 14 120 46 180 26 C240 6 280 22 300 10 L300 48 Z" fill={accent.wave} />
      </svg>
      <span className={`relative flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl ${accent.tint}`} aria-hidden="true">
        <Icon className={`h-8 w-8 ${accent.icon}`} strokeWidth={1.8} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-[19px] font-extrabold leading-tight text-[#14305c]">{card.title}</span>
        <span className="mt-1 block text-[14px] leading-snug text-[#5b6b85]">{card.description}</span>
      </span>
      <span
        className={`relative flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full transition group-hover:translate-x-0.5 ${accent.tint} ${accent.icon}`}
        aria-hidden="true"
      >
        <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
      </span>
    </button>
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
