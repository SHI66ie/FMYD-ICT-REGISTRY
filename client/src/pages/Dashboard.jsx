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
    label: 'Total Files',
    color: 'blue',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: 'incoming',
    label: 'Incoming',
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
    label: 'Outgoing',
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
    label: 'Pending',
    color: 'red',
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
    color: 'purple',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    value: 'text-blue-700',
    border: 'border-blue-100',
  },
  green: {
    bg: 'bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-600',
    value: 'text-emerald-700',
    border: 'border-emerald-100',
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-100 text-orange-600',
    value: 'text-orange-700',
    border: 'border-orange-100',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-600',
    value: 'text-red-700',
    border: 'border-red-100',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-600',
    value: 'text-purple-700',
    border: 'border-purple-100',
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
    return stats[key] ?? stats[key.charAt(0).toUpperCase() + key.slice(1)] ?? 0;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
            <p className="text-sm text-slate-500 mt-0.5">Overview of the file registry</p>
          </div>
          <Link
            to="/files/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Register File
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((card) => {
            const c = colorMap[card.color];
            return (
              <div
                key={card.key}
                className={`rounded-xl border ${c.border} ${c.bg} p-5 flex items-center gap-4`}
              >
                <div className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center shrink-0`}>
                  {card.icon}
                </div>
                <div>
                  {loadingStats ? (
                    <div className="h-7 w-12 bg-slate-200 rounded animate-pulse mb-1" />
                  ) : (
                    <p className={`text-2xl font-bold ${c.value}`}>{getStatValue(card.key)}</p>
                  )}
                  <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Files */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Recent Files</h3>
            <Link to="/files" className="text-sm text-primary-600 hover:underline">
              View all →
            </Link>
          </div>

          {loadingFiles ? (
            <div className="p-8 flex justify-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : recentFiles.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No files registered yet.</p>
              <Link to="/files/new" className="text-primary-600 text-sm hover:underline mt-1 inline-block">
                Register the first file →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-semibold">File No.</th>
                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Officer</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentFiles.map((file) => (
                    <tr key={file._id || file.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{file.fileNumber}</td>
                      <td className="px-4 py-3 text-slate-800 max-w-[180px] truncate" title={file.title}>
                        {file.title}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={file.type} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(file.dateLogged)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">
                        {file.actionOfficer}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={file.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/files/${file._id || file.id}`}
                          className="text-primary-600 hover:underline text-xs font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
