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
      if (statusFilter !== 'All') params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await getFiles(params);
      const data = res.data;
      if (Array.isArray(data)) {
        setFiles(data);
        setTotal(data.length);
      } else {
        setFiles(data.files || data.data || []);
        setTotal(data.pagination?.total ?? (data.files || data.data || []).length);
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

  const handleDelete = async (file) => {
    const id = file._id || file.id;
    const fileNum = file.fileNumber || file.file_number;
    if (!window.confirm(`Are you sure you want to delete file record "${fileNum}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteFile(id);
      toast.success('File deleted successfully');
      fetchFiles();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to delete file';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCSV = () => {
    if (files.length === 0) {
      toast.error('No files to export');
      return;
    }
    const headers = ['File Number', 'Title', 'Type', 'Date Logged', 'Reference Number', 'Origin', 'Destination', 'Action Officer', 'Status', 'Remarks'];
    const rows = files.map((f) => [
      f.fileNumber || f.file_number || '',
      `"${(f.title || '').replace(/"/g, '""')}"`,
      f.type || '',
      f.dateLogged || f.date_logged || '',
      f.referenceNumber || f.reference_number || '',
      `"${(f.origin || '').replace(/"/g, '""')}"`,
      `"${(f.destination || '').replace(/"/g, '""')}"`,
      `"${(f.actionOfficer || f.action_officer || '').replace(/"/g, '""')}"`,
      f.status || '',
      `"${(f.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FMYD_Registry_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('All');
    setStatusFilter('All');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasFilters = search || typeFilter !== 'All' || statusFilter !== 'All' || startDate || endDate;

  return (
    <Layout>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Department File Registry</h2>
            <p className="text-xs text-slate-500 mt-0.5">Comprehensive register of all official incoming and outgoing files</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm border border-emerald-300 text-[#008751] hover:bg-emerald-50 rounded-lg transition-colors font-semibold shadow-2xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <Link
              to="/files/new"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#008751] hover:bg-[#007242] text-white text-xs md:text-sm font-bold rounded-lg transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Register File
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative xl:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search file no., title, reference, officer..."
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008751] focus:border-[#008751]"
              />
            </div>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008751]"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o === 'All' ? 'All Types' : o}</option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008751]"
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
                className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008751]"
                title="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008751]"
                title="End Date"
              />
            </div>
          </div>
          {hasFilters && (
            <div className="mt-2.5 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-xs text-red-600 hover:underline font-semibold"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-emerald-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-3 border-[#008751] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-semibold text-slate-700">
                {hasFilters ? 'No files match your search criteria.' : 'No files registered in the department yet.'}
              </p>
              {hasFilters ? (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-xs font-semibold text-[#008751] hover:underline"
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  to="/files/new"
                  className="mt-3 inline-block px-3 py-1.5 text-xs font-bold text-white bg-[#008751] rounded-lg hover:bg-[#007242]"
                >
                  Register First File
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-emerald-50/60 text-slate-700 text-xs uppercase tracking-wider border-b border-emerald-100">
                    <th className="px-4 py-3 text-left font-bold">File No.</th>
                    <th className="px-4 py-3 text-left font-bold">Title / Subject</th>
                    <th className="px-4 py-3 text-left font-bold">Type</th>
                    <th className="px-4 py-3 text-left font-bold">Date Logged</th>
                    <th className="px-4 py-3 text-left font-bold">Reference</th>
                    <th className="px-4 py-3 text-left font-bold">Origin</th>
                    <th className="px-4 py-3 text-left font-bold">Destination</th>
                    <th className="px-4 py-3 text-left font-bold">Officer</th>
                    <th className="px-4 py-3 text-left font-bold">Status</th>
                    <th className="px-4 py-3 text-left font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {files.map((file) => {
                    const id = file._id || file.id;
                    const fileNumber = file.fileNumber || file.file_number;
                    const dateLogged = file.dateLogged || file.date_logged;
                    const referenceNumber = file.referenceNumber || file.reference_number;
                    const actionOfficer = file.actionOfficer || file.action_officer;

                    return (
                      <tr key={id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-[#008751] whitespace-nowrap">
                          {fileNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-800 max-w-[200px] font-medium">
                          <span className="block truncate" title={file.title}>{file.title}</span>
                        </td>
                        <td className="px-4 py-3"><TypeBadge type={file.type} /></td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                          {formatDate(dateLogged)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate text-xs">
                          {referenceNumber || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate text-xs">
                          {file.origin || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate text-xs">
                          {file.destination || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate text-xs">
                          {actionOfficer || '—'}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={file.status} /></td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={`/files/${id}`}
                              className="px-2.5 py-1 text-xs font-semibold text-[#008751] bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                            >
                              View
                            </Link>
                            <Link
                              to={`/files/${id}/edit`}
                              className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(file)}
                              disabled={deletingId === id}
                              className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors disabled:opacity-50"
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
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total} entries
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white"
                >
                  Prev
                </button>
                <span className="px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
