(() => {
  'use strict';

  const VIEW_LABELS = {
    dashboard: 'Dashboard',
    add: 'Add Student',
    all: 'All Students',
    search: 'Search Student',
    modify: 'Modify Student',
    delete: 'Delete Student',
  };

  const state = {
    students: [],
    stats: {
      total: 0,
      averageMarks: 0,
      highestMarks: 0,
      departments: 0,
    },
    currentView: 'dashboard',
    loading: false,
    pendingDeleteRoll: null,
    activeModifyRoll: null,
  };

  // DOM References
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const openSidebarBtn = document.getElementById('openSidebarBtn');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const topbarBreadcrumb = document.getElementById('topbarBreadcrumb');
  const refreshDataBtn = document.getElementById('refreshDataBtn');
  const topbarAddBtn = document.getElementById('topbarAddBtn');

  const navItems = Array.from(document.querySelectorAll('.nav-item[data-view]'));
  const viewSections = Array.from(document.querySelectorAll('.view-section'));

  // Dashboard elements
  const kpiTotalStudents = document.getElementById('kpiTotalStudents');
  const kpiAverageMarks = document.getElementById('kpiAverageMarks');
  const kpiHighestMarks = document.getElementById('kpiHighestMarks');
  const kpiDepartments = document.getElementById('kpiDepartments');
  const dashboardRecentContainer = document.getElementById('dashboardRecentContainer');

  // Add Student elements
  const addStudentForm = document.getElementById('addStudentForm');
  const addRollNumber = document.getElementById('addRollNumber');
  const addName = document.getElementById('addName');
  const addDepartmentSelect = document.getElementById('addDepartmentSelect');
  const addDepartmentCustom = document.getElementById('addDepartmentCustom');
  const addMarks = document.getElementById('addMarks');
  const addSubmitBtn = document.getElementById('addSubmitBtn');
  const addResetBtn = document.getElementById('addResetBtn');
  const addRollError = document.getElementById('addRollError');
  const addNameError = document.getElementById('addNameError');
  const addDepartmentError = document.getElementById('addDepartmentError');
  const addMarksError = document.getElementById('addMarksError');

  // All Students elements
  const allTotalCount = document.getElementById('allTotalCount');
  const allFilteredCountText = document.getElementById('allFilteredCountText');
  const tableSearchInput = document.getElementById('tableSearchInput');
  const tableDeptFilter = document.getElementById('tableDeptFilter');
  const tableSortSelect = document.getElementById('tableSortSelect');
  const studentsTableWrapper = document.getElementById('studentsTableWrapper');
  const studentsTableBody = document.getElementById('studentsTableBody');
  const studentsEmptyState = document.getElementById('studentsEmptyState');
  const studentsEmptyTitle = document.getElementById('studentsEmptyTitle');
  const studentsEmptyDesc = document.getElementById('studentsEmptyDesc');
  const emptyAddBtn = document.getElementById('emptyAddBtn');

  // Search Student elements
  const searchStudentForm = document.getElementById('searchStudentForm');
  const searchRollInput = document.getElementById('searchRollInput');
  const searchSubmitBtn = document.getElementById('searchSubmitBtn');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const searchResultContainer = document.getElementById('searchResultContainer');
  const searchNotFound = document.getElementById('searchNotFound');
  const searchNotFoundText = document.getElementById('searchNotFoundText');

  // Modify Student elements
  const modifyLookupForm = document.getElementById('modifyLookupForm');
  const modifyLookupRoll = document.getElementById('modifyLookupRoll');
  const modifyLookupBtn = document.getElementById('modifyLookupBtn');
  const modifyLookupClearBtn = document.getElementById('modifyLookupClearBtn');
  const modifyNotFound = document.getElementById('modifyNotFound');
  const modifyNotFoundText = document.getElementById('modifyNotFoundText');
  const modifyStudentForm = document.getElementById('modifyStudentForm');
  const modifyRollNumber = document.getElementById('modifyRollNumber');
  const modifyName = document.getElementById('modifyName');
  const modifyDepartmentSelect = document.getElementById('modifyDepartmentSelect');
  const modifyDepartmentCustom = document.getElementById('modifyDepartmentCustom');
  const modifyMarks = document.getElementById('modifyMarks');
  const modifyNameError = document.getElementById('modifyNameError');
  const modifyDepartmentError = document.getElementById('modifyDepartmentError');
  const modifyMarksError = document.getElementById('modifyMarksError');
  const modifySubmitBtn = document.getElementById('modifySubmitBtn');
  const modifyCancelBtn = document.getElementById('modifyCancelBtn');

  // Delete Student elements
  const deleteLookupForm = document.getElementById('deleteLookupForm');
  const deleteLookupRoll = document.getElementById('deleteLookupRoll');
  const deleteLookupBtn = document.getElementById('deleteLookupBtn');
  const deleteLookupClearBtn = document.getElementById('deleteLookupClearBtn');
  const deleteNotFound = document.getElementById('deleteNotFound');
  const deleteNotFoundText = document.getElementById('deleteNotFoundText');
  const deletePreviewContainer = document.getElementById('deletePreviewContainer');

  // Confirmation Modal elements
  const confirmModal = document.getElementById('confirmModal');
  const confirmModalMessage = document.getElementById('confirmModalMessage');
  const confirmModalSummary = document.getElementById('confirmModalSummary');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  const toastContainer = document.getElementById('toastContainer');

  // -------------------- Utilities --------------------

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const text = document.createElement('span');
    text.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast-close';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    toast.appendChild(text);
    toast.appendChild(closeBtn);
    toastContainer.appendChild(toast);

    window.setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 4500);
  }

  function formatMarks(marks) {
    const num = Number(marks);
    if (!Number.isFinite(num)) return '0';
    return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, '');
  }

  function getAcademicStanding(marks) {
    const score = Number(marks);
    if (score >= 75) return { label: 'Distinction', className: 'standing-distinction' };
    if (score >= 60) return { label: 'First Class', className: 'standing-first' };
    if (score >= 40) return { label: 'Pass', className: 'standing-pass' };
    return { label: 'Needs Improvement', className: 'standing-fail' };
  }

  function formatTimestamp(isoString) {
    if (!isoString) return '—';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async function apiRequest(url, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({
      success: false,
      message: 'Unexpected server response.',
    }));

    if (!response.ok || data.success === false) {
      const err = new Error(data.message || 'Request failed.');
      err.status = response.status;
      err.errors = data.errors || {};
      throw err;
    }

    return data;
  }

  // -------------------- Navigation & Sidebar --------------------

  function openMobileSidebar() {
    sidebar.classList.add('open');
    sidebarBackdrop.hidden = false;
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('open');
    sidebarBackdrop.hidden = true;
  }

  function switchView(viewName, { updateHash = true } = {}) {
    const target = VIEW_LABELS[viewName] ? viewName : 'dashboard';
    state.currentView = target;

    navItems.forEach((btn) => {
      const isActive = btn.dataset.view === target;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    viewSections.forEach((section) => {
      section.hidden = section.id !== `view-${target}`;
    });

    topbarBreadcrumb.textContent = VIEW_LABELS[target];

    if (updateHash && window.location.hash !== `#${target}`) {
      window.history.replaceState(null, '', `#${target}`);
    }

    closeMobileSidebar();
  }

  // -------------------- Data Fetching & Rendering --------------------

  async function loadAllStudents({ silent = false } = {}) {
    state.loading = true;
    renderTableSkeleton();

    try {
      const data = await apiRequest('/api/students', { method: 'GET' });
      state.students = Array.isArray(data.students) ? data.students : [];
      state.stats = data.stats || {
        total: state.students.length,
        averageMarks: 0,
        highestMarks: 0,
        departments: 0,
      };
      renderDashboard();
      populateDepartmentFilter();
      renderStudentsTable();
    } catch (error) {
      if (!silent) {
        showToast(error.message || 'Failed to load student records.', 'error');
      }
      renderStudentsTable();
    } finally {
      state.loading = false;
    }
  }

  function renderDashboard() {
    const { total, averageMarks, highestMarks, departments } = state.stats;
    kpiTotalStudents.textContent = String(total);
    kpiAverageMarks.textContent = total > 0 ? formatMarks(averageMarks) : '—';
    kpiHighestMarks.textContent = total > 0 ? formatMarks(highestMarks) : '—';
    kpiDepartments.textContent = String(departments);

    dashboardRecentContainer.textContent = '';

    if (state.students.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'recent-empty';
      emptyMsg.textContent = 'No student records saved yet. Use Add Student to create the first entry.';
      dashboardRecentContainer.appendChild(emptyMsg);
      return;
    }

    const recent = [...state.students].slice(-5).reverse();
    recent.forEach((student) => {
      const row = document.createElement('div');
      row.className = 'recent-item';

      const main = document.createElement('div');
      main.className = 'recent-main';

      const nameEl = document.createElement('span');
      nameEl.className = 'recent-name';
      nameEl.textContent = student.name;

      const metaEl = document.createElement('span');
      metaEl.className = 'recent-meta';
      metaEl.textContent = `${student.rollNumber} · ${student.department}`;

      main.appendChild(nameEl);
      main.appendChild(metaEl);

      const marksEl = document.createElement('span');
      marksEl.className = 'recent-marks';
      marksEl.textContent = `${formatMarks(student.marks)} / 100`;

      row.appendChild(main);
      row.appendChild(marksEl);
      dashboardRecentContainer.appendChild(row);
    });
  }

  function populateDepartmentFilter() {
    const previousValue = tableDeptFilter.value;
    const deptMap = new Map();

    state.students.forEach((s) => {
      if (s.department) {
        const key = s.department.toLowerCase();
        if (!deptMap.has(key)) {
          deptMap.set(key, s.department);
        }
      }
    });

    tableDeptFilter.textContent = '';
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All Departments';
    tableDeptFilter.appendChild(allOpt);

    Array.from(deptMap.values())
      .sort((a, b) => a.localeCompare(b))
      .forEach((deptName) => {
        const opt = document.createElement('option');
        opt.value = deptName;
        opt.textContent = deptName;
        tableDeptFilter.appendChild(opt);
      });

    if (previousValue && Array.from(tableDeptFilter.options).some((o) => o.value === previousValue)) {
      tableDeptFilter.value = previousValue;
    } else {
      tableDeptFilter.value = 'all';
    }
  }

  function renderTableSkeleton() {
    if (state.students.length > 0) return;
    studentsEmptyState.hidden = true;
    studentsTableWrapper.hidden = false;
    studentsTableBody.textContent = '';

    for (let i = 0; i < 4; i += 1) {
      const tr = document.createElement('tr');
      for (let c = 0; c < 6; c += 1) {
        const td = document.createElement('td');
        const bar = document.createElement('span');
        bar.className = 'skeleton-bar';
        td.appendChild(bar);
        tr.appendChild(td);
      }
      studentsTableBody.appendChild(tr);
    }
  }

  function getFilteredAndSortedStudents() {
    const query = tableSearchInput.value.trim().toLowerCase();
    const deptFilter = tableDeptFilter.value;
    const sortBy = tableSortSelect.value;

    let list = [...state.students];

    if (query) {
      list = list.filter(
        (s) =>
          s.rollNumber.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query) ||
          s.department.toLowerCase().includes(query)
      );
    }

    if (deptFilter && deptFilter !== 'all') {
      list = list.filter((s) => s.department.toLowerCase() === deptFilter.toLowerCase());
    }

    switch (sortBy) {
      case 'roll-asc':
        list.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));
        break;
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'marks-desc':
        list.sort((a, b) => Number(b.marks) - Number(a.marks));
        break;
      case 'marks-asc':
        list.sort((a, b) => Number(a.marks) - Number(b.marks));
        break;
      case 'newest':
      default:
        list.reverse();
        break;
    }

    return list;
  }

  function renderStudentsTable() {
    const total = state.students.length;
    const filtered = getFilteredAndSortedStudents();

    allTotalCount.textContent = String(total);
    allFilteredCountText.textContent =
      filtered.length === total
        ? `Showing ${total} ${total === 1 ? 'student' : 'students'}`
        : `Showing ${filtered.length} of ${total} students`;

    studentsTableBody.textContent = '';

    if (filtered.length === 0) {
      studentsTableWrapper.hidden = true;
      studentsEmptyState.hidden = false;

      if (total === 0) {
        studentsEmptyTitle.textContent = 'No student records found';
        studentsEmptyDesc.textContent =
          'The file data/students.json currently has no records. Add your first student to begin.';
        emptyAddBtn.hidden = false;
      } else {
        studentsEmptyTitle.textContent = 'No matching records';
        studentsEmptyDesc.textContent = 'Try adjusting your search query or department filter.';
        emptyAddBtn.hidden = true;
      }
      return;
    }

    studentsTableWrapper.hidden = false;
    studentsEmptyState.hidden = true;

    filtered.forEach((student) => {
      const tr = document.createElement('tr');

      const tdRoll = document.createElement('td');
      tdRoll.className = 'mono';
      tdRoll.textContent = student.rollNumber;

      const tdName = document.createElement('td');
      tdName.textContent = student.name;

      const tdDept = document.createElement('td');
      tdDept.textContent = student.department;

      const tdMarks = document.createElement('td');
      tdMarks.className = 'num-col mono';
      tdMarks.textContent = formatMarks(student.marks);

      const standing = getAcademicStanding(student.marks);
      const tdStanding = document.createElement('td');
      const standingSpan = document.createElement('span');
      standingSpan.className = `standing-text ${standing.className}`;
      standingSpan.textContent = standing.label;
      tdStanding.appendChild(standingSpan);

      const tdActions = document.createElement('td');
      tdActions.className = 'actions-col';
      const actionGroup = document.createElement('div');
      actionGroup.className = 'table-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        openModifyWithStudent(student);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        openDeleteConfirmModal(student);
      });

      actionGroup.appendChild(editBtn);
      actionGroup.appendChild(deleteBtn);
      tdActions.appendChild(actionGroup);

      tr.appendChild(tdRoll);
      tr.appendChild(tdName);
      tr.appendChild(tdDept);
      tr.appendChild(tdMarks);
      tr.appendChild(tdStanding);
      tr.appendChild(tdActions);

      studentsTableBody.appendChild(tr);
    });
  }

  // -------------------- Record Detail Card Builder --------------------

  function buildStudentRecordSheet(student, { mode = 'search' } = {}) {
    const sheet = document.createElement('div');
    sheet.className = 'record-sheet';

    const header = document.createElement('div');
    header.className = 'record-sheet-header';

    const title = document.createElement('h3');
    title.className = 'record-sheet-title';
    title.textContent = student.name;

    const rollTag = document.createElement('span');
    rollTag.className = 'record-sheet-roll';
    rollTag.textContent = `Roll No: ${student.rollNumber}`;

    header.appendChild(title);
    header.appendChild(rollTag);

    const grid = document.createElement('div');
    grid.className = 'record-details-grid';

    const standing = getAcademicStanding(student.marks);
    const details = [
      { label: 'Roll Number', value: student.rollNumber, mono: true },
      { label: 'Student Name', value: student.name, mono: false },
      { label: 'Department', value: student.department, mono: false },
      { label: 'Marks Obtained', value: `${formatMarks(student.marks)} / 100`, mono: true },
      { label: 'Academic Standing', value: standing.label, className: standing.className },
      { label: 'Last Updated', value: formatTimestamp(student.updatedAt || student.createdAt), mono: false },
    ];

    details.forEach((item) => {
      const cell = document.createElement('div');
      cell.className = 'record-detail-cell';

      const lbl = document.createElement('span');
      lbl.className = 'record-detail-label';
      lbl.textContent = item.label;

      const val = document.createElement('span');
      val.className = 'record-detail-value';
      if (item.mono) val.classList.add('mono');
      if (item.className) val.classList.add(item.className);
      val.textContent = item.value;

      cell.appendChild(lbl);
      cell.appendChild(val);
      grid.appendChild(cell);
    });

    const actions = document.createElement('div');
    actions.className = 'record-sheet-actions';

    if (mode === 'search') {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-primary';
      editBtn.textContent = 'Modify Record';
      editBtn.addEventListener('click', () => {
        openModifyWithStudent(student);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = 'Delete Record';
      delBtn.addEventListener('click', () => {
        openDeleteConfirmModal(student);
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
    } else if (mode === 'delete') {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = 'Delete Student Record';
      delBtn.addEventListener('click', () => {
        openDeleteConfirmModal(student);
      });
      actions.appendChild(delBtn);
    }

    sheet.appendChild(header);
    sheet.appendChild(grid);
    sheet.appendChild(actions);

    return sheet;
  }

  // -------------------- Form Helpers & Validation --------------------

  function resolveDepartmentValue(selectEl, customEl) {
    if (selectEl.value === '__other__') {
      return customEl.value.trim();
    }
    return selectEl.value.trim();
  }

  function syncDepartmentSelect(selectEl, customEl, departmentValue) {
    const matchingOption = Array.from(selectEl.options).find(
      (opt) => opt.value && opt.value !== '__other__' && opt.value.toLowerCase() === departmentValue.toLowerCase()
    );
    if (matchingOption) {
      selectEl.value = matchingOption.value;
      customEl.hidden = true;
      customEl.value = '';
    } else {
      selectEl.value = '__other__';
      customEl.hidden = false;
      customEl.value = departmentValue;
    }
  }

  function clearFieldErrors(pairs) {
    pairs.forEach(([inputEl, errorEl]) => {
      if (inputEl) inputEl.classList.remove('is-invalid');
      if (errorEl) errorEl.textContent = '';
    });
  }

  function setFieldError(inputEl, errorEl, message) {
    if (inputEl) inputEl.classList.add('is-invalid');
    if (errorEl) errorEl.textContent = message;
  }

  function validateFormValues({ rollNumber, name, department, marks }, { checkRoll = true } = {}) {
    const errors = {};

    if (checkRoll) {
      if (!rollNumber) {
        errors.rollNumber = 'Roll number is required.';
      } else if (rollNumber.length > 32) {
        errors.rollNumber = 'Roll number must not exceed 32 characters.';
      } else if (!/^[A-Za-z0-9/_-]+$/.test(rollNumber)) {
        errors.rollNumber = 'Use only letters, numbers, -, _, or /.';
      }
    }

    if (!name) {
      errors.name = 'Student name is required.';
    } else if (name.length < 2 || name.length > 80) {
      errors.name = 'Name must be between 2 and 80 characters.';
    }

    if (!department) {
      errors.department = 'Department is required.';
    } else if (department.length < 2 || department.length > 60) {
      errors.department = 'Department must be between 2 and 60 characters.';
    }

    if (marks === '' || marks === null || marks === undefined) {
      errors.marks = 'Marks are required.';
    } else {
      const num = Number(marks);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        errors.marks = 'Marks must be a number between 0 and 100.';
      }
    }

    return errors;
  }

  // -------------------- Add Student Flow --------------------

  addDepartmentSelect.addEventListener('change', () => {
    const isOther = addDepartmentSelect.value === '__other__';
    addDepartmentCustom.hidden = !isOther;
    if (!isOther) addDepartmentCustom.value = '';
  });

  addResetBtn.addEventListener('click', () => {
    addStudentForm.reset();
    addDepartmentCustom.hidden = true;
    clearFieldErrors([
      [addRollNumber, addRollError],
      [addName, addNameError],
      [addDepartmentSelect, addDepartmentError],
      [addDepartmentCustom, addDepartmentError],
      [addMarks, addMarksError],
    ]);
  });

  addStudentForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    clearFieldErrors([
      [addRollNumber, addRollError],
      [addName, addNameError],
      [addDepartmentSelect, addDepartmentError],
      [addDepartmentCustom, addDepartmentError],
      [addMarks, addMarksError],
    ]);

    const payload = {
      rollNumber: addRollNumber.value.trim(),
      name: addName.value.trim(),
      department: resolveDepartmentValue(addDepartmentSelect, addDepartmentCustom),
      marks: addMarks.value.trim(),
    };

    const errors = validateFormValues(payload, { checkRoll: true });
    if (Object.keys(errors).length > 0) {
      if (errors.rollNumber) setFieldError(addRollNumber, addRollError, errors.rollNumber);
      if (errors.name) setFieldError(addName, addNameError, errors.name);
      if (errors.department) {
        const targetEl = addDepartmentSelect.value === '__other__' ? addDepartmentCustom : addDepartmentSelect;
        setFieldError(targetEl, addDepartmentError, errors.department);
      }
      if (errors.marks) setFieldError(addMarks, addMarksError, errors.marks);
      return;
    }

    addSubmitBtn.disabled = true;
    addSubmitBtn.textContent = 'Saving...';

    try {
      const result = await apiRequest('/api/students', {
        method: 'POST',
        body: JSON.stringify({
          rollNumber: payload.rollNumber,
          name: payload.name,
          department: payload.department,
          marks: Number(payload.marks),
        }),
      });

      showToast(result.message || 'Student added successfully.', 'success');
      addStudentForm.reset();
      addDepartmentCustom.hidden = true;
      await loadAllStudents({ silent: true });
    } catch (error) {
      if (error.errors && error.errors.rollNumber) {
        setFieldError(addRollNumber, addRollError, error.errors.rollNumber);
      }
      showToast(error.message || 'Could not add student.', 'error');
    } finally {
      addSubmitBtn.disabled = false;
      addSubmitBtn.textContent = 'Add Student';
    }
  });

  // -------------------- Search Student Flow --------------------

  searchClearBtn.addEventListener('click', () => {
    searchRollInput.value = '';
    searchResultContainer.hidden = true;
    searchResultContainer.textContent = '';
    searchNotFound.hidden = true;
  });

  searchStudentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const roll = searchRollInput.value.trim();

    searchResultContainer.hidden = true;
    searchResultContainer.textContent = '';
    searchNotFound.hidden = true;

    if (!roll) {
      showToast('Please enter a roll number to search.', 'error');
      searchRollInput.focus();
      return;
    }

    searchSubmitBtn.disabled = true;
    searchSubmitBtn.textContent = 'Searching...';

    try {
      const data = await apiRequest(`/api/students/${encodeURIComponent(roll)}`, {
        method: 'GET',
      });
      const sheet = buildStudentRecordSheet(data.student, { mode: 'search' });
      searchResultContainer.appendChild(sheet);
      searchResultContainer.hidden = false;
    } catch (error) {
      searchNotFoundText.textContent = error.message || `No student found with roll number "${roll}".`;
      searchNotFound.hidden = false;
    } finally {
      searchSubmitBtn.disabled = false;
      searchSubmitBtn.textContent = 'Search';
    }
  });

  // -------------------- Modify Student Flow --------------------

  modifyDepartmentSelect.addEventListener('change', () => {
    const isOther = modifyDepartmentSelect.value === '__other__';
    modifyDepartmentCustom.hidden = !isOther;
    if (!isOther) modifyDepartmentCustom.value = '';
  });

  function populateModifyForm(student) {
    state.activeModifyRoll = student.rollNumber;
    modifyLookupRoll.value = student.rollNumber;
    modifyRollNumber.value = student.rollNumber;
    modifyName.value = student.name;
    syncDepartmentSelect(modifyDepartmentSelect, modifyDepartmentCustom, student.department);
    modifyMarks.value = formatMarks(student.marks);

    clearFieldErrors([
      [modifyName, modifyNameError],
      [modifyDepartmentSelect, modifyDepartmentError],
      [modifyDepartmentCustom, modifyDepartmentError],
      [modifyMarks, modifyMarksError],
    ]);

    modifyNotFound.hidden = true;
    modifyStudentForm.hidden = false;
  }

  function resetModifyView() {
    state.activeModifyRoll = null;
    modifyLookupForm.reset();
    modifyStudentForm.reset();
    modifyStudentForm.hidden = true;
    modifyNotFound.hidden = true;
    modifyDepartmentCustom.hidden = true;
    clearFieldErrors([
      [modifyName, modifyNameError],
      [modifyDepartmentSelect, modifyDepartmentError],
      [modifyDepartmentCustom, modifyDepartmentError],
      [modifyMarks, modifyMarksError],
    ]);
  }

  function openModifyWithStudent(student) {
    switchView('modify');
    populateModifyForm(student);
    modifyName.focus();
  }

  modifyLookupClearBtn.addEventListener('click', resetModifyView);
  modifyCancelBtn.addEventListener('click', resetModifyView);

  modifyLookupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const roll = modifyLookupRoll.value.trim();

    modifyNotFound.hidden = true;
    modifyStudentForm.hidden = true;
    state.activeModifyRoll = null;

    if (!roll) {
      showToast('Please enter a roll number to load.', 'error');
      modifyLookupRoll.focus();
      return;
    }

    modifyLookupBtn.disabled = true;
    modifyLookupBtn.textContent = 'Loading...';

    try {
      const data = await apiRequest(`/api/students/${encodeURIComponent(roll)}`, {
        method: 'GET',
      });
      populateModifyForm(data.student);
    } catch (error) {
      modifyNotFoundText.textContent = error.message || `No student found with roll number "${roll}".`;
      modifyNotFound.hidden = false;
    } finally {
      modifyLookupBtn.disabled = false;
      modifyLookupBtn.textContent = 'Load Student';
    }
  });

  modifyStudentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.activeModifyRoll) return;

    clearFieldErrors([
      [modifyName, modifyNameError],
      [modifyDepartmentSelect, modifyDepartmentError],
      [modifyDepartmentCustom, modifyDepartmentError],
      [modifyMarks, modifyMarksError],
    ]);

    const payload = {
      name: modifyName.value.trim(),
      department: resolveDepartmentValue(modifyDepartmentSelect, modifyDepartmentCustom),
      marks: modifyMarks.value.trim(),
    };

    const errors = validateFormValues(payload, { checkRoll: false });
    if (Object.keys(errors).length > 0) {
      if (errors.name) setFieldError(modifyName, modifyNameError, errors.name);
      if (errors.department) {
        const targetEl = modifyDepartmentSelect.value === '__other__' ? modifyDepartmentCustom : modifyDepartmentSelect;
        setFieldError(targetEl, modifyDepartmentError, errors.department);
      }
      if (errors.marks) setFieldError(modifyMarks, modifyMarksError, errors.marks);
      return;
    }

    modifySubmitBtn.disabled = true;
    modifySubmitBtn.textContent = 'Saving...';

    try {
      const result = await apiRequest(`/api/students/${encodeURIComponent(state.activeModifyRoll)}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: payload.name,
          department: payload.department,
          marks: Number(payload.marks),
        }),
      });

      showToast(result.message || 'Student record updated.', 'success');
      populateModifyForm(result.student);
      await loadAllStudents({ silent: true });
    } catch (error) {
      showToast(error.message || 'Failed to update student record.', 'error');
    } finally {
      modifySubmitBtn.disabled = false;
      modifySubmitBtn.textContent = 'Save Changes';
    }
  });

  // -------------------- Delete Student Flow & Confirmation Modal --------------------

  deleteLookupClearBtn.addEventListener('click', () => {
    deleteLookupForm.reset();
    deletePreviewContainer.hidden = true;
    deletePreviewContainer.textContent = '';
    deleteNotFound.hidden = true;
  });

  deleteLookupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const roll = deleteLookupRoll.value.trim();

    deletePreviewContainer.hidden = true;
    deletePreviewContainer.textContent = '';
    deleteNotFound.hidden = true;

    if (!roll) {
      showToast('Please enter a roll number to find.', 'error');
      deleteLookupRoll.focus();
      return;
    }

    deleteLookupBtn.disabled = true;
    deleteLookupBtn.textContent = 'Searching...';

    try {
      const data = await apiRequest(`/api/students/${encodeURIComponent(roll)}`, {
        method: 'GET',
      });
      const sheet = buildStudentRecordSheet(data.student, { mode: 'delete' });
      deletePreviewContainer.appendChild(sheet);
      deletePreviewContainer.hidden = false;
    } catch (error) {
      deleteNotFoundText.textContent = error.message || `No student found with roll number "${roll}".`;
      deleteNotFound.hidden = false;
    } finally {
      deleteLookupBtn.disabled = false;
      deleteLookupBtn.textContent = 'Find Student';
    }
  });

  function openDeleteConfirmModal(student) {
    state.pendingDeleteRoll = student.rollNumber;
    confirmModalMessage.textContent =
      'Are you sure you want to permanently delete this student record from data/students.json? This action cannot be undone.';

    confirmModalSummary.textContent = '';
    const summaryRows = [
      ['Roll Number', student.rollNumber],
      ['Student Name', student.name],
      ['Department', student.department],
      ['Marks', `${formatMarks(student.marks)} / 100`],
    ];

    summaryRows.forEach(([label, val]) => {
      const row = document.createElement('div');
      row.className = 'modal-summary-row';

      const k = document.createElement('span');
      k.textContent = label;
      const v = document.createElement('strong');
      v.textContent = val;

      row.appendChild(k);
      row.appendChild(v);
      confirmModalSummary.appendChild(row);
    });

    confirmModal.hidden = false;
    confirmCancelBtn.focus();
  }

  function closeDeleteConfirmModal() {
    state.pendingDeleteRoll = null;
    confirmModal.hidden = true;
  }

  confirmCancelBtn.addEventListener('click', closeDeleteConfirmModal);

  confirmModal.addEventListener('click', (event) => {
    if (event.target === confirmModal) {
      closeDeleteConfirmModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !confirmModal.hidden) {
      closeDeleteConfirmModal();
    }
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    if (!state.pendingDeleteRoll) return;
    const rollToDelete = state.pendingDeleteRoll;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'Deleting...';

    try {
      const result = await apiRequest(`/api/students/${encodeURIComponent(rollToDelete)}`, {
        method: 'DELETE',
      });

      closeDeleteConfirmModal();
      showToast(result.message || 'Student deleted successfully.', 'success');

      // Clear any stale search/modify/delete previews showing the deleted student
      if (state.activeModifyRoll && state.activeModifyRoll.toLowerCase() === rollToDelete.toLowerCase()) {
        resetModifyView();
      }
      if (!deletePreviewContainer.hidden && deleteLookupRoll.value.trim().toLowerCase() === rollToDelete.toLowerCase()) {
        deletePreviewContainer.hidden = true;
        deletePreviewContainer.textContent = '';
        deleteLookupRoll.value = '';
      }
      if (!searchResultContainer.hidden && searchRollInput.value.trim().toLowerCase() === rollToDelete.toLowerCase()) {
        searchResultContainer.hidden = true;
        searchResultContainer.textContent = '';
      }

      await loadAllStudents({ silent: true });
    } catch (error) {
      showToast(error.message || 'Failed to delete student record.', 'error');
    } finally {
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = 'Confirm Delete';
    }
  });

  // -------------------- Event Bindings & Init --------------------

  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
    });
  });

  document.querySelectorAll('[data-goto]').forEach((el) => {
    el.addEventListener('click', () => {
      switchView(el.getAttribute('data-goto'));
    });
  });

  topbarAddBtn.addEventListener('click', () => switchView('add'));
  emptyAddBtn.addEventListener('click', () => switchView('add'));

  refreshDataBtn.addEventListener('click', async () => {
    await loadAllStudents();
    showToast('Records synchronized from data/students.json.', 'success');
  });

  openSidebarBtn.addEventListener('click', openMobileSidebar);
  closeSidebarBtn.addEventListener('click', closeMobileSidebar);
  sidebarBackdrop.addEventListener('click', closeMobileSidebar);

  tableSearchInput.addEventListener('input', renderStudentsTable);
  tableDeptFilter.addEventListener('change', renderStudentsTable);
  tableSortSelect.addEventListener('change', renderStudentsTable);

  window.addEventListener('hashchange', () => {
    const hashView = window.location.hash.replace('#', '');
    if (VIEW_LABELS[hashView]) {
      switchView(hashView, { updateHash: false });
    }
  });

  // Initial Boot
  const initialHash = window.location.hash.replace('#', '');
  switchView(VIEW_LABELS[initialHash] ? initialHash : 'dashboard', { updateHash: false });
  loadAllStudents({ silent: true });
})();
