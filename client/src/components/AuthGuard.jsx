import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * AuthGuard wraps protected routes.
 * - Redirects to /login if not authenticated.
 * - If adminOnly is true, redirects to /dashboard if user is not an admin.
 */
export default function AuthGuard({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  // Wait until auth state is resolved from localStorage
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
