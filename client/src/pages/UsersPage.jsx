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
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
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
      setUsers(Array.isArray(data) ? data : data.users || []);
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
      fullName: user.fullName || '',
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
          username: form.username.trim(),
          password: form.password,
          role: form.role,
        });
        toast.success('User created successfully');
      } else {
        const payload = {
          fullName: form.fullName.trim(),
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
      const msg = err?.response?.data?.message || 'Failed to save user';
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
    if (!window.confirm(`Delete user "${user.fullName || user.username}"? This cannot be undone.`)) return;
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

  const FormField = ({ label, name, type = 'text', placeholder = '', required = false }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete={name === 'password' ? 'new-password' : 'off'}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
          formErrors[name] ? 'border-red-400 bg-red-50' : 'border-slate-300'
        }`}
      />
      {formErrors[name] && <p className="text-red-500 text-xs mt-1">{formErrors[name]}</p>}
    </div>
  );

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">User Management</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? 'Loading...' : `${users.length} user${users.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New User
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-sm">No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                    <th className="px-5 py-3 text-left font-semibold">Full Name</th>
                    <th className="px-5 py-3 text-left font-semibold">Username</th>
                    <th className="px-5 py-3 text-left font-semibold">Role</th>
                    <th className="px-5 py-3 text-left font-semibold">Joined</th>
                    <th className="px-5 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const uid = u._id || u.id;
                    const cuid = currentUser?._id || currentUser?.id;
                    const isSelf = uid === cuid;
                    return (
                      <tr key={uid} className={`hover:bg-slate-50 transition-colors ${isSelf ? 'bg-blue-50/40' : ''}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                              {u.fullName?.charAt(0)?.toUpperCase() || u.username?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800">
                              {u.fullName || '—'}
                              {isSelf && <span className="ml-2 text-xs text-primary-600 font-normal">(You)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{u.username}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                          {u.createdAt
                            ? (() => { try { return format(parseISO(u.createdAt), 'dd MMM yyyy'); } catch { return '—'; } })()
                            : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditModal(u)}
                              className="px-2.5 py-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={isSelf || deletingId === uid}
                              title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                              className="px-2.5 py-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
          title={modalMode === 'add' ? 'Add New User' : 'Edit User'}
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Full Name" name="fullName" placeholder="e.g. John Doe" required />
            <FormField label="Username" name="username" placeholder="e.g. johndoe" required />
            <FormField
              label={modalMode === 'edit' ? 'New Password (leave blank to keep)' : 'Password'}
              name="password"
              type="password"
              placeholder={modalMode === 'edit' ? 'Leave blank to keep current' : 'Min. 6 characters'}
              required={modalMode === 'add'}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {submitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {submitting ? 'Saving...' : modalMode === 'add' ? 'Create User' : 'Update User'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
}
