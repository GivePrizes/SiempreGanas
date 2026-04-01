const LOGIN_THEME_STORAGE_KEY = 'mathome-login-theme';
const loginThemeMediaQuery = window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

function getSavedLoginTheme() {
  try {
    const saved = localStorage.getItem(LOGIN_THEME_STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch (_) {
    return null;
  }
}

function getSystemLoginTheme() {
  return loginThemeMediaQuery?.matches ? 'dark' : 'light';
}

function resolveLoginTheme() {
  return getSavedLoginTheme() || getSystemLoginTheme();
}

function syncLoginThemeButtons(theme) {
  document.querySelectorAll('[data-login-theme-choice]').forEach((button) => {
    const isActive = button.dataset.loginThemeChoice === theme;
    button.setAttribute('aria-pressed', String(isActive));
    button.classList.toggle('is-active', isActive);
  });
}

function applyLoginTheme(theme, { persist = true } = {}) {
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-login-theme', normalizedTheme);
  document.documentElement.style.colorScheme = normalizedTheme;

  if (persist) {
    try {
      localStorage.setItem(LOGIN_THEME_STORAGE_KEY, normalizedTheme);
    } catch (_) {
      // Ignore storage errors and keep the visual state in memory.
    }
  }

  syncLoginThemeButtons(normalizedTheme);
  return normalizedTheme;
}

function handleLoginThemeChoice(event) {
  const button = event.target.closest('[data-login-theme-choice]');
  if (!button) return;

  applyLoginTheme(button.dataset.loginThemeChoice);
}

function handleSystemThemeChange(event) {
  if (getSavedLoginTheme()) return;
  applyLoginTheme(event.matches ? 'dark' : 'light', { persist: false });
}

function initLoginThemeToggle() {
  const toolbar = document.querySelector('.theme-switch');
  if (!toolbar) return;

  applyLoginTheme(resolveLoginTheme(), { persist: false });
  toolbar.addEventListener('click', handleLoginThemeChoice);

  if (loginThemeMediaQuery?.addEventListener) {
    loginThemeMediaQuery.addEventListener('change', handleSystemThemeChange);
  } else if (loginThemeMediaQuery?.addListener) {
    loginThemeMediaQuery.addListener(handleSystemThemeChange);
  }
}

window.loginTheme = {
  apply: applyLoginTheme,
  current: () => document.documentElement.getAttribute('data-login-theme') || resolveLoginTheme(),
};

initLoginThemeToggle();
