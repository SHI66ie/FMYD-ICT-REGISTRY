# FMYD ICT Registry — Officer Setup Instructions

**Federal Ministry of Youth Development | ICT Department**

---

## What's in this folder

| File/Folder | Description |
|---|---|
| `FMYD-ICT-Registry.exe` | The main application (double-click to launch) |
| `SETUP.bat` | **Run this FIRST** to install the database |
| `server/` | Backend application (do not delete) |
| `client/dist/` | Frontend web interface (do not delete) |
| `database/` | Database schema (used by SETUP) |

---

## Step 1: Install PostgreSQL (if not already installed)

1. Download PostgreSQL from: **https://www.postgresql.org/download/windows/**
2. Run the installer
3. **Write down the password you set for the `postgres` user** — you will need it in Step 2
4. Keep all defaults during installation

---

## Step 2: Run SETUP (one time only)

1. **Right-click** `SETUP.bat`
2. Click **"Run as Administrator"**
3. Enter your PostgreSQL password when asked
4. Wait for it to finish — it creates the database automatically

---

## Step 3: Open the App

- Double-click **"FMYD ICT Registry"** on your Desktop
  *(the shortcut was created by SETUP)*

Or double-click **`FMYD-ICT-Registry.exe`** directly from this folder.

---

## Default Login

| Username | Password |
|---|---|
| `admin` | `admin123` |

> **Change the password after first login!**

---

## Daily Use

Just double-click **"FMYD ICT Registry"** on the Desktop.

The app will:
- Start the database automatically
- Open in its own dedicated window (like a desktop app)
- Show a tray icon (bottom-right) while running

To close: right-click the tray icon → **Exit Application**

---

## Google Drive Backup (Recommended)

The app can automatically back up the database and uploaded scanned files to Google Drive every hour.

### First-time setup:

1. Open the app (double-click the desktop shortcut)
2. Right-click the **FMYD tray icon** (bottom-right of taskbar)
3. Click **"Setup Google Drive Backup"**
4. Follow the steps — it will:
   - Install **rclone** (a free backup tool)
   - Open a browser to sign in to your Google account
   - Create a `FMYD-Backup` folder in your Google Drive
   - Schedule automatic hourly backups

### What gets backed up:

| Item | Google Drive Location |
|---|---|
| Database (SQL dumps) | `FMYD-Backup/database/` |
| Scanned files (JPG/PNG/PDF) | `FMYD-Backup/uploads/` |

### Manual backup:

Right-click tray icon → **"Backup to Google Drive Now"**

### View backup history:

Right-click tray icon → **"View Backup Log"**

---

## Need Help?

Contact the ICT Department.
