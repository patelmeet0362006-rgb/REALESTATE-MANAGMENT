/* main.js - Core app initializers and interactive UI layouts */

function initMainApp() {
  try {
    initTheme();
    initNavbar();
    initMobileMenu();
    initScrollAnimations();
    initAccountDropdown();
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
 * Mobile Navigation Menu Toggler
 */
function initMobileMenu() {
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navActions = document.querySelector('.nav-actions');
  
  if (!mobileToggle || !navMenu) return;

  const setMobileMenuState = (isOpen) => {
    navMenu.classList.toggle('active', isOpen);
    mobileToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('mobile-menu-open', isOpen);

    const icon = mobileToggle.querySelector('i');
    if (icon) {
      icon.setAttribute('data-feather', isOpen ? 'x' : 'menu');
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
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
  8: { title: "Lodi Colony Regency Suite", page: "index.html#properties" },
  101: { title: "The Raj Mahal Villa", page: "premium.html" },
  102: { title: "Antilia Skyline Penthouse", page: "premium.html" },
  103: { title: "The Lodi Palace Sanctuary", page: "premium.html" },
  104: { title: "Worli Sea Face Horizon Suite", page: "premium.html" }
};

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

  // Toggle dropdown on button click
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('active');
    btn.setAttribute('aria-expanded', menu.classList.contains('active'));
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

  // Initialize feather icons
  if (typeof feather !== 'undefined') {
    feather.replace();
  }
}

window.initAccountDropdown = initAccountDropdown;

function updateAccountButtonState() {
  const accountText = document.getElementById('account-btn-text');
  const dropdownMenu = document.getElementById('account-dropdown-menu');
  if (!accountText) return;

  try {
    const regularUser = localStorage.getItem('apex_regular_current_user');
    const premiumUser = localStorage.getItem('apex_current_user');
    const savedUser = regularUser || premiumUser;
    const user = savedUser ? JSON.parse(savedUser) : null;
    
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
          <a href="premium.html" class="account-dropdown-item" role="menuitem">
            <i data-feather="award" style="width: 16px; height: 16px;"></i>
            <span>Premium Property</span>
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
            // Clear both keys
            localStorage.removeItem('apex_regular_current_user');
            localStorage.removeItem('apex_current_user');
            // Redirect to home or reload current page
            if (window.location.pathname.includes('account.html') || window.location.pathname.includes('favorites.html') || window.location.pathname.includes('premium.html') || window.location.pathname.includes('consultation.html')) {
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
          <a href="premium.html" class="account-dropdown-item" role="menuitem">
            <i data-feather="award" style="width: 16px; height: 16px;"></i>
            <span>Premium Property</span>
          </a>
        `;
      }
      
      // Re-run feather icons
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
    }
  } catch (error) {
    console.error("Error updating account state in dropdown:", error);
    accountText.textContent = 'My Account';
  }
}

window.updateAccountButtonState = updateAccountButtonState;
