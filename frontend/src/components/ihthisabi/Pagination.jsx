import React from 'react'

// Shared server-side pagination control. `pagination` is the {current, pages, total}
// object returned by the paginated list endpoints (see backend/utils/pagination.js).
const Pagination = ({ pagination, onPageChange, loading = false, itemLabel = 'items' }) => {
  if (!pagination || pagination.total === 0) return null

  const { current, pages, total } = pagination
  const limit = pagination.limit || Math.ceil(total / pages) || 10
  const rangeStart = total === 0 ? 0 : (current - 1) * limit + 1
  const rangeEnd = Math.min(current * limit, total)

  return (
    <div className="px-3 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div className="text-sm text-gray-700 text-center sm:text-left">
          Showing {rangeStart}-{rangeEnd} of {total} {itemLabel}
        </div>
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => onPageChange(current - 1)}
            disabled={loading || current <= 1}
            className="btn-ghost text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-md font-medium">
            {current} / {pages}
          </span>
          <button
            onClick={() => onPageChange(current + 1)}
            disabled={loading || current >= pages}
            className="btn-ghost text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default Pagination
