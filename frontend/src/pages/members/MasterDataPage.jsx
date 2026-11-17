import ResponsiveTable from "../../components/tables/ResponsiveTable.jsx";
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Building2, Landmark, MapPinned, Network, Pencil, Plus, SearchX, Trash2 } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import {
  Button, Card, EmptyState, Field, FilterBar, IconButton, IconTile, Input, ListRow, ListSkeleton,
  Modal, PageHeader, Pagination, SearchInput, Select, StatusBadge, TableWrap, Tabs, ToggleRow, Th, PAGE_SIZE
} from '../../components/members/ui'
import { cx } from '../../utils/members/format'
import LocationCascade from '../../components/members/LocationCascade'

const TABS = [
  { type: 'mekhala', label: 'Mekhalas', parent: null },
  { type: 'district', label: 'Districts', parent: 'mekhala' },
  { type: 'area', label: 'Areas', parent: 'district' },
  { type: 'unit', label: 'Units', parent: 'area' }
]

// Which parent levels can be filtered on while looking at each tab.
const FILTERABLE_PARENTS = {
  mekhala: [],
  district: ['mekhala'],
  area: ['mekhala', 'district'],
  unit: ['mekhala', 'district', 'area']
}

const BLANK_FILTERS = { mekhala: '', district: '', area: '', status: '' }

const TAB_ICON = { mekhala: Landmark, district: MapPinned, area: Network, unit: Building2 }

// What a row sits under: its mekhala, district, or area + district.
const parentOf = (type, row) => {
  if (type === 'district') return row.mekhala
  if (type === 'area') return row.district
  if (type === 'unit') return `${row.area}, ${row.district}`
  return ''
}

/**
 * This section owns its own location hierarchy — nothing here is read from the
 * JIH or ihthisabi databases. Build it top-down: mekhalas, then districts inside
 * them, then areas, then units.
 *
 * Rows are paged and filtered on the server. The parent levels (226 rows) are
 * fetched once and reused for both the cascading filters and the create dialog's
 * parent picker; the 265 units are never pulled in bulk.
 */
export default function MasterDataPage() {
  const [tab, setTab] = useState('mekhala')
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({ mekhala: 0, district: 0, area: 0, unit: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(BLANK_FILTERS)
  const [loading, setLoading] = useState(true)

  const [parents, setParents] = useState([])
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', mekhala: '', district: '', area: '' })
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Mekhalas, districts and areas — everything the filters and pickers need.
  const loadParents = useCallback(() => {
    api.get('/admin/master-data', { params: { types: 'mekhala,district,area', includeInactive: 1 } })
      .then(({ data }) => setParents(data.locations || []))
      .catch(() => {})
  }, [])

  useEffect(loadParents, [loadParents])

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/master-data', {
      params: {
        type: tab,
        search: query,
        page,
        limit: PAGE_SIZE,
        includeInactive: 1,
        mekhala: filters.mekhala,
        district: filters.district,
        area: filters.area,
        status: filters.status
      }
    })
      .then(({ data }) => {
        setRows(data.locations || [])
        setTotal(data.pagination?.total || 0)
        if (data.counts) setCounts(data.counts)
      })
      .catch(err => toast.error(apiError(err, 'Failed to load master data')))
      .finally(() => setLoading(false))
  }, [tab, query, page, filters])

  useEffect(load, [load])

  // Debounce the search box so each keystroke doesn't hit the server.
  useEffect(() => {
    const id = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 350)
    return () => clearTimeout(id)
  }, [search])

  const of = useCallback((type) => parents.filter(l => l.type === type), [parents])

  // Each level's options narrow to whatever is selected above it.
  const districtOptions = useMemo(
    () => of('district').filter(d => !filters.mekhala || d.mekhala === filters.mekhala),
    [of, filters.mekhala]
  )
  const areaOptions = useMemo(
    () => of('area').filter(a =>
      (!filters.mekhala || a.mekhala === filters.mekhala) &&
      (!filters.district || a.district === filters.district)
    ),
    [of, filters.mekhala, filters.district]
  )

  /** Changing a parent clears the now-meaningless selections below it. */
  const setFilter = (key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'mekhala') { next.district = ''; next.area = '' }
      if (key === 'district') next.area = ''
      return next
    })
    setPage(1)
  }

  const current = TABS.find(t => t.type === tab)
  const parentFilters = FILTERABLE_PARENTS[tab]
  const filtersActive = Boolean(search || filters.mekhala || filters.district || filters.area || filters.status)

  const clearFilters = () => {
    setFilters(BLANK_FILTERS)
    setSearch('')
    setQuery('')
    setPage(1)
  }

  const switchTab = (type) => {
    setTab(type)
    clearFilters()
  }

  const openCreate = () => {
    // Prefill from whatever the list is already filtered to.
    setForm({
      name: '',
      mekhala: filters.mekhala,
      district: filters.district,
      area: filters.area
    })
    setCreating(true)
  }

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const body = { type: tab, name: form.name }
      if (tab === 'district') body.mekhala = form.mekhala
      if (tab === 'area') {
        const parent = of('district').find(d => d.name === form.district)
        body.district = form.district
        body.mekhala = parent?.mekhala || ''
      }
      if (tab === 'unit') {
        // Area names repeat across districts, so match on both.
        const parent = of('area').find(a => a.name === form.area && a.district === form.district)
        body.area = form.area
        body.district = form.district
        body.mekhala = parent?.mekhala || ''
      }
      await api.post('/admin/master-data', body)
      toast.success('Location added')
      setCreating(false)
      loadParents()
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not add the location'))
    } finally {
      setBusy(false)
    }
  }

  const rename = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.put(`/admin/master-data/${renaming._id}`, { name: renaming.name, isActive: renaming.isActive })
      toast.success('Location updated')
      setRenaming(null)
      loadParents()
      load()
    } catch (err) {
      toast.error(apiError(err, 'Could not update the location'))
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/admin/master-data/${toDelete._id}`)
      toast.success('Location deleted')
      setToDelete(null)
      loadParents()
      // Stepping back avoids landing on a page that no longer exists.
      if (rows.length === 1 && page > 1) setPage(p => p - 1)
      else load()
    } catch (err) {
      toast.error(apiError(err, 'Could not delete the location'))
    } finally {
      setDeleting(false)
    }
  }

  // Create needs the parent list unfiltered by the page's own parent filters.
  const createParentOptions = current.parent === 'mekhala'
    ? of('mekhala')
    : of('district').filter(d => !form.mekhala || d.mekhala === form.mekhala)

  return (
    <div>
      <PageHeader
        title="Master Data"
        subtitle="Mekhalas, districts, areas and units for the members section."
        hideTitleOnMobile
        primaryAction={{ label: `Add ${tab}`, icon: Plus, onClick: openCreate }}
      />

      <Tabs
        className="mb-3 sm:mb-4"
        tabs={TABS.map(t => ({ value: t.type, label: t.label, badge: counts[t.type] }))}
        value={tab}
        onChange={switchTab}
      />

      <FilterBar
        search={
          <SearchInput
            placeholder={`Search ${current.label.toLowerCase()}`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        }
        active={filtersActive}
        activeCount={[filters.mekhala, filters.district, filters.area, filters.status].filter(Boolean).length}
        onClear={clearFilters}
      >
        {parentFilters.includes('mekhala') && (
          <Select
            className="sm:w-44"
            value={filters.mekhala}
            onChange={e => setFilter('mekhala', e.target.value)}
            aria-label="Mekhala"
          >
            <option value="">All mekhalas</option>
            {of('mekhala').map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
          </Select>
        )}

        {parentFilters.includes('district') && (
          <Select
            className="sm:w-44"
            value={filters.district}
            onChange={e => setFilter('district', e.target.value)}
            aria-label="District"
          >
            <option value="">All districts</option>
            {districtOptions.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
          </Select>
        )}

        {parentFilters.includes('area') && (
          <Select
            className="sm:w-44"
            value={filters.area}
            onChange={e => setFilter('area', e.target.value)}
            aria-label="Area"
          >
            <option value="">All areas</option>
            {areaOptions.map(a => <option key={a._id} value={a.name}>{a.name}</option>)}
          </Select>
        )}

        <Select
          className={cx('sm:w-36', parentFilters.length % 2 === 0 && 'col-span-2 sm:col-span-1')}
          value={filters.status}
          onChange={e => setFilter('status', e.target.value)}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </FilterBar>

      <Card className="overflow-hidden">
        {loading ? <ListSkeleton rows={6} /> : rows.length === 0 ? (
          <EmptyState
            icon={filtersActive ? SearchX : TAB_ICON[tab]}
            title={filtersActive
              ? `No ${current.label.toLowerCase()} match these filters`
              : `No ${current.label.toLowerCase()} yet`}
            message={filtersActive
              ? 'Try widening or clearing the filters.'
              : current.parent
                ? `Add ${current.parent}s first, then create ${current.label.toLowerCase()} inside them.`
                : 'Start here — everything else hangs off the mekhalas.'}
            action={filtersActive
              ? <Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>
              : <Button size="sm" onClick={openCreate}><Plus size={16} /> Add {tab}</Button>}
          />
        ) : (
          <>
            {/* Phones and tablets: tap a row to edit; the bin sits beside it */}
            <div className="divide-y divide-line lg:hidden">
              {rows.map(row => (
                <div key={row._id} className="flex items-center pr-2 sm:pr-3">
                  <ListRow
                    className="min-w-0 flex-1"
                    chevron={false}
                    onClick={() => setRenaming({ ...row })}
                    leading={<IconTile icon={TAB_ICON[tab]} tone={row.isActive ? 'royal' : 'slate'} />}
                    title={row.name}
                    meta={parentOf(tab, row) || undefined}
                    trailing={<StatusBadge status={row.isActive ? 'active' : 'inactive'} />}
                  />
                  <IconButton icon={Trash2} tone="danger" label="Delete location" onClick={() => setToDelete(row)} />
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block">
              <TableWrap>
                <ResponsiveTable className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr>
                      <Th>Name</Th>
                      {tab !== 'mekhala' && <Th>Parent</Th>}
                      <Th>Status</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map(row => (
                      <tr key={row._id} className="transition-colors hover:bg-mist/70">
                        <td className="px-4 py-3 pl-5 font-semibold text-ink">{row.name}</td>
                        {tab !== 'mekhala' && (
                          <td className="px-4 py-3 text-slate-600">{parentOf(tab, row)}</td>
                        )}
                        <td className="px-4 py-3"><StatusBadge status={row.isActive ? 'active' : 'inactive'} /></td>
                        <td className="px-4 py-2 pr-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <IconButton icon={Pencil} tone="royal" label="Edit location" onClick={() => setRenaming({ ...row })} />
                            <IconButton icon={Trash2} tone="danger" label="Delete location" onClick={() => setToDelete(row)} />
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
        open={creating}
        onClose={() => setCreating(false)}
        title={`Add ${tab}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button form="location-form" type="submit" loading={busy}>{busy ? 'Saving...' : 'Add'}</Button>
          </>
        }
      >
        <form id="location-form" onSubmit={create} className="space-y-4">
          {tab === 'district' && (
            <Field label="Mekhala" required>
              <Select value={form.mekhala} onChange={e => setForm({ ...form, mekhala: e.target.value })} required>
                <option value="">Select a mekhala</option>
                {createParentOptions.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
              </Select>
            </Field>
          )}

          {tab === 'area' && (
            <Field label="District" required>
              <Select value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} required>
                <option value="">Select a district</option>
                {createParentOptions.map(d => <option key={d._id} value={d.name}>{d.name} — {d.mekhala}</option>)}
              </Select>
            </Field>
          )}

          {tab === 'unit' && (
            <LocationCascade
              locations={parents}
              levels={['district', 'area']}
              value={form}
              onChange={next => setForm({ ...form, ...next })}
            />
          )}

          <Field label="Name" required>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        title="Edit location"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button form="rename-form" type="submit" loading={busy}>{busy ? 'Saving...' : 'Save'}</Button>
          </>
        }
      >
        {renaming && (
          <form id="rename-form" onSubmit={rename} className="space-y-4">
            <Field
              label="Name"
              required
              hint="Renaming also updates every child location and account posted here."
            >
              <Input value={renaming.name} onChange={e => setRenaming({ ...renaming, name: e.target.value })} required />
            </Field>

            <ToggleRow
              checked={renaming.isActive !== false}
              onChange={checked => setRenaming({ ...renaming, isActive: checked })}
              label="Active"
              description="Inactive locations are left out of the cascading pickers."
            />
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete this location?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              {deleting ? 'Deleting...' : 'Delete location'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          <strong className="text-ink">{toDelete?.name}</strong> will be removed permanently. Deleting also removes every
          child location and account posted here. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
