(function initAppThemeEarly() {
  try {
    var storageKey = 'mathome-theme';
    var saved = localStorage.getItem(storageKey);
    var preferred = saved === 'dark' || saved === 'light'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var root = document.documentElement;
    root.setAttribute('data-app-theme', preferred);
    root.setAttribute('data-login-theme', preferred);
    root.style.colorScheme = preferred;
  } catch (_) {
    document.documentElement.setAttribute('data-app-theme', 'light');
    document.documentElement.setAttribute('data-login-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
  }
})();
