import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bell, FileCheck2, Link2, Lock } from 'lucide-react'
import BrandLogo from '../branding/BrandLogo'

const HIGHLIGHTS = [
  { icon: Link2, title: 'Personal application links', text: 'Each applicant gets a private link and credential.' },
  { icon: FileCheck2, title: 'Stage-by-stage review', text: 'Unit, area and district reviews in one trail.' },
  { icon: Bell, title: 'Instant updates', text: 'Reviewers are notified the moment it is their turn.' }
]

/**
 * Frame for the members sign-in screens (staff login and the applicant's link
 * login). Phones: royal hero on top, the form on a white sheet that overlaps
 * it. Desktop: brand panel on the left, form card on the right.
 */
export default function AuthLayout({ title = 'Members Portal', subtitle = 'Rukn & Karkoon application portal', showPortalsLink = true, footer, children }) {
  return (
    <div className="mbr flex min-h-dvh flex-col bg-mist lg:flex-row">
      <section className="mbr-hero px-5 pb-14 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-8 lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:px-14 lg:pb-12 lg:pt-10">
        <div className="flex h-10 items-center">
          {showPortalsLink && (
            <Link
              to="/"
              className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={17} />
              All portals
            </Link>
          )}
        </div>

        <div className="mt-4 text-center lg:mt-0 lg:text-left">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-white/[0.12] ring-1 ring-inset ring-white/20 backdrop-blur lg:mx-0 lg:mb-7 lg:h-[4.5rem] lg:w-[4.5rem]">
            <BrandLogo variant="white" size="md" alt="JIH Plus" />
          </span>
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-white lg:text-[2.75rem]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[15px] text-royal-100/80 lg:mt-3 lg:text-lg">{subtitle}</p>}

          <ul className="mt-10 hidden max-w-md space-y-5 lg:block">
            {HIGHLIGHTS.map((item) => {
              const HighlightIcon = item.icon
              const { title: heading, text } = item
              return (
              <li key={heading} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
                  <HighlightIcon size={19} />
                </span>
                <span>
                  <span className="block font-semibold text-white">{heading}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-royal-100/75">{text}</span>
                </span>
              </li>
              )
            })}
          </ul>
        </div>

        <p className="hidden text-xs text-royal-100/60 lg:block">Jamaat-e-Islami Hind · Kerala</p>
      </section>

      <section className="relative -mt-8 flex flex-1 flex-col rounded-t-[1.75rem] bg-[#fff] px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6 shadow-[0_-8px_32px_rgba(11,20,48,0.12)] sm:px-8 lg:mt-0 lg:items-center lg:justify-center lg:rounded-none lg:bg-mist lg:px-10 lg:shadow-none">
        <div className="mx-auto w-full max-w-md lg:rounded-[1.5rem] lg:border lg:border-line lg:bg-[#fff] lg:p-9 lg:shadow-[0_12px_40px_rgba(11,20,48,0.08)]">
          {children}
        </div>
        <p className="mx-auto mt-6 flex max-w-md items-start justify-center gap-2 px-2 text-center text-xs leading-relaxed text-slate-500">
          <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{footer || 'Access is private. Use only the link and credentials issued to you.'}</span>
        </p>
      </section>
    </div>
  )
}
