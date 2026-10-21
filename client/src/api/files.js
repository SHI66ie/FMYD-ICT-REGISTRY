import api from './axios.js';

/**
 * Fetch paginated/filtered list of files.
 * @param {object} params - query params: page, limit, search, type, status, startDate, endDate, category
 */
export const getFiles = (params = {}) => api.get('/files', { params });

/**
 * Fetch a single file by id (includes receipts).
 * @param {string|number} id
 */
export const getFile = (id) => api.get(`/files/${id}`);

/**
 * Create a new file entry (with optional scan upload).
 * @param {FormData} formData
 */
export const createFile = (formData) =>
  api.post('/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

/**
 * Update an existing file entry.
 * @param {string|number} id
 * @param {FormData|object} data
 */
export const updateFile = (id, data) => {
  const isFormData = data instanceof FormData;
  return api.put(`/files/${id}`, data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
};

/**
 * Delete a file entry.
 * @param {string|number} id
 */
export const deleteFile = (id) => api.delete(`/files/${id}`);

/**
 * Fetch dashboard statistics.
 */
export const getStats = () => api.get('/stats');

// ─── Receipt endpoints ─────────────────────────────────────────────
export const getReceipts = (fileId) => api.get(`/files/${fileId}/receipts`);
export const addReceipt = (fileId, data) => api.post(`/files/${fileId}/receipts`, data);
export const deleteReceipt = (fileId, receiptId) => api.delete(`/files/${fileId}/receipts/${receiptId}`);

// ─── Settings endpoints ────────────────────────────────────────────
export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);
export const setupGDrive = () => api.post('/settings/gdrive/setup');
export const backupToGDrive = () => api.post('/settings/gdrive/backup');
export const getGDriveStatus = () => api.get('/settings/gdrive/status');
