import api from './axios.js';

/**
 * Fetch paginated/filtered list of files.
 * @param {object} params - query params: page, limit, search, type, status, startDate, endDate
 */
export const getFiles = (params = {}) => api.get('/files', { params });

/**
 * Fetch a single file by id.
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
