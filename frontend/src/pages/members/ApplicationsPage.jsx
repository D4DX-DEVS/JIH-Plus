import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, apiError } from '../../utils/members/api'
import {
  Card, PageHeader, Spinner, EmptyState, StatusBadge, Select, SearchInput,
  FilterBar, TableWrap, Button, Th, Pagination, PAGE_SIZE
} from '../../components/members/ui'
import { FORM_TYPE_LABEL } from '../../utils/members/constants'

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
    const workflow = workflows.find(w => w.formType === app.formType)
    const stage = workflow?.stages?.find(s => s.key === app.currentStageKey)
    return stage?.name || app.currentStageKey || '—'
  }

  return (
    <div>
      <PageHeader
        title="Applications"
        subtitle={`${total} application${total === 1 ? '' : 's'} in your scope`}
        hideTitleOnMobile
        actions={
          <Button
            variant={mine ? 'primary' : 'secondary'}
            onClick={() => setParam('mine', mine ? '' : '1')}
          >
            {mine ? 'Showing: waiting on me' : 'Waiting on me'}
          </Button>
        }
      />

      <FilterBar active={Boolean(formType || status || search || mine)} onClear={clearAll}>
        <SearchInput
          className="flex-1 min-w-[200px]"
          placeholder="Search name, mobile or member ID"
          value={searchBox}
          onChange={e => setSearchBox(e.target.value)}
        />

        <Select className="sm:w-40" value={formType} onChange={e => setParam('formType', e.target.value)}>
          <option value="">All types</option>
          <option value="rukn">Rukn</option>
          <option value="karkoon">Karkoon</option>
        </Select>

        <Select className="sm:w-44" value={status} onChange={e => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="in_review">In review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="hold">On hold</option>
        </Select>
      </FilterBar>

      <Card>
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <Button variant="secondary" onClick={load}>Retry</Button>
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            title={formType || status || search || mine ? 'No applications match these filters' : 'No applications yet'}
            message={formType || status || search || mine
              ? 'Try widening or clearing the filters.'
              : 'Applications appear here once an applicant submits through a form access link.'}
            action={(formType || status || search || mine) && (
              <Button variant="secondary" onClick={clearAll}>Clear filters</Button>
            )}
          />
        ) : (
          <>
            {/* Mobile list — no sideways scrolling; each row opens the application. */}
            <ul className="lg:hidden divide-y divide-gray-100">
              {applications.map(app => (
                <li key={app._id}>
                  <Link
                    to={`/members/applications/${app._id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 min-h-[44px] hover:bg-gray-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900 truncate">
                        {app.applicantName || 'Unnamed'}
                      </span>
                      <span className="block text-xs text-gray-500 truncate mt-0.5">
                        {FORM_TYPE_LABEL[app.formType]} · {app.scope?.unit || '—'} · {stageName(app)}
                        {app.memberId ? ` · ID: ${app.memberId}` : ''}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <StatusBadge status={app.status} />
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">
                        {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden lg:block">
              <TableWrap>
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <Th>Applicant</Th>
                      <Th>Type</Th>
                      <Th>Unit</Th>
                      <Th>Stage</Th>
                      <Th>Status</Th>
                      <Th>Submitted</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {applications.map(app => (
                      <tr key={app._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{app.applicantName || 'Unnamed'}</span>
                          {app.memberId && <span className="block text-xs text-gray-500">ID: {app.memberId}</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{FORM_TYPE_LABEL[app.formType]}</td>
                        <td className="px-4 py-3 text-gray-600">{app.scope?.unit || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{stageName(app)}</td>
                        <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                        <td className="px-4 py-3 text-gray-500">
                          {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link to={`/members/applications/${app._id}`} className="text-[#5b21b6] hover:underline">
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          </>
        )}
      </Card>

      <Pagination page={page} total={total} onChange={p => setParam('page', String(p))} />
    </div>
  )
}
