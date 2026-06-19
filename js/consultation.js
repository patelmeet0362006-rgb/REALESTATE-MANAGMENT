/* consultation.js - Booking form controller */

function getBookingDb() {
  return window.supabaseClient || null;
}

function getBookingUser() {
  try {
    const regVal = localStorage.getItem("apex_regular_current_user");
    const premVal = localStorage.getItem("apex_current_user");
    
    if (regVal) return JSON.parse(regVal);
    if (premVal) return JSON.parse(premVal);
    return null;
  } catch (e) {
    return null;
  }
}

function prefillBookingDetails() {
  const user = getBookingUser();
  if (user) {
    const nameEl = document.getElementById("booking-name");
    const emailEl = document.getElementById("booking-email");
    
    if (nameEl) {
      nameEl.value = user.name;
      nameEl.disabled = true;
    }
    
    if (emailEl) {
      emailEl.value = user.email;
      emailEl.disabled = true;
    }
  }
  
  // Default date to tomorrow
  const dateEl = document.getElementById("booking-date");
  if (dateEl) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateEl.value = tomorrow.toISOString().split('T')[0];
    dateEl.min = tomorrow.toISOString().split('T')[0];
  }
}

function initBookingForm() {
  prefillBookingDetails();
  
  const form = document.getElementById("consultation-booking-form");
  const notification = document.getElementById("consultation-status-msg");
  
  if (!form || !notification) return;
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    notification.style.display = "none";
    notification.className = "form-notification";
    
    const name = document.getElementById("booking-name").value.trim();
    const email = document.getElementById("booking-email").value.trim().toLowerCase();
    const phone = document.getElementById("booking-phone").value.trim();
    const interestType = document.getElementById("booking-interest").value;
    const dateVal = document.getElementById("booking-date").value;
    const timeVal = document.getElementById("booking-time").value;
    const message = document.getElementById("booking-message").value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');
    
    // Check validation
    if (!name) {
      showNotice("error", "Please provide your full name.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showNotice("error", "Please provide a valid email address.");
      return;
    }
    if (!phone) {
      showNotice("error", "Please provide a phone number.");
      return;
    }
    if (!dateVal) {
      showNotice("error", "Please select a preferred date.");
      return;
    }
    
    const client = getBookingDb();
    if (!client) {
      showNotice("error", "Database connection unavailable.");
      return;
    }
    
    // Prepare message with embedded date and time slot details to ensure compatibility with standard schema
    const timeLabels = {
      morning: "Morning (9:00 AM - 12:00 PM)",
      afternoon: "Afternoon (12:00 PM - 4:00 PM)",
      evening: "Evening (4:00 PM - 7:00 PM)"
    };
    
    const timeLabel = timeLabels[timeVal] || timeVal;
    const dateFormatted = new Date(dateVal).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    
    const formattedMessage = `[Requested Slot: ${dateFormatted} | ${timeLabel}]\n\n${message || "No additional comments."}`;
    
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<i data-feather="loader" class="shimmer-spin" style="animation: loadingShimmer 1s infinite linear; width: 18px; height: 18px; margin-right: 8px;"></i> Booking consultation...`;
    if (typeof feather !== "undefined") feather.replace();
    
    try {
      const { error } = await client
        .from("consultations")
        .insert({
          name,
          email,
          phone,
          interest_type: interestType,
          message: formattedMessage
        });
        
      if (error) throw error;
      
      const successMsg = `Thank you, ${name}! Your consultation was successfully scheduled for ${dateFormatted} (${timeLabel}). You can view this booking under your Dashboard.`;
      
      showNotice("success", successMsg);
      form.reset();
      prefillBookingDetails();
      
      // If logged in, add button/link to Dashboard
      const user = getBookingUser();
      if (user) {
        const linkBlock = document.createElement("div");
        linkBlock.style.marginTop = "1.5rem";
        linkBlock.style.textAlign = "center";
        linkBlock.innerHTML = `
          <a href="account.html" class="btn btn-outline btn-sm">
            <i data-feather="user"></i> Go to My Account Dashboard
          </a>
        `;
        notification.appendChild(linkBlock);
        if (typeof feather !== "undefined") feather.replace();
      }
      
    } catch (err) {
      showNotice("error", `Could not schedule consultation: ${err.message || "Database request failed."}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      if (typeof feather !== "undefined") feather.replace();
    }
  });
  
  function showNotice(type, msg) {
    notification.textContent = msg;
    notification.className = `form-notification ${type}`;
    notification.style.display = "block";
    notification.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBookingForm);
} else {
  initBookingForm();
}
