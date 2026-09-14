import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

const TYPE_LABEL = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  special: 'Special',
};

// Stacked documents with a green tick once the report has been submitted.
const ReportArt = ({ submitted }) => (
  <svg className="h-[44px] w-[48px] shrink-0" viewBox="0 0 84 76" fill="none" aria-hidden="true">
    <rect x="22" y="4" width="44" height="56" rx="6" fill="#dfe8f7" transform="rotate(8 44 32)" />
    <rect x="14" y="10" width="44" height="56" rx="6" fill="#ffffff" stroke="#c9d6ee" strokeWidth="1.5" />
    <rect x="22" y="22" width="26" height="3" rx="1.5" fill="#9fb6dc" />
    <rect x="22" y="31" width="20" height="3" rx="1.5" fill="#b8c9e6" />
    <rect x="22" y="40" width="24" height="3" rx="1.5" fill="#b8c9e6" />
    <rect x="22" y="49" width="16" height="3" rx="1.5" fill="#c9d6ee" />
    {submitted && (
      <>
        <circle cx="64" cy="58" r="12" fill="#2fb36b" />
        <path d="M58 58 l4 4 8 -8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </svg>
);

/**
 * Shared "Assigned Reports" section for district/area/unit dashboards.
 * Lists active report forms scoped to the logged-in user's role and links
 * straight into UserReportsPage with the report preselected.
 */
const ActiveReportsCard = ({ reports = [], loading = false }) => {
  const navigate = useNavigate();

  const handleFill = (reportId) => {
    navigate('/user-reports', { state: { reportId } });
  };

  return (
    <section className="jih-card p-3 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <h3 className="flex items-center gap-1.5 text-[14px] font-extrabold leading-tight text-[#0f2a5c] sm:text-base">
          <FileText className="h-4 w-4 shrink-0 text-[#1f3560]" strokeWidth={1.8} />
          അസൈൻഡ് റിപ്പോർട്ടുകൾ
        </h3>
        <button
          onClick={() => navigate('/user-reports')}
          className="-mx-2 -my-3 inline-flex min-h-[44px] shrink-0 items-center gap-1 px-2 text-[12px] font-bold text-[#0f2a5c] hover:underline sm:text-xs"
        >
          എല്ലാം കാണുക <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-[#14346b]" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-sm text-gray-400">
          അസൈൻഡ് റിപ്പോർട്ടുകൾ ഒന്നും ഇല്ല
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const submitted = report.status === 'submitted';
            return (
              <article
                key={report._id}
                className="rounded-xl border border-[#e6ecf5] bg-[#f6f8fc] p-3 sm:flex sm:items-center sm:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[14px] font-extrabold leading-snug text-[#0f2a5c] [overflow-wrap:anywhere] sm:text-base">{report.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-[#e8e6f7] px-2 py-0.5 text-[12px] font-bold text-[#3b3a6b] sm:text-xs">
                        {TYPE_LABEL[report.type] || report.type}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold sm:text-xs ${
                          submitted ? 'bg-[#e3f4ea] text-[#1e8a4c]' : 'bg-[#fdf1dc] text-[#a06a12]'
                        }`}
                      >
                        {submitted ? (
                          <><CheckCircle2 className="h-3 w-3" /> Submitted</>
                        ) : (
                          <><Clock className="h-3 w-3" /> Pending</>
                        )}
                      </span>
                    </div>
                  </div>
                  <ReportArt submitted={submitted} />
                </div>
                <button
                  onClick={() => handleFill(report._id)}
                  className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#14346b] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#1d4487] sm:mt-0 sm:min-h-[44px] sm:w-auto sm:shrink-0 sm:text-sm"
                >
                  {submitted ? 'പരിശോധിക്കുക' : 'പൂരിപ്പിക്കുക'} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ActiveReportsCard;
