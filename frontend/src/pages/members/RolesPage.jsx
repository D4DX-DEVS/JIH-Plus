import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import {
  Button, Card, Field, Input, Modal, PageHeader, Pagination, Select, Spinner,
  TableWrap, Th, PAGE_SIZE
} from '../../components/members/ui'

const SCOPE_TYPES = ['state', 'mekhala', 'district', 'area', 'unit']
const BLANK = { key: '', name: '', nameMl: '', level: 5, scopeType: 'unit', canCreateAccessLinks: false }

/**
 * Roles are data, not code. A role added here can be assigned to accounts, given
 * comment sections in the form builder, and placed on a workflow stage — no
 * deployment needed. The `key` is what workflows and form fields reference, so it
 * is fixed once created.
 */
export default function RolesPage() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/admin/roles', { params: { page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        setRoles(data.roles || [])
        setTotal(data.pagination?.total || 0)
      })
      .catch(err => toast.error(apiError(err, 'Failed to load roles')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [page])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (editing._id) await api.put(`/admin/roles/${editing._id}`, editing)
      else await api.post('/admin/roles', editing)
      toast.success('Role saved')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not save the role'))
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/admin/roles/${toDelete._id}`)
      toast.success('Role deleted')
      setToDelete(null)
      if (roles.length === 1 && page > 1) setPage(p => p - 1)
      else load()
    } catch (err) {
      toast.error(apiError(err, 'Could not delete the role'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="The hierarchy that drives scoping, form comment sections and workflow stages."
        hideTitleOnMobile
        actions={<Button onClick={() => setEditing({ ...BLANK })}><Plus size={16} /> New role</Button>}
      />

      <Card>
        {loading ? <Spinner /> : (
          <>
            {/* Mobile: roomy tappable rows — one full-width target per record */}
            <div className="lg:hidden divide-y divide-gray-100">
              {roles.map(role => (
                <div key={role._id} className="min-h-[56px] flex items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-gray-900 break-words leading-snug">
                      {role.name}
                      {role.nameMl && <span className="block text-[11px] font-normal text-gray-500 break-words leading-relaxed">{role.nameMl}</span>}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Rank {role.level} · {role.key} · <span className="capitalize">{role.scopeType}</span> ·{' '}
                      {role.canCreateAccessLinks ? 'Can issue access links' : 'No access links'}
                    </p>
                    {!role.isActive && <p className="text-[11px] text-red-500 mt-0.5">Inactive</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setEditing(role)}
                      className="flex min-h-11 min-w-11 items-center justify-center text-[#5b21b6] text-[13px] font-medium"
                    >
                      Edit
                    </button>
                    {!role.isSystem && (
                      <button
                        onClick={() => setToDelete(role)}
                        aria-label="Delete role"
                        className="flex min-h-11 min-w-11 items-center justify-center text-gray-400 active:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <TableWrap>
            <table className="hidden lg:table w-full text-sm min-w-[680px]">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <Th>Rank</Th>
                  <Th>Role</Th>
                  <Th>Key</Th>
                  <Th>Scope</Th>
                  <Th>Access links</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roles.map(role => (
                  <tr key={role._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{role.level}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{role.name}</span>
                      {role.nameMl && <span className="block text-xs text-gray-500 break-words leading-relaxed">{role.nameMl}</span>}
                      {!role.isActive && <span className="block text-xs text-red-500">Inactive</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{role.key}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{role.scopeType}</td>
                    <td className="px-4 py-3 text-gray-600">{role.canCreateAccessLinks ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => setEditing(role)} className="text-[#5b21b6] hover:underline py-2 px-1 mr-2">
                        Edit
                      </button>
                      {!role.isSystem && (
                        <button onClick={() => setToDelete(role)} aria-label="Delete role" className="text-gray-400 hover:text-red-600 p-2">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </TableWrap>
          </>
        )}
      </Card>

      <Pagination page={page} total={total} onChange={setPage} />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit role' : 'New role'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="role-form" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save role'}</Button>
          </>
        }
      >
        {editing && (
          <form id="role-form" onSubmit={save} className="space-y-4">
            <Field
              label="Key"
              required
              hint={editing._id
                ? 'Fixed — workflow stages and form fields reference this.'
                : 'Letters and numbers only, e.g. zonalAdmin. Cannot be changed later.'}
            >
              <Input
                value={editing.key}
                onChange={e => setEditing({ ...editing, key: e.target.value })}
                disabled={Boolean(editing._id)}
                required
              />
            </Field>

            <Field label="Display name" required>
              <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required />
            </Field>

            <Field label="Malayalam name">
              <Input value={editing.nameMl || ''} onChange={e => setEditing({ ...editing, nameMl: e.target.value })} />
            </Field>

            <Field label="Rank" required hint="0 is highest. Lower ranks get larger numbers.">
              <Input
                type="number"
                min="0"
                value={editing.level}
                onChange={e => setEditing({ ...editing, level: Number(e.target.value) })}
                required
              />
            </Field>

            <Field label="Scope" required hint="What geography an account with this role is posted to.">
              <Select value={editing.scopeType} onChange={e => setEditing({ ...editing, scopeType: e.target.value })}>
                {SCOPE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(editing.canCreateAccessLinks)}
                onChange={e => setEditing({ ...editing, canCreateAccessLinks: e.target.checked })}
                className="mt-0.5"
              />
              <span>Can issue temporary form access links to applicants</span>
            </label>

            {editing._id && !editing.isSystem && (
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editing.isActive !== false}
                  onChange={e => setEditing({ ...editing, isActive: e.target.checked })}
                  className="mt-0.5"
                />
                <span>Active</span>
              </label>
            )}
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete this role?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete role'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          <strong>{toDelete?.name}</strong> will be removed permanently. Accounts using this role must be
          reassigned first.
        </p>
      </Modal>
    </div>
  )
}
