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
    <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm shadow-slate-200/70 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-300/40">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex rounded-full bg-[#002349]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#002349]">
            {topic}
          </p>
          <h2 className="text-xl font-bold text-slate-900">{person}</h2>
          {designation && (
            <p className="mt-1 text-sm font-medium text-[#957C3D]">{designation}</p>
          )}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#002349] to-[#1a3a5c] text-white shadow-md">
          <UserRound className="h-6 w-6" />
        </div>
      </div>

      {description && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <BadgeInfo className="mt-0.5 h-4 w-4 shrink-0 text-[#002349]" />
          <p>{description}</p>
        </div>
      )}

      <div className="space-y-3">
        {phones.map((phone) => (
          <div key={`${topic}-${phone.label}-${phone.value}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{phone.label}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{phone.value}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={getTelHref(phone.value)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#002349] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1a3a5c]"
              >
                <PhoneCall className="h-4 w-4" />
                <span>Call</span>
              </a>
              <a
                href={getWhatsAppHref(phone.value, topic)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#957C3D] bg-[#957C3D]/10 px-4 py-2.5 text-sm font-semibold text-[#7b652f] transition-colors duration-200 hover:bg-[#957C3D]/20"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Message</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {(email || referenceValue) && (
        <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm text-slate-600">
          {email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#002349]" />
              <span>{email}</span>
            </div>
          )}
          {referenceValue && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-[#002349]" />
              <span>{referenceLabel || 'Reference'}: {referenceValue}</span>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default SupportContactCard