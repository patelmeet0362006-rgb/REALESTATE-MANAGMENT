/* agent.js - Controller for Agent Panel workspace */

const STAFF_SESSION_KEY = 'apex_agent_session';
let activeAgent = null;

// Chart references
let statusChart = null;
let tasksChart = null;

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-theme', 'dark');
  initAgentPanel();
});

function getDb() {
  return window.supabaseClient || null;
}

function replaceFeather() {
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
}

/**
 * Guard login check
 */
async function initAgentPanel() {
  const sessionVal = localStorage.getItem(STAFF_SESSION_KEY);
  
  if (sessionVal) {
    try {
      const stored = JSON.parse(sessionVal);
      if (stored && stored.role === 'agent') {
        const client = getDb();
        if (client) {
          const { data, error } = await client
            .from('staff_users')
            .select('*')
            .eq('email', stored.email)
            .eq('role', 'agent')
            .maybeSingle();
            
          if (!error && data) {
            activeAgent = data;
            localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(data));
            showWorkspace();
            return;
          }
        }
      }
    } catch (e) {
      console.error("Invalid staff session JSON", e);
    }
  }
  
  showLoginOverlay();
}

function showLoginOverlay() {
  document.getElementById('agent-login-overlay').style.display = 'flex';
  document.getElementById('agent-workspace').style.display = 'none';
  
  const loginForm = document.getElementById('agent-login-form');
  loginForm.addEventListener('submit', handleLogin);
}

function showWorkspace() {
  document.getElementById('agent-login-overlay').style.display = 'none';
  document.getElementById('agent-workspace').style.display = 'flex';
  
  // Prefill profile values dynamically from database
  document.getElementById('sidebar-agent-name').textContent = activeAgent.name;
  document.getElementById('agent-profile-name').textContent = activeAgent.name;
  document.getElementById('agent-profile-email').textContent = activeAgent.email;
  document.getElementById('agent-profile-phone-label').textContent = activeAgent.phone || 'No phone provided';
  document.getElementById('agent-name-field').value = activeAgent.name;
  document.getElementById('agent-phone-field').value = activeAgent.phone || '';
  
  // Update initials circle
  const initials = activeAgent.name ? activeAgent.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'A';
  const initialsEl = document.getElementById('agent-profile-initials');
  if (initialsEl) initialsEl.textContent = initials;
  
  replaceFeather();
  
  // Set up events
  setupDashboardTabs();
  loadAllAgentData();
  setupConsultationActions();
  setupTaskActions();
  setupProfileActions();
}

/**
 * Agent Login submit
 */
async function handleLogin(e) {
  e.preventDefault();
  const notification = document.getElementById('login-notification');
  notification.style.display = 'none';
  
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const submitBtn = e.target.querySelector('button[type="submit"]');
  
  const client = getDb();
  if (!client) {
    notification.textContent = 'Supabase client database connection is unavailable.';
    notification.className = 'form-notification error';
    notification.style.display = 'block';
    return;
  }
  
  submitBtn.disabled = true;
  const origBtnText = submitBtn.innerHTML;
  submitBtn.innerHTML = 'Connecting...';
  
  try {
    const { data, error } = await client
      .from('staff_users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .eq('role', 'agent')
      .maybeSingle();
      
    if (error) throw error;
    
    if (!data) {
      notification.textContent = 'Invalid agent credentials or access level.';
      notification.className = 'form-notification error';
      notification.style.display = 'block';
      return;
    }
    
    localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify({
      email: data.email,
      name: data.name,
      role: data.role,
      phone: data.phone
    }));
    
    activeAgent = data;
    showWorkspace();
  } catch (err) {
    console.error("Agent login database error:", err);
    notification.textContent = `Database error: ${err.message || 'Verification failed.'}`;
    notification.className = 'form-notification error';
    notification.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = origBtnText;
    replaceFeather();
  }
}

/**
 * Switch Dashboard Tabs
 */
function setupDashboardTabs() {
  const tabs = document.querySelectorAll('.panel-nav-btn[data-target]');
  const contents = document.querySelectorAll('.panel-tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');
      
      tabs.forEach(btn => btn.classList.remove('active'));
      tab.classList.add('active');
      
      contents.forEach(content => {
        if (content.id === targetId) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
      
      if (targetId === 'tab-overview') {
        loadAllAgentData();
      }
      
      replaceFeather();
    });
  });
  
  // Logout
  const logoutBtn = document.getElementById('agent-logout-btn');
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem(STAFF_SESSION_KEY);
    window.location.reload();
  });
}

/**
 * Load Agent specific statistics, consultations, and tasks
 */
async function loadAllAgentData() {
  const client = getDb();
  if (!client || !activeAgent) return;
  
  try {
    // 1. Fetch consultations assigned to this agent
    const { data: bookings, error: bookErr } = await client
      .from('consultations')
      .select('*')
      .eq('assigned_agent_email', activeAgent.email);
    if (bookErr) throw bookErr;
    
    // 2. Fetch tasks for this agent
    const { data: tasks, error: taskErr } = await client
      .from('agent_tasks')
      .select('*')
      .eq('agent_email', activeAgent.email);
    if (taskErr) throw taskErr;
    
    // Calculate KPIs
    const totalAssigned = bookings ? bookings.length : 0;
    const pendingTours = bookings ? bookings.filter(b => b.status === 'pending' || b.status === 'scheduled').length : 0;
    const activeTasks = tasks ? tasks.filter(t => t.status === 'pending').length : 0;
    const completedTours = bookings ? bookings.filter(b => b.status === 'completed').length : 0;
    
    document.getElementById('kpi-agent-assigned').textContent = totalAssigned;
    document.getElementById('kpi-agent-pending').textContent = pendingTours;
    document.getElementById('kpi-agent-tasks').textContent = activeTasks;
    document.getElementById('kpi-agent-completed').textContent = completedTours;
    
    // Render Charts
    renderAgentCharts(bookings || [], tasks || []);
    
    // Render Consultations List
    renderAgentConsultations(bookings || []);
    
    // Render Task checklist
    renderAgentTasksList(tasks || []);
    
  } catch (e) {
    console.error("Error loading agent data:", e);
  }
}

/**
 * Render Chart.js visual charts
 */
function renderAgentCharts(bookings, tasks) {
  // 1. Consultations Status chart
  const statusCtx = document.getElementById('chart-agent-status');
  if (statusCtx) {
    if (statusChart) statusChart.destroy();
    
    const counts = { pending: 0, scheduled: 0, completed: 0, cancelled: 0 };
    bookings.forEach(b => {
      const status = String(b.status).toLowerCase();
      if (counts[status] !== undefined) counts[status]++;
    });
    
    statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Scheduled', 'Completed', 'Cancelled'],
        datasets: [{
          data: [counts.pending, counts.scheduled, counts.completed, counts.cancelled],
          backgroundColor: ['#eab308', '#3b82f6', '#10b981', '#ef4444'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  // 2. Tasks completion rate
  const tasksCtx = document.getElementById('chart-agent-tasks');
  if (tasksCtx) {
    if (tasksChart) tasksChart.destroy();
    
    const pending = tasks.filter(t => t.status === 'pending').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    
    // Def values if empty
    let dataset = [pending, completed];
    if (pending === 0 && completed === 0) {
      dataset = [1, 0]; // Default placeholder
    }
    
    tasksChart = new Chart(tasksCtx, {
      type: 'pie',
      data: {
        labels: ['Pending Tasks', 'Completed Tasks'],
        datasets: [{
          data: dataset,
          backgroundColor: ['#f59e0b', '#10b981'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
}

/**
 * Render Consultations List for Agent
 */
function renderAgentConsultations(bookings) {
  const tbody = document.getElementById('agent-bookings-tbody');
  if (!tbody) return;
  
  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">You have no assigned client consultations at this moment.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = '';
  bookings.sort((a,b) => b.id - a.id).forEach(book => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${book.id}</td>
      <td><strong>${book.name}</strong></td>
      <td>
        <span style="font-size:0.8rem; display:block;">${book.email}</span>
        <span style="font-size:0.75rem; color:var(--text-tertiary);">${book.phone}</span>
      </td>
      <td><span class="badge" style="background:var(--bg-tertiary); text-transform:capitalize;">${book.interest_type}</span></td>
      <td>
        <span style="font-size:0.8rem; display:block; font-weight:500; color:var(--text-primary);">${book.message || 'No timing details'}</span>
        ${book.notes ? `<small style="display:block; color:hsl(150, 80%, 25%); background:hsl(150, 80%, 97%); padding:4px 8px; border-radius:4px; margin-top:4px; max-width:250px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${book.notes}">Notes: ${book.notes}</small>` : ''}
      </td>
      <td><span class="panel-badge panel-badge-${book.status || 'pending'}">${book.status || 'pending'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline btn-manage-booking" data-id="${book.id}">
          <i data-feather="edit-3" style="width:14px; height:14px;"></i>
          <span style="margin-left: 4px;">Update</span>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Bind actions
  document.querySelectorAll('.btn-manage-booking').forEach(btn => {
    btn.addEventListener('click', () => {
      const bookId = Number(btn.getAttribute('data-id'));
      const booking = bookings.find(b => b.id === bookId);
      if (booking) openAgentBookingModal(booking);
    });
  });
  
  replaceFeather();
}

/**
 * Manage consultation updates
 */
function setupConsultationActions() {
  const modal = document.getElementById('agent-booking-modal');
  const btnClose = document.getElementById('btn-close-agent-modal');
  const btnCancel = document.getElementById('btn-cancel-agent-booking');
  const form = document.getElementById('agent-booking-form-detail');
  
  btnClose.addEventListener('click', () => { modal.style.display = 'none'; });
  btnCancel.addEventListener('click', () => { modal.style.display = 'none'; });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('agent-booking-id-field').value;
    const status = document.getElementById('agent-booking-status').value;
    const notes = document.getElementById('agent-booking-notes').value.trim();
    
    const client = getDb();
    if (!client) return;
    
    try {
      const { error } = await client
        .from('consultations')
        .update({ status, notes })
        .eq('id', Number(id));
        
      if (error) throw error;
      
      modal.style.display = 'none';
      await loadAllAgentData();
    } catch (err) {
      console.error("Error updating assigned booking:", err);
      alert(`Could not save updates: ${err.message}`);
    }
  });
}

function openAgentBookingModal(booking) {
  const modal = document.getElementById('agent-booking-modal');
  
  document.getElementById('agent-booking-id-field').value = booking.id;
  document.getElementById('agent-detail-client-name').textContent = booking.name;
  document.getElementById('agent-detail-client-contact').textContent = `Email: ${booking.email} | Mobile: ${booking.phone}`;
  document.getElementById('agent-detail-interest').innerHTML = `<strong style="color:var(--text-primary);">Interest:</strong> ${booking.interest_type}`;
  document.getElementById('agent-detail-original-msg').textContent = booking.message || 'No comments.';
  
  document.getElementById('agent-booking-status').value = booking.status || 'pending';
  document.getElementById('agent-booking-notes').value = booking.notes || '';
  
  modal.style.display = 'flex';
}

/**
 * Render Tasks list
 */
function renderAgentTasksList(tasks) {
  const container = document.getElementById('tasks-list-container');
  if (!container) return;
  
  if (tasks.length === 0) {
    container.innerHTML = `<p style="text-align: center; padding: 1.5rem; color: var(--text-tertiary);">No checklist tasks. Add one on the right side panel!</p>`;
    return;
  }
  
  container.innerHTML = '';
  tasks.sort((a,b) => b.id - a.id).forEach(task => {
    const isCompleted = task.status === 'completed';
    const div = document.createElement('div');
    div.className = `task-item ${isCompleted ? 'completed' : ''}`;
    div.innerHTML = `
      <div style="display: flex; align-items: center;">
        <input type="checkbox" class="task-checkbox" ${isCompleted ? 'checked' : ''} data-id="${task.id}">
        <div>
          <span class="task-text" style="font-weight: 500; font-size: 0.95rem; color: var(--text-primary);">${task.task_title}</span>
          <small style="display: block; color: var(--text-tertiary); font-size: 0.75rem; margin-top: 4px;">Due: ${new Date(task.due_date).toLocaleDateString('en-IN')}</small>
        </div>
      </div>
      <div class="task-actions">
        <button class="task-btn-delete" data-id="${task.id}" title="Delete task">
          <i data-feather="trash-2" style="width: 16px; height: 16px;"></i>
        </button>
      </div>
    `;
    container.appendChild(div);
  });
  
  // Bind events
  document.querySelectorAll('.task-checkbox').forEach(box => {
    box.addEventListener('change', async (e) => {
      const taskId = Number(box.getAttribute('data-id'));
      const status = box.checked ? 'completed' : 'pending';
      await toggleTaskStatus(taskId, status);
    });
  });
  
  document.querySelectorAll('.task-btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const taskId = Number(btn.getAttribute('data-id'));
      if (confirm('Delete this task checklist item?')) {
        await deleteTask(taskId);
      }
    });
  });
  
  replaceFeather();
}

/**
 * Task Actions CRUD
 */
function setupTaskActions() {
  const form = document.getElementById('task-create-form');
  
  // Default date to tomorrow
  const dateEl = document.getElementById('task-due');
  if (dateEl) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateEl.value = tomorrow.toISOString().split('T')[0];
  }
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const taskTitle = document.getElementById('task-title').value.trim();
    const dueDate = document.getElementById('task-due').value;
    
    const client = getDb();
    if (!client || !activeAgent) return;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    
    try {
      const { error } = await client
        .from('agent_tasks')
        .insert({
          agent_email: activeAgent.email,
          task_title: taskTitle,
          due_date: dueDate,
          status: 'pending'
        });
        
      if (error) throw error;
      
      form.reset();
      // Reset due date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateEl.value = tomorrow.toISOString().split('T')[0];
      
      await loadAllAgentData();
    } catch (err) {
      console.error("Error creating agent task:", err);
      alert(`Could not create task: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
      replaceFeather();
    }
  });
}

async function toggleTaskStatus(id, status) {
  const client = getDb();
  if (!client) return;
  
  try {
    const { error } = await client
      .from('agent_tasks')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    
    await loadAllAgentData();
  } catch (err) {
    console.error("Error toggling task status:", err);
  }
}

async function deleteTask(id) {
  const client = getDb();
  if (!client) return;
  
  try {
    const { error } = await client
      .from('agent_tasks')
      .delete()
      .eq('id', id);
    if (error) throw error;
    
    await loadAllAgentData();
  } catch (err) {
    console.error("Error deleting agent task:", err);
    alert(`Could not delete task: ${err.message}`);
  }
}

/**
 * Profile Actions
 */
function setupProfileActions() {
  const form = document.getElementById('agent-profile-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('agent-name-field').value.trim();
    const phone = document.getElementById('agent-phone-field').value.trim();
    
    const client = getDb();
    if (!client) return;
    
    try {
      const { error } = await client
        .from('staff_users')
        .update({ name, phone })
        .eq('email', activeAgent.email)
        .eq('role', 'agent');
        
      if (error) throw error;
      
      activeAgent.name = name;
      activeAgent.phone = phone;
      localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(activeAgent));
      
      // Update UI labels
      document.getElementById('sidebar-agent-name').textContent = name;
      document.getElementById('agent-profile-name').textContent = name;
      document.getElementById('agent-profile-phone-label').textContent = phone;
      
      alert('Agent profile updated successfully!');
    } catch (err) {
      console.error("Error updating agent profile details:", err);
      alert(`Could not update details: ${err.message}`);
    }
  });
}

// Locked in dark mode by default
