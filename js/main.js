/* main.js - Core app initializers and interactive UI layouts */

/**
 * Safe Feather Icon replace wrapper
 * Retries if the Feather Icons library isn't loaded yet on slow mobile/CDN loads.
 */
function safeReplaceFeather() {
  if (typeof feather !== 'undefined') {
    try {
      feather.replace();
    } catch (e) {
      console.error("Error executing feather.replace():", e);
    }
  } else {
    setTimeout(safeReplaceFeather, 100);
  }
}
window.safeReplaceFeather = safeReplaceFeather;

function initMainApp() {
  try {
    safeReplaceFeather();
    initTheme();
    initNavbar();
    initMobileMenu();
    initScrollAnimations();
    initAccountDropdown();
    initAccountSidebar();
    updateAccountButtonState();
  } catch (err) {
    console.error("Initialization error in main app:", err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainApp);
} else {
  initMainApp();
}

/**
 * Theme Toggler (Dark / Light mode)
 */
function initTheme() {
  const themeToggles = document.querySelectorAll('.theme-toggle');
  if (themeToggles.length === 0) return;

  const updateThemeButtons = (theme) => {
    themeToggles.forEach(toggle => {
      const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
      toggle.setAttribute('aria-pressed', String(theme === 'dark'));
    });
  };

  // Check saved preference or default to light
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButtons(savedTheme);

  themeToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeButtons(newTheme);
    });
  });
}

/**
 * Navbar shadow & scaling on page scroll
 */
function initNavbar() {
  const header = document.querySelector('.header');
  if (!header) return;

  const shouldStaySolid = !document.querySelector('.hero');

  const handleScroll = () => {
    if (shouldStaySolid || window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  // Initial check in case page was reloaded scrolled down
  handleScroll();
  window.addEventListener('scroll', handleScroll);
}

/**
 * Dynamically inject mobile-only navigation links (Contact & Schedule Tour)
 * inside the hamburger menu drawer on mobile layouts.
 */
function setupMobileNavItems() {
  const navMenu = document.querySelector('.nav-menu');
  if (!navMenu) return;
  if (navMenu.querySelector('.mobile-only-item')) return; // Already injected

  // Create Contact link item
  const contactLi = document.createElement('li');
  contactLi.className = 'mobile-only-item';
  contactLi.innerHTML = `<a href="index.html#contact" class="nav-link">Contact Us</a>`;
  
  // Create Schedule Tour button item
  const scheduleLi = document.createElement('li');
  scheduleLi.className = 'mobile-only-item';
  scheduleLi.style.marginTop = '1rem';
  scheduleLi.style.padding = '0 1rem';
  scheduleLi.innerHTML = `<a href="consultation.html" class="btn btn-primary" style="width: 100%; justify-content: center; height: 46px;">Schedule Tour</a>`;
  
  navMenu.appendChild(contactLi);
  navMenu.appendChild(scheduleLi);
}

/**
 * Mobile Navigation Menu Toggler
 */
function initMobileMenu() {
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navActions = document.querySelector('.nav-actions');
  
  if (!mobileToggle || !navMenu) return;

  // Set up mobile nav list items
  setupMobileNavItems();

  const setMobileMenuState = (isOpen) => {
    navMenu.classList.toggle('active', isOpen);
    mobileToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('mobile-menu-open', isOpen);

    const icon = mobileToggle.querySelector('i');
    if (icon) {
      icon.setAttribute('data-feather', isOpen ? 'x' : 'menu');
      safeReplaceFeather();
    }
  };

  mobileToggle.setAttribute('aria-expanded', 'false');
  mobileToggle.setAttribute('aria-controls', 'main-navigation');
  navMenu.id = navMenu.id || 'main-navigation';

  mobileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setMobileMenuState(!navMenu.classList.contains('active'));
  });

  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    const clickedMenu = navMenu.contains(e.target);
    const clickedActions = navActions && navActions.contains(e.target);
    const clickedToggle = mobileToggle.contains(e.target);

    if (navMenu.classList.contains('active') && !clickedMenu && !clickedActions && !clickedToggle) {
      setMobileMenuState(false);
    }
  });

  // Close mobile menu when clicking on a link
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      setMobileMenuState(false);
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1100 && navMenu.classList.contains('active')) {
      setMobileMenuState(false);
    }
  });
}

/**
 * Intersection Observer for element entrance animations on scroll
 */
function initScrollAnimations() {
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length === 0) return;

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // Trigger only once
      }
    });
  }, {
    root: null, // browser viewport
    threshold: 0.15, // 15% visibility trigger
    rootMargin: '0px 0px -50px 0px' // adjust bottom margin slightly
  });

  revealElements.forEach(element => {
    revealObserver.observe(element);
  });
}

/**
 * Lookup dictionary for properties mapping ID to title and redirect page
 */
const allPropertiesLookup = {
  1: { title: "The Grand Zenith Villa", page: "index.html#properties" },
  2: { title: "Metropolitan Sky Penthouse", page: "index.html#properties" },
  3: { title: "Whispering Pines Sanctuary", page: "index.html#properties" },
  4: { title: "Neo-Minimalist Smart Villa", page: "index.html#properties" },
  5: { title: "Serene Waterfront Haven", page: "index.html#properties" },
  6: { title: "The Obsidian Penthouse", page: "index.html#properties" },
  7: { title: "GIFT Towers Executive Suite", page: "index.html#properties" },
  8: { title: "Lodi Colony Regency Suite", page: "index.html#properties" }
};

/**
 * Ensures the account slide-out sidebar HTML is present in the DOM.
 * Automatically injects it if missing.
 */
function ensureAccountSidebarHtml() {
  if (!document.getElementById('account-sidebar')) {
    const overlay = document.createElement('div');
    overlay.className = 'account-sidebar-overlay';
    overlay.id = 'account-sidebar-overlay';
    
    const sidebar = document.createElement('div');
    sidebar.className = 'account-sidebar';
    sidebar.id = 'account-sidebar';
    sidebar.innerHTML = `
      <button class="close-sidebar-btn" id="close-sidebar-btn" aria-label="Close Account Menu">&times;</button>
      <div class="account-sidebar-content" id="account-sidebar-content"></div>
    `;
    
    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);
  }
}

/**
 * Render user information or guest action options inside the mobile sidebar drawer
 */
function updateAccountSidebarState() {
  ensureAccountSidebarHtml();
  const sidebarContent = document.getElementById('account-sidebar-content');
  if (!sidebarContent) return;

  try {
    const regularUser = localStorage.getItem('apex_regular_current_user');
    const user = regularUser ? JSON.parse(regularUser) : null;

    if (user) {
      // User is logged in
      sidebarContent.innerHTML = `
        <div class="user-profile-header">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
            <div style="width: 50px; height: 50px; border-radius: var(--radius-full); background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.25rem; flex-shrink: 0;">
              ${user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div style="min-width: 0;">
              <h4 style="font-size: 1.15rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${user.name}</h4>
              <p style="font-size: 0.85rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${user.email}</p>
            </div>
          </div>
          <span class="section-tag" style="font-size: 0.75rem; padding: 0.2rem 0.6rem; margin-bottom: 0;">
            Standard Member
          </span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem;">
          <a href="account.html" class="btn btn-outline" style="justify-content: flex-start; width: 100%;">
            <i data-feather="user" style="width: 18px; height: 18px;"></i>
            <span>My Account Dashboard</span>
          </a>
          <a href="favorites.html" class="btn btn-outline" style="justify-content: flex-start; width: 100%;">
            <i data-feather="heart" style="width: 18px; height: 18px;"></i>
            <span>My Favorite Property List</span>
          </a>
          <hr style="border: none; border-top: 1px solid var(--border-color); margin: 1rem 0;">
          <button id="sidebar-logout-btn" class="btn btn-primary" style="background-color: hsl(0, 84%, 60%); justify-content: center; width: 100%;">
            <i data-feather="log-out" style="width: 18px; height: 18px;"></i>
            <span>Log Out</span>
          </button>
        </div>
      `;

      // Logout handler
      const logoutBtn = document.getElementById('sidebar-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          localStorage.removeItem('apex_regular_current_user');
          if (window.location.pathname.includes('account.html') || window.location.pathname.includes('favorites.html') || window.location.pathname.includes('consultation.html')) {
            window.location.href = 'index.html';
          } else {
            window.location.reload();
          }
        });
      }
    } else {
      // Guest
      sidebarContent.innerHTML = `
        <div class="user-profile-header" style="text-align: center; padding-bottom: 1.5rem;">
          <div style="width: 60px; height: 60px; border-radius: var(--radius-full); background: var(--bg-tertiary); color: var(--text-tertiary); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
            <i data-feather="user" style="width: 30px; height: 30px;"></i>
          </div>
          <h4 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.25rem;">Welcome, Guest</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Log in to sync and view your favorites list</p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem;">
          <a href="account.html" class="btn btn-primary" style="justify-content: center; width: 100%;">
            <i data-feather="log-in" style="width: 18px; height: 18px;"></i>
            <span>Login / Register</span>
          </a>
          <a href="favorites.html" class="btn btn-outline" style="justify-content: flex-start; width: 100%;">
            <i data-feather="heart" style="width: 18px; height: 18px;"></i>
            <span>My Favorite Property List</span>
          </a>
        </div>
      `;
    }

    safeReplaceFeather();
  } catch (error) {
    console.error("Error updating account sidebar state:", error);
  }
}
window.updateAccountSidebarState = updateAccountSidebarState;

/**
 * Slide-out Account Sidebar initialization
 */
function initAccountSidebar() {
  ensureAccountSidebarHtml();
  const sidebar = document.getElementById('account-sidebar');
  const overlay = document.getElementById('account-sidebar-overlay');
  const closeBtn = document.getElementById('close-sidebar-btn');

  if (!sidebar || !overlay) return;

  const closeSidebar = () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.classList.remove('mobile-menu-open');
  };

  if (closeBtn) {
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener('click', closeSidebar);
  }

  const newOverlay = overlay.cloneNode(true);
  overlay.parentNode.replaceChild(newOverlay, overlay);
  newOverlay.addEventListener('click', closeSidebar);
}
window.initAccountSidebar = initAccountSidebar;

/**
 * Account Dropdown Menu initialization
 */
function initAccountDropdown() {
  const wrapper = document.getElementById('account-dropdown-wrapper');
  const btn = document.getElementById('account-dropdown-btn');
  const menu = document.getElementById('account-dropdown-menu');

  if (!wrapper || !btn || !menu) return;
  if (btn.dataset.dropdownReady === 'true') return;
  btn.dataset.dropdownReady = 'true';

  // Toggle dropdown on button click or open sidebar on mobile
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.innerWidth <= 1100) {
      ensureAccountSidebarHtml();
      initAccountSidebar();
      
      const sidebar = document.getElementById('account-sidebar');
      const overlay = document.getElementById('account-sidebar-overlay');
      if (sidebar && overlay) {
        updateAccountSidebarState();
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.classList.add('mobile-menu-open');
      }
    } else {
      // Toggle dropdown on desktop
      menu.classList.toggle('active');
      btn.setAttribute('aria-expanded', menu.classList.contains('active'));
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      menu.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close dropdown when clicking on a menu item
  const menuItems = menu.querySelectorAll('.account-dropdown-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      menu.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    });
  });

  safeReplaceFeather();
}
window.initAccountDropdown = initAccountDropdown;

function updateAccountButtonState() {
  const accountText = document.getElementById('account-btn-text');
  const dropdownMenu = document.getElementById('account-dropdown-menu');
  if (!accountText) return;

  try {
    const regularUser = localStorage.getItem('apex_regular_current_user');
    const user = regularUser ? JSON.parse(regularUser) : null;
    
    // Update button label
    accountText.textContent = user && user.name ? user.name.split(' ')[0] : 'My Account';
    
    // Update dropdown menu dynamically if it exists
    if (dropdownMenu) {
      if (user) {
        // User is logged in
        dropdownMenu.innerHTML = `
          <a href="account.html" class="account-dropdown-item" role="menuitem">
            <i data-feather="user" style="width: 16px; height: 16px;"></i>
            <span>My Account Dashboard</span>
          </a>
          <a href="favorites.html" class="account-dropdown-item" role="menuitem">
            <i data-feather="heart" style="width: 16px; height: 16px;"></i>
            <span>My Favorite Property List</span>
          </a>
          <hr style="border: none; border-top: 1px solid var(--border-color); margin: 0.5rem 0;">
          <a href="#" class="account-dropdown-item" id="nav-logout-btn" role="menuitem" style="color: hsl(0, 84%, 60%);">
            <i data-feather="log-out" style="width: 16px; height: 16px; color: currentColor;"></i>
            <span>Log Out</span>
          </a>
        `;
        
        // Add click listener to Logout button in navigation
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('apex_regular_current_user');
            if (window.location.pathname.includes('account.html') || window.location.pathname.includes('favorites.html') || window.location.pathname.includes('consultation.html')) {
              window.location.href = 'index.html';
            } else {
              window.location.reload();
            }
          });
        }
      } else {
        // User is logged out
        dropdownMenu.innerHTML = `
          <a href="account.html" class="account-dropdown-item" role="menuitem">
            <i data-feather="log-in" style="width: 16px; height: 16px;"></i>
            <span>Login / Register</span>
          </a>
          <a href="favorites.html" class="account-dropdown-item" role="menuitem">
            <i data-feather="heart" style="width: 16px; height: 16px;"></i>
            <span>My Favorite Property List</span>
          </a>
        `;
      }
      
      safeReplaceFeather();
    }
  } catch (error) {
    console.error("Error updating account state in dropdown:", error);
    accountText.textContent = 'My Account';
  }
}
window.updateAccountButtonState = updateAccountButtonState;
