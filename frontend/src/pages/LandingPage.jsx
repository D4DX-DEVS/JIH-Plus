import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Clock,
  FileBarChart,
  MapPin,
  MessageCircle,
  PhoneCall,
  PieChart,
  Shield,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jihLogo from '../assets/LogoColor.png';
import d4dxLogo from '../assets/d4dx_logo.png';
import { PUBLIC_HELP_DESK_CONTACTS, getTelHref, getWhatsAppHref } from '../data/helpDeskContacts';

const portalCards = [
  {
    id: 'expansion-portal',
    title: 'JIH Portal',
    description: 'Access dashboards for district, area and unit management',
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
  {
    id: 'ihthisabi-report',
    title: 'IHTHISABI Report',
    description: 'Access reporting system for member management',
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

const trustItems = [
  {
    title: 'Secure & Reliable',
    description: 'Your data is protected with advanced security',
    icon: Shield,
  },
  {
    title: 'Fast & Efficient',
    description: 'Streamlined processes for better productivity',
    icon: Zap,
  },
  {
    title: 'User Friendly',
    description: 'Designed for everyone to use with ease',
    icon: UserRound,
  },
  {
    title: 'Data Driven',
    description: 'Accurate reports for smarter decisions',
    icon: BarChart3,
  },
];

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
    if (action.path) {
      navigate(action.path);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#f8f9ff] text-[#10274f]">
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

      <BackgroundCanvas />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-3 sm:px-6 lg:px-8">
        <header className="absolute right-4 top-3 z-20 sm:right-6 lg:right-8">
          <button
            type="button"
            onClick={() => setShowHelpDesk(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-xs font-semibold text-[#17325b] shadow-[0_12px_35px_rgba(85,91,144,0.14)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_38px_rgba(85,91,144,0.18)] focus:outline-none focus:ring-2 focus:ring-[#7d5df1]/35 sm:text-sm"
          >
            <PhoneCall className="h-4 w-4 text-[#7548e8]" />
            <span>Help Desk</span>
          </button>
        </header>

        <main className="flex min-h-0 flex-1 flex-col justify-start pt-8 sm:pt-9 lg:pt-7">
          <section className="landing-fade-up text-center">
            <img src={jihLogo} alt="JIH Plus Portal" className="mx-auto h-11 w-auto sm:h-12 lg:h-14" />
            <h1
              className="mt-2 text-2xl font-bold leading-tight text-[#10274f] sm:text-3xl lg:text-[2rem]"
              style={{ fontFamily: 'Cinzel, Georgia, serif', letterSpacing: '0' }}
            >
              JIH Plus Portal
            </h1>
            <div className="mx-auto mt-2 flex w-16 items-center justify-center gap-1.5">
              <span className="h-1.5 w-6 rounded-full bg-[#7548e8]" />
              <span className="h-1.5 w-3 rounded-full bg-[#7548e8]" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#71809d] sm:text-sm">One Portal. Many Possibilities.</p>
          </section>

          <section className="mt-4 grid min-h-0 gap-3 md:grid-cols-3 md:gap-4 lg:gap-5 xl:mt-5">
            {orderedPortalCards.map((card, index) => (
              <PortalCard
                key={card.id}
                card={card}
                index={index}
                onAction={handleAction}
              />
            ))}
          </section>

          <TrustStrip />
        </main>

        <footer className="relative z-10 pb-3 pt-2 text-center md:pb-0">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-1.5 text-xs text-[#6d7892] shadow-[0_10px_32px_rgba(91,98,141,0.12)] backdrop-blur">
            <span>Powered by</span>
            <img src={d4dxLogo} alt="D4DX Logo" className="h-5 w-auto" />
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
      className={`landing-fade-up group relative flex flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/[0.82] p-4 text-center shadow-[0_18px_50px_rgba(87,91,145,0.16)] backdrop-blur transition duration-300 sm:min-h-[265px] sm:p-5 lg:min-h-[300px] lg:p-5 ${
        disabled ? 'opacity-80 grayscale-[0.35]' : 'hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(87,91,145,0.22)]'
      }`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      {disabled && (
        <span className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-[#10274f] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white shadow-md">
          <Clock className="h-3 w-3" />
          Coming Soon
        </span>
      )}

      <div className={`absolute left-1/2 top-5 h-20 w-20 -translate-x-1/2 rounded-full ${accent.glow} opacity-80 blur-2xl`} />

      <div
        className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/55 shadow-inner ring-1 ring-white/80 transition duration-300 sm:h-16 sm:w-16 lg:h-[4.5rem] lg:w-[4.5rem] ${
          disabled ? '' : 'group-hover:scale-105'
        }`}
        aria-hidden="true"
      >
        <span className={`flex h-[2.9rem] w-[2.9rem] items-center justify-center rounded-full ${accent.iconWrap} sm:h-[3.25rem] sm:w-[3.25rem] lg:h-[3.75rem] lg:w-[3.75rem]`}>
          <Icon className={`h-6 w-6 ${accent.icon} sm:h-7 sm:w-7 lg:h-8 lg:w-8`} strokeWidth={2.3} />
        </span>
      </div>

      <h2 className="relative mt-3 text-lg font-extrabold leading-tight text-[#14305c] sm:mt-4 lg:text-xl">{card.title}</h2>
      <span className={`mx-auto mt-2 h-1 w-10 rounded-full ${accent.underline} sm:mt-3`} />
      <p className="mx-auto mt-2 max-w-[220px] text-xs font-medium leading-5 text-[#68758f] sm:mt-3 lg:text-sm">{card.description}</p>

      <div className="hidden md:block">
        <DecorativeIllustration type={card.illustration} accent={card.accent} />
      </div>

      {disabled ? (
        <div className="relative z-10 mt-4 md:mt-auto">
          <div className="flex w-full min-h-[48px] cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#d8dcec] bg-[#eef0f8] px-4 py-2.5 text-xs font-bold text-[#5c6787] lg:text-sm">
            <Clock className="h-4 w-4" />
            <span>Coming Soon</span>
          </div>
        </div>
      ) : (
        <div className="relative z-10 mt-4 space-y-2.5 md:mt-auto">
          {card.actions.map((action) => (
            <PortalActionButton key={action.label} action={action} onClick={() => onAction(action)} />
          ))}
        </div>
      )}
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

const TrustStrip = () => (
  <section className="landing-fade-up mt-4 rounded-2xl border border-white/80 bg-white/[0.72] px-4 py-3 shadow-[0_18px_50px_rgba(87,91,145,0.14)] backdrop-blur sm:px-6 lg:px-8">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
      {trustItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className={`flex items-center gap-3 lg:px-4 ${index > 0 ? 'lg:border-l lg:border-[#e3e6f4]' : ''}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1eaff] text-[#7548e8] lg:h-11 lg:w-11">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-extrabold text-[#18315e]">{item.title}</span>
              <span className="mt-1 block text-xs font-medium leading-5 text-[#73809a]">{item.description}</span>
            </span>
          </div>
        );
      })}
    </div>
  </section>
);

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
        <div className="inline-flex items-center gap-2 rounded-full bg-[#7548e8]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#5a34b0]">
          <PhoneCall className="h-3.5 w-3.5" />
          <span>Help Desk</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1f9] text-[#263758] transition hover:bg-[#e3e7f4]"
          aria-label="Close"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        {PUBLIC_HELP_DESK_CONTACTS.map((contact) => (
          <div key={contact.id} className="rounded-2xl border border-[#e6e8f5] bg-white p-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#7548e8]">{contact.topic}</p>
            <p className="mt-0.5 text-sm font-extrabold text-[#14305c]">{contact.person}</p>

            <div className="mt-3 space-y-2">
              {contact.phones.map((phone) => (
                <div
                  key={`${contact.id}-${phone.value}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f7fc] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[0.65rem] font-semibold uppercase tracking-wide text-[#8992ac]">{phone.label}</p>
                    <p className="text-sm font-bold text-[#14305c]">{phone.value}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={getTelHref(phone.value)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10274f] text-white transition hover:bg-[#17325b]"
                      aria-label={`Call ${contact.person}`}
                    >
                      <PhoneCall className="h-4 w-4" />
                    </a>
                    <a
                      href={getWhatsAppHref(phone.value, contact.topic)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#957C3D]/40 bg-[#957C3D]/10 text-[#7b652f] transition hover:bg-[#957C3D]/20"
                      aria-label={`Message ${contact.person}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
  );
};

const BackgroundCanvas = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full border border-white/65 bg-[#e7eaff] opacity-75" />
    <div className="absolute -left-14 top-7 h-52 w-52 rounded-full border border-white/80 bg-[#f4f6ff] opacity-85" />
    <div className="absolute -right-24 -bottom-20 h-[410px] w-[410px] rounded-full border border-white/70 bg-[#e5ddff] opacity-80" />
    <div className="absolute bottom-10 right-7 h-64 w-64 rounded-full border border-white/85 bg-[#f6f3ff] opacity-75" />
    <div className="absolute right-20 top-8 grid grid-cols-5 gap-2 opacity-35">
      {Array.from({ length: 25 }).map((_, index) => (
        <span key={index} className="h-1.5 w-1.5 rounded-full bg-[#b5abe9]" />
      ))}
    </div>
    <div className="absolute bottom-14 left-7 hidden grid-cols-6 gap-2 opacity-35 sm:grid">
      {Array.from({ length: 24 }).map((_, index) => (
        <span key={index} className="h-1.5 w-1.5 rounded-full bg-[#b5abe9]" />
      ))}
    </div>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.82),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(140,111,245,0.17),transparent_32%)]" />
  </div>
);

export default LandingPage;
