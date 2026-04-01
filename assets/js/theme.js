const APP_THEME_STORAGE_KEY = 'mathome-theme';
const appThemeMediaQuery = window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

function getSavedAppTheme() {
  try {
    const saved = localStorage.getItem(APP_THEME_STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch (_) {
    return null;
  }
}

function getSystemAppTheme() {
  return appThemeMediaQuery?.matches ? 'dark' : 'light';
}

function resolveAppTheme() {
  return getSavedAppTheme() || getSystemAppTheme();
}

function setThemeAttributes(theme) {
  document.documentElement.setAttribute('data-app-theme', theme);
  document.documentElement.setAttribute('data-login-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

function getThemeChoiceFromButton(button) {
  return button.dataset.themeChoice || button.dataset.loginThemeChoice || 'light';
}

function syncThemeButtons(theme) {
  document.querySelectorAll('[data-theme-choice], [data-login-theme-choice]').forEach((button) => {
    const isActive = getThemeChoiceFromButton(button) === theme;
    button.setAttribute('aria-pressed', String(isActive));
    button.classList.toggle('is-active', isActive);
  });
}

function applyAppTheme(theme, { persist = true } = {}) {
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
  setThemeAttributes(normalizedTheme);

  if (persist) {
    try {
      localStorage.setItem(APP_THEME_STORAGE_KEY, normalizedTheme);
    } catch (_) {
      // Ignore storage errors and preserve the visual state for this session.
    }
  }

  syncThemeButtons(normalizedTheme);
  return normalizedTheme;
}

function ensureThemeDock() {
  if (document.body?.dataset.themeDock === 'off') return null;
  if (document.querySelector('[data-theme-choice], [data-login-theme-choice]')) return null;
  if (document.querySelector('.app-theme-dock')) return document.querySelector('.app-theme-dock');

  const dock = document.createElement('div');
  dock.className = 'app-theme-dock';
  dock.setAttribute('role', 'group');
  dock.setAttribute('aria-label', 'Selector de tema');
  dock.innerHTML = `
    <span class="app-theme-dock__label">Tema</span>
    <button type="button" class="app-theme-dock__btn" data-theme-choice="light" aria-pressed="false">
      Claro
    </button>
    <button type="button" class="app-theme-dock__btn" data-theme-choice="dark" aria-pressed="false">
      Oscuro
    </button>
  `;
  document.body.appendChild(dock);
  return dock;
}

function handleThemeChoice(event) {
  const button = event.target.closest('[data-theme-choice], [data-login-theme-choice]');
  if (!button) return;

  applyAppTheme(getThemeChoiceFromButton(button));
}

function handleSystemThemeChange(event) {
  if (getSavedAppTheme()) return;
  applyAppTheme(event.matches ? 'dark' : 'light', { persist: false });
}

function initAppTheme() {
  ensureThemeDock();
  applyAppTheme(resolveAppTheme(), { persist: false });

  document.addEventListener('click', handleThemeChoice);

  if (appThemeMediaQuery?.addEventListener) {
    appThemeMediaQuery.addEventListener('change', handleSystemThemeChange);
  } else if (appThemeMediaQuery?.addListener) {
    appThemeMediaQuery.addListener(handleSystemThemeChange);
  }
}

window.appTheme = {
  apply: applyAppTheme,
  current: () => document.documentElement.getAttribute('data-app-theme') || resolveAppTheme(),
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAppTheme, { once: true });
} else {
  initAppTheme();
}
