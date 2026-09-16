import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/ihthisabi/AuthContext'
import { api } from '../../utils/ihthisabi/api'
import HelpDeskContactList, { HelpDeskBadge } from '../../components/helpdesk/HelpDeskContactList'
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
        topic: unitAdminSupport.unit ? `Your Unit Admin · ${unitAdminSupport.unit}` : 'Your Unit Admin',
        person: unitAdminSupport.name || 'Unit Admin',
        phones: [
          {
            label: 'Mobile Number',
            value: unitAdminSupport.contactNo
          }
        ]
      })
    }

    return baseContacts
  }, [unitAdminSupport, user?.role])

  return (
    <div className="mx-auto w-full max-w-md px-3 py-3 sm:px-6 sm:py-6">
      {/* Same sheet as the landing page help desk — the app bar already names
          the screen on phones, so the badge is the only heading. */}
      <div className="rounded-3xl border border-white/80 bg-[#fbfcff] p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <HelpDeskBadge />
        </div>

        {user?.role === 'rukn' && loading && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f6f7fc] px-3 py-2.5 text-xs text-[#8992ac]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7548e8]" />
            <span>Loading your unit admin contact…</span>
          </div>
        )}

        {user?.role === 'rukn' && error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {user?.role === 'rukn' && !loading && !error && !unitAdminSupport?.contactNo && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#f6f7fc] px-3 py-2.5 text-xs text-[#59677f]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8992ac]" />
            <span>Your unit admin contact is not in the system yet. Use the Ihthisabi help desk contacts below.</span>
          </div>
        )}

        <HelpDeskContactList contacts={contacts} className="mt-4" />
      </div>
    </div>
  )
}

export default HelpDeskPage
