import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFiles, deleteFile } from '../api/files.js';
import Layout from '../components/Layout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TypeBadge from '../components/TypeBadge.jsx';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const PAGE_SIZE = 15;

const STATUS_OPTIONS = ['All', 'Pending', 'In Progress', 'Completed', 'Returned'];
const TYPE_OPTIONS = ['All', 'Incoming', 'Outgoing'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export default function FilesPage() {
  const navigate = useNavigate();

  const [files, setFiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
      };
      if (search.trim()) params.search = search.trim();
      if (typeFilter !== 'All') params.type = typeFilter.toLowerCase();
      if (statusFilter !== 'All') params.status = statusFilter.toLowerCase();
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await getFiles(params);
      const data = res.data;
      if (Array.isArray(data)) {
        setFiles(data);
        setTotal(data.length);
      } else {
        setFiles(data.files || data.data || []);
        setTotal(data.total || data.count || 0);
      }
    } catch {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter, startDate, endDate]);

  const handleDelete = async (file) => {
    const id = file._id || file.id;
    if (!window.confirm(`Delete file "${file.title}"? This action cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteFile(id);
      toast.success('File deleted');
      fetchFiles();
    } catch {
      toast.error('Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCSV = () => {
    if (!files.length) {
      toast.error('No data to export');
      return;
    }
    const headers = [
      'File Number', 'Title', 'Type', 'Date Logged', 'Reference No',
      'Origin', 'Destination', 'Action Officer', 'Status', 'Remarks',
    ];
    const rows = files.map((f) => [
      f.fileNumber, f.title, f.type,
      formatDate(f.dateLogged), f.referenceNumber,
      f.origin, f.destination, f.actionOfficer, f.status, f.remarks,
    ].map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`));

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FMYD-ICT-Files-${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('All');
    setStatusFilter('All');
    setStartDate('');
    setEndDate('');
  };

  const hasFilters = search || typeFilter !== 'All' || statusFilter !== 'All' || startDate || endDate;

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800">File Registry</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? 'Loading...' : `${total} record${total !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <Link
              to="/files/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Register File
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative xl:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search file no., title, reference..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o === 'All' ? 'All Types' : o}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o} value={o}>{o === 'All' ? 'All Statuses' : o}</option>
              ))}
            </select>

            {/* Date range */}
            <div className="flex gap-2 xl:col-span-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                title="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                title="End Date"
              />
            </div>
          </div>
          {hasFilters && (
            <div className="mt-2 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs text-red-500 hover:text-red-700 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">
                {hasFilters ? 'No files match your filters.' : 'No files registered yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                    <th className="px-4 py-3 text-left font-semibold">File No.</th>
                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Reference</th>
                    <th className="px-4 py-3 text-left font-semibold">Origin</th>
                    <th className="px-4 py-3 text-left font-semibold">Destination</th>
                    <th className="px-4 py-3 text-left font-semibold">Officer</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {files.map((file) => {
                    const id = file._id || file.id;
                    return (
                      <tr key={id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {file.fileNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-800 max-w-[180px]">
                          <span className="block truncate" title={file.title}>{file.title}</span>
                        </td>
                        <td className="px-4 py-3"><TypeBadge type={file.type} /></td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDate(file.dateLogged)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">
                          {file.referenceNumber || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">
                          {file.origin}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">
                          {file.destination}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">
                          {file.actionOfficer}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={file.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/files/${id}`}
                              className="px-2 py-1 text-xs text-primary-700 bg-primary-50 hover:bg-primary-100 rounded transition-colors"
                            >
                              View
                            </Link>
                            <Link
                              to={`/files/${id}/edit`}
                              className="px-2 py-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(file)}
                              disabled={deletingId === id}
                              className="px-2 py-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                            >
                              {deletingId === id ? '...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
              <p className="text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors text-xs"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors text-xs"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
