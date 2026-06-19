/* contact.js - Testimonial slider and contact form validation */

function initContactApp() {
  try {
    initTestimonials();
    initContactForm();
  } catch (err) {
    console.error("Initialization error in contact component:", err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContactApp);
} else {
  initContactApp();
}

/**
 * Testimonial Slider / Carousel Logic
 */
function initTestimonials() {
  const track = document.querySelector('.testimonial-track');
  const slides = Array.from(document.querySelectorAll('.testimonial-slide'));
  const nextBtn = document.querySelector('.carousel-nav-btn-next');
  const prevBtn = document.querySelector('.carousel-nav-btn-prev');
  const dotsContainer = document.querySelector('.carousel-dots');

  if (!track || slides.length === 0) return;

  let currentIndex = 0;
  let autoplayTimer = null;

  // Create dot indicators
  slides.forEach((_, idx) => {
    const dot = document.createElement('button');
    dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
    dot.setAttribute('aria-label', `Go to testimonial slide ${idx + 1}`);
    dotsContainer.appendChild(dot);
  });

  const dots = Array.from(document.querySelectorAll('.carousel-dot'));

  // Move to a specific slide
  const moveToSlide = (index) => {
    if (index < 0) {
      currentIndex = slides.length - 1;
    } else if (index >= slides.length) {
      currentIndex = 0;
    } else {
      currentIndex = index;
    }

    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    
    // Update dots
    dots.forEach((dot, idx) => {
      if (idx === currentIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  };

  // Nav buttons event listeners
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      moveToSlide(currentIndex + 1);
      resetAutoplay();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      moveToSlide(currentIndex - 1);
      resetAutoplay();
    });
  }

  // Dots click events
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      moveToSlide(idx);
      resetAutoplay();
    });
  });

  // Autoplay function
  const startAutoplay = () => {
    autoplayTimer = setInterval(() => {
      moveToSlide(currentIndex + 1);
    }, 6000); // Shift every 6 seconds
  };

  const resetAutoplay = () => {
    clearInterval(autoplayTimer);
    startAutoplay();
  };

  // Start autoplay
  startAutoplay();
}

/**
 * Lead Generation Booking & Contact Form Validation
 */
function initContactForm() {
  const contactForm = document.getElementById('agent-contact-form');
  const notification = document.getElementById('form-status-msg');

  if (!contactForm) return;

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset notification status
    notification.style.display = 'none';
    notification.className = 'form-notification';

    // Grab form elements
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const phoneInput = document.getElementById('contact-phone');
    const messageInput = document.getElementById('contact-message');
    const submitBtn = contactForm.querySelector('button[type="submit"]');

    // Validation checks
    let isValid = true;
    let errorMsg = '';

    if (!nameInput.value.trim()) {
      isValid = false;
      errorMsg = 'Please provide your full name.';
    } else if (!validateEmail(emailInput.value.trim())) {
      isValid = false;
      errorMsg = 'Please enter a valid email address.';
    } else if (!phoneInput.value.trim()) {
      isValid = false;
      errorMsg = 'Please provide a contact phone number.';
    } else if (!messageInput.value.trim()) {
      isValid = false;
      errorMsg = 'Please enter your message details.';
    }

    if (!isValid) {
      showNotification('error', errorMsg);
      return;
    }

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i data-feather="loader" class="shimmer-spin" style="animation: loadingShimmer 1s infinite linear; width: 18px; height: 18px; margin-right: 8px;"></i> Sending Message...`;
    
    // Check if feather is defined, if so replace elements
    if (typeof feather !== 'undefined') {
      feather.replace();
    }

    try {
      const name = nameInput.value.trim();
      const email = emailInput.value.trim().toLowerCase();
      const phone = phoneInput.value.trim();
      const interestType = document.getElementById('contact-interest-type').value;
      const message = messageInput.value.trim();

      if (typeof supabaseClient === 'undefined') {
        throw new Error('Supabase is not connected.');
      }

      const { error } = await supabaseClient
        .from('consultations')
        .insert({
          name,
          email,
          phone,
          interest_type: interestType,
          message
        });

      if (error) throw error;

      showNotification('success', `Thank you, ${name}! Your consultation request was saved. We will call you shortly.`);
      contactForm.reset();
    } catch (error) {
      showNotification('error', `Could not save consultation: ${getContactErrorMessage(error)}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
    }
  });

  function showNotification(type, message) {
    notification.textContent = message;
    notification.classList.add(type);
    notification.style.display = 'block';
    
    // Scroll slightly to focus on the message
    notification.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  }

  function getContactErrorMessage(error) {
    if (!error) return 'Database request failed.';
    return error.message || error.error_description || error.error || 'Database request failed.';
  }
}
