# Student Record Management System

**Operating System Mini Project** — A full-stack, file-based Student Record Management System built with **Node.js**, **Express.js**, **HTML/CSS/JavaScript**, and persistent **JSON file storage**.

---

## Problem Statement

> *"A college maintains student details, including roll number, name, department, and marks. Manual record management makes searching and updating information difficult. Develop a shell-based system to add, search, display, modify, and delete student records using files for data storage."*

---

## Key Features

1. **Add Student (`POST /api/students`)**
   - Captures Roll Number, Student Name, Department, and Marks (`0–100`).
   - Validates all fields on both the client and server.
   - Enforces **unique Roll Number** constraint (case-insensitive check).

2. **Search Student (`GET /api/students/:rollNumber`)**
   - Looks up a student directly by their unique Roll Number.
   - Displays full academic profile, standing, and quick Edit/Delete actions.

3. **Display All Students (`GET /api/students`)**
   - Displays all records stored in `data/students.json` in a clean, sortable table.
   - Shows live total student count, average marks, highest marks, and department count.
   - Supports instant filtering by keyword or department.

4. **Modify Student (`PUT /api/students/:rollNumber`)**
   - Search and load any existing student by Roll Number.
   - Edit Name, Department, and Marks while keeping Roll Number locked as the primary key.
   - Persists updates directly to `data/students.json`.

5. **Delete Student (`DELETE /api/students/:rollNumber`)**
   - Look up a student by Roll Number and preview details before deletion.
   - Requires explicit confirmation via an accessible dialog before removing from the file.

6. **OS File Handling (`data/students.json`)**
   - Automatically creates the `data/` folder and `data/students.json` file if missing.
   - Uses Node.js `fs` / `fs/promises` operations with serialized, atomic temp-file-and-rename writes to prevent file corruption.

---

## Project Structure

```text
.
├── server.js               # Express server + Node.js fs file storage & REST API
├── student_records.sh      # Standalone menu-driven Bash shell script (CSV storage)
├── package.json            # Project metadata, dependencies, Node engines & scripts
├── render.yaml             # Render Blueprint deployment configuration
├── .gitignore              # Git ignore rules (node_modules, .env, temp files)
├── .env.example            # Example environment variables (PORT, optional DATA_DIR)
├── data/
│   ├── students.json       # Persistent JSON file database (used by Node.js web app)
│   └── students.csv        # Persistent CSV file database (used by student_records.sh)
├── public/
│   ├── index.html          # College management dashboard UI
│   ├── style.css           # Navy blue, white & light grey responsive stylesheet
│   └── script.js           # Frontend logic & REST API integration
└── README.md               # Documentation & Render deployment guide
```

---

## Bash Shell Script & Operating System Concepts

This project includes an independent, menu-driven Bash shell script (`student_records.sh`) designed specifically for the **Operating System** practical curriculum. It runs directly in a Linux terminal without requiring Node.js or the web server.

### 1. What is Shell Scripting?
A **shell script** is an executable plain-text program containing a sequence of operating system commands interpreted by a Unix/Linux shell such as **Bash** (`Bourne Again SHell`). Shell scripting automates repetitive system tasks and builds interactive command-line utilities using core OS primitives:
- **User I/O**: `read` for keyboard input and `echo` / `printf` for formatted terminal output.
- **Control Flow**: `if-else` conditionals, `case` menu dispatchers, and `while` loops for persistent interactive menus and input validation.
- **Process & Utility Piping**: Combining standard Unix utilities (`mkdir`, `mktemp`, `mv`, `tr`, `awk`) to perform validation and file updates safely.

### 2. What is File Handling?
**File handling** is the process of creating, reading, searching, updating, and deleting persistent data stored on secondary storage (disk) instead of volatile RAM:
- **Creation & Initialization**: Checking directory/file existence (`-d`, `-f`, `-s`) and creating `data/students.csv` automatically when missing.
- **Reading & Parsing**: Reading records line by line with `IFS=',' read -r` while skipping headers and handling empty files gracefully.
- **Appending**: Writing new student records cleanly using output redirection (`>>`).
- **Safe Modification & Deletion**: Rewriting filtered or updated lines into a temporary file created via `mktemp` and replacing the original file atomically using `mv` so a partial write never corrupts existing student records.

### 3. How Does This Project Demonstrate Operating System Concepts?
- **Shell Command Interpretation**: `student_records.sh` acts as a user-space shell application running directly on top of the OS kernel's command interpreter.
- **File System Management & Persistence**: Both the Bash script (`data/students.csv`) and the Node.js server (`data/students.json`) demonstrate persistent secondary-storage management, directory resolution, file permissions (`chmod +x`), and atomic file replacement (`mktemp` + `mv` in Bash; temp-file + `fs.rename` in Node.js).
- **Concurrency & Data Integrity**: Temporary-file-and-rename updates ensure file consistency during modify and delete operations, while strict input validation prevents malformed data from corrupting structured records.
- **Process Independence**: The Bash CLI (`student_records.sh`) and the Express web interface (`server.js`) operate as independent OS processes, demonstrating how multiple interfaces can implement the same file-backed record management workflow.

### 4. How to Execute the Bash Script in a Linux Terminal

1. Open a Linux terminal (or WSL / Git Bash / macOS terminal) in the project root directory.
2. Grant execute permission to the script (one-time setup):
   ```bash
   chmod +x student_records.sh
   ```
3. Run the script directly:
   ```bash
   ./student_records.sh
   ```
   *(Alternatively, run with `bash student_records.sh`.)*
4. Use the interactive menu (`1`–`6`) to Add, Search, Display All, Modify, or Delete student records stored in `data/students.csv`.

---

## Local Setup & Running (Web Application)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   *(Or `npm run dev` during development.)*

3. **Open in browser:**
   Visit `http://localhost:3000`.

---

## Uploading to GitHub (Step-by-Step)

1. Create a new empty repository on GitHub (for example, `student-record-management-system`). Do **not** initialize it with a README if pushing an existing project.
2. Open a terminal inside the project root directory and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Student Record Management System"
   git branch -M main
   git remote add origin https://github.com/<your-username>/student-record-management-system.git
   git push -u origin main
   ```

---

## Deploying to Render

### Option A: Deploy Using Render Dashboard (Manual Web Service)
1. Log in to [Render](https://render.com) and click **New +** -> **Web Service**.
2. Connect your GitHub account and select your `student-record-management-system` repository.
3. Configure these exact settings:
   - **Name**: `student-record-management-system`
   - **Runtime / Environment**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
   - **Instance Type**: `Free` (or `Starter` if attaching a Persistent Disk)
4. Click **Create Web Service**. Render automatically injects `process.env.PORT`, which `server.js` listens on (`process.env.PORT || 3000` on `0.0.0.0`).

### Option B: Deploy Using `render.yaml` (Blueprint)
1. Click **New +** -> **Blueprint** in Render.
2. Select your GitHub repository containing `render.yaml`.
3. Review the `student-record-management-system` service and click **Apply**.

---

## Render Storage Limitation & Persistent Storage Solution

- **Understanding Render's Ephemeral Filesystem (Free Tier)**:
  On Render's **Free** web service tier, the container filesystem is **ephemeral**. Any records written to `data/students.json` during runtime will work normally while the service is awake, **but they will reset when the service sleeps due to inactivity, restarts, or redeploys**.
- **Built-In Persistent Storage Support (`DATA_DIR` + Render Disk)**:
  `server.js` supports an optional `DATA_DIR` environment variable (`process.env.DATA_DIR`), defaulting to `./data` locally so zero configuration is needed on your computer. To make records **100% persistent** across restarts and deployments on Render without changing any JSON file-based code:
  1. Upgrade the Render Web Service plan to **Starter** (or higher).
  2. In Render Dashboard -> **Disks** -> **Add Disk**:
     - **Name**: `student-records-data`
     - **Mount Path**: `/var/data`
     - **Size**: `1 GB`
  3. In Render Dashboard -> **Environment** -> **Add Environment Variable**:
     - **Key**: `DATA_DIR`
     - **Value**: `/var/data`
  4. `server.js` will automatically create `/var/data/students.json` on the mounted disk and persist all student records safely across restarts and redeployments. *(You can also uncomment the `disk` and `DATA_DIR` sections in `render.yaml`.)*

---

## Testing the Live Deployed Website

1. Open your Render URL (`https://<your-service-name>.onrender.com`).
2. Check `/api/health` (`https://<your-service-name>.onrender.com/api/health`) — it should return `{"status":"ok","service":"student-record-management-system","storageReady":true}`.
3. Click **Add Student**, create a record (e.g., Roll No `27600124005`, Name `Aditya Pratap Singh`, Department `Computer Science & Engineering`, Marks `91.5`), and verify the success toast.
4. Refresh the browser page (`F5`) and open **All Students** — verify the record remains visible and the Dashboard KPI counts update.
5. Test **Search Student**, **Modify Student**, and **Delete Student** (confirming via the modal) to verify end-to-end CRUD operations.

---

## Viva / Practical Examination Notes

- **Why file-based storage?** Demonstrates OS file system concepts: directory creation (`mkdir -p` / `fs.mkdir`), file existence checks (`-f` / `fs.existsSync`), reading (`read` / `fs.readFile`), atomic writing (`mktemp` + `mv` / `fs.writeFile` + `fs.rename`), and record-level validation.
- **How are records persisted across pages/sessions?** The Bash script saves records directly to `data/students.csv` on disk, while the web application saves records to `students.json` via the Express REST API.
