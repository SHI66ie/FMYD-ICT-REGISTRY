import { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import { getSettings, updateSettings, setupGDrive, backupToGDrive, getGDriveStatus } from '../api/files.js';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState({ gdriveEnabled: false, rcloneInstalled: false, gdriveConnected: false });
  const [status, setStatus] = useState({ lastBackupLog: null });
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [settingsRes, statusRes] = await Promise.all([getSettings(), getGDriveStatus()]);
      setSettings(settingsRes.data);
      setStatus(statusRes.data);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGDrive = async () => {
    try {
      const newVal = !settings.gdriveEnabled;
      await updateSettings({ gdriveEnabled: newVal });
      setSettings(prev => ({ ...prev, gdriveEnabled: newVal }));
      toast.success(newVal ? 'Google Drive backup enabled' : 'Google Drive backup disabled');
    } catch {
      toast.error('Failed to update settings');
    }
  };

  const handleSetupGDrive = async () => {
    setSettingUp(true);
    try {
      const res = await setupGDrive();
      toast.success(res.data.message || 'Setup started — check your browser');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to start setup';
      toast.error(msg);
    } finally {
      setSettingUp(false);
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const res = await backupToGDrive();
      toast.success(res.data.message || 'Backup started');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Backup failed');
    } finally {
      setBackingUp(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <div className="w-10 h-10 border-4 border-[#008751] border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Settings</h2>
          <p className="text-sm text-slate-500 mt-1">Configure application preferences and Google Drive backup</p>
        </div>

        {/* Google Drive Backup Section */}
        <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
          <div className="px-6 py-4 bg-emerald-50/30 border-b border-emerald-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#008751] flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Google Drive Backup</h3>
              <p className="text-xs text-slate-500">Automatically backup your database and files to Google Drive</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Status indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${settings.rcloneInstalled ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${settings.rcloneInstalled ? 'bg-[#008751]' : 'bg-red-500'}`} />
                <div>
                  <p className="text-sm font-medium text-slate-800">Rclone</p>
                  <p className="text-xs text-slate-500">{settings.rcloneInstalled ? 'Installed' : 'Not installed'}</p>
                </div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-lg border ${settings.gdriveConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${settings.gdriveConnected ? 'bg-[#008751]' : 'bg-amber-500'}`} />
                <div>
                  <p className="text-sm font-medium text-slate-800">Google Drive</p>
                  <p className="text-xs text-slate-500">{settings.gdriveConnected ? 'Connected' : 'Not connected'}</p>
                </div>
              </div>
            </div>

            {/* Enable/disable toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-800">Enable Google Drive Backup</p>
                <p className="text-xs text-slate-500 mt-0.5">When enabled, you can backup data to Google Drive</p>
              </div>
              <button
                onClick={handleToggleGDrive}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.gdriveEnabled ? 'bg-[#008751]' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.gdriveEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSetupGDrive}
                disabled={settingUp}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#008751] hover:bg-[#007242] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {settingUp ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                )}
                {settingUp ? 'Setting up...' : 'Sign in to Google Drive'}
              </button>

              <button
                onClick={handleBackup}
                disabled={backingUp || !settings.gdriveEnabled}
                className="flex items-center gap-2 px-4 py-2.5 border border-emerald-300 text-[#008751] hover:bg-emerald-50 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
              >
                {backingUp ? (
                  <div className="w-4 h-4 border-2 border-[#008751] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
                {backingUp ? 'Backing up...' : 'Backup Now'}
              </button>

              <button
                onClick={fetchSettings}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Status
              </button>
            </div>

            {/* Last backup log */}
            {status.lastBackupLog && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">Last Backup Log</p>
                <pre className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-x-auto whitespace-pre-wrap max-h-40">
                  {status.lastBackupLog}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* App Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-3 pb-2 border-b border-slate-100">About</h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-slate-500">Application</span>
            <span className="text-slate-800 font-medium">FMYD ICT File Registry</span>
            <span className="text-slate-500">Version</span>
            <span className="text-slate-800 font-medium">2.0.0</span>
            <span className="text-slate-500">Database</span>
            <span className="text-slate-800 font-medium">SQLite (Embedded)</span>
            <span className="text-slate-500">Department</span>
            <span className="text-slate-800 font-medium">ICT, Federal Ministry of Youth Development</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
