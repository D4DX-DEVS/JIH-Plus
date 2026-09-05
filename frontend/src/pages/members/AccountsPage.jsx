import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import {
  Button, Card, EmptyState, Field, FilterBar, Input, Modal, PageHeader,
  Pagination, SearchInput, Select, Spinner, TableWrap, Th, PAGE_SIZE
} from '../../components/members/ui'

const BLANK = {
  username: '', password: '', name: '', contactNo: '', email: '',
  roleKey: '', isRukn: false, scope: { mekhala: '', district: '', area: '', unit: '' }
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [roles, setRoles] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [searchBox, setSearchBox] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ roleKey: '', status: '', scopeName: '' })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/admin/accounts', { params: { search, ...filters, page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        setAccounts(data.accounts || [])
        setTotal(data.pagination?.total || 0)
      })
      .catch(err => toast.error(apiError(err, 'Failed to load accounts')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [search, filters, page])

  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchBox.trim()); setPage(1) }, 350)
    return () => clearTimeout(id)
  }, [searchBox])

  const setFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const filtersActive = Boolean(searchBox || filters.roleKey || filters.status || filters.scopeName)
  const clearFilters = () => {
    setFilters({ roleKey: '', status: '', scopeName: '' })
    setSearchBox('')
    setSearch('')
    setPage(1)
  }

  useEffect(() => {
    Promise.all([
      api.get('/admin/roles'),
      api.get('/admin/master-data')
    ])
      .then(([rolesRes, locRes]) => {
        setRoles(rolesRes.data.roles || [])
        setLocations(locRes.data.locations || [])
      })
      .catch(() => {})
  }, [])

  const selectedRole = useMemo(
    () => roles.find(r => r.key === editing?.roleKey),
    [roles, editing?.roleKey]
  )

  // Only the level the role is posted to needs picking; the backend fills in the
  // parents from master data.
  const optionsFor = (type) => locations.filter(l => l.type === type)

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const body = { ...editing }
      if (editing._id && !body.password) delete body.password
      if (editing._id) await api.put(`/admin/accounts/${editing._id}`, body)
      else await api.post('/admin/accounts', body)
      toast.success('Account saved')
      setEditing(null)
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not save the account'))
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/admin/accounts/${toDelete._id}`)
      toast.success('Account deleted')
      setToDelete(null)
      if (accounts.length === 1 && page > 1) setPage(p => p - 1)
      else load()
    } catch (err) {
      toast.error(apiError(err, 'Could not delete the account'))
    } finally {
      setDeleting(false)
    }
  }

  const startEdit = (account) => setEditing({
    ...account,
    roleKey: account.role?.key || '',
    password: '',
    scope: account.scope || BLANK.scope
  })

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle="Reviewer logins. Each account holds one role and one posting."
        hideTitleOnMobile
        actions={<Button onClick={() => setEditing({ ...BLANK })}><Plus size={16} /> New account</Button>}
      />

      <FilterBar active={filtersActive} onClear={clearFilters}>
        <SearchInput
          className="flex-1 min-w-[200px]"
          placeholder="Search by name, username or contact"
          value={searchBox}
          onChange={e => setSearchBox(e.target.value)}
        />

        <Select className="sm:w-44" value={filters.roleKey} onChange={e => setFilter('roleKey', e.target.value)}>
          <option value="">All roles</option>
          {roles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
        </Select>

        {/* District is the useful grouping level here — a unit-level list would
            run to hundreds of options. Any account inside the district matches. */}
        <Select className="sm:w-44" value={filters.scopeName} onChange={e => setFilter('scopeName', e.target.value)}>
          <option value="">All districts</option>
          {locations.filter(l => l.type === 'district').map(l => (
            <option key={l._id} value={l.name}>{l.name}</option>
          ))}
        </Select>

        <Select className="sm:w-40" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
          <option value="rukn">Rukn only</option>
        </Select>
      </FilterBar>

      <Card>
        {loading ? <Spinner /> : accounts.length === 0 ? (
          <EmptyState
            title={filtersActive ? 'No accounts match these filters' : 'No accounts yet'}
            message={filtersActive
              ? 'Try widening or clearing the filters.'
              : 'Create reviewer logins for each level of the hierarchy.'}
            action={filtersActive && <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <>
            {/* Mobile: roomy tappable rows — one full-width target per record */}
            <div className="lg:hidden divide-y divide-gray-100">
              {accounts.map(account => (
                <div key={account._id} className="min-h-[56px] flex items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-gray-900 break-words leading-snug">
                      {account.name}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {account.username} · {account.role?.name || '—'} ·{' '}
                      {account.scope?.unit || account.scope?.area || account.scope?.district || account.scope?.mekhala || 'State'}
                    </p>
                    {(account.isRukn || !account.isActive) && (
                      <p className="text-[11px] mt-0.5">
                        {account.isRukn && <span className="text-gray-500">Rukn</span>}
                        {account.isRukn && !account.isActive && <span className="text-gray-400"> · </span>}
                        {!account.isActive && <span className="text-red-500">Deactivated</span>}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => startEdit(account)}
                      className="flex min-h-11 min-w-11 items-center justify-center text-[#5b21b6] text-[13px] font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setToDelete(account)}
                      aria-label="Delete account"
                      className="flex min-h-11 min-w-11 items-center justify-center text-gray-400 active:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <TableWrap>
            <table className="hidden lg:table w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <Th>Name</Th>
                  <Th>Username</Th>
                  <Th>Role</Th>
                  <Th>Posting</Th>
                  <Th>Rukn</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map(account => (
                  <tr key={account._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{account.name}</span>
                      {!account.isActive && <span className="block text-xs text-red-500">Deactivated</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{account.username}</td>
                    <td className="px-4 py-3 text-gray-600">{account.role?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {account.scope?.unit || account.scope?.area || account.scope?.district || account.scope?.mekhala || 'State'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{account.isRukn ? 'Yes' : '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => startEdit(account)} className="text-[#5b21b6] hover:underline py-2 px-1 mr-2">
                        Edit
                      </button>
                      <button onClick={() => setToDelete(account)} aria-label="Delete account" className="text-gray-400 hover:text-red-600 p-2">
                        <Trash2 size={15} />
                      </button>
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
        title={editing?._id ? 'Edit account' : 'New account'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="account-form" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save account'}</Button>
          </>
        }
      >
        {editing && (
          <form id="account-form" onSubmit={save} className="space-y-4">
            <Field label="Full name" required>
              <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} required />
            </Field>

            <Field label="Username" required>
              <Input
                value={editing.username}
                onChange={e => setEditing({ ...editing, username: e.target.value })}
                disabled={Boolean(editing._id)}
                required
              />
            </Field>

            <Field
              label={editing._id ? 'New password' : 'Password'}
              required={!editing._id}
              hint={editing._id ? 'Leave blank to keep the current password.' : 'At least 6 characters.'}
            >
              <Input
                type="password"
                value={editing.password || ''}
                onChange={e => setEditing({ ...editing, password: e.target.value })}
                required={!editing._id}
                autoComplete="new-password"
              />
            </Field>

            <Field label="Role" required>
              <Select
                value={editing.roleKey}
                onChange={e => setEditing({ ...editing, roleKey: e.target.value })}
                required
              >
                <option value="">Select a role</option>
                {roles.filter(r => r.isActive).map(r => (
                  <option key={r.key} value={r.key}>{r.name}</option>
                ))}
              </Select>
            </Field>

            {selectedRole && selectedRole.scopeType !== 'state' && (
              <Field label={selectedRole.scopeType} required>
                <Select
                  value={editing.scope?.[selectedRole.scopeType] || ''}
                  onChange={e => setEditing({
                    ...editing,
                    scope: { ...BLANK.scope, [selectedRole.scopeType]: e.target.value }
                  })}
                  required
                >
                  <option value="">Select a {selectedRole.scopeType}</option>
                  {optionsFor(selectedRole.scopeType).map(l => (
                    <option key={l._id} value={l.name}>
                      {l.name}
                      {l.area ? ` — ${l.area}, ${l.district}` : l.district ? ` — ${l.district}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label="Contact number">
              <Input value={editing.contactNo || ''} onChange={e => setEditing({ ...editing, contactNo: e.target.value })} />
            </Field>

            <Field label="Email">
              <Input type="email" value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} />
            </Field>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(editing.isRukn)}
                onChange={e => setEditing({ ...editing, isRukn: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                This person is a Rukn — in the Karkoon workflow a Unit Nazim/Nazimath who is
                a Rukn may fill the area admin's comments and skip that stage.
              </span>
            </label>

            {editing._id && (
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
        title="Delete this account?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete account'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          <strong>{toDelete?.name}</strong>'s login will be removed permanently. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
