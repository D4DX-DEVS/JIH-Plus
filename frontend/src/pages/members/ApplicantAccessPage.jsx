import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertTriangle, ArrowRight, CheckCircle2, Lock, ShieldCheck, User } from 'lucide-react'
import { applicantApi, apiError, APPLICANT_TOKEN_KEY } from '../../utils/members/api'
import DynamicFormRenderer from '../../components/reportRenderer/DynamicFormRenderer'
import { Button, Field, Input, PasswordInput } from '../../components/members/ui'
import AuthLayout from '../../components/members/AuthLayout'
import BrandLogo from '../../components/branding/BrandLogo'

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

// The server stores uploads on the CDN, which only accepts these image types,
// and the whole submission must fit the API's 10 MB request limit.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_FILE_BYTES = 7 * 1024 * 1024

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(file)
})

// The renderer holds chosen files as File objects, which JSON turns into {}.
// Send them as data URLs, which the server uploads and swaps for CDN links.
async function serializeFiles(formData) {
  const out = { ...formData }
  let total = 0
  for (const [key, value] of Object.entries(out)) {
    if (!(value instanceof File)) continue
    if (!IMAGE_TYPES.includes(value.type)) {
      throw new Error(`"${value.name}" is not a supported image. Upload a JPG, PNG, GIF or WEBP file.`)
    }
    if (value.size > MAX_FILE_BYTES) throw new Error(`"${value.name}" is larger than 5 MB.`)
    total += value.size
    if (total > MAX_TOTAL_FILE_BYTES) throw new Error('The attached files together must be under 7 MB.')
    out[key] = await readAsDataUrl(value)
  }
  return out
}

// Drafts keep the typed answers only; a chosen file is picked again on return.
const withoutFiles = (formData) =>
  Object.fromEntries(Object.entries(formData || {}).filter(([, value]) => !(value instanceof File)))

// Steer the file picker to the image types the server accepts.
const withImageAccept = (template) => ({
  ...template,
  pages: (template.pages || []).map(page => ({
    ...page,
    fields: (page.fields || []).map(field => (field.type === 'file' && !field.accept
      ? { ...field, accept: IMAGE_TYPES.join(',') }
      : field))
  }))
})

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
      setTemplate(withImageAccept(data.template))
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
      await applicantApi.put('/access/draft', { formData: withoutFiles(formData), lastPage })
      const hadFiles = Object.values(formData || {}).some(value => value instanceof File)
      toast.success(hadFiles ? 'Progress saved. Attach your files again before you submit.' : 'Progress saved')
    } catch (error) {
      toast.error(apiError(error, 'Could not save your progress'))
    }
  }

  const submit = async (formData) => {
    setSubmitting(true)
    try {
      await applicantApi.post('/access/submit', { formData: await serializeFiles(formData) })
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
      <StatusScreen
        tone="success"
        title="Application submitted"
        message="Your application has been sent for verification. Your unit admin will contact you if anything else is needed. You can close this page."
      />
    )
  }

  if (blockedMessage) {
    return (
      <StatusScreen
        tone="warning"
        title="Form unavailable"
        message={blockedMessage}
        action={
          <Button variant="secondary" className="w-full" onClick={() => { setBlockedMessage(''); loadForm() }}>
            Try again
          </Button>
        }
      />
    )
  }

  if (!authed) {
    return (
      <AuthLayout
        title="Application Form"
        subtitle="Rukn & Karkun membership application"
        showPortalsLink={false}
        footer="Your application link and credentials are private. Do not share them."
      >
        <form onSubmit={signIn} className="space-y-4">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-50 text-royal-700">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-ink">Sign in to continue</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Enter the username and password your unit admin gave you.
              </p>
            </div>
          </div>

          <Field label="Username" required>
            <Input
              icon={User}
              value={credentials.username}
              onChange={e => setCredentials({ ...credentials, username: e.target.value })}
              autoComplete="off"
              autoCapitalize="none"
              placeholder="Your username"
              required
            />
          </Field>

          <Field label="Password" required>
            <PasswordInput
              icon={Lock}
              value={credentials.password}
              onChange={e => setCredentials({ ...credentials, password: e.target.value })}
              autoComplete="off"
              placeholder="Your password"
              required
            />
          </Field>

          <Button type="submit" size="lg" loading={loading} className="!mt-6 w-full">
            {loading ? 'Checking…' : <>Open form <ArrowRight size={18} strokeWidth={2.4} /></>}
          </Button>
        </form>
      </AuthLayout>
    )
  }

  if (loading || !template) return <StatusScreen tone="loading" title="Loading the form…" />

  return (
    <div className="mbr mbr-canvas mobile-readable-content min-h-dvh">
      <header className="mbr-hero px-4 pb-12 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6 sm:pb-16 sm:pt-8">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.12] ring-1 ring-inset ring-white/20">
              <BrandLogo variant="white" size="xs" alt="JIH Plus" className="!h-5" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-royal-100/80">Members Application</p>
          </div>
          <h1 className="mt-3 text-xl font-bold leading-snug tracking-tight text-white [overflow-wrap:anywhere] sm:text-3xl">{template.title}</h1>
          {template.description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-royal-100/80 [overflow-wrap:anywhere]">{template.description}</p>
          )}
        </div>
      </header>

      <main className="relative z-[1] -mt-7 px-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:-mt-10 sm:px-6">
        <div className="mbr-card mbr-form mx-auto max-w-3xl p-4 shadow-[0_8px_32px_rgba(11,20,48,0.08)] sm:p-6">
          <DynamicFormRenderer
            report={template}
            initialData={draft.formData}
            initialPage={draft.lastPage}
            submitting={submitting}
            onSubmit={submit}
            onSaveDraft={saveDraft}
          />
        </div>
        <p className="mx-auto mt-4 flex max-w-3xl items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <Lock size={13} className="shrink-0" /> Your answers are saved privately against your personal link.
        </p>
      </main>
    </div>
  )
}

/** Full-screen centred state for the applicant: done, unavailable or loading. */
function StatusScreen({ tone, title, message, action }) {
  const icon = {
    success: <CheckCircle2 size={30} />,
    warning: <AlertTriangle size={28} />
  }[tone]
  return (
    <div className="mbr mbr-canvas mobile-readable-content flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mbr-card w-full max-w-sm p-6 text-center sm:p-8">
        {tone === 'loading' ? (
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-royal-100 border-t-royal-600" role="status" />
        ) : (
          <span className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${tone === 'success' ? 'bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60' : 'bg-amber-50 text-amber-600 ring-8 ring-amber-50/60'}`}>
            {icon}
          </span>
        )}
        <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
        {message && <p className="mt-2 text-sm leading-relaxed text-slate-500">{message}</p>}
        {action && <div className="mt-6">{action}</div>}
      </div>
      <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
        <BrandLogo size="xs" alt="JIH Plus" className="!h-5 opacity-80" />
        Members Application
      </div>
    </div>
  )
}
