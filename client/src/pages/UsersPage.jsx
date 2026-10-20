import { useEffect, useState } from 'react';
import { getUsers, updateUser, deleteUser } from '../api/users.js';
import { register } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../components/Layout.jsx';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

const ROLE_OPTIONS = ['admin', 'staff'];

const INITIAL_FORM = {
  fullName: '',
  username: '',
  password: '',
  role: 'staff',
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-2xs"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden border border-emerald-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-50 bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 rounded-full bg-[#008751]" />
            <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function FormField({
  label,
  name,
  type = 'text',
  placeholder = '',
  required = false,
  value,
  onChange,
  error,
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={name === 'password' ? 'new-password' : 'off'}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008751] transition-colors ${
          error ? 'border-red-400 bg-red-50' : 'border-slate-300'
        }`}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      const data = res.data;
      setUsers(Array.isArray(data) ? data : data.users || data.data || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setForm({ ...INITIAL_FORM });
    setFormErrors({});
    setEditTarget(null);
    setModalMode('add');
  };

  const openEditModal = (user) => {
    setForm({
      fullName: user.fullName || user.full_name || '',
      username: user.username || '',
      password: '',
      role: user.role || 'staff',
    });
    setFormErrors({});
    setEditTarget(user);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditTarget(null);
    setForm({ ...INITIAL_FORM });
    setFormErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.username.trim()) errs.username = 'Username is required';
    if (modalMode === 'add' && !form.password.trim()) errs.password = 'Password is required';
    if (form.password && form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      if (modalMode === 'add') {
        await register({
          fullName: form.fullName.trim(),
          full_name: form.fullName.trim(),
          username: form.username.trim(),
          password: form.password,
          role: form.role,
        });
        toast.success('User created successfully');
      } else {
        const payload = {
          fullName: form.fullName.trim(),
          full_name: form.fullName.trim(),
          username: form.username.trim(),
          role: form.role,
        };
        if (form.password.trim()) payload.password = form.password;
        await updateUser(editTarget._id || editTarget.id, payload);
        toast.success('User updated successfully');
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to save user';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (user) => {
    const uid = user._id || user.id;
    const cuid = currentUser?._id || currentUser?.id;
    if (uid === cuid) {
      toast.error('You cannot delete your own account');
      return;
    }
    if (!window.confirm(`Delete user "${user.fullName || user.full_name || user.username}"? This cannot be undone.`)) return;
    setDeletingId(uid);
    try {
      await deleteUser(uid);
      toast.success('User deleted');
      fetchUsers();
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Staff & Officers Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorized registry personnel accounts ({users.length} registered)
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#008751] hover:bg-[#007242] text-white text-xs md:text-sm font-bold rounded-lg transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add New User
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-emerald-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-3 border-[#008751] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-sm font-medium text-slate-600">No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-emerald-50/60 text-slate-700 text-xs uppercase tracking-wider border-b border-emerald-100">
                    <th className="px-5 py-3 text-left font-bold">Full Name</th>
                    <th className="px-5 py-3 text-left font-bold">Username</th>
                    <th className="px-5 py-3 text-left font-bold">Role</th>
                    <th className="px-5 py-3 text-left font-bold">Date Created</th>
                    <th className="px-5 py-3 text-left font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const uid = u._id || u.id;
                    const cuid = currentUser?._id || currentUser?.id;
                    const isSelf = uid === cuid;
                    const fullName = u.fullName || u.full_name;
                    const createdAt = u.createdAt || u.created_at;

                    return (
                      <tr key={uid} className={`hover:bg-emerald-50/20 transition-colors ${isSelf ? 'bg-emerald-50/30' : ''}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#008751] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs">
                              {fullName?.charAt(0)?.toUpperCase() || u.username?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-800">
                              {fullName || '—'}
                              {isSelf && <span className="ml-2 text-[10px] bg-emerald-100 text-[#008751] px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{u.username}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                              u.role === 'admin'
                                ? 'bg-emerald-100 text-[#008751] border border-emerald-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                          {createdAt
                            ? (() => { try { return format(parseISO(createdAt), 'dd MMM yyyy'); } catch { return '—'; } })()
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditModal(u)}
                              className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={isSelf || deletingId === uid}
                              title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                              className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {deletingId === uid ? '...' : 'Delete'}
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
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalMode && (
        <Modal
          title={modalMode === 'add' ? 'Register New Staff User' : 'Edit User Information'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Full Name"
              name="fullName"
              placeholder="e.g. John Okon"
              value={form.fullName}
              onChange={handleChange}
              error={formErrors.fullName}
              required
            />
            <FormField
              label="Username"
              name="username"
              placeholder="e.g. johno"
              value={form.username}
              onChange={handleChange}
              error={formErrors.username}
              required
            />
            <FormField
              label={modalMode === 'edit' ? 'New Password (leave blank to keep current)' : 'Password'}
              name="password"
              type="password"
              placeholder={modalMode === 'edit' ? 'Leave blank to keep current' : 'Min. 6 characters'}
              value={form.password}
              onChange={handleChange}
              error={formErrors.password}
              required={modalMode === 'add'}
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Role / Permissions</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#008751]"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#008751] hover:bg-[#007242] disabled:bg-emerald-300 text-white rounded-lg text-sm font-bold transition-all shadow-sm"
              >
                {submitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {submitting ? 'Saving...' : modalMode === 'add' ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
