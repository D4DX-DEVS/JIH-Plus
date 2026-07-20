import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, LifeBuoy } from 'lucide-react'
import SupportContactCard from '../components/helpdesk/SupportContactCard'
import { PUBLIC_HELP_DESK_CONTACTS } from '../data/helpDeskContacts'

const HelpDeskPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,35,73,0.12),_transparent_36%),linear-gradient(135deg,_#f8fafc_0%,_#dbeafe_45%,_#eef2ff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-[#002349] shadow-sm transition-colors duration-200 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </button>
        </div>

        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-xl shadow-slate-200/50 backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#002349]/10 px-4 py-2 text-sm font-semibold text-[#002349]">
                <LifeBuoy className="h-4 w-4" />
                <span>Help Desk</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Support Contacts</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Use the contacts below for portal help, membership application support, and Ihthisabi reporting queries. Each contact includes direct call and message actions.
              </p>
            </div>
            <div className="rounded-2xl border border-[#957C3D]/20 bg-[#957C3D]/10 px-5 py-4 text-sm text-[#6f5a2a]">
              For urgent issues, contact the relevant desk directly instead of waiting for email follow-up.
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {PUBLIC_HELP_DESK_CONTACTS.map((contact) => (
            <SupportContactCard key={contact.id} {...contact} />
          ))}
        </section>
      </div>
    </div>
  )
}

export default HelpDeskPage