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
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
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
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!fileData) return null;

  const f = fileData;
  const fileId = f._id || f.id;
  const scanUrl = f.scanPath || f.scanUrl || f.scan;
  const isImage = scanUrl && scanUrl.match(/\.(jpg|jpeg|png)$/i);
  const isPdf = scanUrl && scanUrl.match(/\.pdf$/i);
  const fullScanUrl = scanUrl
    ? scanUrl.startsWith('http')
      ? scanUrl
      : `/api/${scanUrl}`
    : null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 no-print">
          <div className="flex items-center gap-3">
            <Link
              to="/files"
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h2 className="text-xl font-bold text-slate-800">File Details</h2>
              <p className="text-sm text-slate-500 mt-0.5 font-mono">{f.fileNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <Link
              to={`/files/${fileId}/edit`}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit File
            </Link>
          </div>
        </div>

        {/* Print header (only shows on print) */}
        <div className="hidden print:block mb-6 text-center border-b pb-4">
          <h1 className="text-lg font-bold">FMYD ICT File Registry</h1>
          <p className="text-sm text-slate-600">Federal Ministry of Youth Development</p>
          <p className="text-xs text-slate-400 mt-1">Printed: {format(new Date(), 'dd MMMM yyyy, HH:mm')}</p>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
          {/* Card header with type + status */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-800 text-base">{f.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{f.fileNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <TypeBadge type={f.type} />
              <StatusBadge status={f.status} />
            </div>
          </div>

          {/* Detail grid */}
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            <DetailRow label="Date Logged" value={formatDate(f.dateLogged)} />
            <DetailRow label="Reference Number" value={f.referenceNumber} />
            <DetailRow label="Origin (From)" value={f.origin} />
            <DetailRow label="Destination (To)" value={f.destination} />
            <DetailRow label="Action Officer" value={f.actionOfficer} />
            <DetailRow label="Registered By" value={f.createdBy?.fullName || f.createdBy?.username || f.registeredBy} />
            <DetailRow
              label="Date Registered"
              value={f.createdAt ? format(parseISO(f.createdAt), 'dd MMMM yyyy, HH:mm') : '—'}
            />
            <DetailRow
              label="Last Updated"
              value={f.updatedAt ? format(parseISO(f.updatedAt), 'dd MMMM yyyy, HH:mm') : '—'}
            />
            {f.remarks && (
              <div className="col-span-1 sm:col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Remarks</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{f.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Scan Preview */}
        {fullScanUrl && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-5">
            <h3 className="font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Document Scan
            </h3>
            {isImage && (
              <img
                src={fullScanUrl}
                alt="File scan"
                className="max-w-full max-h-[600px] object-contain rounded-lg border border-slate-200"
              />
            )}
            {isPdf && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">PDF Document</p>
                  <a
                    href={fullScanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Open PDF →
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back button */}
        <div className="no-print pb-6">
          <Link
            to="/files"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to File Registry
          </Link>
        </div>
      </div>
    </Layout>
  );
}
