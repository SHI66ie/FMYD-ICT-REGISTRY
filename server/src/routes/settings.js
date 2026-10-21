const express = require('express');
const { execSync, exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const CONFIG_PATH = path.join(__dirname, '..', '..', 'data', 'config.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {}
  return { gdriveEnabled: false };
}

function writeConfig(config) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Find rclone executable (checks bundled paths, PATH, and winget packages)
function getRcloneExe() {
  const possiblePaths = [
    'rclone',
    path.resolve(__dirname, '..', '..', '..', 'rclone.exe'),
    path.resolve(__dirname, '..', '..', 'rclone.exe'),
    path.resolve(__dirname, '..', 'rclone.exe'),
    path.resolve(process.env.LOCALAPPDATA || '', 'Microsoft/WinGet/Packages/Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe/rclone-v1.75.1-windows-amd64/rclone.exe'),
  ];

  for (const p of possiblePaths) {
    if (p === 'rclone') {
      try {
        execSync('rclone version', { timeout: 2000, stdio: 'pipe' });
        return 'rclone';
      } catch {}
    } else if (fs.existsSync(p)) {
      try {
        execSync(`"${p}" version`, { timeout: 2000, stdio: 'pipe' });
        return p;
      } catch {}
    }
  }
  return null;
}

// ─── GET /api/settings ───────────────────────────────────────────────
router.get('/', (req, res) => {
  const config = readConfig();
  const rcloneExe = getRcloneExe();
  const rcloneInstalled = !!rcloneExe;
  let gdriveConnected = false;

  if (rcloneInstalled) {
    try {
      const output = execSync(`"${rcloneExe}" listremotes`, { timeout: 5000, stdio: 'pipe' }).toString();
      gdriveConnected = output.includes('gdrive:');
    } catch {}
  }

  return res.json({
    gdriveEnabled: config.gdriveEnabled || false,
    rcloneInstalled,
    gdriveConnected,
  });
});

// ─── PUT /api/settings ───────────────────────────────────────────────
router.put('/', (req, res) => {
  const config = readConfig();
  if (req.body.gdriveEnabled !== undefined) {
    config.gdriveEnabled = !!req.body.gdriveEnabled;
  }
  writeConfig(config);
  return res.json({ message: 'Settings saved', ...config });
});

// ─── POST /api/settings/gdrive/setup ─────────────────────────────────
// Opens rclone config in a terminal or launches setup-backup.bat
router.post('/gdrive/setup', (req, res) => {
  try {
    const rootDir = path.resolve(__dirname, '..', '..', '..');
    const setupBat = path.join(rootDir, 'backup', 'setup-backup.bat');

    if (fs.existsSync(setupBat)) {
      spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', setupBat], {
        cwd: path.join(rootDir, 'backup'),
        detached: true,
        stdio: 'ignore'
      });
      return res.json({ message: 'Google Drive setup window opened. Complete the authorization steps on screen.' });
    }

    const rcloneExe = getRcloneExe() || 'rclone';
    spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', `"${rcloneExe}" config`], {
      detached: true,
      stdio: 'ignore'
    });

    return res.json({ message: 'Google Drive setup started. Follow instructions in the opened window.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to start Google Drive setup: ' + err.message });
  }
});

// ─── POST /api/settings/gdrive/backup ────────────────────────────────
router.post('/gdrive/backup', (req, res) => {
  const rootDir = path.resolve(__dirname, '..', '..', '..');
  const backupScript = path.join(rootDir, 'backup', 'backup.ps1');

  if (!fs.existsSync(backupScript)) {
    return res.status(404).json({ error: 'Backup script not found' });
  }

  try {
    exec(
      `powershell -ExecutionPolicy Bypass -File "${backupScript}"`,
      { cwd: path.join(rootDir, 'backup'), detached: true }
    );
    return res.json({ message: 'Backup started. Check the backup log for progress.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to start backup: ' + err.message });
  }
});

// ─── GET /api/settings/gdrive/status ─────────────────────────────────
router.get('/gdrive/status', (req, res) => {
  const rcloneExe = getRcloneExe();
  const rcloneInstalled = !!rcloneExe;
  let gdriveConnected = false;
  let lastBackupLog = null;

  if (rcloneInstalled) {
    try {
      const output = execSync(`"${rcloneExe}" listremotes`, { timeout: 5000, stdio: 'pipe' }).toString();
      gdriveConnected = output.includes('gdrive:');
    } catch {}
  }

  const rootDir = path.resolve(__dirname, '..', '..', '..');
  const logFile = path.join(rootDir, 'backup', 'backup.log');
  if (fs.existsSync(logFile)) {
    try {
      const lines = fs.readFileSync(logFile, 'utf-8').split('\n');
      lastBackupLog = lines.slice(-10).join('\n').trim();
    } catch {}
  }

  return res.json({ rcloneInstalled, gdriveConnected, lastBackupLog });
});

module.exports = router;
