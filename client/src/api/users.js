import api from './axios.js';

/**
 * Fetch all users (admin only).
 */
export const getUsers = () => api.get('/users');

/**
 * Update a user's details.
 * @param {string|number} id
 * @param {{ fullName?: string, username?: string, password?: string, role?: string }} data
 */
export const updateUser = (id, data) => api.put(`/users/${id}`, data);

/**
 * Delete a user account.
 * @param {string|number} id
 */
export const deleteUser = (id) => api.delete(`/users/${id}`);
