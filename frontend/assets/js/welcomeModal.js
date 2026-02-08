/**
 * welcomeModal.js
 * 
 * Sistema de modal de bienvenida para usuarios nuevos
 * - Se muestra automáticamente al registrarse o iniciar sesión
 * - Se persiste en localStorage para no mostrar más de una vez por dispositivo
 * - Totalmente responsive y premium
 */

class WelcomeModal {
  constructor(options = {}) {
    this.storageKey = 'welcomeModal_shown_v1';
    this.modalId = 'welcomeModalContainer';
    this.forceShow = options.forceShow || false;
    
    // Crear HTML del modal si no existe
    if (!document.getElementById(this.modalId)) {
      this.createModalHTML();
    }
    
    this.modal = document.getElementById(this.modalId);
    this.closeBtn = document.querySelector(`#${this.modalId} .welcome-modal-close`);
    this.overlay = document.querySelector(`#${this.modalId} .welcome-modal-overlay`);
    
    this.attachEventListeners();
  }

  createModalHTML() {
    const modalHTML = `
      <div id="welcomeModalContainer" class="welcome-modal-container" style="display: none;">
        <div class="welcome-modal-overlay"></div>
        <div class="welcome-modal-content">
          <!-- Botón cerrar -->
          <button class="welcome-modal-close" aria-label="Cerrar bienvenida">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <!-- Imagen promocional -->
          <div class="welcome-modal-image-wrapper">
            <img 
              src="assets/imagenes/90c68f7d-4e86-4560-8877-9782faad12dd.png" 
              alt="Bienvenido a Siempre Ganas" 
              class="welcome-modal-image"
            />
            <div class="welcome-modal-image-glow"></div>
          </div>

          <!-- Contenido texto -->
          <div class="welcome-modal-text">
            <h1 class="welcome-modal-title">Bienvenido a SIEMPRE GANAS</h1>
            
            <p class="welcome-modal-subtitle">
              Disfruta contenido premium, participa en chats en vivo y gana premios reales
            </p>

            <!-- Beneficios -->
            <div class="welcome-modal-benefits">
              <div class="benefit-item">
                <span class="benefit-icon">✓</span>
                <span class="benefit-text">Cuentas originales</span>
              </div>
              <div class="benefit-item">
                <span class="benefit-icon">✓</span>
                <span class="benefit-text">Comunidad en sorteos</span>
              </div>
              <div class="benefit-item">
                <span class="benefit-icon">✓</span>
                <span class="benefit-text">Premios garantizados</span>
              </div>
            </div>

            <!-- Urgencia -->
            <div class="welcome-modal-urgency">
              ⚡ HASTA AGOTAR EXISTENCIAS
            </div>

            <!-- Botón CTA -->
            <button class="welcome-modal-cta">¡Comienza ahora!</button>
          </div>
        </div>
      </div>
    `;

    // Insertar al final del body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  attachEventListeners() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }

    // CTA button: redirige a URL específica
    const ctaBtn = document.querySelector(`#${this.modalId} .welcome-modal-cta`);
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        const ctaUrl = sessionStorage.getItem('welcomeModal_cta_url') || 'participante/dashboard.html';
        sessionStorage.removeItem('welcomeModal_cta_url');
        location.href = ctaUrl;
      });
    }

    // Permitir cerrar con ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible()) {
        this.close();
      }
    });
  }

  show() {
    if (!this.modal) return;

    // Si ya fue mostrado y no es force, no mostrar
    if (!this.forceShow && this.hasBeenShown()) {
      return;
    }

    this.modal.style.display = 'flex';
    
    // Agregar clase para trigger animación
    setTimeout(() => {
      this.modal.classList.add('welcome-modal-active');
    }, 10);

    // Marcar como mostrado en localStorage
    this.markAsShown();
  }

  close() {
    if (!this.modal) return;

    this.modal.classList.remove('welcome-modal-active');
    
    // Esperar animación de salida
    setTimeout(() => {
      this.modal.style.display = 'none';
    }, 300);
  }

  isVisible() {
    return this.modal && this.modal.style.display !== 'none';
  }

  markAsShown() {
    try {
      localStorage.setItem(this.storageKey, 'true');
    } catch (e) {
      console.warn('localStorage no disponible:', e);
    }
  }

  hasBeenShown() {
    try {
      return localStorage.getItem(this.storageKey) === 'true';
    } catch (e) {
      console.warn('localStorage no disponible:', e);
      return false;
    }
  }

  reset() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn('localStorage no disponible:', e);
    }
  }

  forceShowAgain() {
    this.reset();
    this.show();
  }

  /**
   * Establecer URL de destino para el botón CTA
   * @param {string} url - URL a redirigir cuando se hace click en "¡Comienza ahora!"
   */
  setCtaUrl(url) {
    try {
      sessionStorage.setItem('welcomeModal_cta_url', url);
    } catch (e) {
      console.warn('sessionStorage no disponible:', e);
    }
  }
}

// Instancia global
let welcomeModalInstance = null;

/**
 * Inicializar modal de bienvenida cuando el DOM esté listo
 */
document.addEventListener('DOMContentLoaded', () => {
  welcomeModalInstance = new WelcomeModal();
});

/**
 * Método público para mostrar el modal desde otros scripts
 * Uso: showWelcomeModal() desde auth.js u otro lugar
 */
function showWelcomeModal(forceShow = false) {
  if (!welcomeModalInstance) {
    welcomeModalInstance = new WelcomeModal({ forceShow });
  }
  
  if (forceShow) {
    welcomeModalInstance.forceShow = true;
  }
  
  welcomeModalInstance.show();
}

/**
 * Método público para forzar mostrar nuevamente (útil para testing)
 * Uso: resetWelcomeModal()
 */
function resetWelcomeModal() {
  if (welcomeModalInstance) {
    welcomeModalInstance.forceShowAgain();
  }
}

/**
 * Método público para establecer URL del botón CTA
 * Uso: setWelcomeModalCtaUrl('participante/sorteo.html?id=33')
 */
function setWelcomeModalCtaUrl(url) {
  if (welcomeModalInstance) {
    welcomeModalInstance.setCtaUrl(url);
  } else {
    try {
      sessionStorage.setItem('welcomeModal_cta_url', url);
    } catch (e) {
      console.warn('sessionStorage no disponible:', e);
    }
  }
}
