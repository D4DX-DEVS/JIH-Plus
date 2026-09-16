import React from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import HelpDeskContactList, { HelpDeskBadge } from '../components/helpdesk/HelpDeskContactList'
import { PUBLIC_HELP_DESK_CONTACTS } from '../data/helpDeskContacts'

// Full-page twin of the landing page help desk sheet, for direct links.
const HelpDeskPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#101936]/5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/80 bg-[#fbfcff] p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <HelpDeskBadge />
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1f9] text-[#263758] transition hover:bg-[#e3e7f4]"
            aria-label="Back to home"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <HelpDeskContactList contacts={PUBLIC_HELP_DESK_CONTACTS} className="mt-4" />
      </div>
    </div>
  )
}

export default HelpDeskPage
