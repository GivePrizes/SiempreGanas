/**
 * welcomeModal.js
 *
 * Modal promocional exclusivo para participantes.
 * - Control de rol: solo se muestra a usuarios con role "participante".
 * - Control de localStorage: llave versionada para evitar conflictos entre versiones.
 * - Control de redireccion: CTA unico con location.href y bloqueo de doble click.
 */

class WelcomeModal {
  constructor(options = {}) {
    // Storage versionado para evitar conflictos con versiones anteriores.
    this.storageKey = 'welcomeModal_participante_v2';
    this.modalId = 'welcomeModalContainer';
    this.forceShow = options.forceShow === true;
    this.showDelayMs = 2000;
    this.ctaUrl = '/participante/sorteo.html?id=42';
    this.redirectInProgress = false;
    this.showTimeoutId = null;
    this.hideTimeoutId = null;

    if (!document.getElementById(this.modalId)) {
      this.createModalHTML();
    }

    this.modal = document.getElementById(this.modalId);
    this.closeBtn = document.querySelector(`#${this.modalId} .welcome-modal-close`);
    this.overlay = document.querySelector(`#${this.modalId} .welcome-modal-overlay`);
    this.ctaBtn = document.querySelector(`#${this.modalId} .welcome-modal-cta`);

    this.handleEscKey = (event) => {
      if (event.key === 'Escape' && this.isVisible()) {
        this.close();
      }
    };

    this.attachEventListeners();
  }

  getImageSrc() {
    const inNestedSection = /^\/(participante|admin)\//.test(window.location.pathname);
    const basePath = inNestedSection ? '../assets/imagenes/' : 'assets/imagenes/';
    return `${basePath}disn+Netflix.png`;
  }

  createModalHTML() {
    const modalHTML = `
      <div id="welcomeModalContainer" class="welcome-modal-container" style="display: none;" aria-hidden="true">
        <div class="welcome-modal-overlay"></div>
        <div class="welcome-modal-content" role="dialog" aria-modal="true" aria-labelledby="welcomeModalTitle">
          <button class="welcome-modal-close" type="button" aria-label="Cerrar promocion">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="welcome-modal-image-wrapper">
            <img
              src="${this.getImageSrc()}"
              alt="Promocion especial disponible para participantes"
              class="welcome-modal-image"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div class="welcome-modal-text">
            <h1 id="welcomeModalTitle" class="welcome-modal-title">Participa en sorteos disponibles</h1>
            <p class="welcome-modal-subtitle">Promocion valida hasta agotar cupos. Aplican terminos y condiciones.</p>
            <button class="welcome-modal-cta" type="button">ENTRA AL MOMENTO</button>
            <p class="welcome-modal-legal">Promocion sujeta a terminos y condiciones.</p>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  attachEventListeners() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }

    if (this.ctaBtn) {
      this.ctaBtn.addEventListener('click', () => {
        if (this.redirectInProgress) {
          return;
        }

        this.redirectInProgress = true;
        location.href = this.ctaUrl;
      });
    }

    document.addEventListener('keydown', this.handleEscKey);
  }

  getCurrentUser() {
    try {
      const rawUser = localStorage.getItem('user');
      return rawUser ? JSON.parse(rawUser) : null;
    } catch (error) {
      console.warn('No se pudo leer el usuario desde localStorage:', error);
      return null;
    }
  }

  isParticipante() {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Compatibilidad con payloads legacy: normaliza "rol" a "role".
    const normalizedUser = user.role ? user : { ...user, role: user.rol };

    // Solo mostrar a participantes autenticados.
    return normalizedUser?.role === 'participante';
  }

  show() {
    if (!this.modal) return;

    // Solo mostrar a participantes autenticados.
    if (!this.isParticipante()) return;

    // Control de localStorage para mostrar una sola vez por version.
    if (!this.forceShow && this.hasBeenShown()) return;

    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
    }

    this.showTimeoutId = setTimeout(() => {
      this.modal.style.display = 'flex';
      this.modal.setAttribute('aria-hidden', 'false');

      setTimeout(() => {
        this.modal.classList.add('welcome-modal-active');
      }, 10);

      this.markAsShown();
    }, this.showDelayMs);
  }

  close() {
    if (!this.modal) return;

    if (this.showTimeoutId) {
      clearTimeout(this.showTimeoutId);
      this.showTimeoutId = null;
    }

    this.modal.classList.remove('welcome-modal-active');
    this.modal.setAttribute('aria-hidden', 'true');

    if (this.hideTimeoutId) {
      clearTimeout(this.hideTimeoutId);
    }

    this.hideTimeoutId = setTimeout(() => {
      this.modal.style.display = 'none';
    }, 300);
  }

  isVisible() {
    return this.modal && this.modal.style.display !== 'none';
  }

  markAsShown() {
    try {
      localStorage.setItem(this.storageKey, 'true');
    } catch (error) {
      console.warn('localStorage no disponible:', error);
    }
  }

  hasBeenShown() {
    try {
      return localStorage.getItem(this.storageKey) === 'true';
    } catch (error) {
      console.warn('localStorage no disponible:', error);
      return false;
    }
  }
}

let welcomeModalInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!welcomeModalInstance) {
    welcomeModalInstance = new WelcomeModal();
  }
});

function showWelcomeModal(forceShow = false) {
  if (!welcomeModalInstance) {
    welcomeModalInstance = new WelcomeModal({ forceShow });
  }

  if (forceShow) {
    welcomeModalInstance.forceShow = true;
  }

  welcomeModalInstance.show();
}



