const express = require('express');
const { execSync, exec } = require('child_process');
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

// ─── GET /api/settings ───────────────────────────────────────────────
router.get('/', (req, res) => {
  const config = readConfig();

  // Check rclone status
  let rcloneInstalled = false;
  let gdriveConnected = false;

  try {
    execSync('rclone version', { timeout: 3000, stdio: 'pipe' });
    rcloneInstalled = true;
  } catch {}

  if (rcloneInstalled) {
    try {
      const output = execSync('rclone listremotes', { timeout: 5000, stdio: 'pipe' }).toString();
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
// Starts rclone config in the background (opens browser for OAuth)
router.post('/gdrive/setup', (req, res) => {
  try {
    // Check if rclone exists
    try {
      execSync('rclone version', { timeout: 3000, stdio: 'pipe' });
    } catch {
      return res.status(400).json({
        error: 'rclone is not installed. Please install rclone first.',
        installUrl: 'https://rclone.org/downloads/',
      });
    }

    // Run rclone config (interactive - opens browser)
    exec('rclone config', { detached: true, stdio: 'ignore' });

    return res.json({ message: 'Google Drive setup started. A browser window should open for authentication.' });
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
  let rcloneInstalled = false;
  let gdriveConnected = false;
  let lastBackupLog = null;

  try {
    execSync('rclone version', { timeout: 3000, stdio: 'pipe' });
    rcloneInstalled = true;
  } catch {}

  if (rcloneInstalled) {
    try {
      const output = execSync('rclone listremotes', { timeout: 5000, stdio: 'pipe' }).toString();
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
