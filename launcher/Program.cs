using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace FMYD.ICT.Registry
{
    static class Program
    {
        private static Process serverProcess = null;
        private static NotifyIcon trayIcon = null;
        private static string appUrl = "http://localhost:5000";
        private static string rootDir = "";
        private static Mutex singleInstanceMutex = null;

        [STAThread]
        static void Main()
        {
            // Single instance check
            bool createdNew;
            singleInstanceMutex = new Mutex(true, "FMYD_ICT_REGISTRY_SINGLETON_MUTEX", out createdNew);
            if (!createdNew)
            {
                OpenAppWindow();
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            rootDir = AppDomain.CurrentDomain.BaseDirectory;

            EnsurePostgresRunning();
            EnsureServerRunning();
            SetupTrayIcon();
            OpenAppWindow();

            Application.Run();
        }

        private static void EnsurePostgresRunning()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "net.exe";
                psi.Arguments = "start postgresql-x64-18";
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                Process p = Process.Start(psi);
                p.WaitForExit(4000);
            }
            catch { }

            string pgCtl = @"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe";
            string pgData = @"C:\Program Files\PostgreSQL\18\data";
            if (File.Exists(pgCtl) && Directory.Exists(pgData))
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = pgCtl;
                    psi.Arguments = string.Format("start -D \"{0}\"", pgData);
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    Process p = Process.Start(psi);
                    p.WaitForExit(3000);
                }
                catch { }
            }
        }

        private static bool IsServerHealthy()
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(appUrl + "/api/health");
                req.Timeout = 1500;
                req.Method = "GET";
                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    return resp.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void EnsureServerRunning()
        {
            if (IsServerHealthy()) return;

            string serverDir = Path.Combine(rootDir, "server");
            string serverEntry = Path.Combine(serverDir, "src", "index.js");

            if (File.Exists(serverEntry))
            {
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = "node.exe";
                    psi.Arguments = string.Format("\"{0}\"", serverEntry);
                    psi.WorkingDirectory = serverDir;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    serverProcess = Process.Start(psi);
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Failed to start backend server: " + ex.Message,
                        "FMYD ICT Registry", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }

            for (int i = 0; i < 24; i++)
            {
                if (IsServerHealthy()) break;
                Thread.Sleep(500);
            }
        }

        private static string FindBrowserExecutable()
        {
            string[] paths = new string[]
            {
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
            };
            foreach (string p in paths)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }

        private static void OpenAppWindow()
        {
            try
            {
                string browser = FindBrowserExecutable();
                string userProfileDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "FMYD-Registry-Desktop"
                );

                if (!string.IsNullOrEmpty(browser))
                {
                    string args = string.Format(
                        "--app=\"{0}\" --window-size=1366,860 --user-data-dir=\"{1}\" --app-id=\"FMYD.ICT.Registry\"",
                        appUrl, userProfileDir
                    );
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = browser;
                    psi.Arguments = args;
                    psi.UseShellExecute = false;
                    Process.Start(psi);
                }
                else
                {
                    Process.Start(appUrl);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error opening application window: " + ex.Message,
                    "FMYD ICT Registry", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        // ─── Google Drive Backup Helpers ─────────────────────────

        private static bool IsRcloneInstalled()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "rclone";
                psi.Arguments = "version";
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                Process p = Process.Start(psi);
                p.WaitForExit(3000);
                return p.ExitCode == 0;
            }
            catch { return false; }
        }

        private static bool IsGDriveConfigured()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "rclone";
                psi.Arguments = "listremotes";
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                Process p = Process.Start(psi);
                string output = p.StandardOutput.ReadToEnd();
                p.WaitForExit(3000);
                return output.Contains("gdrive:");
            }
            catch { return false; }
        }

        private static void RunBackupNow()
        {
            string backupScript = Path.Combine(rootDir, "backup", "backup.ps1");
            if (!File.Exists(backupScript))
            {
                MessageBox.Show("Backup script not found at:\n" + backupScript,
                    "FMYD ICT Registry", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            if (!IsRcloneInstalled())
            {
                DialogResult result = MessageBox.Show(
                    "Google Drive backup is not set up yet.\n\n" +
                    "Would you like to run the setup now?\n" +
                    "(This will install rclone and connect your Google Drive)",
                    "FMYD ICT Registry — Backup Setup Required",
                    MessageBoxButtons.YesNo, MessageBoxIcon.Question);

                if (result == DialogResult.Yes)
                {
                    RunBackupSetup();
                }
                return;
            }

            if (!IsGDriveConfigured())
            {
                DialogResult result = MessageBox.Show(
                    "Google Drive is not connected yet.\n\n" +
                    "Would you like to run the setup to connect your Google account?",
                    "FMYD ICT Registry — Google Drive Not Connected",
                    MessageBoxButtons.YesNo, MessageBoxIcon.Question);

                if (result == DialogResult.Yes)
                {
                    RunBackupSetup();
                }
                return;
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "powershell.exe";
                psi.Arguments = string.Format(
                    "-ExecutionPolicy Bypass -File \"{0}\"", backupScript);
                psi.WorkingDirectory = Path.Combine(rootDir, "backup");
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                Process.Start(psi);

                trayIcon.ShowBalloonTip(3000, "FMYD Backup",
                    "Backup to Google Drive started...\nDatabase + uploads syncing.",
                    ToolTipIcon.Info);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to run backup: " + ex.Message,
                    "FMYD ICT Registry", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static void RunBackupSetup()
        {
            string setupBat = Path.Combine(rootDir, "backup", "setup-backup.bat");
            if (!File.Exists(setupBat))
            {
                MessageBox.Show("Backup setup script not found.",
                    "FMYD ICT Registry", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = string.Format("/k \"\"{0}\"\"", setupBat);
                psi.WorkingDirectory = Path.Combine(rootDir, "backup");
                psi.Verb = "runas";
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch { }
        }

        private static void ViewBackupLog()
        {
            string logFile = Path.Combine(rootDir, "backup", "backup.log");
            if (File.Exists(logFile))
            {
                Process.Start("notepad.exe", logFile);
            }
            else
            {
                MessageBox.Show("No backup log found yet.\nRun a backup first.",
                    "FMYD ICT Registry", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private static string GetBackupStatusText()
        {
            if (!IsRcloneInstalled())
                return "Google Drive backup: NOT SET UP\n\nUse 'Setup Google Drive Backup' from the tray menu.";

            if (!IsGDriveConfigured())
                return "rclone is installed but Google Drive is not connected.\n\nUse 'Setup Google Drive Backup' from the tray menu.";

            string logFile = Path.Combine(rootDir, "backup", "backup.log");
            if (!File.Exists(logFile))
                return "Google Drive: CONNECTED\nNo backups have run yet.\n\nClick 'Backup to Google Drive Now' to run one.";

            try
            {
                string[] lines = File.ReadAllLines(logFile);
                int start = Math.Max(0, lines.Length - 8);
                string last = "";
                for (int i = start; i < lines.Length; i++)
                    last += lines[i] + "\n";
                return "Google Drive: CONNECTED\n\nLast backup log:\n" + last;
            }
            catch
            {
                return "Google Drive: CONNECTED\nCould not read backup log.";
            }
        }

        // ─── System Tray ────────────────────────────────────────

        private static void SetupTrayIcon()
        {
            trayIcon = new NotifyIcon();
            trayIcon.Text = "FMYD ICT File Registry";

            string iconPath = Path.Combine(rootDir, "fmyd-logo.ico");
            if (File.Exists(iconPath))
            {
                try { trayIcon.Icon = new Icon(iconPath); }
                catch { trayIcon.Icon = SystemIcons.Application; }
            }
            else
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            ContextMenu contextMenu = new ContextMenu();

            // ── App section
            MenuItem openItem = new MenuItem("Open FMYD Registry", delegate { OpenAppWindow(); });
            openItem.DefaultItem = true;
            contextMenu.MenuItems.Add(openItem);

            contextMenu.MenuItems.Add("Open in Browser (LAN Sharing)", delegate {
                try { Process.Start(appUrl); } catch { }
            });

            contextMenu.MenuItems.Add("-");

            // ── Google Drive Backup section
            contextMenu.MenuItems.Add("Backup to Google Drive Now", delegate { RunBackupNow(); });

            contextMenu.MenuItems.Add("Setup Google Drive Backup", delegate { RunBackupSetup(); });

            contextMenu.MenuItems.Add("View Backup Log", delegate { ViewBackupLog(); });

            contextMenu.MenuItems.Add("-");

            // ── Status section
            contextMenu.MenuItems.Add("Server & Backup Status", delegate {
                bool serverOk = IsServerHealthy();
                string backupStatus = GetBackupStatusText();
                string msg = (serverOk
                    ? "Server: ONLINE\nURL: http://localhost:5000"
                    : "Server: OFFLINE or starting...")
                    + "\n\n" + backupStatus;

                MessageBox.Show(msg, "FMYD ICT Registry — Status",
                    MessageBoxButtons.OK,
                    serverOk ? MessageBoxIcon.Information : MessageBoxIcon.Warning);
            });

            contextMenu.MenuItems.Add("-");
            contextMenu.MenuItems.Add("Exit Application", delegate { ExitApp(); });

            trayIcon.ContextMenu = contextMenu;
            trayIcon.DoubleClick += delegate { OpenAppWindow(); };
            trayIcon.Visible = true;
        }

        private static void ExitApp()
        {
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }

            if (serverProcess != null && !serverProcess.HasExited)
            {
                try { serverProcess.Kill(); } catch { }
            }

            if (singleInstanceMutex != null)
            {
                try { singleInstanceMutex.ReleaseMutex(); } catch { }
            }

            Application.Exit();
            Environment.Exit(0);
        }
    }
}
