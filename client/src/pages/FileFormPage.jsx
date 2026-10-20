import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getFile, createFile, updateFile } from '../api/files.js';
import Layout from '../components/Layout.jsx';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed', 'Returned'];

const INITIAL_FORM = {
  fileNumber: '',
  title: '',
  dateLogged: '',
  referenceNumber: '',
  type: 'Incoming',
  origin: '',
  destination: '',
  actionOfficer: '',
  status: 'Pending',
  remarks: '',
};

function getInitialDate() {
  return new Date().toISOString().split('T')[0];
}

function InputField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  className = '',
  placeholder = '',
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008751] focus:border-[#008751] transition-colors ${
          error ? 'border-red-400 bg-red-50' : 'border-slate-300'
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function FileFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({ ...INITIAL_FORM, dateLogged: getInitialDate() });
  const [file, setFile] = useState(null); // uploaded File object
  const [preview, setPreview] = useState(null); // data URL or existing URL
  const [existingScan, setExistingScan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isEdit) {
      fetchFile();
    }
  }, [id]);

  const fetchFile = async () => {
    try {
      const res = await getFile(id);
      const data = res.data;
      const f = data.file || data;
      setForm({
        fileNumber: f.fileNumber || '',
        title: f.title || '',
        dateLogged: f.dateLogged ? f.dateLogged.split('T')[0] : '',
        referenceNumber: f.referenceNumber || '',
        type: f.type || 'Incoming',
        origin: f.origin || '',
        destination: f.destination || '',
        actionOfficer: f.actionOfficer || '',
        status: f.status || 'Pending',
        remarks: f.remarks || '',
      });
      if (f.scanPath || f.scanUrl || f.scan) {
        setExistingScan(f.scanPath || f.scanUrl || f.scan);
      }
    } catch {
      toast.error('Failed to load file');
      navigate('/files');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    const maxSize = 10 * 1024 * 1024;
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(selectedFile.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }
    if (selectedFile.size > maxSize) {
      toast.error('File size must be less than 10MB');
      return;
    }
    setFile(selectedFile);
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview('pdf');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileChange(dropped);
  };

  const validate = () => {
    const errs = {};
    if (!form.fileNumber.trim()) errs.fileNumber = 'File number is required';
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.dateLogged) errs.dateLogged = 'Date is required';
    if (!form.type) errs.type = 'Type is required';
    if (!form.origin.trim()) errs.origin = 'Origin is required';
    if (!form.destination.trim()) errs.destination = 'Destination is required';
    if (!form.actionOfficer.trim()) errs.actionOfficer = 'Action officer is required';
    if (!form.status) errs.status = 'Status is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        formData.append(key, val);
      });
      if (file) formData.append('scan', file);

      if (isEdit) {
        await updateFile(id, formData);
        toast.success('File updated successfully');
      } else {
        await createFile(formData);
        toast.success('File registered successfully');
      }
      navigate('/files');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save file';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/files" className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {isEdit ? 'Edit File Entry' : 'Register New File'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEdit ? `Editing: ${form.fileNumber}` : 'Fill in the details to register a new file'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Main Info Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              File Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="File Number"
                name="fileNumber"
                value={form.fileNumber}
                onChange={handleChange}
                error={errors.fileNumber}
                required
              />
              <InputField
                label="Date Logged"
                name="dateLogged"
                type="date"
                value={form.dateLogged}
                onChange={handleChange}
                error={errors.dateLogged}
                required
              />
              <div className="sm:col-span-2">
                <InputField
                  label="Title / Subject"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  error={errors.title}
                  required
                />
              </div>
              <InputField
                label="Reference Number"
                name="referenceNumber"
                value={form.referenceNumber}
                onChange={handleChange}
                error={errors.referenceNumber}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-6">
                  {['Incoming', 'Outgoing'].map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type"
                        value={t}
                        checked={form.type === t}
                        onChange={handleChange}
                        className="w-4 h-4 text-primary-600 border-slate-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-slate-700">{t}</span>
                    </label>
                  ))}
                </div>
                {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
              </div>
            </div>
          </div>

          {/* Routing Info Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Routing Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Origin (From)"
                name="origin"
                value={form.origin}
                onChange={handleChange}
                error={errors.origin}
                required
              />
              <InputField
                label="Destination (To)"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                error={errors.destination}
                required
              />
              <InputField
                label="Action Officer"
                name="actionOfficer"
                value={form.actionOfficer}
                onChange={handleChange}
                error={errors.actionOfficer}
                required
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                    errors.status ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Additional notes or remarks..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* File Upload Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
              Document Scan
              <span className="ml-2 text-xs font-normal text-slate-400">(JPG, PNG, PDF — max 10MB)</span>
            </h3>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files[0])}
              />
              <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {file ? (
                <p className="text-sm font-medium text-primary-600">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm text-slate-600 font-medium">Drop your file here, or click to browse</p>
                  <p className="text-xs text-slate-400 mt-1">Supports: JPG, PNG, PDF up to 10MB</p>
                </>
              )}
            </div>

            {/* Preview new file */}
            {preview && preview !== 'pdf' && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2 font-medium">Preview:</p>
                <img
                  src={preview}
                  alt="Scan preview"
                  className="max-h-60 rounded-lg border border-slate-200 object-contain"
                />
              </div>
            )}
            {preview === 'pdf' && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-4 py-3 rounded-lg border border-slate-200">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{file?.name}</span>
                <span className="text-xs text-slate-400">({(file?.size / 1024).toFixed(0)} KB)</span>
              </div>
            )}

            {/* Existing scan (edit mode) */}
            {!file && existingScan && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2 font-medium">Existing scan:</p>
                {existingScan.match(/\.(jpg|jpeg|png)$/i) ? (
                  <img
                    src={existingScan.startsWith('http') ? existingScan : `/api/${existingScan}`}
                    alt="Existing scan"
                    className="max-h-60 rounded-lg border border-slate-200 object-contain"
                  />
                ) : (
                  <a
                    href={existingScan.startsWith('http') ? existingScan : `/api/${existingScan}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View existing scan
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end pb-6">
            <Link
              to="/files"
              className="px-5 py-2.5 text-sm border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? 'Saving...' : isEdit ? 'Update File' : 'Register File'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
