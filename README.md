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
├── package.json            # Project metadata, dependencies, and start/dev scripts
├── data/
│   └── students.json       # Persistent JSON file database (auto-created if missing)
├── public/
│   ├── index.html          # College management dashboard UI
│   ├── style.css           # Navy blue, white & light grey responsive stylesheet
│   └── script.js           # Frontend logic & REST API integration
└── README.md               # Documentation & Render deployment guide
```

---

## Local Setup & Running

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

## Deploying to Render

1. Push this project repository to GitHub/GitLab.
2. In Render, create a new **Web Service** connected to your repository.
3. Configure the service settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Render automatically provides `process.env.PORT`. `server.js` listens on `process.env.PORT || 3000` on host `0.0.0.0`.
5. *(Optional for long-term persistence on Render free/paid tiers)*: Attach a **Render Persistent Disk** mounted at `/opt/render/project/src/data` (or the app's `data/` path) so `data/students.json` survives service restarts and redeployments.

---

## Viva / Practical Examination Notes

- **Why JSON file storage?** Demonstrates OS file system concepts: directory creation (`fs.mkdir`), file existence checks (`fs.existsSync`), reading (`fs.readFile`), atomic writing (`fs.writeFile` + `fs.rename`), and serialized write queuing to avoid race conditions.
- **How are records persisted across pages?** All views communicate with the Express backend REST API, which reads from and writes to `data/students.json` on disk.
