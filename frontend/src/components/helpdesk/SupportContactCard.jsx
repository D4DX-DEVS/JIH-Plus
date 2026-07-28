import React from 'react'
import { MessageCircle, PhoneCall, UserRound, BadgeInfo, Mail, Hash } from 'lucide-react'
import { getTelHref, getWhatsAppHref } from '../../data/helpDeskContacts'

const SupportContactCard = ({
  topic,
  person,
  designation,
  description,
  phones = [],
  email,
  referenceLabel,
  referenceValue
}) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-slate-200/70 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-300/40 sm:rounded-3xl sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-3 sm:mb-5 sm:gap-4">
        <div>
          <p className="mb-1.5 inline-flex rounded-full bg-[#002349]/8 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#002349] sm:mb-2 sm:px-3 sm:py-1 sm:text-xs">
            {topic}
          </p>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{person}</h2>
          {designation && (
            <p className="mt-1 text-xs font-medium text-[#957C3D] sm:text-sm">{designation}</p>
          )}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#002349] to-[#1a3a5c] text-white shadow-md sm:h-12 sm:w-12 sm:rounded-2xl">
          <UserRound className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>

      {description && (
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:mb-5 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm">
          <BadgeInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#002349] sm:h-4 sm:w-4" />
          <p>{description}</p>
        </div>
      )}

      <div className="space-y-2 sm:space-y-3">
        {phones.map((phone) => (
          <div key={`${topic}-${phone.label}-${phone.value}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:rounded-2xl sm:p-4">
            <div className="mb-2 flex items-start justify-between gap-3 sm:mb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{phone.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{phone.value}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
              <a
                href={getTelHref(phone.value)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#002349] px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#1a3a5c] sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm"
              >
                <PhoneCall className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Call</span>
              </a>
              <a
                href={getWhatsAppHref(phone.value, topic)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#957C3D] bg-[#957C3D]/10 px-3 py-2 text-xs font-semibold text-[#7b652f] transition-colors duration-200 hover:bg-[#957C3D]/20 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm"
              >
                <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Message</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {(email || referenceValue) && (
        <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-xs text-slate-600 sm:mt-5 sm:space-y-2 sm:pt-4 sm:text-sm">
          {email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-[#002349] sm:h-4 sm:w-4" />
              <span>{email}</span>
            </div>
          )}
          {referenceValue && (
            <div className="flex items-center gap-2">
              <Hash className="h-3.5 w-3.5 text-[#002349] sm:h-4 sm:w-4" />
              <span>{referenceLabel || 'Reference'}: {referenceValue}</span>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default SupportContactCard