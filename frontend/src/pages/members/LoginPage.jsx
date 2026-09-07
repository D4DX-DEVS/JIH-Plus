import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, ExternalLink, Link2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../contexts/members/AuthContext'
import { Button, Field, Input } from '../../components/members/ui'
import BrandLogo from '../../components/branding/BrandLogo'

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
    <div className="mobile-readable-content min-h-screen bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] px-3 py-4 sm:flex sm:items-center sm:justify-center sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-white/70 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> All portals
        </button>

        <div className="mb-4 text-center">
          <BrandLogo alt="JIH Plus" size="md" className="mx-auto mb-2" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Members Application</h1>
          <p className="mt-1 text-sm text-gray-600">Rukn &amp; Karkoon application portal</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-lg shadow-violet-100">
          <div className="grid grid-cols-2 gap-1 border-b border-gray-100 bg-gray-50 p-1.5">
            <button
              type="button"
              onClick={() => setMode('staff')}
              aria-pressed={mode === 'staff'}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${mode === 'staff' ? 'bg-white text-[#5b21b6] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <ShieldCheck size={17} /> Staff login
            </button>
            <button
              type="button"
              onClick={() => setMode('applicant')}
              aria-pressed={mode === 'applicant'}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${mode === 'applicant' ? 'bg-white text-[#5b21b6] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <Link2 size={17} /> Applicant form
            </button>
          </div>

          {mode === 'staff' ? (
            <form onSubmit={submit} className="space-y-4 p-4 sm:p-6">
              <div>
                <h2 className="font-semibold text-gray-900">Administration access</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">For authorised administrators and reviewers.</p>
              </div>
              <Field label="Username" required>
                <Input
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </Field>

              <Field label="Password" required>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  required
                />
              </Field>

              <Button type="submit" disabled={busy} className="w-full">
                {busy ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          ) : (
            <form onSubmit={openApplicantForm} className="space-y-4 p-4 sm:p-6">
              <div>
                <h2 className="font-semibold text-gray-900">Open your application</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                  Paste the personal link shared by your unit administrator. Your username and password will be requested on the next screen.
                </p>
              </div>
              <Field label="Personal application link" required hint="Only a valid Members Application link can be opened.">
                <Input
                  value={accessLink}
                  onChange={e => setAccessLink(e.target.value)}
                  placeholder="Paste link here"
                  inputMode="url"
                  autoComplete="off"
                  autoFocus
                  required
                />
              </Field>
              <Button type="submit" className="w-full">
                Open application form <ExternalLink size={16} />
              </Button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
          Application access is private. Use only the link and credentials issued to you.
        </p>
      </div>
    </div>
  )
}
