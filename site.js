const root = document.documentElement;
const sys = window.matchMedia('(prefers-color-scheme: light)');
const btns = document.querySelectorAll('.theme-btn');

const indicator = document.getElementById('themeIndicator');

const applyTheme = (mode) => {
  const resolved = mode === 'system' ? (sys.matches ? 'light' : 'dark') : mode;
  root.setAttribute('data-theme', resolved);
  btns.forEach((b, i) => {
    const active = b.dataset.mode === mode;
    b.classList.toggle('active', active);
    if (active) indicator.style.transform = `translateX(${i * 28}px)`; // 26px btn + 2px gap
  });
};

const saved = localStorage.getItem('themeMode') || 'system';
applyTheme(saved);

btns.forEach(btn => btn.addEventListener('click', () => {
  const mode = btn.dataset.mode;
  localStorage.setItem('themeMode', mode);
  applyTheme(mode);
}));

sys.addEventListener('change', () => {
  if ((localStorage.getItem('themeMode') || 'system') === 'system') applyTheme('system');
});

// Mobile burger menu
const navEl = document.querySelector('nav');
const burger = document.querySelector('.nav-burger');
burger.addEventListener('click', () => {
  const open = navEl.classList.toggle('menu-open');
  burger.setAttribute('aria-expanded', open);
  // lock page scroll while the full-screen menu is open
  document.body.style.overflow = open ? 'hidden' : '';
});
navEl.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navEl.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  });
});

// Contact dropdown (desktop) — click to toggle, click outside to close
const contact = document.querySelector('.nav-contact');
if (contact) {
  const trigger = contact.querySelector('.nav-contact-trigger');
  const contactMQ = window.matchMedia('(max-width: 640px)');

  // Mobile: accordion expanded by default. Desktop: popover closed by default.
  const applyContactDefault = () => {
    const mobile = contactMQ.matches;
    contact.classList.toggle('open', mobile);
    trigger.setAttribute('aria-expanded', mobile);
  };
  applyContactDefault();
  contactMQ.addEventListener('change', applyContactDefault);

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = contact.classList.toggle('open');
    trigger.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', (e) => {
    if (contactMQ.matches) return; // on mobile the accordion isn't dismissed by outside clicks
    if (!contact.contains(e.target)) {
      contact.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
}

// Copy email to clipboard, with a transient "copied" check
document.querySelectorAll('.copy-email').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const email = btn.dataset.email;
    // instant visual feedback — don't wait on the clipboard promise
    btn.classList.add('copied');
    clearTimeout(btn._copiedTimer);
    btn._copiedTimer = setTimeout(() => btn.classList.remove('copied'), 1600);
    // copy, with a legacy fallback for older/insecure contexts
    const legacyCopy = () => {
      const ta = document.createElement('textarea');
      ta.value = email;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).catch(legacyCopy);
    } else {
      legacyCopy();
    }
  });
});
