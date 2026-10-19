import api from './axios.js';

/**
 * Authenticate user and return JWT token.
 * @param {string} username
 * @param {string} password
 */
export const login = (username, password) =>
  api.post('/auth/login', { username, password });

/**
 * Register a new user account.
 * @param {{ fullName: string, username: string, password: string, role: string }} data
 */
export const register = (data) => api.post('/auth/register', data);

/**
 * Get the currently authenticated user's profile.
 */
export const getMe = () => api.get('/auth/me');
