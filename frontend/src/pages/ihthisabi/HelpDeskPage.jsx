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
    <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
      <section className="mb-6 overflow-hidden rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              <LifeBuoy className="h-4 w-4" />
              <span>Ihthisabi Help Desk</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Get Support Quickly</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
              This page covers common Ihthisabi support contacts. Membership application support is intentionally excluded here.
            </p>
          </div>
          {user?.role === 'rukn' && user?.unit && (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-sm text-gray-700">
              Logged in as a member from <span className="font-semibold text-gray-900">{user.unit}</span>.
            </div>
          )}
        </div>
      </section>

      {user?.role === 'rukn' && loading && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Loading your unit admin contact details...</span>
        </div>
      )}

      {user?.role === 'rukn' && error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {user?.role === 'rukn' && !loading && !error && !unitAdminSupport?.contactNo && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span>Your unit admin contact is not available in the system yet. You can still use the common Ihthisabi help desk contacts below.</span>
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {contacts.map((contact) => (
          <SupportContactCard key={contact.id} {...contact} />
        ))}
      </section>
    </div>
  )
}

export default HelpDeskPage