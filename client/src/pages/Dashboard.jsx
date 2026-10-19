import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getFiles } from '../api/files.js';
import Layout from '../components/Layout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TypeBadge from '../components/TypeBadge.jsx';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const statCards = [
  {
    key: 'total',
    label: 'Total Registered Files',
    color: 'fmyd',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: 'incoming',
    label: 'Incoming Files',
    color: 'green',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    key: 'outgoing',
    label: 'Outgoing Files',
    color: 'orange',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l4-4m0 0l-4-4m4 4H4" />
      </svg>
    ),
  },
  {
    key: 'pending',
    label: 'Pending Action',
    color: 'amber',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'today',
    label: "Today's Entries",
    color: 'forest',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const colorMap = {
  fmyd: {
    bg: 'bg-white',
    icon: 'bg-[#008751] text-white shadow-sm',
    value: 'text-[#008751]',
    border: 'border-emerald-200 shadow-xs',
  },
  green: {
    bg: 'bg-white',
    icon: 'bg-emerald-100 text-emerald-700',
    value: 'text-emerald-700',
    border: 'border-emerald-100 shadow-xs',
  },
  orange: {
    bg: 'bg-white',
    icon: 'bg-orange-100 text-orange-700',
    value: 'text-orange-700',
    border: 'border-orange-100 shadow-xs',
  },
  amber: {
    bg: 'bg-white',
    icon: 'bg-amber-100 text-amber-700',
    value: 'text-amber-700',
    border: 'border-amber-100 shadow-xs',
  },
  forest: {
    bg: 'bg-white',
    icon: 'bg-[#0a3821] text-emerald-100 shadow-sm',
    value: 'text-[#0a3821]',
    border: 'border-emerald-200/60 shadow-xs',
  },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentFiles, setRecentFiles] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecent();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await getStats();
      setStats(res.data);
    } catch {
      toast.error('Failed to load statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await getFiles({ limit: 10, page: 1 });
      const data = res.data;
      setRecentFiles(Array.isArray(data) ? data : data.files || data.data || []);
    } catch {
      // silently fail recent files
    } finally {
      setLoadingFiles(false);
    }
  };

  const getStatValue = (key) => {
    if (!stats) return '—';
    if (key === 'total') return stats.total_files ?? stats.total ?? 0;
    if (key === 'incoming') return stats.incoming_count ?? stats.incoming ?? 0;
    if (key === 'outgoing') return stats.outgoing_count ?? stats.outgoing ?? 0;
    if (key === 'pending') return stats.pending_count ?? stats.pending ?? 0;
    if (key === 'today') return stats.today_count ?? stats.today ?? 0;
    return stats[key] ?? 0;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Government Banner */}
        <div className="bg-gradient-to-r from-[#0a3821] via-[#008751] to-[#0a3821] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-200">Department of Information & Communications Technology</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Federal Ministry of Youth Development</h2>
              <p className="text-emerald-100/90 text-xs md:text-sm mt-1">Official Incoming & Outgoing File Registry System</p>
            </div>
            <Link
              to="/files/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#008751] hover:bg-emerald-50 text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Register New File
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((card) => {
            const c = colorMap[card.color];
            return (
              <div
                key={card.key}
                className={`rounded-xl border ${c.border} ${c.bg} p-5 flex items-center gap-4 transition-all hover:shadow-sm`}
              >
                <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center shrink-0`}>
                  {card.icon}
                </div>
                <div>
                  {loadingStats ? (
                    <div className="h-7 w-12 bg-slate-200 rounded animate-pulse mb-1" />
                  ) : (
                    <p className={`text-2xl font-extrabold ${c.value}`}>{getStatValue(card.key)}</p>
                  )}
                  <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Files Table */}
        <div className="bg-white rounded-xl border border-emerald-100/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-emerald-50 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-4 rounded-full bg-[#008751]" />
              <h3 className="font-bold text-slate-800 text-sm">Recently Registered Files</h3>
            </div>
            <Link to="/files" className="text-xs font-semibold text-[#008751] hover:text-[#005c35] hover:underline flex items-center gap-1">
              View all register →
            </Link>
          </div>

          {loadingFiles ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-3 border-[#008751] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentFiles.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-slate-600">No files registered yet.</p>
              <p className="text-xs text-slate-400 mt-0.5">Start keeping records by logging the first department file.</p>
              <Link to="/files/new" className="text-[#008751] text-xs font-semibold hover:underline mt-3 inline-block bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                + Register First File
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-emerald-50/50 text-slate-600 text-xs uppercase tracking-wider border-b border-emerald-100">
                    <th className="px-4 py-3 text-left font-bold">File No.</th>
                    <th className="px-4 py-3 text-left font-bold">Title / Subject</th>
                    <th className="px-4 py-3 text-left font-bold">Type</th>
                    <th className="px-4 py-3 text-left font-bold">Date Logged</th>
                    <th className="px-4 py-3 text-left font-bold">Action Officer</th>
                    <th className="px-4 py-3 text-left font-bold">Status</th>
                    <th className="px-4 py-3 text-left font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentFiles.map((file) => {
                    const id = file._id || file.id;
                    const fileNumber = file.fileNumber || file.file_number;
                    const dateLogged = file.dateLogged || file.date_logged;
                    const actionOfficer = file.actionOfficer || file.action_officer;

                    return (
                      <tr key={id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-[#008751] whitespace-nowrap">
                          {fileNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-800 max-w-[220px] font-medium">
                          <span className="block truncate" title={file.title}>{file.title}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <TypeBadge type={file.type} />
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                          {formatDate(dateLogged)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate text-xs">
                          {actionOfficer || '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={file.status} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            to={`/files/${id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#008751] hover:text-[#005c35] hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
