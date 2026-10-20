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
                // App already running - open or bring up the window
                OpenAppWindow();
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            rootDir = AppDomain.CurrentDomain.BaseDirectory;

            // Ensure PostgreSQL is running
            EnsurePostgresRunning();

            // Ensure Backend server is running
            EnsureServerRunning();

            // Setup system tray
            SetupTrayIcon();

            // Open the native app window
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
            if (IsServerHealthy())
            {
                return;
            }

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
                    MessageBox.Show("Failed to start backend server: " + ex.Message, "FMYD ICT Registry", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }

            // Wait up to 12 seconds for server to respond
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
                        appUrl,
                        userProfileDir
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
                MessageBox.Show("Error opening application window: " + ex.Message, "FMYD ICT Registry", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private static void SetupTrayIcon()
        {
            trayIcon = new NotifyIcon();
            trayIcon.Text = "FMYD ICT File Registry";

            string iconPath = Path.Combine(rootDir, "fmyd-logo.ico");
            if (File.Exists(iconPath))
            {
                try
                {
                    trayIcon.Icon = new Icon(iconPath);
                }
                catch
                {
                    trayIcon.Icon = SystemIcons.Application;
                }
            }
            else
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            ContextMenu contextMenu = new ContextMenu();

            MenuItem openItem = new MenuItem("Open FMYD Registry Window", delegate { OpenAppWindow(); });
            openItem.DefaultItem = true;
            contextMenu.MenuItems.Add(openItem);

            contextMenu.MenuItems.Add("Open in Web Browser (LAN / Sharing)", delegate {
                try { Process.Start(appUrl); } catch { }
            });

            contextMenu.MenuItems.Add("-");

            contextMenu.MenuItems.Add("Server Status", delegate {
                bool ok = IsServerHealthy();
                MessageBox.Show(
                    ok ? "FMYD ICT Registry is online and healthy.\nAccess URL: http://localhost:5000\nLAN Access: http://<Your-IP>:5000"
                       : "Backend server is currently offline or starting.",
                    "FMYD ICT Registry Status",
                    MessageBoxButtons.OK,
                    ok ? MessageBoxIcon.Information : MessageBoxIcon.Warning
                );
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
                try
                {
                    serverProcess.Kill();
                }
                catch { }
            }

            if (singleInstanceMutex != null)
            {
                try
                {
                    singleInstanceMutex.ReleaseMutex();
                }
                catch { }
            }

            Application.Exit();
            Environment.Exit(0);
        }
    }
}
