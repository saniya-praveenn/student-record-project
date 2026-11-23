import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Confine all data file operations strictly inside the /data directory
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'students.json');
const PUBLIC_DIR = path.resolve(__dirname, 'public');

if (!DATA_FILE.startsWith(DATA_DIR + path.sep)) {
  throw new Error('Invalid data file path configuration.');
}

// Middleware to parse JSON request bodies and serve static frontend files
app.use(express.json({ limit: '100kb' }));
app.use(express.static(PUBLIC_DIR));

// Handle malformed JSON payloads gracefully
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON request payload.',
    });
  }
  return next(err);
});

// Serialize file write operations to prevent race conditions and file corruption
let writeQueue = Promise.resolve();

/**
 * Automatically creates the data/ directory and data/students.json file if missing.
 */
async function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    await fsp.mkdir(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    await fsp.writeFile(DATA_FILE, '[]\n', 'utf8');
  }
}

/**
 * Reads all student records from data/students.json using Node.js file system APIs.
 */
async function readStudents() {
  await ensureDataFile();
  const raw = await fsp.readFile(DATA_FILE, 'utf8');
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  const parsed = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) {
    throw new Error('Corrupted data file: expected a JSON array.');
  }
  return parsed;
}

/**
 * Atomically writes the student records array back to data/students.json.
 */
function writeStudents(students) {
  const task = writeQueue.then(async () => {
    await ensureDataFile();
    const tempFile = path.resolve(DATA_DIR, `students.json.tmp.${process.pid}.${Date.now()}`);
    if (!tempFile.startsWith(DATA_DIR + path.sep)) {
      throw new Error('Invalid temporary file path.');
    }
    const payload = JSON.stringify(students, null, 2) + '\n';
    await fsp.writeFile(tempFile, payload, 'utf8');
    await fsp.rename(tempFile, DATA_FILE);
  });

  // Keep queue alive even if a write fails
  writeQueue = task.catch(() => {});
  return task;
}

/**
 * Validates and normalizes student fields on the server.
 */
function validateStudentPayload(body, { requireRollNumber = true } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, message: 'Request body must be a JSON object.' };
  }

  const errors = {};
  let rollNumber = '';

  if (requireRollNumber) {
    if (typeof body.rollNumber !== 'string' || !body.rollNumber.trim()) {
      errors.rollNumber = 'Roll number is required.';
    } else {
      rollNumber = body.rollNumber.trim();
      if (rollNumber.length > 32) {
        errors.rollNumber = 'Roll number must not exceed 32 characters.';
      } else if (!/^[A-Za-z0-9/_-]+$/.test(rollNumber)) {
        errors.rollNumber = 'Roll number may only contain letters, numbers, -, _, and /.';
      }
    }
  }

  let name = '';
  if (typeof body.name !== 'string' || !body.name.trim()) {
    errors.name = 'Student name is required.';
  } else {
    name = body.name.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 80) {
      errors.name = 'Student name must be between 2 and 80 characters.';
    } else if (/[<>]/.test(name)) {
      errors.name = 'Student name contains invalid characters.';
    }
  }

  let department = '';
  if (typeof body.department !== 'string' || !body.department.trim()) {
    errors.department = 'Department is required.';
  } else {
    department = body.department.trim().replace(/\s+/g, ' ');
    if (department.length < 2 || department.length > 60) {
      errors.department = 'Department must be between 2 and 60 characters.';
    } else if (/[<>]/.test(department)) {
      errors.department = 'Department contains invalid characters.';
    }
  }

  let marks = NaN;
  if (body.marks === undefined || body.marks === null || body.marks === '') {
    errors.marks = 'Marks are required.';
  } else {
    const parsedMarks = Number(body.marks);
    if (!Number.isFinite(parsedMarks)) {
      errors.marks = 'Marks must be a valid number.';
    } else if (parsedMarks < 0 || parsedMarks > 100) {
      errors.marks = 'Marks must be between 0 and 100.';
    } else {
      marks = Math.round(parsedMarks * 100) / 100;
    }
  }

  if (Object.keys(errors).length > 0) {
    const firstMessage = Object.values(errors)[0];
    return { valid: false, message: firstMessage, errors };
  }

  return {
    valid: true,
    data: {
      ...(requireRollNumber ? { rollNumber } : {}),
      name,
      department,
      marks,
    },
  };
}

/**
 * Computes summary statistics from the current list of students.
 */
function computeStats(students) {
  const total = students.length;
  if (total === 0) {
    return {
      total: 0,
      averageMarks: 0,
      highestMarks: 0,
      departments: 0,
    };
  }

  let sum = 0;
  let highest = students[0].marks;
  const deptSet = new Set();

  for (const student of students) {
    const m = Number(student.marks) || 0;
    sum += m;
    if (m > highest) highest = m;
    if (student.department) {
      deptSet.add(student.department.toLowerCase());
    }
  }

  return {
    total,
    averageMarks: Math.round((sum / total) * 100) / 100,
    highestMarks: highest,
    departments: deptSet.size,
  };
}

// -------------------- REST API ROUTES --------------------

// 1. Display All Students (with optional search/department query)
app.get('/api/students', async (req, res) => {
  try {
    const allStudents = await readStudents();
    const stats = computeStats(allStudents);

    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const dept = typeof req.query.department === 'string' ? req.query.department.trim().toLowerCase() : '';

    let filtered = allStudents;
    if (q) {
      filtered = filtered.filter(
        (s) =>
          s.rollNumber.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q)
      );
    }
    if (dept && dept !== 'all') {
      filtered = filtered.filter((s) => s.department.toLowerCase() === dept);
    }

    return res.json({
      success: true,
      count: filtered.length,
      totalCount: allStudents.length,
      stats,
      students: filtered,
    });
  } catch (error) {
    console.error('Error reading students:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to read student records from file storage.',
    });
  }
});

// 2. Search Student by Roll Number
app.get('/api/students/:rollNumber', async (req, res) => {
  try {
    const targetRoll = decodeURIComponent(req.params.rollNumber || '').trim();
    if (!targetRoll) {
      return res.status(400).json({
        success: false,
        message: 'Roll number parameter is required.',
      });
    }

    const students = await readStudents();
    const student = students.find(
      (s) => s.rollNumber.toLowerCase() === targetRoll.toLowerCase()
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `No student found with roll number "${targetRoll}".`,
      });
    }

    return res.json({
      success: true,
      student,
    });
  } catch (error) {
    console.error('Error searching student:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search student record.',
    });
  }
});

// 3. Add Student
app.post('/api/students', async (req, res) => {
  try {
    const validation = validateStudentPayload(req.body, { requireRollNumber: true });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        errors: validation.errors,
      });
    }

    const { rollNumber, name, department, marks } = validation.data;
    const students = await readStudents();

    const duplicate = students.find(
      (s) => s.rollNumber.toLowerCase() === rollNumber.toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `Roll number "${rollNumber}" already exists. Roll numbers must be unique.`,
        errors: { rollNumber: 'This roll number is already registered.' },
      });
    }

    const now = new Date().toISOString();
    const newStudent = {
      rollNumber,
      name,
      department,
      marks,
      createdAt: now,
      updatedAt: now,
    };

    students.push(newStudent);
    await writeStudents(students);

    return res.status(201).json({
      success: true,
      message: `Student "${name}" (Roll No: ${rollNumber}) added successfully.`,
      student: newStudent,
    });
  } catch (error) {
    console.error('Error adding student:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save student record to file storage.',
    });
  }
});

// 4. Modify Student by Roll Number
app.put('/api/students/:rollNumber', async (req, res) => {
  try {
    const targetRoll = decodeURIComponent(req.params.rollNumber || '').trim();
    if (!targetRoll) {
      return res.status(400).json({
        success: false,
        message: 'Roll number parameter is required.',
      });
    }

    const validation = validateStudentPayload(req.body, { requireRollNumber: false });
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        errors: validation.errors,
      });
    }

    const students = await readStudents();
    const index = students.findIndex(
      (s) => s.rollNumber.toLowerCase() === targetRoll.toLowerCase()
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: `No student found with roll number "${targetRoll}".`,
      });
    }

    const existing = students[index];
    const updatedStudent = {
      ...existing,
      name: validation.data.name,
      department: validation.data.department,
      marks: validation.data.marks,
      updatedAt: new Date().toISOString(),
    };

    students[index] = updatedStudent;
    await writeStudents(students);

    return res.json({
      success: true,
      message: `Student "${updatedStudent.name}" (Roll No: ${updatedStudent.rollNumber}) updated successfully.`,
      student: updatedStudent,
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update student record.',
    });
  }
});

// 5. Delete Student by Roll Number
app.delete('/api/students/:rollNumber', async (req, res) => {
  try {
    const targetRoll = decodeURIComponent(req.params.rollNumber || '').trim();
    if (!targetRoll) {
      return res.status(400).json({
        success: false,
        message: 'Roll number parameter is required.',
      });
    }

    const students = await readStudents();
    const index = students.findIndex(
      (s) => s.rollNumber.toLowerCase() === targetRoll.toLowerCase()
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: `No student found with roll number "${targetRoll}".`,
      });
    }

    const [removed] = students.splice(index, 1);
    await writeStudents(students);

    return res.json({
      success: true,
      message: `Student "${removed.name}" (Roll No: ${removed.rollNumber}) deleted successfully.`,
      student: removed,
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete student record.',
    });
  }
});

// Unknown API routes return 404 JSON
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.',
  });
});

// Serve the frontend dashboard for all other GET requests
app.get('*', (req, res) => {
  res.sendFile(path.resolve(PUBLIC_DIR, 'index.html'));
});

// Initialize storage file and start the Express server
ensureDataFile()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Student Record Management System listening on http://0.0.0.0:${PORT}`);
      console.log(`JSON file storage active at: ${DATA_FILE}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize file storage:', error);
    process.exit(1);
  });
