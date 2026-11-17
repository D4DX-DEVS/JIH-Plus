import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowRight, ExternalLink, Link2, Lock, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '../../contexts/members/AuthContext'
import AuthLayout from '../../components/members/AuthLayout'
import { Button, Field, Input, PasswordInput, Tabs } from '../../components/members/ui'

const ACCESS_TABS = [
  { value: 'staff', label: 'Staff sign in', icon: ShieldCheck },
  { value: 'applicant', label: 'Applicant', icon: Link2 },
]

// Autofocus only where it can't pop the phone keyboard over the page.
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches

export default function LoginPage() {
  const { login, isAuthenticated, initializing } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [accessLink, setAccessLink] = useState('')
  const [mode, setMode] = useState('staff')
  const [busy, setBusy] = useState(false)

  if (!initializing && isAuthenticated) return <Navigate to="/members" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const result = await login(form.username.trim(), form.password)
    setBusy(false)
    if (result.success) {
      navigate('/members', { replace: true })
    } else {
      toast.error(result.message)
    }
  }

  const openApplicantForm = (e) => {
    e.preventDefault()
    const value = accessLink.trim()
    if (!value) {
      toast.error('Paste the personal application link you received')
      return
    }

    let token = value
    try {
      const parsed = new URL(value, window.location.origin)
      const match = parsed.pathname.match(/^\/members\/apply\/([^/]+)\/?$/)
      if (match) token = decodeURIComponent(match[1])
    } catch {
      // A raw token is also accepted below.
    }

    if (!/^[a-f0-9]{48}$/i.test(token)) {
      toast.error('This does not look like a valid personal application link')
      return
    }

    navigate(`/members/apply/${encodeURIComponent(token)}`)
  }

  return (
    <AuthLayout>
      <Tabs tabs={ACCESS_TABS} value={mode} onChange={setMode} fill />

      {mode === 'staff' ? (
        <form onSubmit={submit} className="mt-6 space-y-4" aria-busy={busy}>
          <div className="mb-5">
            <h2 className="text-xl font-bold tracking-tight text-ink">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in as an administrator or reviewer.</p>
          </div>
          <Field label="Username" required>
            <Input
              id="members-username"
              icon={User}
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="Enter your username"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus={isDesktop()}
              required
            />
          </Field>
          <Field label="Password" required>
            <PasswordInput
              id="members-password"
              icon={Lock}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Button type="submit" size="lg" loading={busy} className="!mt-6 w-full">
            {busy ? 'Signing in…' : <>Sign in <ArrowRight size={18} strokeWidth={2.4} /></>}
          </Button>
        </form>
      ) : (
        <form onSubmit={openApplicantForm} className="mt-6 space-y-4">
          <div className="mb-5">
            <h2 className="text-xl font-bold tracking-tight text-ink">Open your application</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Paste the personal link your unit administrator shared. You'll enter your username and password on the next screen.
            </p>
          </div>
          <Field label="Personal application link" required hint="Only a valid Members Application link can be opened.">
            <Input
              id="members-access-link"
              icon={Link2}
              value={accessLink}
              onChange={e => setAccessLink(e.target.value)}
              placeholder="Paste link here"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              autoFocus={isDesktop()}
              required
            />
          </Field>
          <Button type="submit" size="lg" className="!mt-6 w-full">
            Open application form <ExternalLink size={17} />
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
