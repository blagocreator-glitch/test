// State
let phoneRevealed = false;
let chatOpen = false;
let lastFocusedElement = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const currentYear = document.getElementById('currentYear');
  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }
  initScrollReveal();
  initLazyLoad();
  loadSavedTheme();
  initScrollSpy();

  // Hide loading screen
  const loadingDelay = window.__smetaProPage ? 0 : 1000;
  setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  }, loadingDelay);
});

// Theme toggle
function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function loadSavedTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
}

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    .filter(el => !el.hasAttribute('hidden') && el.offsetParent !== null);
}

function trapFocus(event, container) {
  if (event.key !== 'Tab') return;
  const focusable = getFocusableElements(container);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

// Phone toggle
function togglePhone() {
  const display = document.getElementById('phoneDisplay');

  if (!phoneRevealed) {
    display.textContent = '+7 (985) 123-45-32';
    display.classList.add('text-brand-600');
    phoneRevealed = true;
  } else {
    window.location.href = 'tel:+79851234532';
  }
}

// Mobile menu
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn = document.getElementById('mobileMenuBtn');
  const isOpen = menu.classList.contains('translate-x-0');

  if (isOpen) {
    menu.classList.remove('translate-x-0');
    menu.classList.add('translate-x-full');
    btn.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocusedElement) lastFocusedElement.focus();
  } else {
    lastFocusedElement = document.activeElement;
    menu.classList.remove('translate-x-full');
    menu.classList.add('translate-x-0');
    btn.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const [firstFocusable] = getFocusableElements(menu);
    if (firstFocusable) firstFocusable.focus();
  }
}

// Handle mobile nav clicks
function handleMobileNavClick(event, sectionId) {
  event.preventDefault();
  toggleMobileMenu();
  setTimeout(() => {
    scrollToSection(sectionId);
  }, 300);
}

// Bottom Navigation Handler
function handleBottomNavClick(event, sectionId) {
  event.preventDefault();

  // Update active state
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.remove('active');
  });
  event.currentTarget.classList.add('active');

  // Scroll to section
  scrollToSection(sectionId);
}

function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId);
  if (element) {
    const offset = 80;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}

// Scroll spy for bottom nav
function initScrollSpy() {
  const sections = ['services', 'calculator', 'portfolio', 'process', 'about', 'reviews', 'cta'];
  const observerOptions = {
    root: null,
    rootMargin: '-50% 0px -50% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
          item.classList.remove('active');
          if (item.getAttribute('data-section') === id) {
            item.classList.add('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(id => {
    const element = document.getElementById(id);
    if (element) observer.observe(element);
  });
}

// Modal
function openModal(service = '') {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');

  if (service) {
    document.getElementById('formService').value = service;
  }

  lastFocusedElement = document.activeElement;
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    content.classList.remove('scale-95', 'opacity-0');
    content.classList.add('scale-100', 'opacity-100');
    document.getElementById('formName')?.focus();
  }, 10);
}

function openModalWithCalc() {
  const area = document.getElementById('areaRange').value;
  const total = document.getElementById('totalPrice').textContent;
  document.getElementById('formCalcData').value = `Площадь: ${area}м², Сумма: ${total}`;
  openModal();
}

function closeModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');

  content.classList.remove('scale-100', 'opacity-100');
  content.classList.add('scale-95', 'opacity-0');

  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
    if (lastFocusedElement) lastFocusedElement.focus();
  }, 300);
}

// Portfolio filter
function filterPortfolio(category) {
  document.querySelectorAll('.portfolio-filter').forEach(btn => {
    const isActive = btn.getAttribute('data-filter') === category;
    btn.classList.toggle('bg-brand-500', isActive);
    btn.classList.toggle('text-white', isActive);
    btn.classList.toggle('bg-bg-secondary', !isActive);
    btn.setAttribute('aria-pressed', isActive);
  });

  document.querySelectorAll('.portfolio-item').forEach(item => {
    const show = category === 'all' || item.getAttribute('data-category') === category;
    item.style.display = show ? 'block' : 'none';
    if (show) {
      item.classList.add('animate-fade-in');
    }
  });
}

// Lightbox
function openLightbox(element) {
  const img = element.querySelector('img');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');

  lastFocusedElement = document.activeElement;
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
  document.getElementById('lightboxCloseBtn')?.focus();
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';
  if (lastFocusedElement) lastFocusedElement.focus();
}

function handlePortfolioKey(event, element) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openLightbox(element);
  }
}

// Chat
function toggleChat() {
  const chat = document.getElementById('chatWindow');
  chatOpen = !chatOpen;
  chat.classList.toggle('hidden', !chatOpen);
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');
  const text = input.value.trim();

  if (!text) return;

  // User message
  const userMsg = document.createElement('div');
  userMsg.className = 'bg-brand-500 text-white p-3 rounded-xl rounded-tr-none text-sm ml-auto max-w-[80%]';
  userMsg.textContent = text;
  messages.appendChild(userMsg);

  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  // Bot response simulation
  setTimeout(() => {
    const botMsg = document.createElement('div');
    botMsg.className = 'bg-white dark:bg-dark-surface p-3 rounded-xl rounded-tl-none text-sm shadow-sm max-w-[80%]';

    const responses = {
      'цена': 'Цена зависит от площади и типа ремонта. Используйте калькулятор на сайте или оставьте заявку для точного расчета.',
      'срок': 'Средний срок ремонта 2-3 месяца. Точнее скажем после осмотра.',
      'гарантия': 'Мы даем гарантию до 3 лет на все виды работ.',
      'замер': 'Выезд замерщика бесплатный в пределах Москвы.'
    };

    let response = 'Спасибо за вопрос! Оставьте номер телефона, и наш специалист подробно проконсультирует вас.';

    for (const key in responses) {
      if (text.toLowerCase().includes(key)) {
        response = responses[key];
        break;
      }
    }

    botMsg.textContent = response;
    messages.appendChild(botMsg);
    messages.scrollTop = messages.scrollHeight;
  }, 1000);
}

// Form submission
document.getElementById('contactForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  // Honeypot
  if (this.querySelector('input[name="website"]').value) return;

  // Rate limit
  const lastSubmit = localStorage.getItem('lastSubmit');
  if (lastSubmit && Date.now() - parseInt(lastSubmit) < 60000) {
    showNotification('error');
    return;
  }

  const btn = document.getElementById('submitBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
  btn.disabled = true;

  const formData = {
    name: document.getElementById('formName').value.trim(),
    phone: document.getElementById('formPhone').value.trim(),
    service: document.getElementById('formService').value,
    calcData: document.getElementById('formCalcData').value,
    date: new Date().toLocaleString('ru-RU')
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('/send-mail.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      localStorage.setItem('lastSubmit', Date.now().toString());
      closeModal();
      showNotification('success');
      this.reset();
    } else {
      throw new Error('Server error');
    }
  } catch (error) {
    console.error('Form error:', error);
    showNotification('error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

function showNotification(type) {
  const notif = type === 'success' ? document.getElementById('notification') : document.getElementById('errorNotification');
  notif.classList.remove('translate-y-20', 'opacity-0');
  setTimeout(() => {
    notif.classList.add('translate-y-20', 'opacity-0');
  }, 5000);
}

const detailedSidePanelsState = {
  rooms: false,
  summary: false,
  roomsScroll: true,
  summaryScroll: true,
  summaryPinned: true
};

function applyDetailedSidePanelsState() {
  const layout = document.getElementById('detailedCalcLayout');
  if (!layout) return;

  layout.classList.toggle('rooms-collapsed', detailedSidePanelsState.rooms);
  layout.classList.toggle('summary-collapsed', detailedSidePanelsState.summary);

  const roomsToggle = document.getElementById('roomsSideToggle');
  const summaryToggle = document.getElementById('summarySideToggle');
  const roomsCard = document.getElementById('roomsSideCard');
  const summaryCard = document.getElementById('summarySideCard');
  const roomsScrollToggle = document.getElementById('roomsScrollToggle');
  const summaryScrollToggle = document.getElementById('summaryScrollToggle');
  const summaryPinToggle = document.getElementById('summaryPinToggle');
  const roomsIcon = roomsToggle?.querySelector('i');
  const summaryIcon = summaryToggle?.querySelector('i');

  if (roomsToggle) {
    roomsToggle.setAttribute('aria-expanded', String(!detailedSidePanelsState.rooms));
    roomsToggle.setAttribute('aria-label', detailedSidePanelsState.rooms ? 'Развернуть раздел Помещения' : 'Свернуть раздел Помещения');
  }
  if (roomsIcon) {
    roomsIcon.className = detailedSidePanelsState.rooms ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
  }

  if (summaryToggle) {
    summaryToggle.setAttribute('aria-expanded', String(!detailedSidePanelsState.summary));
    summaryToggle.setAttribute('aria-label', detailedSidePanelsState.summary ? 'Развернуть раздел Итого' : 'Свернуть раздел Итого');
  }
  if (summaryIcon) {
    summaryIcon.className = detailedSidePanelsState.summary ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
  }

  roomsCard?.classList.toggle('side-scroll-off', !detailedSidePanelsState.roomsScroll);
  summaryCard?.classList.toggle('side-scroll-off', !detailedSidePanelsState.summaryScroll);
  summaryCard?.classList.toggle('summary-pin-off', !detailedSidePanelsState.summaryPinned);
  if (summaryCard) {
    summaryCard.classList.toggle('sticky', detailedSidePanelsState.summaryPinned);
    summaryCard.classList.toggle('top-24', detailedSidePanelsState.summaryPinned);
  }

  updateDetailedPanelToolButton(
    roomsScrollToggle,
    detailedSidePanelsState.roomsScroll,
    'Выключить скроллинг панели Помещения',
    'Включить скроллинг панели Помещения'
  );
  updateDetailedPanelToolButton(
    summaryScrollToggle,
    detailedSidePanelsState.summaryScroll,
    'Выключить скроллинг панели Итого',
    'Включить скроллинг панели Итого'
  );
  updateDetailedPanelToolButton(
    summaryPinToggle,
    detailedSidePanelsState.summaryPinned,
    'Отключить фиксацию панели Итого',
    'Зафиксировать панель Итого при прокрутке'
  );
}

function updateDetailedPanelToolButton(button, active, activeLabel, inactiveLabel) {
  if (!button) return;
  button.classList.toggle('is-off', !active);
  button.setAttribute('aria-pressed', String(Boolean(active)));
  button.setAttribute('aria-label', active ? activeLabel : inactiveLabel);
  button.title = active ? activeLabel : inactiveLabel;
}

function saveDetailedSidePanelsState() {
  try {
    localStorage.setItem('detailedSidePanelsState', JSON.stringify(detailedSidePanelsState));
  } catch (error) {
    console.warn('Не удалось сохранить состояние боковых панелей:', error);
  }
}

function restoreDetailedSidePanelsState() {
  try {
    const saved = JSON.parse(localStorage.getItem('detailedSidePanelsState') || '{}');
    detailedSidePanelsState.rooms = window.__smetaProPage ? false : Boolean(saved.rooms);
    detailedSidePanelsState.summary = window.__smetaProPage ? false : Boolean(saved.summary);
    detailedSidePanelsState.roomsScroll = saved.roomsScroll !== false;
    detailedSidePanelsState.summaryScroll = saved.summaryScroll !== false;
    detailedSidePanelsState.summaryPinned = saved.summaryPinned !== false;
  } catch (error) {
    detailedSidePanelsState.rooms = false;
    detailedSidePanelsState.summary = false;
    detailedSidePanelsState.roomsScroll = true;
    detailedSidePanelsState.summaryScroll = true;
    detailedSidePanelsState.summaryPinned = true;
  }
  applyDetailedSidePanelsState();
}

function toggleDetailedSidePanel(panel) {
  if (!Object.prototype.hasOwnProperty.call(detailedSidePanelsState, panel)) return;
  detailedSidePanelsState[panel] = !detailedSidePanelsState[panel];
  applyDetailedSidePanelsState();
  saveDetailedSidePanelsState();
}

function setDetailedSidePanelCollapsed(panel, collapsed, options = {}) {
  if (!Object.prototype.hasOwnProperty.call(detailedSidePanelsState, panel)) return;
  const nextValue = Boolean(collapsed);
  if (detailedSidePanelsState[panel] === nextValue) return;
  detailedSidePanelsState[panel] = nextValue;
  applyDetailedSidePanelsState();
  if (options.persist !== false) saveDetailedSidePanelsState();
}

function toggleDetailedPanelScroll(panel) {
  const key = panel === 'summary' ? 'summaryScroll' : panel === 'rooms' ? 'roomsScroll' : '';
  if (!key) return;
  detailedSidePanelsState[key] = !detailedSidePanelsState[key];
  applyDetailedSidePanelsState();
  saveDetailedSidePanelsState();
}

function toggleDetailedSummaryPin() {
  detailedSidePanelsState.summaryPinned = !detailedSidePanelsState.summaryPinned;
  applyDetailedSidePanelsState();
  saveDetailedSidePanelsState();
}

window.toggleDetailedSidePanel = toggleDetailedSidePanel;
window.setDetailedSidePanelCollapsed = setDetailedSidePanelCollapsed;
window.toggleDetailedPanelScroll = toggleDetailedPanelScroll;
window.toggleDetailedSummaryPin = toggleDetailedSummaryPin;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', restoreDetailedSidePanelsState);
} else {
  restoreDetailedSidePanelsState();
}

// Phone mask
document.getElementById('formPhone')?.addEventListener('input', function(e) {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 0) {
    if (value[0] === '7' || value[0] === '8') value = value.substring(1);
    let formatted = '+7';
    if (value.length > 0) formatted += ' (' + value.substring(0, 3);
    if (value.length >= 3) formatted += ') ' + value.substring(3, 6);
    if (value.length >= 6) formatted += '-' + value.substring(6, 8);
    if (value.length >= 8) formatted += '-' + value.substring(8, 10);
    e.target.value = formatted;
  }
});

// Scroll reveal
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-slide-up');
        entry.target.style.opacity = '1';
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

// Lazy load with blur-up
function initLazyLoad() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.onload = () => img.classList.add('loaded');
          imageObserver.unobserve(img);
        }
      });
    });

    document.querySelectorAll('.blur-up').forEach(img => imageObserver.observe(img));
  }
}

// Close on outside click
document.getElementById('modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// Escape key
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('modal');
  const menu = document.getElementById('mobileMenu');
  const lightbox = document.getElementById('lightbox');

  if (modal.classList.contains('flex')) {
    trapFocus(e, modal);
  }

  if (menu.classList.contains('translate-x-0')) {
    trapFocus(e, menu);
  }

  if (lightbox.classList.contains('active')) {
    trapFocus(e, lightbox);
  }

  if (e.key === 'Escape') {
    closeModal();
    closeLightbox();
    if (chatOpen) toggleChat();
    if (menu.classList.contains('translate-x-0')) toggleMobileMenu();
  }
});

// Navbar scroll
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (window.scrollY > 50) {
    nav.classList.add('shadow-lg');
  } else {
    nav.classList.remove('shadow-lg');
  }
});

// Hide sticky CTA when modal is open
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.target.id === 'modal') {
      const sticky = document.getElementById('stickyCTA');
      if (sticky) {
        if (mutation.target.classList.contains('flex')) {
          sticky.style.transform = 'translateY(150%)';
        } else {
          sticky.style.transform = 'translateY(0)';
        }
      }
    }
  });
});

observer.observe(document.getElementById('modal'), { attributes: true, attributeFilter: ['class'] });
