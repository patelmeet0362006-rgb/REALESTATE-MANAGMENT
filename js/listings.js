/* listings.js - Property listings dataset and filtering engine */

// Mock database of luxury listings
const listingsData = [
  {
    id: 1,
    title: "The Grand Zenith Villa",
    type: "villa",
    purpose: "buy",
    price: 48500000,
    location: "Bandra West, Mumbai, Maharashtra",
    beds: 5,
    baths: 6,
    area: 6200,
    image: "images/listing-1.png",
    badge: "new"
  },
  {
    id: 2,
    title: "Metropolitan Sky Penthouse",
    type: "penthouse",
    purpose: "buy",
    price: 32000000,
    location: "Chanakyapuri, New Delhi, Delhi",
    beds: 3,
    baths: 3.5,
    area: 3400,
    image: "images/listing-2.png",
    badge: "hot"
  },
  {
    id: 3,
    title: "Whispering Pines Sanctuary",
    type: "villa",
    purpose: "buy",
    price: 21500000,
    location: "Koregaon Park, Pune, Maharashtra",
    beds: 4,
    baths: 4.5,
    area: 4100,
    image: "images/listing-3.png",
    badge: "new"
  },
  {
    id: 4,
    title: "Neo-Minimalist Smart Villa",
    type: "villa",
    purpose: "buy",
    price: 39000000,
    location: "GIFT City, Gandhinagar, Gujarat",
    beds: 5,
    baths: 5,
    area: 5800,
    image: "images/listing-4.png",
    badge: "hot"
  },
  {
    id: 5,
    title: "Serene Waterfront Haven",
    type: "apartment",
    purpose: "buy",
    price: 14500000,
    location: "Marine Drive, Mumbai, Maharashtra",
    beds: 2,
    baths: 2,
    area: 1800,
    image: "images/listing-1.png",
    badge: ""
  },
  {
    id: 6,
    title: "The Obsidian Penthouse",
    type: "penthouse",
    purpose: "buy",
    price: 28000000,
    location: "Vasant Kunj, New Delhi, Delhi",
    beds: 3,
    baths: 3,
    area: 2900,
    image: "images/listing-2.png",
    badge: ""
  },
  {
    id: 7,
    title: "GIFT Towers Executive Suite",
    type: "apartment",
    purpose: "rent",
    price: 65000, // Monthly Rent in INR
    location: "GIFT City, Gandhinagar, Gujarat",
    beds: 2,
    baths: 2,
    area: 1150,
    image: "images/listing-3.png",
    badge: "new"
  },
  {
    id: 8,
    title: "Lodi Colony Regency Suite",
    type: "apartment",
    purpose: "rent",
    price: 82000, // Monthly Rent in INR
    location: "Lodi Colony, New Delhi, Delhi",
    beds: 1,
    baths: 1.5,
    area: 950,
    image: "images/listing-4.png",
    badge: "hot"
  }
];

// State variables for active filters
let activeFilters = {
  purpose: 'buy', // 'buy' or 'rent'
  type: 'all',    // 'all', 'villa', 'penthouse', 'apartment'
  searchQuery: '',
  maxPrice: 100000000
};

// Global cache for favorited property IDs (synced from Supabase)
let dbFavorites = [];
const REGULAR_USER_STORAGE_KEY = 'apex_regular_current_user';

function getListingDbErrorMessage(error) {
  if (!error) return 'Database request failed.';
  const rawMessage = error.message || error.msg || error.error_description || error.error || 'Database request failed.';
  const code = error.code || error.statusCode || error.status;
  return code ? `${rawMessage} (${code})` : rawMessage;
}

function getActiveRegularUser() {
  const savedUser = localStorage.getItem(REGULAR_USER_STORAGE_KEY) || localStorage.getItem('apex_current_user');

  try {
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    localStorage.removeItem(REGULAR_USER_STORAGE_KEY);
    localStorage.removeItem('apex_current_user');
    return null;
  }
}

function initListingsPortal() {
  try {
    initListings();
  } catch (err) {
    console.error("Initialization error in listings engine:", err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initListingsPortal);
} else {
  initListingsPortal();
}

async function initListings() {
  const listingsGrid = document.querySelector('.listings-grid');
  if (!listingsGrid) return;

  // Load favorites from Supabase if logged in. Guests are prompted to sign in.
  const activeRegularUser = getActiveRegularUser();
  if (activeRegularUser && typeof supabaseClient !== 'undefined') {
    try {
      const email = activeRegularUser.email;
      const { data, error } = await supabaseClient
        .from('user_favorites')
        .select('property_id')
        .eq('user_email', email)
        .eq('is_premium', false);
      if (!error && data) {
        dbFavorites = data.map(item => Number(item.property_id)).filter(Number.isFinite);
      } else {
        dbFavorites = [];
      }
    } catch (e) {
      console.error("Error loading favorites from Supabase:", e);
      dbFavorites = [];
    }
  } else {
    dbFavorites = [];
  }

  // Render properties initial load
  renderListings(listingsData);

  // Set up price range slider label syncing
  setupPriceSliders();

  // Set up event listeners for filters
  setupFilters();

  // Set up Hero search bar form submit
  setupHeroSearch();
}

/**
 * Renders filtered listings cards into the grid
 */
function renderListings(properties) {
  const listingsGrid = document.querySelector('.listings-grid');
  if (!listingsGrid) return;

  // Filter listings based on global state
  const filtered = properties.filter(item => {
    // 1. Purpose filter (Buy/Rent)
    if (item.purpose !== activeFilters.purpose) return false;

    // 2. Type filter
    if (activeFilters.type !== 'all' && item.type !== activeFilters.type) return false;

    // 3. Price limit
    if (item.price > activeFilters.maxPrice) return false;

    // 4. Keyword search (Title/Location)
    if (activeFilters.searchQuery) {
      const query = activeFilters.searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchLoc = item.location.toLowerCase().includes(query);
      if (!matchTitle && !matchLoc) return false;
    }

    return true;
  });

  // Clear existing items
  listingsGrid.innerHTML = '';

  if (filtered.length === 0) {
    listingsGrid.innerHTML = `
      <div class="listings-not-found">
        <i data-feather="frown" style="width: 48px; height: 48px; margin-bottom: 1rem; color: var(--text-tertiary);"></i>
        <h3>No properties match your current filters.</h3>
        <p>Try broadening your price range or adjusting your keyword search.</p>
      </div>
    `;
    feather.replace();
    return;
  }

  // Generate cards
  filtered.forEach(prop => {
    const isRent = prop.purpose === 'rent';
    const formattedPrice = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(prop.price);

    const priceDisplay = isRent ? `${formattedPrice}/mo` : formattedPrice;

    // Badge markup
    let badgeHtml = '';
    if (prop.badge) {
      const badgeClass = prop.badge === 'new' ? 'badge-tag-new' : 'badge-tag-hot';
      badgeHtml = `<span class="listing-badge ${badgeClass}">${prop.badge}</span>`;
    }

    // Check if favorited (synced state)
    const isFavorited = dbFavorites.includes(prop.id);
    const heartFill = isFavorited ? 'var(--accent)' : 'none';
    const heartStroke = isFavorited ? 'var(--accent)' : 'var(--text-light)';

    const card = document.createElement('div');
    card.className = 'listing-card reveal active'; // Reveal class triggers animation if scrolled
    card.innerHTML = `
      <div class="listing-img-container">
        <img src="${prop.image}" alt="${prop.title}" class="listing-img" loading="lazy">
        <div class="listing-badge-container">
          ${badgeHtml}
        </div>
        <span class="badge-purpose">${prop.purpose === 'buy' ? 'For Sale' : 'For Rent'}</span>
        
        <!-- Regular Customer Heart Toggle -->
        <button class="fav-heart-btn" data-id="${prop.id}" aria-label="Toggle favorite" 
          style="position: absolute; top: 1rem; right: 1rem; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radius-full); background: rgba(15, 22, 36, 0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: ${heartStroke}; transition: all var(--transition-fast); z-index: 10;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${heartFill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-heart">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
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
      toggleRegularFavorite(prop.id, heartBtn);
    });

    listingsGrid.appendChild(card);
  });

  feather.replace();
}

/**
 * Configure ranges sliders to show dynamic pricing values
 */
function setupPriceSliders() {
  // Hero price slider
  const heroSlider = document.getElementById('hero-price-slider');
  const heroPriceVal = document.getElementById('hero-price-val');
  if (heroSlider && heroPriceVal) {
    heroSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      const purpose = activeFilters.purpose;
      const maxVal = parseInt(heroSlider.max);
      
      if (val === maxVal) {
        heroPriceVal.textContent = 'Any Price';
      } else if (purpose === 'rent') {
        heroPriceVal.textContent = `₹${(val / 1000).toFixed(0)}k/mo`;
      } else {
        if (val >= 10000000) {
          heroPriceVal.textContent = `₹${(val / 10000000).toFixed(2)} Cr`;
        } else {
          heroPriceVal.textContent = `₹${(val / 100000).toFixed(0)} Lakh`;
        }
      }
    });
  }
}

/**
 * Event handling filters in listings section
 */
function setupFilters() {
  // 1. Property Type Filters (All, Villa, etc.)
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      activeFilters.type = e.target.getAttribute('data-filter');
      renderListings(listingsData);
    });
  });
}

/**
 * Hero Search Console form submission parser
 */
function setupHeroSearch() {
  // Buy/Rent/Sell Tabs
  const searchTabs = document.querySelectorAll('.search-tab');
  const heroSlider = document.getElementById('hero-price-slider');
  const heroPriceVal = document.getElementById('hero-price-val');

  searchTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      searchTabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');

      const purpose = e.target.getAttribute('data-tab');
      activeFilters.purpose = purpose;

      // Adjust price slider defaults based on Buy vs Rent
      if (purpose === 'rent') {
        heroSlider.min = 10000;
        heroSlider.max = 200000;
        heroSlider.step = 5000;
        heroSlider.value = 200000;
        heroPriceVal.textContent = 'Any Price';
        activeFilters.maxPrice = 200000;
      } else {
        heroSlider.min = 5000000;
        heroSlider.max = 100000000;
        heroSlider.step = 2500000;
        heroSlider.value = 100000000;
        heroPriceVal.textContent = 'Any Price';
        activeFilters.maxPrice = 100000000;
      }

      renderListings(listingsData);
    });
  });

  // Action on Clicking Search button
  const searchForm = document.querySelector('.search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const locInput = document.getElementById('hero-location-input');
      const typeSelect = document.getElementById('hero-type-select');
      const priceSlider = document.getElementById('hero-price-slider');

      if (locInput) activeFilters.searchQuery = locInput.value.trim();
      if (typeSelect) activeFilters.type = typeSelect.value;
      if (priceSlider) activeFilters.maxPrice = parseInt(priceSlider.value);

      // Scroll smoothly to properties section
      const listingsSection = document.getElementById('properties');
      if (listingsSection) {
        listingsSection.scrollIntoView({ behavior: 'smooth' });
      }

      // Sync property category filters UI with the type chosen in hero search
      const filterBtns = document.querySelectorAll('.filter-btn');
      filterBtns.forEach(btn => {
        if (btn.getAttribute('data-filter') === activeFilters.type) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      renderListings(listingsData);
    });
  }
}

/**
 * Toggles a property in the regular customer's favorites database
 */
async function toggleRegularFavorite(propertyId, buttonElement) {
  const activeRegularUser = getActiveRegularUser();
  const svg = buttonElement.querySelector('svg');
  
  if (!activeRegularUser) {
    alert('Please log in or register from My Account > My Favorite Property List to save properties.');
    window.location.href = 'account.html?redirect=index.html%23properties';
    return;
  }
  
  const email = activeRegularUser.email;
  const index = dbFavorites.indexOf(propertyId);

  if (typeof supabaseClient === 'undefined') {
    alert('Supabase is not connected. Please try again after the page finishes loading.');
    return;
  }
  
  if (index === -1) {
    try {
      const { error } = await supabaseClient
        .from('user_favorites')
        .insert({
          user_email: email,
          property_id: propertyId,
          is_premium: false
        });
      if (error) {
        console.error("Error adding favorite to Supabase:", error);
        alert(`Could not save favorite: ${getListingDbErrorMessage(error)}`);
        return;
      }

      dbFavorites.push(propertyId);
      svg.setAttribute('fill', 'var(--accent)');
      svg.setAttribute('stroke', 'var(--accent)');
      buttonElement.style.color = 'var(--accent)';
    } catch (error) {
      console.error("Unexpected error adding favorite to Supabase:", error);
      alert(`Could not save favorite: ${getListingDbErrorMessage(error)}`);
    }
  } else {
    try {
      const { error } = await supabaseClient
        .from('user_favorites')
        .delete()
        .eq('user_email', email)
        .eq('property_id', propertyId)
        .eq('is_premium', false);
      if (error) {
        console.error("Error removing favorite from Supabase:", error);
        alert(`Could not remove favorite: ${getListingDbErrorMessage(error)}`);
        return;
      }

      dbFavorites.splice(index, 1);
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'var(--text-light)');
      buttonElement.style.color = 'var(--text-light)';
    } catch (error) {
      console.error("Unexpected error removing favorite from Supabase:", error);
      alert(`Could not remove favorite: ${getListingDbErrorMessage(error)}`);
    }
  }
}
