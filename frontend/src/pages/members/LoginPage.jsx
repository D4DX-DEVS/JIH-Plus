import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowRight, ExternalLink, Link2, Lock, ShieldCheck, User, Users } from 'lucide-react'
import { useAuth } from '../../contexts/members/AuthContext'
import AuthShell from '../../components/auth/AuthShell'
import { AuthButton, AuthField, AuthInfoBanner, AuthTabs } from '../../components/auth/AuthControls'

const ACCESS_TABS = [
  { value: 'staff', label: 'Staff login', icon: ShieldCheck },
  { value: 'applicant', label: 'Applicant form', icon: Link2 },
]

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
    <AuthShell title="Members Application" subtitle="Rukn & Karkoon application portal">
      <AuthTabs variant="soft" label="Access type" tabs={ACCESS_TABS} value={mode} onChange={setMode} />

      {mode === 'staff' ? (
        <form onSubmit={submit} className="mt-5 space-y-5" aria-busy={busy}>
          <AuthInfoBanner
            icon={Users}
            title="Administration access"
            description="For authorised administrators and reviewers."
          />
          <AuthField
            id="members-username"
            label="Username"
            required
            icon={User}
            value={form.username}
            onChange={e => setForm({ ...form, username: e.target.value })}
            placeholder="Enter username"
            autoComplete="username"
            autoFocus
          />
          <AuthField
            id="members-password"
            label="Password"
            required
            icon={Lock}
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Enter password"
            autoComplete="current-password"
          />
          <AuthButton type="submit" loading={busy} loadingLabel="Signing in..." className="w-full">
            Sign in
            <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
          </AuthButton>
        </form>
      ) : (
        <form onSubmit={openApplicantForm} className="mt-5 space-y-5">
          <AuthInfoBanner
            icon={Link2}
            title="Open your application"
            description="Paste the personal link shared by your unit administrator. Your username and password will be requested on the next screen."
          />
          <AuthField
            id="members-access-link"
            label="Personal application link"
            required
            icon={Link2}
            value={accessLink}
            onChange={e => setAccessLink(e.target.value)}
            placeholder="Paste link here"
            inputMode="url"
            autoComplete="off"
            autoFocus
            hint="Only a valid Members Application link can be opened."
          />
          <AuthButton type="submit" className="w-full">
            Open application form
            <ExternalLink className="h-5 w-5" strokeWidth={2.2} />
          </AuthButton>
        </form>
      )}

      <p className="mt-6 flex items-start justify-center gap-2 px-2 text-center text-sm leading-relaxed text-[#5b6b85]">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>Application access is private. Use only the link and credentials issued to you.</span>
      </p>
    </AuthShell>
  )
}
