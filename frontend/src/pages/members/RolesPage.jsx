import ResponsiveTable from "../../components/tables/ResponsiveTable.jsx";
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import {
  Badge, Button, Card, EmptyState, Field, IconButton, IconTile, Input, ListRow, ListSkeleton,
  Modal, PageHeader, Pagination, Select, TableWrap, ToggleRow, Th, PAGE_SIZE
} from '../../components/members/ui'
import { cx } from '../../utils/members/format'

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
        primaryAction={{ label: 'New role', mobileLabel: 'New', icon: Plus, onClick: () => setEditing({ ...BLANK }) }}
      />

      <Card className="overflow-hidden">
        {loading ? <ListSkeleton rows={6} /> : roles.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No roles yet"
            message="Roles define the hierarchy that scopes accounts, form comment sections and workflow stages."
          />
        ) : (
          <>
            {/* Phones and tablets: tap a row to edit; the bin sits beside it */}
            <div className="divide-y divide-line lg:hidden">
              {roles.map(role => (
                <div key={role._id} className={cx('flex items-center', !role.isSystem && 'pr-2 sm:pr-3')}>
                  <ListRow
                    className="min-w-0 flex-1"
                    chevron={false}
                    onClick={() => setEditing(role)}
                    leading={<IconTile icon={ShieldCheck} tone={role.isActive ? 'royal' : 'slate'} />}
                    title={
                      <>
                        {role.name}
                        {role.nameMl && <span className="block text-xs font-normal text-slate-500">{role.nameMl}</span>}
                      </>
                    }
                    meta={<>Rank {role.level} · {role.key} · <span className="capitalize">{role.scopeType}</span></>}
                    trailing={(role.canCreateAccessLinks || role.isSystem || !role.isActive) ? (
                      <>
                        {role.canCreateAccessLinks && <Badge tone="royal">Can issue links</Badge>}
                        {role.isSystem && <Badge tone="slate">System</Badge>}
                        {!role.isActive && <Badge tone="rose">Inactive</Badge>}
                      </>
                    ) : null}
                  />
                  {!role.isSystem && (
                    <IconButton icon={Trash2} tone="danger" label="Delete role" onClick={() => setToDelete(role)} />
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block">
              <TableWrap>
                <ResponsiveTable className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr>
                      <Th>Rank</Th>
                      <Th>Role</Th>
                      <Th>Key</Th>
                      <Th>Scope</Th>
                      <Th>Access links</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {roles.map(role => (
                      <tr key={role._id} className="transition-colors hover:bg-mist/70">
                        <td className="px-4 py-3 pl-5 text-slate-500">{role.level}</td>
                        <td className="px-4 py-3">
                          <span className="block font-semibold text-ink">{role.name}</span>
                          {role.nameMl && <span className="block text-xs leading-relaxed text-slate-500 [overflow-wrap:anywhere]">{role.nameMl}</span>}
                          {(role.isSystem || !role.isActive) && (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {role.isSystem && <Badge tone="slate">System</Badge>}
                              {!role.isActive && <Badge tone="rose">Inactive</Badge>}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{role.key}</td>
                        <td className="px-4 py-3 capitalize text-slate-600">{role.scopeType}</td>
                        <td className="px-4 py-3">
                          {role.canCreateAccessLinks ? <Badge tone="green">Yes</Badge> : <span className="text-slate-400">No</span>}
                        </td>
                        <td className="px-4 py-2 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <IconButton icon={Pencil} tone="royal" label="Edit role" onClick={() => setEditing(role)} />
                            {!role.isSystem && (
                              <IconButton icon={Trash2} tone="danger" label="Delete role" onClick={() => setToDelete(role)} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </ResponsiveTable>
              </TableWrap>
            </div>
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
            <Button form="role-form" type="submit" loading={busy}>{busy ? 'Saving...' : 'Save role'}</Button>
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            </div>

            <ToggleRow
              checked={Boolean(editing.canCreateAccessLinks)}
              onChange={checked => setEditing({ ...editing, canCreateAccessLinks: checked })}
              label="Issue form access links"
              description="Can issue temporary form access links to applicants."
            />

            {editing._id && !editing.isSystem && (
              <ToggleRow
                checked={editing.isActive !== false}
                onChange={checked => setEditing({ ...editing, isActive: checked })}
                label="Active"
                description="Inactive roles can't be assigned, and accounts that hold one cannot sign in."
              />
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
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              {deleting ? 'Deleting...' : 'Delete role'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          <strong className="text-ink">{toDelete?.name}</strong> will be removed permanently. Accounts using this role must be
          reassigned first.
        </p>
      </Modal>
    </div>
  )
}
