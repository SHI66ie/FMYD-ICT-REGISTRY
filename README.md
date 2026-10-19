# FMYD ICT File Registry

A multi-user LAN web application for the Federal Ministry of Youth Development ICT Department to track and manage incoming and outgoing files, with file cover scan uploads.

## Features

- 📁 Register incoming and outgoing files
- 📷 Upload scanned file covers (JPG, PNG, PDF)
- 🔍 Search and filter by type, status, date, officer
- 📊 Dashboard with live statistics
- 👥 Multi-user with Admin and Staff roles
- 🖨️ Print file records
- 📤 Export to CSV
- 🌐 LAN-accessible — works across your department network

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Auth**: JWT

## Prerequisites

Before setting up, make sure you have installed:
- [Node.js](https://nodejs.org) v18 or higher
- [PostgreSQL](https://www.postgresql.org/download/) v14 or higher
- npm (comes with Node.js)

---

## Setup Instructions

### Step 1: Set up PostgreSQL Database

1. Open **pgAdmin** or **psql** and run:

```sql
CREATE DATABASE fmyd_registry;
```

2. Connect to the database and run the schema:

```bash
psql -U postgres -d fmyd_registry -f database/schema.sql
```

Or paste the contents of `database/schema.sql` into pgAdmin's Query Tool.

---

### Step 2: Configure the Backend

```bash
cd server
copy .env.example .env
```

Edit `.env` and fill in your PostgreSQL credentials:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fmyd_registry
DB_USER=postgres
DB_PASSWORD=your_actual_password
JWT_SECRET=choose_a_long_random_secret_string
```

Install dependencies and start:

```bash
npm install
npm run dev
```

The API will be running at `http://localhost:5000`

---

### Step 3: Configure the Frontend

Open a **new terminal**:

```bash
cd client
npm install
npm run dev
```

The app will be accessible at `http://localhost:5173`

---

### Step 4: LAN Access (Other Computers on the Network)

Once running, other computers on the same network can access the app at:

```
http://<your-computer-ip>:5173
```

Find your IP address:
```bash
ipconfig
```
Look for **IPv4 Address** under your active network adapter (e.g., `192.168.1.100`).

> **Tip**: Set a static IP on the registry server PC for consistent access across the department.

---

## Default Login

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |

> **⚠️ Change the admin password immediately after first login!**

---

## File Entry Fields

| Field | Description |
|-------|-------------|
| File Number | Unique identifier for the physical file |
| Title | Subject/description of the file |
| Date Logged | Date the file was received/sent |
| Reference Number | Official reference number |
| Type | Incoming or Outgoing |
| Origin | Where the file came from |
| Destination | Where the file is going |
| Action Officer | Officer responsible for the file |
| Status | Pending / In Progress / Completed / Returned |
| Remarks | Additional notes |
| Scan | Uploaded image/PDF of the file cover |

---

## Project Structure

```
FMYD-ICT-REGISTRY/
├── server/           # Node.js Express backend
│   ├── src/
│   │   ├── index.js       # Entry point
│   │   ├── db.js          # PostgreSQL connection
│   │   ├── upload.js      # Multer config
│   │   ├── middleware/
│   │   │   └── auth.js    # JWT middleware
│   │   └── routes/
│   │       ├── auth.js    # Authentication routes
│   │       ├── files.js   # File registry routes
│   │       ├── users.js   # User management routes
│   │       └── stats.js   # Dashboard stats routes
│   ├── uploads/      # Uploaded scan images
│   └── .env          # Environment config
├── client/           # React Vite frontend
│   └── src/
│       ├── pages/    # Page components
│       ├── components/ # Shared components
│       ├── api/      # API call functions
│       └── context/  # Auth context
├── database/
│   └── schema.sql    # Database schema
└── README.md
```

---

## Support

For issues or assistance, contact the ICT Department.
