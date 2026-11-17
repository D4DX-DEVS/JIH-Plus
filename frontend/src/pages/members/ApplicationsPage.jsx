import ResponsiveTable from "../../components/tables/ResponsiveTable.jsx";
import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, FileSearch, Inbox } from 'lucide-react'
import { api, apiError } from '../../utils/members/api'
import {
  Avatar, Button, Card, EmptyState, ErrorState, FilterBar, ListRow, ListSkeleton, PageHeader, Pagination, SearchInput, Select, StatusBadge, TableWrap, Th, TypeBadge, PAGE_SIZE
} from '../../components/members/ui'
import { TYPE_TONE, cx, shortDate, timeAgo } from '../../utils/members/format'
import { FORM_TYPE_LABEL } from '../../utils/members/constants'

const STATUS_CHIPS = [
  { value: '', label: 'All' },
  { value: 'submitted', label: 'Submitted', dot: 'bg-sky-500' },
  { value: 'in_review', label: 'In review', dot: 'bg-amber-500' },
  { value: 'approved', label: 'Approved', dot: 'bg-emerald-500' },
  { value: 'rejected', label: 'Rejected', dot: 'bg-rose-500' },
  { value: 'hold', label: 'On hold', dot: 'bg-slate-400' }
]

const chip = (active) => cx(
  'mobile-compact-control inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors',
  active
    ? 'bg-royal-600 text-white shadow-[0_2px_8px_rgba(42,75,214,0.25)]'
    : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:text-ink hover:ring-slate-300'
)

export default function ApplicationsPage() {
  const [params, setParams] = useSearchParams()
  const [applications, setApplications] = useState([])
  const [workflows, setWorkflows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const formType = params.get('formType') || ''
  const status = params.get('status') || ''
  const mine = params.get('mine') || ''
  const search = params.get('search') || ''
  const page = Number(params.get('page') || 1)
  const [searchBox, setSearchBox] = useState(search)

  const setParam = useCallback((key, value) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }, [setParams])

  const clearAll = () => { setParams(new URLSearchParams()); setSearchBox('') }
  const filtering = Boolean(formType || status || search || mine)

  useEffect(() => {
    api.get('/workflows').then(({ data }) => setWorkflows(data.workflows || [])).catch(() => {})
  }, [])

  // Debounce the search box so each keystroke doesn't hit the server, same as
  // the other list pages (FormsPage, AccountsPage, MasterDataPage).
  useEffect(() => {
    const id = setTimeout(() => setParam('search', searchBox.trim()), 350)
    return () => clearTimeout(id)
  }, [searchBox, setParam])

  const load = useCallback(() => {
    setLoading(true)
    api.get('/applications', { params: { formType, status, mine, search, page, limit: PAGE_SIZE } })
      .then(({ data }) => {
        setApplications(data.applications || [])
        setTotal(data.pagination?.total || 0)
        setError('')
      })
      .catch(err => setError(apiError(err, 'Failed to load applications')))
      .finally(() => setLoading(false))
  }, [formType, status, mine, search, page])

  useEffect(load, [load])

  // Stage keys are opaque in the DB; the workflow config carries their labels.
  const stageName = (app) => {
    // An empty stage means the application has left the workflow.
    if (!app.currentStageKey) return app.status === 'rejected' ? 'Closed' : 'Completed'
    const workflow = workflows.find(w => w.formType === app.formType)
    const stage = workflow?.stages?.find(s => s.key === app.currentStageKey)
    return stage?.name || app.currentStageKey || '—'
  }

  return (
    <div>
      <PageHeader
        title="Applications"
        subtitle="Every Rukn and Karkoon application in your scope."
        hideTitleOnMobile
      />

      <FilterBar
        search={
          <SearchInput
            placeholder="Search name, mobile or ID"
            value={searchBox}
            onChange={e => setSearchBox(e.target.value)}
          />
        }
        active={Boolean(formType || search)}
        activeCount={formType ? 1 : 0}
        onClear={() => { setParam('formType', ''); setSearchBox('') }}
      >
        <Select className="col-span-2 sm:w-44" value={formType} onChange={e => setParam('formType', e.target.value)} aria-label="Application type">
          <option value="">All types</option>
          <option value="rukn">Rukn</option>
          <option value="karkoon">Karkoon</option>
        </Select>
      </FilterBar>

      {/* Queue toggle + status chips, one sideways-scrolling row */}
      <div className="mbr-scroll-x -mx-3 mb-3 items-center gap-1.5 px-3 sm:mx-0 sm:mb-4 sm:flex-wrap sm:px-0">
        <button type="button" aria-pressed={Boolean(mine)} onClick={() => setParam('mine', mine ? '' : '1')} className={chip(Boolean(mine))}>
          <Inbox size={15} /> Waiting on me
        </button>
        <span className="mx-1 h-5 w-px shrink-0 bg-slate-300" aria-hidden="true" />
        <div role="radiogroup" aria-label="Status" className="flex gap-1.5">
          {STATUS_CHIPS.map(option => {
            const active = option.value === status
            return (
              <button
                key={option.value || 'all'}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setParam('status', option.value)}
                className={chip(active)}
              >
                {option.dot && <span className={cx('h-1.5 w-1.5 rounded-full', active ? 'bg-white' : option.dot)} aria-hidden="true" />}
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs font-medium text-slate-500">
          {loading ? 'Loading…' : `${total} application${total === 1 ? '' : 's'}${mine ? ' waiting on you' : ''}`}
        </p>
        {filtering && (
          <button type="button" onClick={clearAll} className="mobile-compact-control text-xs font-semibold text-royal-700 hover:underline">
            Reset all
          </button>
        )}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <ListSkeleton rows={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : applications.length === 0 ? (
          <EmptyState
            icon={filtering ? FileSearch : Inbox}
            title={filtering ? 'No applications match' : 'No applications yet'}
            message={filtering
              ? 'Try widening or clearing the filters.'
              : 'Applications appear here once an applicant submits through a form access link.'}
            action={filtering && <Button variant="secondary" size="sm" onClick={clearAll}>Clear filters</Button>}
          />
        ) : (
          <>
            {/* Phones and tablets: one tappable row per application */}
            <div className="divide-y divide-line lg:hidden">
              {applications.map(app => (
                <ListRow
                  key={app._id}
                  to={`/members/applications/${app._id}`}
                  leading={<Avatar name={app.applicantName} tone={TYPE_TONE[app.formType]} />}
                  title={app.applicantName || 'Unnamed applicant'}
                  meta={[
                    FORM_TYPE_LABEL[app.formType],
                    app.scope?.unit,
                    stageName(app),
                    app.memberId && `ID ${app.memberId}`
                  ].filter(Boolean).join(' · ')}
                  trailing={
                    <>
                      <StatusBadge status={app.status} />
                      <span className="text-[11px] text-slate-400">{timeAgo(app.submittedAt)}</span>
                    </>
                  }
                />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block">
              <TableWrap>
                <ResponsiveTable className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr>
                      <Th>Applicant</Th>
                      <Th>Type</Th>
                      <Th>Unit</Th>
                      <Th>Current stage</Th>
                      <Th>Status</Th>
                      <Th>Submitted</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {applications.map(app => (
                      <tr key={app._id} className="group transition-colors hover:bg-mist/70">
                        <td className="px-4 py-3 pl-5">
                          <Link to={`/members/applications/${app._id}`} className="flex items-center gap-3">
                            <Avatar name={app.applicantName} tone={TYPE_TONE[app.formType]} size="sm" />
                            <span className="min-w-0">
                              <span className="block font-semibold text-ink group-hover:text-royal-700">{app.applicantName || 'Unnamed applicant'}</span>
                              {app.memberId && <span className="block text-xs text-slate-500">ID {app.memberId}</span>}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3"><TypeBadge type={app.formType} /></td>
                        <td className="px-4 py-3 text-slate-600">{app.scope?.unit || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{stageName(app)}</td>
                        <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                        <td className="px-4 py-3 text-slate-500">{shortDate(app.submittedAt)}</td>
                        <td className="px-4 py-3 pr-5 text-right">
                          <Link
                            to={`/members/applications/${app._id}`}
                            aria-label={`Open ${app.applicantName || 'application'}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors group-hover:bg-royal-50 group-hover:text-royal-700"
                          >
                            <ChevronRight size={16} />
                          </Link>
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

      <Pagination page={page} total={total} onChange={p => setParam('page', String(p))} />
    </div>
  )
}
