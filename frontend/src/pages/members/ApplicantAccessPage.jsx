import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CheckCircle2 } from 'lucide-react'
import { applicantApi, apiError, APPLICANT_TOKEN_KEY } from '../../utils/members/api'
import DynamicFormRenderer from '../../components/reportRenderer/DynamicFormRenderer'
import { Button, Field, Input, Spinner } from '../../components/members/ui'

/**
 * The only members screen an applicant ever sees.
 *
 * They reach it through a personal link their unit admin created, and must enter
 * the username and password issued with that link. The template that comes back
 * has already had every role-scoped page and field stripped server-side, so no
 * reviewer comment section is reachable from here even in the network response.
 */
// The session token alone isn't enough to know it belongs to *this* link — a
// second applicant opening their own link on a shared device would otherwise
// silently resume the first applicant's session. The link token travels
// alongside it so a resume only happens when they match.
const APPLICANT_LINK_KEY = `${APPLICANT_TOKEN_KEY}_link`

export default function ApplicantAccessPage() {
  const { token } = useParams()
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [authed, setAuthed] = useState(false)
  const [template, setTemplate] = useState(null)
  const [draft, setDraft] = useState({ formData: {}, lastPage: 0 })
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [blockedMessage, setBlockedMessage] = useState('')

  const loadForm = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await applicantApi.get('/access/form')
      setTemplate(data.template)
      setDraft(data.draft || { formData: {}, lastPage: 0 })
      setAuthed(true)
    } catch (error) {
      const status = error.response?.status
      if (status === 401) {
        localStorage.removeItem(APPLICANT_TOKEN_KEY)
        localStorage.removeItem(APPLICANT_LINK_KEY)
        setAuthed(false)
      } else {
        setBlockedMessage(apiError(error, 'This form is not available'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Resume an existing session on reload rather than asking for the credential
  // again — but only when the stored session was created from this same link.
  // A different applicant's link on the same device must always show the login form.
  useEffect(() => {
    const hasToken = localStorage.getItem(APPLICANT_TOKEN_KEY)
    const sessionLink = localStorage.getItem(APPLICANT_LINK_KEY)
    if (hasToken && sessionLink === token) {
      loadForm()
    } else if (hasToken) {
      localStorage.removeItem(APPLICANT_TOKEN_KEY)
      localStorage.removeItem(APPLICANT_LINK_KEY)
    }
  }, [loadForm, token])

  const signIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await applicantApi.post('/access/login', {
        token,
        username: credentials.username.trim(),
        password: credentials.password
      })
      localStorage.setItem(APPLICANT_TOKEN_KEY, data.token)
      localStorage.setItem(APPLICANT_LINK_KEY, token)
      await loadForm()
    } catch (error) {
      toast.error(apiError(error, 'Invalid link or credentials'))
      setLoading(false)
    }
  }

  const saveDraft = async (formData, lastPage) => {
    try {
      await applicantApi.put('/access/draft', { formData, lastPage })
      toast.success('Progress saved')
    } catch (error) {
      toast.error(apiError(error, 'Could not save your progress'))
    }
  }

  const submit = async (formData) => {
    setSubmitting(true)
    try {
      await applicantApi.post('/access/submit', { formData })
      localStorage.removeItem(APPLICANT_TOKEN_KEY)
      localStorage.removeItem(APPLICANT_LINK_KEY)
      setDone(true)
    } catch (error) {
      toast.error(apiError(error, 'Could not submit your application'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Shell>
        <div className="text-center py-10">
          <CheckCircle2 size={48} className="mx-auto text-green-600 mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">Application submitted</h1>
          <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto">
            Your application has been sent for verification. Your unit admin will contact you
            if anything else is needed. You can close this page.
          </p>
        </div>
      </Shell>
    )
  }

  if (blockedMessage) {
    return (
      <Shell>
        <div className="text-center py-10">
          <h1 className="text-lg font-semibold text-gray-900">Form unavailable</h1>
          <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto">{blockedMessage}</p>
          <Button variant="secondary" className="mt-4" onClick={() => { setBlockedMessage(''); loadForm() }}>
            Try again
          </Button>
        </div>
      </Shell>
    )
  }

  if (!authed) {
    return (
      <Shell>
        <form onSubmit={signIn} className="space-y-4">
          <div className="text-center mb-2">
            <h1 className="text-xl font-semibold text-gray-900">Application Form</h1>
            <p className="text-sm text-gray-500 mt-1">
              Enter the username and password your unit admin gave you.
            </p>
          </div>

          <Field label="Username" required>
            <Input
              value={credentials.username}
              onChange={e => setCredentials({ ...credentials, username: e.target.value })}
              autoComplete="off"
              autoFocus
              required
            />
          </Field>

          <Field label="Password" required>
            <Input
              type="password"
              value={credentials.password}
              onChange={e => setCredentials({ ...credentials, password: e.target.value })}
              autoComplete="off"
              required
            />
          </Field>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Checking...' : 'Open form'}
          </Button>
        </form>
      </Shell>
    )
  }

  if (loading || !template) return <Shell><Spinner label="Loading the form..." /></Shell>

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-gray-900 break-words">{template.title}</h1>
          {template.description && <p className="text-sm text-gray-600 mt-1 break-words">{template.description}</p>}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <DynamicFormRenderer
            report={template}
            initialData={draft.formData}
            initialPage={draft.lastPage}
            submitting={submitting}
            onSubmit={submit}
            onSaveDraft={saveDraft}
          />
        </div>
      </div>
    </div>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-white border border-gray-200/80 rounded-2xl shadow-lg shadow-violet-100 p-6">{children}</div>
    </div>
  )
}
