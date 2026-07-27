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

// CV download gate — opens a modal, emails a code to a business address, then downloads
(() => {
  const API_BASE = 'https://cv-gate.vercel.app/api';
  // Matched on the brand root (domain's first label), not the full domain —
  // so gmail.co / gmail.io / gmail.ai are blocked alongside gmail.com.
  const FREE_EMAIL_ROOTS = new Set([
    'gmail', 'googlemail', 'yahoo', 'outlook', 'hotmail', 'live', 'msn', 'icloud', 'me', 'mac',
    'aol', 'protonmail', 'proton', 'gmx', 'mail', 'yandex', 'zoho', 'fastmail', 'tutanota', 'inbox', 'web',
  ]);

  const triggers = document.querySelectorAll('.cv-download-trigger');
  const modal = document.getElementById('cv-modal');
  if (!triggers.length || !modal) return;

  const subEl = document.getElementById('cv-modal-sub');
  const emailForm = document.getElementById('cv-modal-form');
  const emailInput = document.getElementById('cv-modal-email');
  const sendBtn = document.getElementById('cv-modal-send-btn');
  const codeForm = document.getElementById('cv-modal-code-form');
  const codeInput = document.getElementById('cv-modal-code');
  const verifyBtn = document.getElementById('cv-modal-verify-btn');
  const resendBtn = document.getElementById('cv-modal-resend');
  const editEmailBtn = document.getElementById('cv-modal-edit-email');
  const errorEl = document.getElementById('cv-modal-error');
  const successEl = document.getElementById('cv-modal-success');
  const closeBtn = modal.querySelector('.cv-modal-close');

  const defaultSub = 'Work email only — filters out gmail/outlook/etc.';
  const fallbackError = 'Something went wrong. <a href="mailto:olegsuvorav@gmail.com">Email me directly</a> and I\'ll send it over.';
  const businessEmailError = 'Please use your work email — personal providers (Gmail, Outlook, etc.) aren\'t accepted.';
  const CODE_ERRORS = {
    wrong_code: 'That code doesn\'t match — check your inbox and try again.',
    expired: 'That code expired — hit resend for a new one.',
  };

  let token = null;
  let resendCooldown = null;

  const isBusinessEmail = (email) => {
    const match = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(email.trim().toLowerCase());
    if (!match) return false;
    const root = match[1].split('.')[0];
    return !FREE_EMAIL_ROOTS.has(root);
  };

  const showError = (html) => {
    errorEl.hidden = false;
    errorEl.innerHTML = html;
  };

  const clearResendCooldown = () => {
    clearInterval(resendCooldown);
    resendCooldown = null;
    resendBtn.disabled = false;
    resendBtn.textContent = 'Resend code';
  };

  const startResendCooldown = () => {
    let secondsLeft = 20;
    resendBtn.disabled = true;
    resendBtn.textContent = `Resend code (${secondsLeft}s)`;
    clearInterval(resendCooldown);
    resendCooldown = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearResendCooldown();
        return;
      }
      resendBtn.textContent = `Resend code (${secondsLeft}s)`;
    }, 1000);
  };

  const showEmailStep = () => {
    token = null;
    codeInput.value = '';
    emailForm.hidden = false;
    codeForm.hidden = true;
    errorEl.hidden = true;
    subEl.textContent = defaultSub;
    clearResendCooldown();
    setTimeout(() => emailInput.focus(), 50);
  };

  const showCodeStep = (email) => {
    emailForm.hidden = true;
    codeForm.hidden = false;
    errorEl.hidden = true;
    subEl.textContent = `Enter the 6-digit code we sent to ${email}.`;
    verifyBtn.disabled = true;
    startResendCooldown();
    setTimeout(() => codeInput.focus(), 50);
  };

  const resetModal = () => {
    successEl.hidden = true;
    emailInput.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = 'Send code';
    verifyBtn.textContent = 'Verify & Download';
    showEmailStep();
  };

  const validateEmailLive = () => {
    const email = emailInput.value.trim();
    if (!email) {
      errorEl.hidden = true;
      sendBtn.disabled = true;
      return;
    }
    const valid = isBusinessEmail(email);
    sendBtn.disabled = !valid;
    if (valid) {
      errorEl.hidden = true;
    } else {
      showError(businessEmailError);
    }
  };

  const validateCodeLive = () => {
    codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
    verifyBtn.disabled = codeInput.value.length !== 6;
  };

  const openModal = (sourcePage) => {
    modal.dataset.sourcePage = sourcePage;
    resetModal();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    clearResendCooldown();
  };

  const sendCode = async (email) => {
    let res;
    try {
      res = await fetch(`${API_BASE}/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sourcePage: modal.dataset.sourcePage }),
      });
    } catch {
      showError(fallbackError);
      return false;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showError(data.error === 'business_email_required' ? businessEmailError : fallbackError);
      return false;
    }

    const data = await res.json();
    token = data.token;
    return true;
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(trigger.dataset.source || 'Home');
    });
  });

  emailInput.addEventListener('input', validateEmailLive);
  codeInput.addEventListener('input', validateCodeLive);

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  editEmailBtn.addEventListener('click', showEmailStep);

  resendBtn.addEventListener('click', async () => {
    if (resendBtn.disabled) return;
    const email = emailInput.value.trim();
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending…';
    const ok = await sendCode(email);
    if (ok) {
      startResendCooldown();
    } else {
      clearResendCooldown();
    }
  });

  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    errorEl.hidden = true;

    if (!isBusinessEmail(email)) {
      showError(businessEmailError);
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';

    const ok = await sendCode(email);

    sendBtn.textContent = 'Send code';
    if (ok) {
      showCodeStep(email);
    } else {
      sendBtn.disabled = false;
    }
  });

  codeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();
    errorEl.hidden = true;

    if (code.length !== 6 || !token) return;

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying…';

    let res;
    try {
      res = await fetch(`${API_BASE}/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, token, sourcePage: modal.dataset.sourcePage }),
      });
    } catch {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify & Download';
      showError(fallbackError);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify & Download';
      showError(CODE_ERRORS[data.error] || fallbackError);
      return;
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'Oleg-Suvorov-CV.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

    codeForm.hidden = true;
    successEl.hidden = false;
    setTimeout(closeModal, 1800);
  });
})();
