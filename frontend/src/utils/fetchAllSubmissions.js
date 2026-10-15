import axios from 'axios';

const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

/**
 * Loads every page of a report-submissions endpoint, so a list is never cut off
 * at the newest PAGE_SIZE rows. Rows come back "slim" (no embedded report
 * definition); `reportDefinitions` maps report id -> full report, sent once.
 *
 * `params` go on every page; `firstPageParams` (includeRoster, includeReports…)
 * only on the first, since their payload does not change from page to page.
 */
export async function fetchAllSubmissions(url, token, { params = {}, firstPageParams = {} } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  const data = [];
  let reportDefinitions = {};
  let extras = {};

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const query = new URLSearchParams({
      ...params,
      ...(page === 1 ? firstPageParams : {}),
      slim: 1,
      limit: PAGE_SIZE,
      page,
    });
    const res = await axios.get(`${import.meta.env.VITE_API_URL}${url}?${query}`, { headers });
    if (!res.data?.success) throw new Error(res.data?.message || 'Submissions load failed.');

    data.push(...(res.data.data || []));
    Object.assign(reportDefinitions, res.data.reportDefinitions);
    if (page === 1) extras = { roster: res.data.roster, reports: res.data.reports };
    if (!res.data.hasNextPage) break;
  }

  return { data, reportDefinitions, ...extras };
}
