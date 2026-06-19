/* premium.js - Subscription auth gateway and favorite lists rendering */

// Mock Database of Ultra-Luxury Premium Indian Estates
const premiumProperties = [
  {
    id: 101,
    title: "The Raj Mahal Villa",
    location: "GIFT City, Gandhinagar, Gujarat",
    price: 125000000, // ₹12.5 Crores
    beds: 6,
    baths: 8,
    area: 9500,
    image: "images/listing-1.png",
    badge: "Super Premium"
  },
  {
    id: 102,
    title: "Antilia Skyline Penthouse",
    location: "Altamount Road, Mumbai, Maharashtra",
    price: 240000000, // ₹24.0 Crores
    beds: 4,
    baths: 5,
    area: 6800,
    image: "images/listing-2.png",
    badge: "Exclusive"
  },
  {
    id: 103,
    title: "The Lodi Palace Sanctuary",
    location: "Lodi Estate, New Delhi, Delhi",
    price: 180000000, // ₹18.0 Crores
    beds: 5,
    baths: 6,
    area: 8200,
    image: "images/listing-3.png",
    badge: "Off-Market"
  },
  {
    id: 104,
    title: "Worli Sea Face Horizon Suite",
    location: "Worli, Mumbai, Maharashtra",
    price: 110000000, // ₹11.0 Crores
    beds: 3,
    baths: 4,
    area: 4500,
    image: "images/listing-4.png",
    badge: "New Release"
  }
];

// Active State
let currentUser = null;
let favoriteIds = [];
let currentFilter = 'all'; // 'all' or 'favorites'

function initPremiumPortal() {
  try {
    initAuthSession();
    setupAuthTabs();
    setupAuthForms();
    setupDashboardFilters();
  } catch (err) {
    console.error("Initialization error in premium portal:", err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPremiumPortal);
} else {
  initPremiumPortal();
}

/**
 * Check if user is already logged in from a previous session and check payment
 */
async function initAuthSession() {
  const savedUser = localStorage.getItem('apex_current_user') || localStorage.getItem('apex_regular_current_user');
  const logoutBtn = document.getElementById('auth-logout-btn');

  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    
    if (typeof supabaseClient !== 'undefined') {
      try {
        // Query premium user to check has_paid and existence
        const { data: userData, error: userError } = await supabaseClient
          .from('premium_users')
          .select('has_paid')
          .eq('email', currentUser.email)
          .maybeSingle();

        if (userError || !userData) {
          // If user doesn't exist in DB, clear session
          localStorage.removeItem('apex_current_user');
          currentUser = null;
          showAuthGateway();
          return;
        }

        // Update local status
        currentUser.has_paid = userData.has_paid;
        localStorage.setItem('apex_current_user', JSON.stringify(currentUser));

        // Load favorites for this specific user
        const { data: favsData, error: favsError } = await supabaseClient
          .from('user_favorites')
          .select('property_id')
          .eq('user_email', currentUser.email)
          .eq('is_premium', true);

        if (!favsError && favsData) {
          favoriteIds = favsData.map(item => item.property_id);
        } else {
          favoriteIds = [];
        }

        // Check if user has paid ₹12
        if (userData.has_paid) {
          showDashboard();
        } else {
          showPaymentGateway();
        }

      } catch (err) {
        console.error("Error initializing premium session:", err);
        showAuthGateway();
      }
    } else {
      showAuthGateway();
    }
  } else {
    showAuthGateway();
  }

  // Handle Logout
  if (logoutBtn) {
    // Clone to remove previous listener if any
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    newLogoutBtn.style.display = savedUser ? 'block' : 'none';

    newLogoutBtn.addEventListener('click', () => {
      localStorage.removeItem('apex_current_user');
      currentUser = null;
      favoriteIds = [];
      showAuthGateway();
    });
  }
}

/**
 * Handle switching between Login and Register tabs
 */
function setupAuthTabs() {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('auth-login-form');
  const formRegister = document.getElementById('auth-register-form');
  const notification = document.getElementById('auth-notification');

  console.log("premium.js - Binding auth tabs:", { tabLogin, tabRegister, formLogin, formRegister });

  if (!tabLogin || !tabRegister || !formLogin || !formRegister) {
    console.error("premium.js - setupAuthTabs: Missing required tab elements!");
    return;
  }

  tabLogin.addEventListener('click', (e) => {
    e.preventDefault();
    console.log("premium.js - Login tab clicked");
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.style.display = 'block';
    formRegister.style.display = 'none';
    if (notification) notification.style.display = 'none';
  });

  tabRegister.addEventListener('click', (e) => {
    e.preventDefault();
    console.log("premium.js - Register tab clicked");
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.style.display = 'block';
    formLogin.style.display = 'none';
    if (notification) notification.style.display = 'none';
  });
}

/**
 * Setup Registration and Login form submissions
 */
function setupAuthForms() {
  const formLogin = document.getElementById('auth-login-form');
  const formRegister = document.getElementById('auth-register-form');
  const notification = document.getElementById('auth-notification');

  // Handle Login Submission
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      notification.style.display = 'none';

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (typeof supabaseClient === 'undefined') {
        showNotification('error', 'Database connection unavailable.');
        return;
      }

      showNotification('success', 'Authenticating...');

      try {
        let { data, error } = await supabaseClient
          .from('premium_users')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        let isRegular = false;

        if (!data && !error) {
          const { data: regData, error: regError } = await supabaseClient
            .from('regular_users')
            .select('*')
            .eq('email', email)
            .maybeSingle();
          if (!regError && regData) {
            data = regData;
            isRegular = true;
          }
        }

        if (error) {
          showNotification('error', 'Database connection error: ' + error.message);
          return;
        }

        if (!data || data.password !== password) {
          showNotification('error', 'Invalid email address or password.');
          return;
        }

        // Log in success
        currentUser = { name: data.name, email: data.email, has_paid: isRegular ? false : data.has_paid };
        
        if (isRegular) {
          localStorage.setItem('apex_regular_current_user', JSON.stringify({ name: data.name, email: data.email }));
          localStorage.removeItem('apex_current_user');
        } else {
          localStorage.setItem('apex_current_user', JSON.stringify(currentUser));
          localStorage.removeItem('apex_regular_current_user');
        }
        
        // Load favorites from Supabase
        const { data: favsData, error: favsError } = await supabaseClient
          .from('user_favorites')
          .select('property_id')
          .eq('user_email', currentUser.email)
          .eq('is_premium', true);

        if (!favsError && favsData) {
          favoriteIds = favsData.map(item => item.property_id);
        } else {
          favoriteIds = [];
        }

        showNotification('success', 'Signing in...');
        setTimeout(() => {
          formLogin.reset();
          
          if (currentUser.has_paid) {
            showDashboard();
          } else {
            showPaymentGateway();
          }
        }, 1000);

      } catch (err) {
        console.error("Premium Login error:", err);
        showNotification('error', 'An unexpected error occurred.');
      }
    });
  }

  // Handle Register Submission
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      notification.style.display = 'none';

      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const confirm = document.getElementById('register-confirm').value;

      // Validations
      if (password.length < 6) {
        showNotification('error', 'Password must be at least 6 characters long.');
        return;
      }

      if (password !== confirm) {
        showNotification('error', 'Passwords do not match.');
        return;
      }

      if (typeof supabaseClient === 'undefined') {
        showNotification('error', 'Database connection unavailable.');
        return;
      }

      showNotification('success', 'Creating account...');

      try {
        const { data: existingUser, error: checkError } = await supabaseClient
          .from('premium_users')
          .select('email')
          .eq('email', email)
          .maybeSingle();

        if (checkError) {
          showNotification('error', 'Database error: ' + checkError.message);
          return;
        }

        if (existingUser) {
          showNotification('error', 'This email is already registered.');
          return;
        }

        // Create new account
        const { error: insertError } = await supabaseClient
          .from('premium_users')
          .insert({ name, email, password, has_paid: false });

        if (insertError) {
          showNotification('error', 'Registration failed: ' + insertError.message);
          return;
        }

        // Auto login user
        currentUser = { name, email, has_paid: false };
        localStorage.setItem('apex_current_user', JSON.stringify(currentUser));
        localStorage.removeItem('apex_regular_current_user'); // Clear regular session
        favoriteIds = []; // new account starts with zero favorites

        showNotification('success', 'Account created successfully! Redirecting...');
        setTimeout(() => {
          formRegister.reset();
          showPaymentGateway();
        }, 1200);

      } catch (err) {
        console.error("Premium registration error:", err);
        showNotification('error', 'An unexpected error occurred.');
      }
    });
  }

  function showNotification(type, message) {
    if (!notification) return;
    notification.textContent = message;
    notification.className = `form-notification ${type}`;
    notification.style.display = 'block';
  }
}

/**
 * Reveal Auth Gateway panels
 */
function showAuthGateway() {
  document.getElementById('auth-gateway-section').style.display = 'block';
  document.getElementById('payment-gateway-section').style.display = 'none';
  document.getElementById('premium-dashboard-section').style.display = 'none';
  document.getElementById('auth-logout-btn').style.display = 'none';
  if (typeof window.initAccountDropdown === 'function') {
    window.initAccountDropdown();
  }
}

/**
 * Reveal Payment Gateway Panel
 */
function showPaymentGateway() {
  document.getElementById('auth-gateway-section').style.display = 'none';
  document.getElementById('payment-gateway-section').style.display = 'block';
  document.getElementById('premium-dashboard-section').style.display = 'none';
  document.getElementById('auth-logout-btn').style.display = 'block'; // Allow logout from checkout screen
  if (typeof window.initAccountDropdown === 'function') {
    window.initAccountDropdown();
  }

  setupPaymentLogic();
}

/**
 * Handle UPI vs Credit Card toggles and confirming payments
 */
function setupPaymentLogic() {
  const tabUpi = document.getElementById('tab-payment-upi');
  const tabCard = document.getElementById('tab-payment-card');
  const upiSec = document.getElementById('payment-upi-section');
  const cardForm = document.getElementById('payment-card-form');
  const notification = document.getElementById('payment-notification');
  const upiConfirmBtn = document.getElementById('btn-pay-upi-confirm');

  if (!tabUpi || !tabCard) return;

  tabUpi.addEventListener('click', () => {
    tabUpi.classList.add('active');
    tabCard.classList.remove('active');
    upiSec.style.display = 'block';
    cardForm.style.display = 'none';
    notification.style.display = 'none';
  });

  tabCard.addEventListener('click', () => {
    tabCard.classList.add('active');
    tabUpi.classList.remove('active');
    cardForm.style.display = 'block';
    upiSec.style.display = 'none';
    notification.style.display = 'none';
  });

  // UPI Payment Confirmation
  if (upiConfirmBtn) {
    // Remove previous listener to avoid double binding
    const newBtn = upiConfirmBtn.cloneNode(true);
    upiConfirmBtn.parentNode.replaceChild(newBtn, upiConfirmBtn);

    newBtn.addEventListener('click', () => {
      notification.style.display = 'none';
      newBtn.disabled = true;
      newBtn.innerHTML = `<i data-feather="loader" class="shimmer-spin" style="animation: loadingShimmer 1s infinite linear; width: 18px; height: 18px; margin-right: 8px;"></i> Verifying UPI Transfer...`;
      feather.replace();

      setTimeout(async () => {
        // Save payment status in Supabase
        if (typeof supabaseClient !== 'undefined' && currentUser) {
          try {
            const { error } = await supabaseClient
              .from('premium_users')
              .update({ has_paid: true })
              .eq('email', currentUser.email);
            if (!error) {
              currentUser.has_paid = true;
              localStorage.setItem('apex_current_user', JSON.stringify(currentUser));
            } else {
              console.error("Error updating has_paid status in Supabase:", error);
            }
          } catch (err) {
            console.error("Unexpected error updating payment status:", err);
          }
        }
        showDashboard();
      }, 2000);
    });
  }

  // Card Payment Submission
  if (cardForm) {
    cardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      notification.style.display = 'none';

      const cardNum = document.getElementById('card-num').value.trim();
      const cardExp = document.getElementById('card-expiry').value.trim();
      const cardCvv = document.getElementById('card-cvv').value.trim();
      const submitBtn = cardForm.querySelector('button[type="submit"]');

      if (!cardNum || !cardExp || !cardCvv) {
        showNotification('error', 'All card fields are required.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-feather="loader" class="shimmer-spin" style="animation: loadingShimmer 1s infinite linear; width: 18px; height: 18px; margin-right: 8px;"></i> Secure Checkout processing...`;
      feather.replace();

      setTimeout(async () => {
        // Save payment status in Supabase
        if (typeof supabaseClient !== 'undefined' && currentUser) {
          try {
            const { error } = await supabaseClient
              .from('premium_users')
              .update({ has_paid: true })
              .eq('email', currentUser.email);
            if (!error) {
              currentUser.has_paid = true;
              localStorage.setItem('apex_current_user', JSON.stringify(currentUser));
            } else {
              console.error("Error updating has_paid status in Supabase:", error);
            }
          } catch (err) {
            console.error("Unexpected error updating payment status:", err);
          }
        }
        cardForm.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i data-feather="credit-card"></i> Pay ₹12.00 securely`;
        feather.replace();
        showDashboard();
      }, 2000);
    });
  }

  function showNotification(type, message) {
    if (!notification) return;
    notification.textContent = message;
    notification.className = `form-notification ${type}`;
    notification.style.display = 'block';
  }
}

/**
 * Reveal Dashboard and start rendering premium listings
 */
function showDashboard() {
  document.getElementById('auth-gateway-section').style.display = 'none';
  document.getElementById('payment-gateway-section').style.display = 'none';
  document.getElementById('premium-dashboard-section').style.display = 'block';
  document.getElementById('auth-logout-btn').style.display = 'block';

  // Customize welcome headline
  const welcomeHeading = document.getElementById('welcome-user-heading');
  if (welcomeHeading && currentUser) {
    welcomeHeading.innerHTML = `Welcome, <span>${currentUser.name}</span>!`;
  }

  if (typeof window.initAccountDropdown === 'function') {
    window.initAccountDropdown();
  }

  renderPremiumListings();
}

/**
 * Set up Grid filters (All vs Favorites Only)
 */
function setupDashboardFilters() {
  const btnAll = document.getElementById('filter-all-premium');
  const btnFav = document.getElementById('filter-favorites-premium');

  if (!btnAll || !btnFav) return;

  btnAll.addEventListener('click', () => {
    btnAll.classList.add('active');
    btnFav.classList.remove('active');
    currentFilter = 'all';
    renderPremiumListings();
  });

  btnFav.addEventListener('click', () => {
    btnFav.classList.add('active');
    btnAll.classList.remove('active');
    currentFilter = 'favorites';
    renderPremiumListings();
  });
}

/**
 * Render subscription premium properties to grid
 */
function renderPremiumListings() {
  const grid = document.getElementById('premium-listings-grid');
  if (!grid) return;

  // Filter listings based on current dashboard tab
  const filtered = premiumProperties.filter(item => {
    if (currentFilter === 'favorites') {
      return favoriteIds.includes(item.id);
    }
    return true;
  });

  grid.innerHTML = '';

  if (filtered.length === 0) {
    const emptyMsg = currentFilter === 'favorites' 
      ? 'You have not favorited any luxury properties yet. Tap the heart icons to save them.'
      : 'No premium properties available.';
      
    grid.innerHTML = `
      <div class="listings-not-found">
        <i data-feather="heart" style="width: 48px; height: 48px; margin-bottom: 1rem; color: var(--text-tertiary);"></i>
        <h3>Favorites list is empty.</h3>
        <p>${emptyMsg}</p>
      </div>
    `;
    feather.replace();
    return;
  }

  filtered.forEach(prop => {
    const formattedPrice = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(prop.price);

    const isFavorited = favoriteIds.includes(prop.id);
    
    // Heart details
    const heartFill = isFavorited ? 'var(--accent)' : 'none';
    const heartStroke = isFavorited ? 'var(--accent)' : 'var(--text-light)';

    const card = document.createElement('div');
    card.className = 'listing-card reveal active';
    card.innerHTML = `
      <div class="listing-img-container">
        <img src="${prop.image}" alt="${prop.title}" class="listing-img" loading="lazy">
        <div class="listing-badge-container">
          <span class="listing-badge badge-tag-hot">${prop.badge}</span>
        </div>
        
        <!-- Interactive Favorite Heart Toggle -->
        <button class="fav-heart-btn" data-id="${prop.id}" aria-label="Toggle favorite" 
          style="position: absolute; top: 1rem; right: 1rem; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radius-full); background: rgba(15, 22, 36, 0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: ${heartStroke}; transition: all var(--transition-fast); z-index: 10;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${heartFill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-heart">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>
      
      <div class="listing-details">
        <div class="listing-price-row">
          <span class="listing-price" style="color: var(--accent);">${formattedPrice}</span>
        </div>
        <h3 class="listing-title">${prop.title}</h3>
        <div class="listing-location">
          <i data-feather="map-pin" class="listing-location-icon"></i>
          <span>${prop.location}</span>
        </div>
        <div class="listing-specs">
          <div class="spec-item">
            <i data-feather="square" class="spec-icon"></i>
            <span>${prop.beds} Beds</span>
          </div>
          <div class="spec-item">
            <i data-feather="wind" class="spec-icon"></i>
            <span>${prop.baths} Baths</span>
          </div>
          <div class="spec-item">
            <i data-feather="maximize" class="spec-icon"></i>
            <span>${prop.area.toLocaleString()} sqft</span>
          </div>
        </div>
      </div>
    `;

    // Heart toggle action click listener
    const heartBtn = card.querySelector('.fav-heart-btn');
    heartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(prop.id, heartBtn);
    });

    grid.appendChild(card);
  });

  feather.replace();
}

/**
 * Handle favoriting / unfavoriting logic
 */
async function toggleFavorite(propertyId, buttonElement) {
  const index = favoriteIds.indexOf(propertyId);
  const svg = buttonElement.querySelector('svg');
  
  if (index === -1) {
    // Add to favorites
    favoriteIds.push(propertyId);
    svg.setAttribute('fill', 'var(--accent)');
    svg.setAttribute('stroke', 'var(--accent)');
    buttonElement.style.color = 'var(--accent)';
    
    if (typeof supabaseClient !== 'undefined' && currentUser) {
      try {
        const { error } = await supabaseClient
          .from('user_favorites')
          .insert({
            user_email: currentUser.email,
            property_id: propertyId,
            is_premium: true
          });
        if (error) console.error("Error adding premium favorite to Supabase:", error);
      } catch (err) {
        console.error("Unexpected error adding premium favorite:", err);
      }
    }
  } else {
    // Remove from favorites
    favoriteIds.splice(index, 1);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'var(--text-light)');
    buttonElement.style.color = 'var(--text-light)';
    
    if (typeof supabaseClient !== 'undefined' && currentUser) {
      try {
        const { error } = await supabaseClient
          .from('user_favorites')
          .delete()
          .eq('user_email', currentUser.email)
          .eq('property_id', propertyId)
          .eq('is_premium', true);
        if (error) console.error("Error removing premium favorite from Supabase:", error);
      } catch (err) {
        console.error("Unexpected error removing premium favorite:", err);
      }
    }
    
    // If we are currently on the Favorites tab, instantly remove card on toggle
    if (currentFilter === 'favorites') {
      setTimeout(() => {
        renderPremiumListings();
      }, 300);
    }
  }
}
