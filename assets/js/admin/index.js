import { cargarComprobantes } from './comprobantes.js?v=20260416b';
import { cargarSorteosAdmin } from './sorteos-admin.js?v=20260415a';

const ADMIN_PANEL_VIEW_STORAGE_KEY = 'mathome:admin-panel:view:v1';
const VIEW_PAGOS = 'pagos';
const VIEW_RONDAS = 'rondas';
const PANEL_REFRESH_MS = 300000;

const shellDom = {
  toggle: document.getElementById('adminShellToggle'),
  sidebar: document.getElementById('adminShellSidebar'),
  backdrop: document.getElementById('adminShellBackdrop'),
  navPagos: document.getElementById('adminNavPagos'),
  navRondas: document.getElementById('adminNavRondas'),
  navCuentas: document.getElementById('adminNavCuentas'),
  navSections: Array.from(document.querySelectorAll('[data-admin-view-target]')),
  sections: Array.from(document.querySelectorAll('[data-admin-view]')),
};

const panelState = {
  puedePagos: false,
  currentView: VIEW_PAGOS,
};

let panelRefreshTimer = null;

function readSavedView() {
  try {
    const saved = localStorage.getItem(ADMIN_PANEL_VIEW_STORAGE_KEY);
    return saved === VIEW_RONDAS ? VIEW_RONDAS : VIEW_PAGOS;
  } catch {
    return VIEW_PAGOS;
  }
}

function persistView(view) {
  try {
    localStorage.setItem(ADMIN_PANEL_VIEW_STORAGE_KEY, view);
  } catch {
    // noop
  }
}

function setShellOpen(open) {
  const isOpen = Boolean(open);
  document.body.classList.toggle('admin-shell-open', isOpen);
  shellDom.toggle?.setAttribute('aria-expanded', String(isOpen));
  if (shellDom.backdrop) {
    shellDom.backdrop.hidden = !isOpen;
  }
}

function loadCurrentView() {
  if (panelState.currentView === VIEW_PAGOS && panelState.puedePagos) {
    cargarComprobantes();
    return;
  }

  cargarSorteosAdmin();
}

function setAdminView(nextView, { persist = true, closeShell = true } = {}) {
  const requestedView = nextView === VIEW_RONDAS ? VIEW_RONDAS : VIEW_PAGOS;
  const finalView = !panelState.puedePagos && requestedView === VIEW_PAGOS
    ? VIEW_RONDAS
    : requestedView;

  panelState.currentView = finalView;

  shellDom.sections.forEach((section) => {
    section.hidden = section.dataset.adminView !== finalView;
  });

  shellDom.navSections.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.adminViewTarget === finalView);
  });

  if (persist) {
    persistView(finalView);
  }

  if (closeShell) {
    setShellOpen(false);
  }

  loadCurrentView();
}

function initAdminShellNavigation() {
  shellDom.toggle?.addEventListener('click', () => {
    const isOpen = document.body.classList.contains('admin-shell-open');
    setShellOpen(!isOpen);
  });

  shellDom.backdrop?.addEventListener('click', () => {
    setShellOpen(false);
  });

  shellDom.navPagos?.addEventListener('click', () => {
    setAdminView(VIEW_PAGOS);
  });

  shellDom.navRondas?.addEventListener('click', () => {
    setAdminView(VIEW_RONDAS);
  });

  shellDom.navCuentas?.addEventListener('click', () => {
    setShellOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setShellOpen(false);
    }
  });
}

function startPanelAutoRefresh() {
  if (panelRefreshTimer) {
    clearInterval(panelRefreshTimer);
  }

  panelRefreshTimer = setInterval(() => {
    if (document.hidden) return;
    loadCurrentView();
  }, PANEL_REFRESH_MS);

  window.addEventListener('focus', () => {
    loadCurrentView();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadCurrentView();
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const user = typeof window.requireAuthUser === 'function'
    ? await window.requireAuthUser({ redirectTo: '../index.html' })
    : null;

  if (!token || !user || user.rol !== 'admin') {
    alert('No tienes acceso al panel de administrador.');
    location.href = '../index.html';
    return;
  }

  const permisos = Array.isArray(user.permisos) ? user.permisos : [];
  const puedePagos = permisos.includes('pagos:aprobar');
  const puedeCuentas = permisos.includes('cuentas:gestionar');
  panelState.puedePagos = puedePagos;

  if (puedeCuentas && !puedePagos) {
    location.href = 'cuentas-sorteo.html';
    return;
  }

  if (!puedePagos) {
    document.getElementById('bloqueComprobantes')?.setAttribute('hidden', 'hidden');
    shellDom.navPagos?.setAttribute('hidden', 'hidden');
  }

  if (!puedeCuentas) {
    shellDom.navCuentas?.setAttribute('hidden', 'hidden');
  }

  initAdminShellNavigation();

  const preferredView = readSavedView();
  setAdminView(preferredView, { persist: false, closeShell: false });
  startPanelAutoRefresh();
});
