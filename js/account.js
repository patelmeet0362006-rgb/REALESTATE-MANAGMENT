/* account.js - Regular and Premium user dashboard & auth logic */

const REGULAR_USER_KEY = "apex_regular_current_user";

// Properties datasets to render cards in the dashboard
const REGULAR_PROPERTIES = [
  { id: 1, title: "The Grand Zenith Villa", purpose: "buy", price: 48500000, location: "Bandra West, Mumbai, Maharashtra", beds: 5, baths: 6, area: 6200, image: "images/listing-1.png", badge: "new" },
  { id: 2, title: "Metropolitan Sky Penthouse", purpose: "buy", price: 32000000, location: "Chanakyapuri, New Delhi, Delhi", beds: 3, baths: 3.5, area: 3400, image: "images/listing-2.png", badge: "hot" },
  { id: 3, title: "Whispering Pines Sanctuary", purpose: "buy", price: 21500000, location: "Koregaon Park, Pune, Maharashtra", beds: 4, baths: 4.5, area: 4100, image: "images/listing-3.png", badge: "new" },
  { id: 4, title: "Neo-Minimalist Smart Villa", purpose: "buy", price: 39000000, location: "GIFT City, Gandhinagar, Gujarat", beds: 5, baths: 5, area: 5800, image: "images/listing-4.png", badge: "hot" },
  { id: 5, title: "Serene Waterfront Haven", purpose: "buy", price: 14500000, location: "Marine Drive, Mumbai, Maharashtra", beds: 2, baths: 2, area: 1800, image: "images/listing-1.png", badge: "" },
  { id: 6, title: "The Obsidian Penthouse", purpose: "buy", price: 28000000, location: "Vasant Kunj, New Delhi, Delhi", beds: 3, baths: 3, area: 2900, image: "images/listing-2.png", badge: "" },
  { id: 7, title: "GIFT Towers Executive Suite", purpose: "rent", price: 65000, location: "GIFT City, Gandhinagar, Gujarat", beds: 2, baths: 2, area: 1150, image: "images/listing-3.png", badge: "new" },
  { id: 8, title: "Lodi Colony Regency Suite", purpose: "rent", price: 82000, location: "Lodi Colony, New Delhi, Delhi", beds: 1, baths: 1.5, area: 950, image: "images/listing-4.png", badge: "hot" }
];

let cachedFavorites = [];

function accountDb() {
  return window.supabaseClient || null;
}

function accountById(id) {
  return document.getElementById(id);
}

function accountMessage(error) {
  if (!error) return "Something went wrong.";
  return error.message || error.error_description || error.error || "Database request failed.";
}

function showAccountNotice(type, message) {
  const notice = accountById("auth-notification");
  if (!notice) return;
  notice.textContent = message;
  notice.className = `form-notification ${type}`;
  notice.style.display = "block";
}

function clearAccountNotice() {
  const notice = accountById("auth-notification");
  if (notice) notice.style.display = "none";
}

function saveRegularSession(user) {
  localStorage.setItem(REGULAR_USER_KEY, JSON.stringify({
    name: user.name || user.email,
    email: String(user.email).toLowerCase()
  }));
}

function redirectAfterAuth() {
  const params = new URLSearchParams(window.location.search);
  window.location.href = params.get("redirect") || "account.html";
}

function setAccountActiveClass(element, isActive) {
  if (!element || !element.classList) return;
  element.classList.toggle("active", isActive);
}

function switchAccountMode(mode) {
  const isRegister = mode === "register";
  setAccountActiveClass(accountById("tab-login"), !isRegister);
  setAccountActiveClass(accountById("tab-register"), isRegister);
  accountById("auth-login-form").style.display = isRegister ? "none" : "block";
  accountById("auth-register-form").style.display = isRegister ? "block" : "none";
  clearAccountNotice();
}

async function findRegularUser(email) {
  const client = accountDb();
  if (!client) throw new Error("Supabase is not connected.");

  const { data, error } = await client
    .from("regular_users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function bindAccountPage() {
  const tabLogin = accountById("tab-login");
  const tabRegister = accountById("tab-register");

  if (tabLogin) tabLogin.addEventListener("click", () => switchAccountMode("login"));
  if (tabRegister) tabRegister.addEventListener("click", () => switchAccountMode("register"));

  const forgotPasswordLink = accountById("forgot-password-link");
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      clearAccountNotice();
      showAccountNotice("success", "Password reset instructions have been sent to your email.");
    });
  }

  accountById("auth-login-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    clearAccountNotice();

    const email = accountById("login-email").value.trim().toLowerCase();
    const password = accountById("login-password").value;

    try {
      showAccountNotice("success", "Checking account...");
      const user = await findRegularUser(email);

      if (!user || user.password !== password) {
        showAccountNotice("error", "Invalid email or password.");
        return;
      }

      saveRegularSession({ name: user.name, email: user.email });
      if (typeof window.updateAccountButtonState === "function") {
        window.updateAccountButtonState();
      }
      redirectAfterAuth();
    } catch (error) {
      showAccountNotice("error", `Login failed: ${accountMessage(error)}`);
    }
  });

  accountById("auth-register-form")?.addEventListener("submit", async event => {
    event.preventDefault();
    clearAccountNotice();

    const name = accountById("register-name").value.trim();
    const email = accountById("register-email").value.trim().toLowerCase();
    const password = accountById("register-password").value;
    const confirm = accountById("register-confirm").value;
    const submitButton = event.currentTarget.querySelector("button[type='submit']");

    if (!name || !email || !password) {
      showAccountNotice("error", "Please fill all fields.");
      return;
    }

    if (password.length < 6) {
      showAccountNotice("error", "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      showAccountNotice("error", "Passwords do not match.");
      return;
    }

    try {
      submitButton.disabled = true;
      showAccountNotice("success", "Creating account...");

      const existingUser = await findRegularUser(email);
      if (existingUser) {
        showAccountNotice("error", "This email is already registered. Please login.");
        return;
      }

      const { error } = await accountDb()
        .from("regular_users")
        .insert({ name, email, password });

      if (error) throw error;

      saveRegularSession({ name, email });
      if (typeof window.updateAccountButtonState === "function") {
        window.updateAccountButtonState();
      }
      redirectAfterAuth();
    } catch (error) {
      showAccountNotice("error", `Registration failed: ${accountMessage(error)}`);
    } finally {
      submitButton.disabled = false;
    }
  });

  switchAccountMode(window.location.hash === "#register" ? "register" : "login");
}

/* ==========================================
   DASHBOARD IMPLEMENTATION
   ========================================== */

function getSessionUser() {
  try {
    const regVal = localStorage.getItem(REGULAR_USER_KEY);
    
    if (regVal) {
      const user = JSON.parse(regVal);
      user.role = "regular";
      return user;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function startAccountPage() {
  const user = getSessionUser();
  if (user) {
    // Modify CSS layout to dashboard wide mode
    const container = accountById("account-container");
    if (container) {
      container.style.maxWidth = "1200px";
    }
    
    await renderDashboard(user);
  } else {
    bindAccountPage();
  }
}

async function renderDashboard(user) {
  const section = accountById("account-section");
  if (!section) return;

  // Render Dashboard Skeleton
  section.innerHTML = `
    <div class="container dashboard-container">
      <div class="dashboard-layout">
        <!-- Sidebar Navigation -->
        <aside class="dashboard-sidebar">
          <div class="dashboard-user-card">
            <div class="dashboard-avatar">
              <i data-feather="user"></i>
            </div>
            <div class="dashboard-user-info">
              <h3 class="dashboard-user-name">${user.name}</h3>
              <p class="dashboard-user-email">${user.email}</p>
              <span class="badge badge-regular">
                Regular Member
              </span>
            </div>
          </div>
          <nav class="dashboard-nav">
            <button class="dashboard-nav-btn active" data-target="panel-overview">
              <i data-feather="home"></i>
              <span>Overview</span>
            </button>
            <button class="dashboard-nav-btn" data-target="panel-favorites">
              <i data-feather="heart"></i>
              <span>Saved Favorites</span>
            </button>
            <button class="dashboard-nav-btn" data-target="panel-consultations">
              <i data-feather="calendar"></i>
              <span>My Consultations</span>
            </button>
            <button class="dashboard-nav-btn" data-target="panel-settings">
              <i data-feather="settings"></i>
              <span>Settings</span>
            </button>
            <hr class="dashboard-divider">
            <button class="dashboard-nav-btn agent-panel-btn" style="color: var(--accent);">
              <i data-feather="briefcase"></i>
              <span>Agent Panel</span>
            </button>
            <button class="dashboard-nav-btn admin-panel-btn" style="color: var(--accent);">
              <i data-feather="shield"></i>
              <span>Admin Panel</span>
            </button>
            <hr class="dashboard-divider">
            <button class="dashboard-nav-btn logout-btn" id="dashboard-logout-btn">
              <i data-feather="log-out"></i>
              <span>Log Out</span>
            </button>
          </nav>
        </aside>

        <!-- Main Dashboard Content Panel -->
        <main class="dashboard-content">
          <!-- Overview Tab -->
          <div class="dashboard-tab-panel active" id="panel-overview">
            <div class="dashboard-header-block">
              <h2 class="dashboard-title">Welcome back, ${user.name.split(' ')[0]}!</h2>
              <p class="dashboard-subtitle">Manage your real estate investments, liked listings, and consultation bookings here.</p>
            </div>
            
            <div class="dashboard-stats-grid">
              <div class="stat-card">
                <div class="stat-icon"><i data-feather="heart"></i></div>
                <div class="stat-details">
                  <span class="stat-num" id="stat-favs-count">...</span>
                  <span class="stat-label">Favorites</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><i data-feather="calendar"></i></div>
                <div class="stat-details">
                  <span class="stat-num" id="stat-booking-count">...</span>
                  <span class="stat-label">Bookings</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon"><i data-feather="award"></i></div>
                <div class="stat-details">
                  <span class="stat-num" style="text-transform: capitalize;">Standard</span>
                  <span class="stat-label">Access Level</span>
                </div>
              </div>
            </div>

            <div class="dashboard-card-row">
              <div class="dashboard-card-panel">
                <h3>Quick Account Summary</h3>
                <ul class="summary-list">
                  <li><strong>Full Name:</strong> <span>${user.name}</span></li>
                  <li><strong>Email Address:</strong> <span>${user.email}</span></li>
                  <li><strong>Membership Tier:</strong> <span>Standard Member</span></li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Saved Favorites Tab -->
          <div class="dashboard-tab-panel" id="panel-favorites">
            <div class="dashboard-header-block">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                  <h2 class="dashboard-title">Saved Properties</h2>
                  <p class="dashboard-subtitle">A compilation of properties you saved while exploring the website.</p>
                </div>
              </div>
            </div>
            
            <div class="listings-grid" id="dashboard-favorites-grid">
              <div style="color: var(--text-secondary);">Loading favorites...</div>
            </div>
          </div>

          <!-- My Consultations Tab -->
          <div class="dashboard-tab-panel" id="panel-consultations">
            <div class="dashboard-header-block">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                  <h2 class="dashboard-title">My Booked Consultations</h2>
                  <p class="dashboard-subtitle">Track your private tours and executive consultation bookings.</p>
                </div>
                <a href="consultation.html" class="btn btn-primary btn-sm">
                  <i data-feather="plus"></i> Schedule New
                </a>
              </div>
            </div>
            
            <div class="consultations-list" id="dashboard-consultations-list">
              <div style="color: var(--text-secondary);">Loading consultations...</div>
            </div>
          </div>

          <!-- Account Settings Tab -->
          <div class="dashboard-tab-panel" id="panel-settings">
            <div class="dashboard-header-block">
              <h2 class="dashboard-title">Account Settings</h2>
              <p class="dashboard-subtitle">Update your personal preferences and contact credentials.</p>
            </div>
            
            <div class="form-notification" id="settings-notification"></div>
            
            <form id="dashboard-settings-form" class="contact-form-panel" style="margin-top: 1rem; border-radius: var(--radius-md);">
              <div class="form-row">
                <div class="form-group">
                  <label for="settings-name">Full Name</label>
                  <input type="text" id="settings-name" class="form-control" value="${user.name}" required>
                </div>
                <div class="form-group">
                  <label for="settings-email">Email Address</label>
                  <input type="email" id="settings-email" class="form-control" value="${user.email}" disabled>
                  <small style="color: var(--text-tertiary); margin-top: 4px;">Email address is linked to your database record and cannot be changed.</small>
                </div>
              </div>
              
              <button type="submit" class="btn btn-primary">
                <i data-feather="save"></i>
                <span>Save Changes</span>
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  `;

  // Initialize Feather Icons in newly injected markup
  safeReplaceFeather();

  // Tab Navigation Handling
  const navBtns = section.querySelectorAll(".dashboard-nav-btn:not(.logout-btn)");
  const panels = section.querySelectorAll(".dashboard-tab-panel");

  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      navBtns.forEach(b => b.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.dataset.target;
      const targetPanel = section.querySelector(`#${targetId}`);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });

  // Logout Handlers
  const logoutBtn = section.querySelector("#dashboard-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(REGULAR_USER_KEY);
      if (typeof window.updateAccountButtonState === "function") {
        window.updateAccountButtonState();
      }
      window.location.href = "index.html";
    });
  }

  // Bind Settings Form Submit
  const settingsForm = section.querySelector("#dashboard-settings-form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const notification = section.querySelector("#settings-notification");
      if (notification) notification.style.display = "none";

      const newName = section.querySelector("#settings-name").value.trim();
      if (!newName) return;

      const client = accountDb();
      if (!client) {
        showSettingsNotice("error", "Database client not connected.");
        return;
      }

      const table = "regular_users";
      const storageKey = REGULAR_USER_KEY;

      try {
        const saveBtn = settingsForm.querySelector("button[type='submit']");
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i data-feather="loader" class="shimmer-spin" style="animation: loadingShimmer 1s infinite linear; width: 18px; height: 18px; margin-right: 8px;"></i> Saving...`;
        safeReplaceFeather();

        const { error } = await client
          .from(table)
          .update({ name: newName })
          .eq("email", user.email);

        if (error) throw error;

        // Save back in local storage
        user.name = newName;
        localStorage.setItem(storageKey, JSON.stringify(user));
        
        // Update header & sidebar names
        const sidebarName = section.querySelector(".dashboard-user-name");
        if (sidebarName) sidebarName.textContent = newName;
        
        if (typeof window.updateAccountButtonState === "function") {
          window.updateAccountButtonState();
        }

        showSettingsNotice("success", "Settings updated successfully.");
        
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i data-feather="save"></i> <span>Save Changes</span>`;
        safeReplaceFeather();
      } catch (err) {
        showSettingsNotice("error", `Could not save changes: ${accountMessage(err)}`);
        const saveBtn = settingsForm.querySelector("button[type='submit']");
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i data-feather="save"></i> <span>Save Changes</span>`;
        safeReplaceFeather();
      }
    });

    function showSettingsNotice(type, msg) {
      const notification = section.querySelector("#settings-notification");
      if (!notification) return;
      notification.textContent = msg;
      notification.className = `form-notification ${type}`;
      notification.style.display = "block";
    }
  }

  // Load Dashboard Data (Favorites & Consultations)
  await loadDashboardData(user);
}

async function loadDashboardData(user) {
  const client = accountDb();
  if (!client) return;

  try {
    // 1. Fetch consultations history
    const { data: bookingData, error: bookingError } = await client
      .from("consultations")
      .select("*")
      .eq("email", user.email);

    let bookings = [];
    if (!bookingError && bookingData) {
      bookings = bookingData;
    }

    // Update stats
    const bookingCountEl = accountById("stat-booking-count");
    if (bookingCountEl) bookingCountEl.textContent = bookings.length;

    // Render bookings history
    renderConsultationList(bookings);

    // 2. Fetch favorites list
    let favQuery = client
      .from("user_favorites")
      .select("property_id")
      .eq("user_email", user.email);
      
    const { data: favsData, error: favsError } = await favQuery;

    if (!favsError && favsData) {
      cachedFavorites = favsData;
    } else {
      cachedFavorites = [];
    }

    // Update stats count
    const favsCountEl = accountById("stat-favs-count");
    if (favsCountEl) favsCountEl.textContent = cachedFavorites.length;

    // Display active favorites tab grid
    displayDashboardFavorites(user);

  } catch (error) {
    console.error("Error loading dashboard content:", error);
  }
}

function renderConsultationList(bookings) {
  const container = accountById("dashboard-consultations-list");
  if (!container) return;

  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="listings-not-found">
        <i data-feather="calendar" style="width: 48px; height: 48px; margin-bottom: 1rem; color: var(--text-tertiary);"></i>
        <h3>No consultations booked yet.</h3>
        <p>Schedule a private tour or advisory consultation for properties you are interested in.</p>
        <a href="consultation.html" class="btn btn-primary" style="margin-top: 1.25rem;">Schedule Consultation</a>
      </div>
    `;
    safeReplaceFeather();
    return;
  }

  // Sort by created_at or id descending
  const sortedBookings = [...bookings].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
    const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
    return dateB - dateA;
  });

  container.innerHTML = sortedBookings.map(booking => {
    const formattedDate = booking.created_at 
      ? new Date(booking.created_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "Recently Submitted";
      
    // Handle status badges
    let statusClass = "badge-pending";
    let statusLabel = booking.status || "Pending Review";

    return `
      <div class="consultation-card">
        <div class="consultation-header">
          <div>
            <span class="consultation-interest">${booking.interest_type ? booking.interest_type + " Inquiry" : "Consultation Request"}</span>
            <div class="consultation-date">${formattedDate}</div>
          </div>
          <span class="consultation-badge ${statusClass}">${statusLabel}</span>
        </div>
        
        <div class="consultation-details-grid">
          <div class="consultation-detail-item">
            <i data-feather="user"></i>
            <span>${booking.name}</span>
          </div>
          <div class="consultation-detail-item">
            <i data-feather="phone"></i>
            <span>${booking.phone}</span>
          </div>
        </div>
        
        ${booking.message ? `
          <div class="consultation-message-box">
            "${booking.message}"
          </div>
        ` : ''}
      </div>
    `;
  }).join("");

  safeReplaceFeather();
}

function displayDashboardFavorites(user) {
  const grid = accountById("dashboard-favorites-grid");
  if (!grid) return;

  const currentEmail = user.email;
  
  // Filter cached favorites based on toggle selection
  const filteredIds = cachedFavorites.map(item => Number(item.property_id));

  // Match against mock data arrays
  const filteredProperties = REGULAR_PROPERTIES.filter(prop => filteredIds.includes(prop.id));

  if (filteredProperties.length === 0) {
    grid.innerHTML = `
      <div class="listings-not-found" style="grid-column: 1 / -1; width: 100%;">
        <i data-feather="heart" style="width: 48px; height: 48px; margin-bottom: 1rem; color: var(--text-tertiary);"></i>
        <h3>No properties favorited.</h3>
        <p>Explore our listings and tap the heart icon on properties you like to save them here.</p>
        <a href="index.html#properties" class="btn btn-primary" style="margin-top: 1.25rem;">Browse properties</a>
      </div>
    `;
    safeReplaceFeather();
    return;
  }

  grid.innerHTML = filteredProperties.map(prop => {
    const formattedPrice = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(prop.price);
    const priceDisplay = prop.purpose === "rent" ? `${formattedPrice}/mo` : formattedPrice;
    const badge = prop.badge || "Saved";
    const badgeClass = prop.badge === "new" ? "badge-tag-new" : "badge-tag-hot";

    return `
      <article class="listing-card reveal active">
        <div class="listing-img-container">
          <img src="${prop.image}" alt="${prop.title}" class="listing-img" loading="lazy">
          <div class="listing-badge-container">
            <span class="listing-badge ${badgeClass}">${badge}</span>
          </div>
          <span class="badge-purpose">${prop.purpose === "rent" ? "For Rent" : "For Sale"}</span>
          
          <button class="fav-heart-btn" type="button" data-unsave-id="${prop.id}" aria-label="Remove saved property" 
            style="position: absolute; top: 1rem; right: 1rem; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radius-full); background: rgba(15, 22, 36, 0.45); color: var(--accent); z-index: 10;">
            <i data-feather="heart" style="fill: currentColor;"></i>
          </button>
        </div>
        
        <div class="listing-details">
          <div class="listing-price-row">
            <span class="listing-price">${priceDisplay}</span>
          </div>
          <h3 class="listing-title">${prop.title}</h3>
          <div class="listing-location">
            <i data-feather="map-pin" class="listing-location-icon"></i>
            <span>${prop.location}</span>
          </div>
          <div class="listing-specs">
            <div class="spec-item"><i data-feather="square" class="spec-icon"></i><span>${prop.beds} Beds</span></div>
            <div class="spec-item"><i data-feather="wind" class="spec-icon"></i><span>${prop.baths} Baths</span></div>
            <div class="spec-item"><i data-feather="maximize" class="spec-icon"></i><span>${prop.area.toLocaleString()} sqft</span></div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  // Attach unsave click listeners
  grid.querySelectorAll("[data-unsave-id]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const propId = Number(btn.dataset.unsave-id);
      
      const client = accountDb();
      if (!client) return;

      try {
        const { error } = await client
          .from("user_favorites")
          .delete()
          .eq("user_email", currentEmail)
          .eq("property_id", propId);

        if (error) throw error;

        // Remove from local cache
        cachedFavorites = cachedFavorites.filter(item => item.property_id != propId);
        
        // Update stats
        const favsCountEl = accountById("stat-favs-count");
        if (favsCountEl) favsCountEl.textContent = cachedFavorites.length;

        // Rerender active grid
        displayDashboardFavorites(user);

      } catch (err) {
        console.error("Error unsaving favorite:", err);
      }
    });
  });

  safeReplaceFeather();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAccountPage);
} else {
  startAccountPage();
}
