import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, LifeBuoy, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { api } from '../../utils/ihthisabi/api'
import SupportContactCard from '../../components/helpdesk/SupportContactCard'
import { IHTHISABI_HELP_DESK_CONTACTS } from '../../data/helpDeskContacts'

const HelpDeskPage = () => {
  const { user } = useAuth()
  const [unitAdminSupport, setUnitAdminSupport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchHelpDeskSupport = async () => {
      if (user?.role !== 'rukn') {
        setUnitAdminSupport(null)
        return
      }

      try {
        setLoading(true)
        setError('')
        const response = await api.get('/auth/helpdesk')
        setUnitAdminSupport(response.data?.data?.unitAdmin || null)
      } catch (fetchError) {
        console.error('Failed to fetch unit admin support details:', fetchError)
        setError('Could not load your unit admin support details right now.')
      } finally {
        setLoading(false)
      }
    }

    fetchHelpDeskSupport()
  }, [user?.role])

  const contacts = useMemo(() => {
    const baseContacts = [...IHTHISABI_HELP_DESK_CONTACTS]

    if (user?.role === 'rukn' && unitAdminSupport?.contactNo) {
      baseContacts.push({
        id: 'unit-admin-support',
        topic: 'Your Unit Admin',
        person: unitAdminSupport.name || 'Unit Admin',
        designation: unitAdminSupport.unit ? `${unitAdminSupport.unit} Unit Admin` : 'Unit Admin',
        description: [unitAdminSupport.area, unitAdminSupport.district].filter(Boolean).join(' • ') || 'Your assigned unit admin support contact.',
        phones: [
          {
            label: 'Mobile Number',
            value: unitAdminSupport.contactNo
          }
        ],
        email: unitAdminSupport.emailId
      })
    }

    return baseContacts
  }, [unitAdminSupport, user?.role])

  return (
    <div className="max-w-6xl mx-auto px-3 py-3 sm:px-6 sm:py-6">
      <section className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:mb-4 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
              <LifeBuoy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Ihthisabi Help Desk</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-3xl">Get Support Quickly</h1>
            <p className="mt-1.5 text-xs leading-5 text-gray-600 sm:mt-3 sm:text-base sm:leading-6">
              This page covers common Ihthisabi support contacts. Membership application support is intentionally excluded here.
            </p>
          </div>
          {user?.role === 'rukn' && user?.unit && (
            <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5 text-xs text-gray-700 sm:rounded-2xl sm:px-5 sm:py-4 sm:text-sm">
              Logged in as a member from <span className="font-semibold text-gray-900">{user.unit}</span>.
            </div>
          )}
        </div>
      </section>

      {user?.role === 'rukn' && loading && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-600 shadow-sm sm:mb-6 sm:gap-3 sm:rounded-2xl sm:px-5 sm:py-4 sm:text-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary sm:h-4 sm:w-4" />
          <span>Loading your unit admin contact details...</span>
        </div>
      )}

      {user?.role === 'rukn' && error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 sm:mb-6 sm:gap-3 sm:rounded-2xl sm:px-5 sm:py-4 sm:text-sm">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          <span>{error}</span>
        </div>
      )}

      {user?.role === 'rukn' && !loading && !error && !unitAdminSupport?.contactNo && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 sm:mb-6 sm:gap-3 sm:rounded-2xl sm:px-5 sm:py-4 sm:text-sm">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500 sm:h-4 sm:w-4" />
          <span>Your unit admin contact is not available in the system yet. You can still use the common Ihthisabi help desk contacts below.</span>
        </div>
      )}

      <section className="grid gap-3 sm:gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {contacts.map((contact) => (
          <SupportContactCard key={contact.id} {...contact} />
        ))}
      </section>
    </div>
  )
}

export default HelpDeskPage