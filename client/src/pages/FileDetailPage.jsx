import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getFile } from '../api/files.js';
import Layout from '../components/Layout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TypeBadge from '../components/TypeBadge.jsx';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMMM yyyy');
  } catch {
    return dateStr;
  }
}

function DetailRow({ label, value, wide = false }) {
  return (
    <div className={`${wide ? 'col-span-1 sm:col-span-2' : ''}`}>
      <p className="text-xs font-semibold text-emerald-800/70 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value || '—'}</p>
    </div>
  );
}

export default function FileDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFile();
  }, [id]);

  const fetchFile = async () => {
    try {
      const res = await getFile(id);
      const data = res.data;
      setFileData(data.file || data);
    } catch {
      toast.error('Failed to load file details');
      navigate('/files');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <div className="w-10 h-10 border-4 border-[#008751] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!fileData) return null;

  const f = fileData;
  const fileId = f._id || f.id;
  const fileNum = f.fileNumber || f.file_number;
  const dateLogged = f.dateLogged || f.date_logged;
  const refNum = f.referenceNumber || f.reference_number;
  const officer = f.actionOfficer || f.action_officer;
  const createdByName = f.created_by_name || f.createdByName || f.createdBy?.fullName || f.createdBy?.username || 'System';
  const createdAt = f.createdAt || f.created_at;
  const updatedAt = f.updatedAt || f.updated_at;

  const rawScan = f.scanPath || f.scan_path || f.scanUrl || f.scan;
  const isImage = rawScan && rawScan.match(/\.(jpg|jpeg|png)$/i);
  const isPdf = rawScan && rawScan.match(/\.pdf$/i);
  const fullScanUrl = rawScan
    ? rawScan.startsWith('http')
      ? rawScan
      : `/uploads/${rawScan}`
    : null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <Link
              to="/files"
              className="p-2 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
              title="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-800">File Details Record</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-50 text-[#008751] border border-emerald-200 font-bold">
                  {fileNum}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Federal Ministry of Youth Development File Record</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-emerald-300 text-[#008751] hover:bg-emerald-50 rounded-lg transition-colors font-semibold shadow-2xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Record
            </button>
            <Link
              to={`/files/${fileId}/edit`}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#008751] hover:bg-[#007242] text-white text-sm font-bold rounded-lg transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit File
            </Link>
          </div>
        </div>

        {/* Print header (only shows on physical print) */}
        <div className="hidden print:block mb-6 text-center border-b pb-4">
          <img src="/fmyd-logo.png" alt="FMYD Logo" className="w-16 h-16 mx-auto mb-2 object-contain" />
          <p className="text-xs tracking-widest font-bold uppercase text-slate-500">Federal Republic of Nigeria</p>
          <h1 className="text-lg font-extrabold text-[#008751]">FEDERAL MINISTRY OF YOUTH DEVELOPMENT</h1>
          <p className="text-sm font-semibold text-slate-700">Department of Information & Communications Technology</p>
          <p className="text-xs text-slate-400 mt-1">Official Registry File Record — Printed: {format(new Date(), 'dd MMMM yyyy, HH:mm')}</p>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-xl border border-emerald-100 shadow-xs overflow-hidden">
          {/* Card header with type + status */}
          <div className="px-6 py-4 border-b border-emerald-50 bg-emerald-50/30 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">{f.title}</h3>
              <p className="text-xs text-[#008751] font-mono mt-0.5 font-semibold">{fileNum}</p>
            </div>
            <div className="flex items-center gap-2">
              <TypeBadge type={f.type} />
              <StatusBadge status={f.status} />
            </div>
          </div>

          {/* Detail grid */}
          <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            <DetailRow label="Date Logged" value={formatDate(dateLogged)} />
            <DetailRow label="Reference Number" value={refNum} />
            <DetailRow label="Origin (From)" value={f.origin} />
            <DetailRow label="Destination (To)" value={f.destination} />
            <DetailRow label="Action Officer" value={officer} />
            <DetailRow label="Logged By Officer" value={createdByName} />
            <DetailRow
              label="Date First Registered"
              value={createdAt ? format(parseISO(createdAt), 'dd MMMM yyyy, HH:mm') : '—'}
            />
            <DetailRow
              label="Last Modified"
              value={updatedAt ? format(parseISO(updatedAt), 'dd MMMM yyyy, HH:mm') : '—'}
            />
            {f.remarks && (
              <div className="col-span-1 sm:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-1">Remarks & Notes</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{f.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Scan Preview Card */}
        {fullScanUrl && (
          <div className="bg-white rounded-xl border border-emerald-100 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-emerald-50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-4 rounded-full bg-[#008751]" />
                <h3 className="font-bold text-slate-800 text-sm">Scanned File Cover / Document</h3>
              </div>
              <a
                href={fullScanUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-[#008751] hover:underline flex items-center gap-1"
              >
                Open in Full View ↗
              </a>
            </div>

            {isImage && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-center">
                <img
                  src={fullScanUrl}
                  alt="File scan cover"
                  className="max-w-full max-h-[600px] object-contain rounded-md shadow-xs"
                />
              </div>
            )}
            {isPdf && (
              <div className="flex items-center justify-between p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                        clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Scanned PDF Document</p>
                    <p className="text-xs text-slate-500 font-mono">{rawScan}</p>
                  </div>
                </div>
                <a
                  href={fullScanUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#008751] hover:bg-[#007242] rounded-lg shadow-2xs"
                >
                  View PDF
                </a>
              </div>
            )}
          </div>
        )}

        {/* Back Link */}
        <div className="no-print pb-6">
          <Link
            to="/files"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#008751] hover:underline"
          >
            ← Back to File Registry
          </Link>
        </div>
      </div>
    </Layout>
  );
}
