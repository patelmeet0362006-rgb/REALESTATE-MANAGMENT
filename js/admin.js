/* admin.js - Controller for Admin Panel dashboard */

const STAFF_SESSION_KEY = 'apex_admin_session';
let activeAdmin = null;

// Chart references for updates
let revenueChart = null;
let propertyTypeChart = null;
let consultationsChart = null;

// Initialize Page
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-theme', 'dark');
  initAdminPanel();
});

function getDb() {
  return window.supabaseClient || null;
}

function replaceFeather() {
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
}

async function initAdminPanel() {
  const sessionVal = localStorage.getItem(STAFF_SESSION_KEY);
  
  if (sessionVal) {
    try {
      const stored = JSON.parse(sessionVal);
      if (stored && stored.role === 'admin') {
        const client = getDb();
        if (client) {
          const { data, error } = await client
            .from('staff_users')
            .select('*')
            .eq('email', stored.email)
            .eq('role', 'admin')
            .maybeSingle();
            
          if (!error && data) {
            activeAdmin = data;
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
  document.getElementById('admin-login-overlay').style.display = 'flex';
  document.getElementById('admin-workspace').style.display = 'none';
  
  const loginForm = document.getElementById('admin-login-form');
  loginForm.addEventListener('submit', handleLogin);
}

function showWorkspace() {
  document.getElementById('admin-login-overlay').style.display = 'none';
  document.getElementById('admin-workspace').style.display = 'flex';
  
  // Update admin labels dynamically from Supabase
  document.getElementById('sidebar-admin-name').textContent = activeAdmin.name;
  document.getElementById('admin-profile-name').textContent = activeAdmin.name;
  document.getElementById('admin-profile-email').textContent = activeAdmin.email;
  document.getElementById('admin-name-field').value = activeAdmin.name;
  document.getElementById('admin-phone-field').value = activeAdmin.phone || '';
  
  // Update initials circle
  const initials = activeAdmin.name ? activeAdmin.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'A';
  const initialsEl = document.getElementById('admin-profile-initials');
  if (initialsEl) initialsEl.textContent = initials;
  
  // Replace icons
  replaceFeather();
  
  // Initialize Tabs & Actions
  setupDashboardTabs();
  loadAllDashboardData();
  setupPropertyActions();
  setupBookingActions();
  setupProfileActions();
}

/**
 * Handle Login Form Submit
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
      .eq('role', 'admin')
      .maybeSingle();
      
    if (error) throw error;
    
    if (!data) {
      notification.textContent = 'Invalid administrator credentials or access level.';
      notification.className = 'form-notification error';
      notification.style.display = 'block';
      return;
    }
    
    // Save staff session
    localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify({
      email: data.email,
      name: data.name,
      role: data.role,
      phone: data.phone
    }));
    
    activeAdmin = data;
    showWorkspace();
  } catch (err) {
    console.error("Login database error:", err);
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
      
      // Toggle button active class
      tabs.forEach(btn => btn.classList.remove('active'));
      tab.classList.add('active');
      
      // Toggle panel active class
      contents.forEach(content => {
        if (content.id === targetId) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
      
      // Special handle: trigger chart resize/refreshes if Overview clicked
      if (targetId === 'tab-overview') {
        loadAllDashboardData();
      }
      
      replaceFeather();
    });
  });
  
  // Logout action
  const logoutBtn = document.getElementById('admin-logout-btn');
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem(STAFF_SESSION_KEY);
    window.location.reload();
  });
}

/**
 * Fetch and Render All Dashboard Data
 */
async function loadAllDashboardData() {
  const client = getDb();
  if (!client) {
    console.warn("Supabase not connected. Unable to retrieve admin data.");
    return;
  }
  
  try {
    // 1. Fetch properties
    const { data: properties, error: propErr } = await client.from('properties').select('*');
    if (propErr) throw propErr;
    
    // 2. Fetch consultations
    const { data: consultations, error: consErr } = await client.from('consultations').select('*');
    if (consErr) throw consErr;
    
    // 3. Fetch users counts
    const { data: regulars, error: regErr } = await client.from('regular_users').select('*');
    const { data: premiums, error: premErr } = await client.from('premium_users').select('*');
    
    // 4. Fetch payment logs
    const { data: payments, error: payErr } = await client.from('premium_payments').select('*');
    
    // Update KPI panels
    document.getElementById('kpi-properties').textContent = properties ? properties.length : 0;
    document.getElementById('kpi-consultations').textContent = consultations ? consultations.length : 0;
    
    const totalUsers = (regulars ? regulars.length : 0) + (premiums ? premiums.length : 0);
    document.getElementById('kpi-users').textContent = totalUsers;
    
    // Calculate total successful revenue
    let totalRevenue = 0;
    if (payments) {
      payments.forEach(p => {
        if (p.status === 'successful') {
          totalRevenue += Number(p.amount || 12);
        }
      });
    }
    document.getElementById('kpi-revenue').textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
    
    // Render Graphs & Tables
    renderCharts(properties || [], consultations || [], payments || []);
    renderPropertiesList(properties || []);
    renderBookingsList(consultations || []);
    renderUsersTables(regulars || [], premiums || [], payments || []);
    
  } catch (err) {
    console.error("Error loading admin workspace data:", err);
  }
}

/**
 * Render Chart.js Dashboard Visualizations
 */
function renderCharts(properties, consultations, payments) {
  // --- 1. REVENUE GROWTH CHART ---
  const revCtx = document.getElementById('chart-revenue');
  if (revCtx) {
    if (revenueChart) revenueChart.destroy();
    
    // Group payments by date (last 7 days or months)
    const successPayments = payments.filter(p => p.status === 'successful');
    const revByDate = {};
    
    // Default mock series if empty
    let labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    let dataset = [120, 240, 360, 600, 840, 1020];
    
    if (successPayments.length > 0) {
      successPayments.forEach(p => {
        const dateStr = new Date(p.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        revByDate[dateStr] = (revByDate[dateStr] || 0) + Number(p.amount);
      });
      labels = Object.keys(revByDate);
      dataset = Object.values(revByDate);
    }
    
    revenueChart = new Chart(revCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue (INR)',
          data: dataset,
          borderColor: '#eab308', // Amber
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { grid: { color: 'rgba(0, 0, 0, 0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // --- 2. PROPERTY TYPES DOUGHNUT CHART ---
  const typeCtx = document.getElementById('chart-property-types');
  if (typeCtx) {
    if (propertyTypeChart) propertyTypeChart.destroy();
    
    const typesCount = { villa: 0, penthouse: 0, apartment: 0, house: 0 };
    properties.forEach(p => {
      const type = String(p.type).toLowerCase();
      if (typesCount[type] !== undefined) {
        typesCount[type]++;
      }
    });
    
    propertyTypeChart = new Chart(typeCtx, {
      type: 'doughnut',
      data: {
        labels: ['Villas', 'Penthouses', 'Apartments', 'Houses'],
        datasets: [{
          data: [typesCount.villa, typesCount.penthouse, typesCount.apartment, typesCount.house],
          backgroundColor: ['#2563eb', '#8b5cf6', '#06b6d4', '#10b981'],
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

  // --- 3. CONSULTATIONS BY CATEGORY BAR CHART ---
  const consCtx = document.getElementById('chart-consultations');
  if (consCtx) {
    if (consultationsChart) consultationsChart.destroy();
    
    const interestCounts = {};
    consultations.forEach(c => {
      const type = c.interest_type || 'Unspecified';
      interestCounts[type] = (interestCounts[type] || 0) + 1;
    });
    
    consultationsChart = new Chart(consCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(interestCounts),
        datasets: [{
          label: 'Bookings Count',
          data: Object.values(interestCounts),
          backgroundColor: '#3b82f6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, beginAtZero: true },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

/**
 * Render Properties Manager Table
 */
function renderPropertiesList(properties) {
  const tbody = document.getElementById('properties-tbody');
  if (!tbody) return;
  
  if (properties.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center;">No property listings in the database. Click 'Add Property' to create one.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = '';
  properties.sort((a, b) => b.id - a.id).forEach(prop => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${prop.id}</td>
      <td><img src="${prop.image || 'images/listing-1.png'}" style="width: 50px; height: 35px; object-fit: cover; border-radius: var(--radius-sm);"></td>
      <td><strong>${prop.title}</strong></td>
      <td><span style="font-size: 0.8rem; display: block; max-width: 180px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${prop.location}</span></td>
      <td>
        <span class="badge" style="background: var(--bg-tertiary); color: var(--text-primary); text-transform: capitalize;">${prop.type}</span>
        <span style="display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 600; color: var(--text-tertiary); margin-top: 4px;">For ${prop.purpose}</span>
      </td>
      <td><strong>₹${Number(prop.price).toLocaleString('en-IN')}</strong></td>
      <td><small style="color: var(--text-tertiary);">${prop.beds} BHK | ${prop.baths} Bath | ${prop.area} sqft</small></td>
      <td>
        <span class="badge ${prop.is_premium ? 'badge-premium' : 'badge-regular'}">
          ${prop.is_premium ? 'Premium' : 'Standard'}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-sm btn-outline btn-edit-prop" data-id="${prop.id}"><i data-feather="edit-2" style="width:14px; height:14px;"></i></button>
          <button class="btn btn-sm btn-outline btn-delete-prop" data-id="${prop.id}" style="color: hsl(0, 84%, 60%); border-color: rgba(239, 68, 68, 0.2);"><i data-feather="trash-2" style="width:14px; height:14px;"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Bind actions
  document.querySelectorAll('.btn-edit-prop').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const propId = Number(btn.getAttribute('data-id'));
      const propObj = properties.find(p => p.id === propId);
      if (propObj) openPropertyModal(propObj);
    });
  });
  
  document.querySelectorAll('.btn-delete-prop').forEach(btn => {
    btn.addEventListener('click', async () => {
      const propId = Number(btn.getAttribute('data-id'));
      if (confirm(`Are you sure you want to delete Property ID #${propId}?`)) {
        await deleteProperty(propId);
      }
    });
  });
  
  replaceFeather();
}

/**
 * Render Bookings & Leads Table
 */
function renderBookingsList(bookings) {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;
  
  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;">No client consultation bookings found in database.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = '';
  bookings.sort((a, b) => b.id - a.id).forEach(book => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${book.id}</td>
      <td><strong>${book.name}</strong></td>
      <td>
        <span style="font-size:0.8rem; display:block;">${book.email}</span>
        <span style="font-size:0.75rem; color:var(--text-tertiary);">${book.phone}</span>
      </td>
      <td><span class="badge" style="background:var(--bg-tertiary); text-transform:capitalize;">${book.interest_type}</span></td>
      <td><span style="font-size:0.8rem; display:block; max-width: 200px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${book.message}">${book.message || 'No slots info'}</span></td>
      <td><span style="font-weight: 500; color: var(--text-primary); font-size:0.8rem;">${book.assigned_agent_email || '<span style="color:var(--text-tertiary); font-style:italic;">Unassigned</span>'}</span></td>
      <td><span class="panel-badge panel-badge-${book.status || 'pending'}">${book.status || 'pending'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline btn-edit-booking" data-id="${book.id}">
          <i data-feather="sliders" style="width:14px; height:14px;"></i>
          <span style="margin-left: 4px;">Manage</span>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Bind actions
  document.querySelectorAll('.btn-edit-booking').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const bookId = Number(btn.getAttribute('data-id'));
      const booking = bookings.find(b => b.id === bookId);
      if (booking) openBookingModal(booking);
    });
  });
  
  replaceFeather();
}

/**
 * Render Users list & Payments logs
 */
function renderUsersTables(regulars, premiums, payments) {
  const usersTbody = document.getElementById('users-tbody');
  const paymentsTbody = document.getElementById('payments-tbody');
  
  // Render Users
  if (usersTbody) {
    usersTbody.innerHTML = '';
    const allUsers = [];
    if (regulars) regulars.forEach(u => allUsers.push({ ...u, role: 'Standard' }));
    if (premiums) premiums.forEach(u => allUsers.push({ ...u, role: u.has_paid ? 'Premium' : 'Standard (Unpaid)' }));
    
    if (allUsers.length === 0) {
      usersTbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">No registered users.</td></tr>`;
    } else {
      allUsers.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.email}</td>
          <td><strong>${u.name}</strong></td>
          <td><span class="badge ${u.role.includes('Premium') ? 'badge-premium' : 'badge-regular'}">${u.role}</span></td>
          <td><small>${new Date(u.created_at).toLocaleDateString('en-IN')}</small></td>
        `;
        usersTbody.appendChild(tr);
      });
    }
  }
  
  // Render Payments
  if (paymentsTbody) {
    paymentsTbody.innerHTML = '';
    if (!payments || payments.length === 0) {
      paymentsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No premium transaction logs.</td></tr>`;
    } else {
      payments.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.user_email}</td>
          <td><strong>₹${Number(p.amount).toFixed(2)}</strong></td>
          <td><span style="text-transform: uppercase; font-size: 0.8rem;">${p.payment_method}</span></td>
          <td><span style="font-family: monospace; font-size: 0.8rem; color: var(--text-tertiary);">${p.transaction_id || 'N/A'}</span></td>
          <td><span class="panel-badge panel-badge-${p.status === 'successful' ? 'completed' : 'cancelled'}">${p.status}</span></td>
        `;
        paymentsTbody.appendChild(tr);
      });
    }
  }
}

/**
 * CRUD functions for Properties table
 */
function setupPropertyActions() {
  const modal = document.getElementById('property-modal');
  const btnAdd = document.getElementById('btn-add-property');
  const btnClose = document.getElementById('btn-close-property-modal');
  const btnCancel = document.getElementById('btn-cancel-property');
  const form = document.getElementById('property-form');
  
  btnAdd.addEventListener('click', () => openPropertyModal());
  btnClose.addEventListener('click', () => { modal.style.display = 'none'; });
  btnCancel.addEventListener('click', () => { modal.style.display = 'none'; });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('property-id-field').value;
    const title = document.getElementById('property-title').value.trim();
    const type = document.getElementById('property-type').value;
    const purpose = document.getElementById('property-purpose').value;
    const price = Number(document.getElementById('property-price').value);
    const location = document.getElementById('property-location').value.trim();
    const beds = parseInt(document.getElementById('property-beds').value);
    const baths = parseFloat(document.getElementById('property-baths').value);
    const area = parseInt(document.getElementById('property-area').value);
    const image = document.getElementById('property-image').value.trim();
    const badge = document.getElementById('property-badge').value.trim();
    const isPremium = document.getElementById('property-premium').checked;
    
    const client = getDb();
    if (!client) return;
    
    const saveBtn = document.getElementById('btn-save-property');
    saveBtn.disabled = true;
    
    try {
      const payload = { title, type, purpose, price, location, beds, baths, area, image, badge, is_premium: isPremium };
      
      if (id) {
        // Edit Mode
        const { error } = await client
          .from('properties')
          .update(payload)
          .eq('id', Number(id));
        if (error) throw error;
      } else {
        // Add Mode
        const { error } = await client
          .from('properties')
          .insert(payload);
        if (error) throw error;
      }
      
      modal.style.display = 'none';
      await loadAllDashboardData();
    } catch (err) {
      console.error("Error saving property listing:", err);
      alert(`Could not save listing: ${err.message || 'Database request failed.'}`);
    } finally {
      saveBtn.disabled = false;
    }
  });
}

function openPropertyModal(prop = null) {
  const modal = document.getElementById('property-modal');
  const titleEl = document.getElementById('property-modal-title');
  
  if (prop) {
    // Fill values for Edit
    titleEl.textContent = 'Edit Property Listing';
    document.getElementById('property-id-field').value = prop.id;
    document.getElementById('property-title').value = prop.title;
    document.getElementById('property-type').value = prop.type;
    document.getElementById('property-purpose').value = prop.purpose;
    document.getElementById('property-price').value = prop.price;
    document.getElementById('property-location').value = prop.location;
    document.getElementById('property-beds').value = prop.beds;
    document.getElementById('property-baths').value = prop.baths;
    document.getElementById('property-area').value = prop.area;
    document.getElementById('property-image').value = prop.image;
    document.getElementById('property-badge').value = prop.badge || '';
    document.getElementById('property-premium').checked = prop.is_premium;
  } else {
    // Clear values for Add
    titleEl.textContent = 'Add Property Listing';
    document.getElementById('property-id-field').value = '';
    document.getElementById('property-title').value = '';
    document.getElementById('property-type').value = 'villa';
    document.getElementById('property-purpose').value = 'buy';
    document.getElementById('property-price').value = '';
    document.getElementById('property-location').value = '';
    document.getElementById('property-beds').value = '3';
    document.getElementById('property-baths').value = '3';
    document.getElementById('property-area').value = '2500';
    document.getElementById('property-image').value = 'images/listing-1.png';
    document.getElementById('property-badge').value = '';
    document.getElementById('property-premium').checked = false;
  }
  
  modal.style.display = 'flex';
}

async function deleteProperty(id) {
  const client = getDb();
  if (!client) return;
  
  try {
    const { error } = await client
      .from('properties')
      .delete()
      .eq('id', id);
    if (error) throw error;
    
    await loadAllDashboardData();
  } catch (err) {
    console.error("Error deleting property:", err);
    alert(`Could not delete property: ${err.message || 'Database request failed.'}`);
  }
}

/**
 * Manage consultations and assignments
 */
function setupBookingActions() {
  const modal = document.getElementById('booking-modal');
  const btnClose = document.getElementById('btn-close-booking-modal');
  const btnCancel = document.getElementById('btn-cancel-booking');
  const form = document.getElementById('booking-form');
  
  btnClose.addEventListener('click', () => { modal.style.display = 'none'; });
  btnCancel.addEventListener('click', () => { modal.style.display = 'none'; });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('booking-id-field').value;
    const status = document.getElementById('booking-status').value;
    const assignedAgentEmail = document.getElementById('booking-agent').value || null;
    const notes = document.getElementById('booking-notes').value.trim();
    
    const client = getDb();
    if (!client) return;
    
    try {
      const { error } = await client
        .from('consultations')
        .update({
          status: status,
          assigned_agent_email: assignedAgentEmail,
          notes: notes
        })
        .eq('id', Number(id));
        
      if (error) throw error;
      
      modal.style.display = 'none';
      await loadAllDashboardData();
    } catch (err) {
      console.error("Error updating booking status:", err);
      alert(`Could not update booking: ${err.message}`);
    }
  });
}

async function openBookingModal(booking) {
  const modal = document.getElementById('booking-modal');
  
  document.getElementById('booking-id-field').value = booking.id;
  document.getElementById('detail-client-name').textContent = booking.name;
  document.getElementById('detail-client-contact').textContent = `Email: ${booking.email} | Mobile: ${booking.phone}`;
  document.getElementById('detail-interest').innerHTML = `<strong style="color:var(--text-primary);">Interest type:</strong> ${booking.interest_type}`;
  document.getElementById('detail-original-msg').textContent = booking.message || 'No additional comments provided.';
  
  document.getElementById('booking-status').value = booking.status || 'pending';
  document.getElementById('booking-notes').value = booking.notes || '';
  
  // Populate agent selection dropdown dynamically
  const agentSelect = document.getElementById('booking-agent');
  agentSelect.innerHTML = '<option value="">Unassigned</option>';
  
  const client = getDb();
  if (client) {
    try {
      const { data: agents } = await client
        .from('staff_users')
        .select('email, name')
        .eq('role', 'agent');
        
      if (agents) {
        agents.forEach(agent => {
          const opt = document.createElement('option');
          opt.value = agent.email;
          opt.textContent = `${agent.name} (${agent.email})`;
          agentSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.error("Error loading agents selection dropdown:", e);
    }
  }
  
  agentSelect.value = booking.assigned_agent_email || '';
  modal.style.display = 'flex';
}

/**
 * Profile controls
 */
function setupProfileActions() {
  const form = document.getElementById('admin-profile-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('admin-name-field').value.trim();
    const phone = document.getElementById('admin-phone-field').value.trim();
    
    const client = getDb();
    if (!client) return;
    
    try {
      const { error } = await client
        .from('staff_users')
        .update({ name, phone })
        .eq('email', activeAdmin.email)
        .eq('role', 'admin');
        
      if (error) throw error;
      
      // Update active session locally
      activeAdmin.name = name;
      activeAdmin.phone = phone;
      localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(activeAdmin));
      
      // Update UI labels
      document.getElementById('sidebar-admin-name').textContent = name;
      document.getElementById('admin-profile-name').textContent = name;
      document.getElementById('admin-phone-field').value = phone;
      
      alert('Profile information updated successfully!');
    } catch (e) {
      console.error("Error updating admin profile:", e);
      alert(`Could not update profile: ${e.message}`);
    }
  });
}

// Locked in dark mode by default
