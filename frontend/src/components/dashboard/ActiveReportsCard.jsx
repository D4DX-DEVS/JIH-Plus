import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

const typeBadgeClass = (type) => {
  if (type === 'monthly') return 'bg-blue-100 text-blue-800';
  if (type === 'special') return 'bg-purple-100 text-purple-800';
  if (type === 'yearly') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-800';
};

const statusBadgeClass = (status) =>
  status === 'submitted'
    ? 'bg-green-100 text-green-800 border border-green-200'
    : 'bg-yellow-100 text-yellow-700 border border-yellow-200';

/**
 * Shared "Active Reports" section for district/area/unit dashboards.
 * Lists active report forms scoped to the logged-in user's role and links
 * straight into UserReportsPage with the report preselected.
 */
const ActiveReportsCard = ({ reports = [], loading = false }) => {
  const navigate = useNavigate();

  const handleFill = (reportId) => {
    navigate('/user-reports', { state: { reportId } });
  };

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#002349] flex items-center gap-2">
          <FileText className="w-4 h-4" /> ആക്ടീവ് റിപ്പോർട്ടുകൾ
        </h3>
        <button
          onClick={() => navigate('/user-reports')}
          className="text-xs font-semibold text-[#002349] hover:underline py-2 -my-2"
        >
          എല്ലാം കാണുക
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#002349]" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
          ആക്ടീവ് റിപ്പോർട്ടുകൾ ഒന്നും ഇല്ല
        </div>
      ) : (
        <div className="space-y-2.5">
          {reports.map((report) => (
            <div
              key={report._id}
              className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{report.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeBadgeClass(report.type)}`}>
                    {report.type}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${statusBadgeClass(report.status)}`}>
                    {report.status === 'submitted' ? (
                      <><CheckCircle2 className="w-2.5 h-2.5" /> Submitted</>
                    ) : (
                      <><Clock className="w-2.5 h-2.5" /> Pending</>
                    )}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleFill(report._id)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#002349] text-white text-xs font-semibold hover:bg-[#1a3a5c] transition-colors"
              >
                പൂരിപ്പിക്കുക <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveReportsCard;
