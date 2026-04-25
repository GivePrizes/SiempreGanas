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

function getToggleThemeTarget(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

function setThemeDockSpacing(enabled) {
  document.body?.classList.toggle('has-app-theme-dock', Boolean(enabled));
}

function syncThemeButtons(theme) {
  document.querySelectorAll('[data-theme-choice], [data-login-theme-choice]').forEach((button) => {
    const isActive = getThemeChoiceFromButton(button) === theme;
    button.setAttribute('aria-pressed', String(isActive));
    button.classList.toggle('is-active', isActive);
  });

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const nextTheme = getToggleThemeTarget(theme);
    const nextLabel = nextTheme === 'dark' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
    button.dataset.themeToggle = nextTheme;
    button.setAttribute('aria-label', nextLabel);
    button.setAttribute('title', nextLabel);
    button.setAttribute('aria-pressed', String(theme === 'dark'));
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
  if (document.body?.dataset.themeDock === 'off') {
    setThemeDockSpacing(false);
    return null;
  }

  if (document.querySelector('[data-theme-choice], [data-login-theme-choice]')) {
    setThemeDockSpacing(false);
    return null;
  }

  const existingDock = document.querySelector('.app-theme-dock');
  if (existingDock) {
    setThemeDockSpacing(true);
    return existingDock;
  }

  const dock = document.createElement('div');
  dock.className = 'app-theme-dock';
  dock.setAttribute('role', 'group');
  dock.setAttribute('aria-label', 'Cambiar tema');
  dock.innerHTML = `
    <button type="button" class="app-theme-dock__toggle" data-theme-toggle="dark" aria-label="Cambiar tema" title="Cambiar tema" aria-pressed="false">
      <span class="app-theme-dock__icon app-theme-dock__icon--sun" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <circle cx="12" cy="12" r="4.2" fill="currentColor"></circle>
          <path d="M12 2.5v2.3M12 19.2v2.3M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
        </svg>
      </span>
      <span class="app-theme-dock__icon app-theme-dock__icon--moon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M18.4 14.7a7.5 7.5 0 0 1-9.1-9.1 8.3 8.3 0 1 0 9.1 9.1Z" fill="currentColor"></path>
        </svg>
      </span>
    </button>
  `;
  document.body.appendChild(dock);
  setThemeDockSpacing(true);
  return dock;
}

function handleThemeChoice(event) {
  const toggleButton = event.target.closest('[data-theme-toggle]');
  if (toggleButton) {
    applyAppTheme(toggleButton.dataset.themeToggle || getToggleThemeTarget(window.appTheme?.current?.() || resolveAppTheme()));
    return;
  }

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
