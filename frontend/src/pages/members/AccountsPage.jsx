import ResponsiveTable from "../../components/tables/ResponsiveTable.jsx";
import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Plus, SearchX, Trash2, Users } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import {
  Avatar, Badge, Button, Card, EmptyState, Field, FilterBar, IconButton, Input, ListRow,
  ListSkeleton, Modal, PageHeader, Pagination, PasswordInput, SearchInput, Select,
  TableWrap, ToggleRow, Th, PAGE_SIZE
} from '../../components/members/ui'
import LocationCascade from '../../components/members/LocationCascade'

const BLANK = {
  username: '', password: '', name: '', contactNo: '', email: '',
  roleKey: '', isRukn: false, scope: { mekhala: '', district: '', area: '', unit: '' }
}

// The pickers each role's posting needs, top-down. Area and unit postings start
// from the district so every list only holds the chosen parent's children; the
// backend fills in the rest of the chain (mekhala) from master data.
const CHAIN = { mekhala: ['mekhala'], district: ['district'], area: ['district', 'area'], unit: ['district', 'area', 'unit'] }

// Keep only the levels the new role uses, so switching role never leaves a
// stale lower level (e.g. a unit) behind on an area account.
const scopeFor = (scope, type) => ({
  ...BLANK.scope,
  ...Object.fromEntries((CHAIN[type] || []).map(level => [level, scope?.[level] || '']))
})

// Where an account is posted: the lowest level it holds, else the whole state.
const postingOf = (account) =>
  account.scope?.unit || account.scope?.area || account.scope?.district || account.scope?.mekhala || 'State'

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

  const levels = CHAIN[selectedRole?.scopeType] || []

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
        primaryAction={{ label: 'New account', mobileLabel: 'New', icon: Plus, onClick: () => setEditing({ ...BLANK }) }}
      />

      <FilterBar
        search={
          <SearchInput
            placeholder="Search by name, username or contact"
            value={searchBox}
            onChange={e => setSearchBox(e.target.value)}
          />
        }
        active={filtersActive}
        activeCount={[filters.roleKey, filters.scopeName, filters.status].filter(Boolean).length}
        onClear={clearFilters}
      >
        <Select className="sm:w-44" value={filters.roleKey} onChange={e => setFilter('roleKey', e.target.value)} aria-label="Role">
          <option value="">All roles</option>
          {roles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
        </Select>

        {/* District is the useful grouping level here — a unit-level list would
            run to hundreds of options. Any account inside the district matches. */}
        <Select className="sm:w-44" value={filters.scopeName} onChange={e => setFilter('scopeName', e.target.value)} aria-label="District">
          <option value="">All districts</option>
          {locations.filter(l => l.type === 'district').map(l => (
            <option key={l._id} value={l.name}>{l.name}</option>
          ))}
        </Select>

        <Select className="col-span-2 sm:col-span-1 sm:w-40" value={filters.status} onChange={e => setFilter('status', e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
          <option value="rukn">Rukn only</option>
        </Select>
      </FilterBar>

      <Card className="overflow-hidden">
        {loading ? <ListSkeleton rows={6} /> : accounts.length === 0 ? (
          <EmptyState
            icon={filtersActive ? SearchX : Users}
            title={filtersActive ? 'No accounts match these filters' : 'No accounts yet'}
            message={filtersActive
              ? 'Try widening or clearing the filters.'
              : 'Create reviewer logins for each level of the hierarchy.'}
            action={filtersActive && <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <>
            {/* Phones and tablets: tap a row to edit; the bin sits beside it */}
            <div className="divide-y divide-line lg:hidden">
              {accounts.map(account => (
                <div key={account._id} className="flex items-center pr-2 sm:pr-3">
                  <ListRow
                    className="min-w-0 flex-1"
                    chevron={false}
                    onClick={() => startEdit(account)}
                    leading={<Avatar name={account.name} />}
                    title={account.name}
                    meta={[account.username, account.role?.name || '—', postingOf(account)].join(' · ')}
                    trailing={(account.isRukn || !account.isActive) ? (
                      <>
                        {account.isRukn && <Badge tone="royal">Rukn</Badge>}
                        {!account.isActive && <Badge tone="rose">Deactivated</Badge>}
                      </>
                    ) : null}
                  />
                  <IconButton icon={Trash2} tone="danger" label="Delete account" onClick={() => setToDelete(account)} />
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block">
              <TableWrap>
                <ResponsiveTable className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr>
                      <Th>Name</Th>
                      <Th>Username</Th>
                      <Th>Role</Th>
                      <Th>Posting</Th>
                      <Th>Rukn</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {accounts.map(account => (
                      <tr key={account._id} className="transition-colors hover:bg-mist/70">
                        <td className="px-4 py-3 pl-5">
                          <div className="flex items-center gap-3">
                            <Avatar name={account.name} size="sm" />
                            <span className="min-w-0">
                              <span className="block font-semibold text-ink">{account.name}</span>
                              {!account.isActive && <Badge tone="rose" className="mt-0.5">Deactivated</Badge>}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{account.username}</td>
                        <td className="px-4 py-3 text-slate-600">{account.role?.name || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{postingOf(account)}</td>
                        <td className="px-4 py-3">{account.isRukn ? <Badge tone="royal">Rukn</Badge> : <span className="text-slate-400">—</span>}</td>
                        <td className="px-4 py-2 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <IconButton icon={Pencil} tone="royal" label="Edit account" onClick={() => startEdit(account)} />
                            <IconButton icon={Trash2} tone="danger" label="Delete account" onClick={() => setToDelete(account)} />
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
        title={editing?._id ? 'Edit account' : 'New account'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button form="account-form" type="submit" loading={busy}>{busy ? 'Saving...' : 'Save account'}</Button>
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
              <PasswordInput
                value={editing.password || ''}
                onChange={e => setEditing({ ...editing, password: e.target.value })}
                required={!editing._id}
                autoComplete="new-password"
              />
            </Field>

            <Field label="Role" required>
              <Select
                value={editing.roleKey}
                onChange={e => {
                  const role = roles.find(r => r.key === e.target.value)
                  setEditing({ ...editing, roleKey: e.target.value, scope: scopeFor(editing.scope, role?.scopeType) })
                }}
                required
              >
                <option value="">Select a role</option>
                {roles.filter(r => r.isActive).map(r => (
                  <option key={r.key} value={r.key}>{r.name}</option>
                ))}
              </Select>
            </Field>

            <LocationCascade
              locations={locations}
              levels={levels}
              value={editing.scope || BLANK.scope}
              onChange={next => setEditing({ ...editing, scope: { ...BLANK.scope, ...next } })}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Contact number">
                <Input value={editing.contactNo || ''} onChange={e => setEditing({ ...editing, contactNo: e.target.value })} />
              </Field>

              <Field label="Email">
                <Input type="email" value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} />
              </Field>
            </div>

            <ToggleRow
              checked={Boolean(editing.isRukn)}
              onChange={checked => setEditing({ ...editing, isRukn: checked })}
              label="This person is a Rukn"
              description="In the Karkoon workflow a Unit Nazim/Nazimath who is a Rukn may fill the area admin's comments and skip that stage."
            />

            {editing._id && (
              <ToggleRow
                checked={editing.isActive !== false}
                onChange={checked => setEditing({ ...editing, isActive: checked })}
                label="Active"
                description="Deactivated accounts cannot sign in."
              />
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
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              {deleting ? 'Deleting...' : 'Delete account'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          <strong className="text-ink">{toDelete?.name}</strong>'s login will be removed permanently. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
