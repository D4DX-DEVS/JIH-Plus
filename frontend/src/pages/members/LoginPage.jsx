import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/members/AuthContext'
import { Button, Field, Input } from '../../components/members/ui'

export default function LoginPage() {
  const { login, isAuthenticated, initializing } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f3ff] to-[#ede9fe] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white flex items-center justify-center font-bold shadow-md">
            MA
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Members Application</h1>
          <p className="text-sm text-gray-500 mt-1">Rukn &amp; Karkoon administration</p>
        </div>

        <form onSubmit={submit} className="bg-white border border-gray-200/80 rounded-2xl shadow-lg shadow-violet-100 p-6 space-y-4">
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

        <p className="text-center text-xs text-gray-500 mt-5">
          Applicants: use the personal link your unit admin shared with you.
        </p>
      </div>
    </div>
  )
}
