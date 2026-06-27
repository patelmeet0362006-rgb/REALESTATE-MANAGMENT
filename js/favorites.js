/* favorites.js - Saved regular property list */

const REGULAR_USER_KEY = "apex_regular_current_user";

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

let currentUser = null;
let favoriteIds = [];

function favDb() {
  return window.supabaseClient || null;
}

function favById(id) {
  return document.getElementById(id);
}

function favMessage(error) {
  if (!error) return "Something went wrong.";
  return error.message || error.error_description || error.error || "Database request failed.";
}

function readRegularSession() {
  try {
    const value = localStorage.getItem(REGULAR_USER_KEY);
    const user = value ? JSON.parse(value) : null;
    return user && user.email ? user : null;
  } catch (error) {
    localStorage.removeItem(REGULAR_USER_KEY);
    return null;
  }
}

function updateAccountLabel() {
  const label = favById("account-btn-text");
  if (!label) return;
  label.textContent = currentUser && currentUser.name ? currentUser.name.split(" ")[0] : "My Account";
}

function showNotice(type, message) {
  const notice = favById("favorites-notification");
  if (!notice) return;
  notice.textContent = message;
  notice.className = `form-notification ${type}`;
  notice.style.display = "block";
}

function redirectToAccount() {
  window.location.href = "account.html?redirect=favorites.html";
}

async function loadFavorites() {
  const client = favDb();
  if (!client) throw new Error("Supabase is not connected.");

  const { data, error } = await client
    .from("user_favorites")
    .select("property_id")
    .eq("user_email", currentUser.email);

  if (error) throw error;

  favoriteIds = (data || [])
    .map(item => Number(item.property_id))
    .filter(Number.isFinite);
}

function renderFavorites() {
  const grid = favById("favorites-listings-grid");
  const subtitle = favById("favorites-dashboard-subtitle");
  if (!grid) return;

  if (subtitle && currentUser) {
    subtitle.textContent = `Logged in as ${currentUser.email}.`;
  }

  const savedProperties = REGULAR_PROPERTIES.filter(property => favoriteIds.includes(property.id));

  if (savedProperties.length === 0) {
    grid.innerHTML = `
      <div class="listings-not-found" style="grid-column: 1 / -1;">
        <i data-feather="heart" style="width: 48px; height: 48px; margin-bottom: 1rem; color: var(--text-tertiary);"></i>
        <h3>No property saved yet.</h3>
        <p>Your favorite property list is empty. Add properties from the homepage heart button.</p>
        <a href="index.html#properties" class="btn btn-primary" style="margin-top: 1.25rem;">Browse Properties</a>
      </div>
    `;
    safeReplaceFeather();
    return;
  }

  grid.innerHTML = savedProperties.map(propertyCard).join("");
  grid.querySelectorAll("[data-remove-favorite]").forEach(button => {
    button.addEventListener("click", () => removeFavorite(Number(button.dataset.removeFavorite)));
  });

  safeReplaceFeather();
}

function propertyCard(property) {
  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(property.price);
  const price = property.purpose === "rent" ? `${formattedPrice}/mo` : formattedPrice;
  const badge = property.badge || "Saved";
  const badgeClass = property.badge === "new" ? "badge-tag-new" : "badge-tag-hot";

  return `
    <article class="listing-card reveal active">
      <div class="listing-img-container">
        <img src="${property.image}" alt="${property.title}" class="listing-img" loading="lazy">
        <div class="listing-badge-container">
          <span class="listing-badge ${badgeClass}">${badge}</span>
        </div>
        <span class="badge-purpose">${property.purpose === "buy" ? "For Sale" : "For Rent"}</span>
        <button class="fav-heart-btn" type="button" data-remove-favorite="${property.id}" aria-label="Remove saved property" style="position: absolute; top: 1rem; right: 1rem; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--radius-full); background: rgba(15, 22, 36, 0.45); color: var(--accent); z-index: 10;">
          <i data-feather="heart" style="fill: currentColor;"></i>
        </button>
      </div>
      <div class="listing-details">
        <div class="listing-price-row">
          <span class="listing-price">${price}</span>
        </div>
        <h3 class="listing-title">${property.title}</h3>
        <div class="listing-location">
          <i data-feather="map-pin" class="listing-location-icon"></i>
          <span>${property.location}</span>
        </div>
        <div class="listing-specs">
          <div class="spec-item"><i data-feather="square" class="spec-icon"></i><span>${property.beds} Beds</span></div>
          <div class="spec-item"><i data-feather="wind" class="spec-icon"></i><span>${property.baths} Baths</span></div>
          <div class="spec-item"><i data-feather="maximize" class="spec-icon"></i><span>${property.area.toLocaleString()} sqft</span></div>
        </div>
      </div>
    </article>
  `;
}

async function removeFavorite(propertyId) {
  try {
    const { error } = await favDb()
      .from("user_favorites")
      .delete()
      .eq("user_email", currentUser.email)
      .eq("property_id", propertyId);

    if (error) throw error;

    favoriteIds = favoriteIds.filter(id => id !== propertyId);
    renderFavorites();
  } catch (error) {
    showNotice("error", `Could not remove favorite: ${favMessage(error)}`);
  }
}

function bindFavoritesPage() {
  favById("auth-logout-btn")?.addEventListener("click", () => {
    localStorage.removeItem("apex_regular_current_user");
    localStorage.removeItem("apex_current_user");
    redirectToAccount();
  });
}

async function startFavoritesPage() {
  bindFavoritesPage();
  currentUser = readRegularSession();
  updateAccountLabel();

  if (!currentUser) {
    redirectToAccount();
    return;
  }

  try {
    await loadFavorites();
    renderFavorites();
  } catch (error) {
    showNotice("error", `Could not load favorites: ${favMessage(error)}`);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startFavoritesPage);
} else {
  startFavoritesPage();
}
