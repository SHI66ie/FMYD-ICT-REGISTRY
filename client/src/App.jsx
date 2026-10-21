import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AuthGuard from './components/AuthGuard.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import FilesPage from './pages/FilesPage.jsx';
import FileFormPage from './pages/FileFormPage.jsx';
import FileDetailPage from './pages/FileDetailPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '8px',
            background: '#1e293b',
            color: '#f8fafc',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#f8fafc' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#f8fafc' },
          },
        }}
      />

      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/files"
          element={
            <AuthGuard>
              <FilesPage />
            </AuthGuard>
          }
        />
        <Route
          path="/files/new"
          element={
            <AuthGuard>
              <FileFormPage />
            </AuthGuard>
          }
        />
        <Route
          path="/files/:id"
          element={
            <AuthGuard>
              <FileDetailPage />
            </AuthGuard>
          }
        />
        <Route
          path="/files/:id/edit"
          element={
            <AuthGuard>
              <FileFormPage />
            </AuthGuard>
          }
        />

        {/* Admin only */}
        <Route
          path="/users"
          element={
            <AuthGuard adminOnly>
              <UsersPage />
            </AuthGuard>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <AuthGuard>
              <SettingsPage />
            </AuthGuard>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
