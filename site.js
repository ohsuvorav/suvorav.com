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

// Job-status tooltip — tap-to-toggle for mobile (no hover there)
document.querySelectorAll('.status-dot').forEach(dot => {
  dot.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = dot.classList.toggle('active');
    clearTimeout(dot._tooltipTimer);
    if (open) dot._tooltipTimer = setTimeout(() => dot.classList.remove('active'), 1800);
  });
});
document.addEventListener('click', () => {
  document.querySelectorAll('.status-dot.active').forEach(d => d.classList.remove('active'));
});

// CV download gate — opens a modal, verifies a business email, then downloads
(() => {
  const ENDPOINT = 'https://cv-gate.vercel.app/api/capture-email';
  const FREE_EMAIL_DOMAINS = new Set([
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'outlook.com', 'hotmail.com',
    'hotmail.co.uk', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
    'protonmail.com', 'proton.me', 'gmx.com', 'gmx.net', 'mail.com', 'yandex.com', 'yandex.ru',
    'zoho.com', 'fastmail.com', 'tutanota.com', 'inbox.com', 'web.de',
  ]);

  const triggers = document.querySelectorAll('.cv-download-trigger');
  const modal = document.getElementById('cv-modal');
  if (!triggers.length || !modal) return;

  const form = document.getElementById('cv-modal-form');
  const emailInput = document.getElementById('cv-modal-email');
  const errorEl = document.getElementById('cv-modal-error');
  const successEl = document.getElementById('cv-modal-success');
  const submitBtn = form.querySelector('.cv-modal-submit');
  const closeBtn = modal.querySelector('.cv-modal-close');
  const fallbackError = 'Something went wrong. <a href="mailto:olegsuvorav@gmail.com">Email me directly</a> and I\'ll send it over.';
  const businessEmailError = 'Please use your work email — personal providers (Gmail, Outlook, etc.) aren\'t accepted.';

  let pendingHref = null;

  const isBusinessEmail = (email) => {
    const match = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(email.trim().toLowerCase());
    return !!match && !FREE_EMAIL_DOMAINS.has(match[1]);
  };

  const showError = (html) => {
    errorEl.hidden = false;
    errorEl.innerHTML = html;
  };

  const resetModal = () => {
    form.hidden = false;
    errorEl.hidden = true;
    successEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Download';
  };

  const validateLive = () => {
    const email = emailInput.value.trim();
    if (!email) {
      errorEl.hidden = true;
      submitBtn.disabled = true;
      return;
    }
    const valid = isBusinessEmail(email);
    submitBtn.disabled = !valid;
    if (valid) {
      errorEl.hidden = true;
    } else {
      showError(businessEmailError);
    }
  };

  const openModal = (href, sourcePage) => {
    pendingHref = href;
    modal.dataset.sourcePage = sourcePage;
    resetModal();
    emailInput.value = '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => emailInput.focus(), 50);
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(trigger.getAttribute('href'), trigger.dataset.source || 'Home');
    });
  });

  emailInput.addEventListener('input', validateLive);

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    errorEl.hidden = true;

    if (!isBusinessEmail(email)) {
      showError(businessEmailError);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying…';

    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sourcePage: modal.dataset.sourcePage }),
      });
    } catch {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Download';
      showError(fallbackError);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Download';
      showError(data.error === 'business_email_required' ? businessEmailError : fallbackError);
      return;
    }

    form.hidden = true;
    successEl.hidden = false;
    const link = document.createElement('a');
    link.href = pendingHref;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(closeModal, 1800);
  });
})();
