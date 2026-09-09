import React from 'react'
import { MessageCircle, PhoneCall } from 'lucide-react'
import { getTelHref, getWhatsAppHref } from '../../data/helpDeskContacts'

/**
 * The one help-desk look used everywhere: the landing page modal, the public
 * /help-desk page and the Ihthisabi help desk all render this list so a person
 * sees the same compact card — topic, name, one row per number with round
 * Call / Message buttons — no matter where they opened it from.
 */
export const HelpDeskBadge = () => (
  <div className="inline-flex items-center gap-2 rounded-full bg-[#7548e8]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#5a34b0]">
    <PhoneCall className="h-3.5 w-3.5" />
    <span>Help Desk</span>
  </div>
)

const HelpDeskContactList = ({ contacts = [], className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {contacts.map((contact) => (
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
)

export default HelpDeskContactList
