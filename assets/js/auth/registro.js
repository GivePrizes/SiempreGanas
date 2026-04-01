const validators = window.authValidators || {};

function setFieldState(input, errorNode, { message = '', ok = false, error = false } = {}) {
  if (errorNode) errorNode.textContent = message;
  if (!input) return;

  input.classList.toggle('input-ok', ok);
  input.classList.toggle('input-error', error);
}

async function registro() {
  const nombre = document.getElementById('regNombre')?.value.trim();
  const email = document.getElementById('regEmail')?.value?.trim().toLowerCase();
  const telefono = document.getElementById('regTelefono')?.value.trim();
  const alias = document.getElementById('regAlias')?.value.trim();
  const password = document.getElementById('regPass')?.value;
  const confirm = document.getElementById('regPassConfirm')?.value;
  const termsAccepted = document.getElementById('regTerms')?.checked;
  const errorTerms = document.getElementById('errorTerms');
  const errorAlias = document.getElementById('errorAlias');
  const btn = document.getElementById('registroBtn');

  if (!validators.nombreValido?.(nombre)) {
    return alert('Error: Ingresa tu nombre real (mínimo nombre y apellido).');
  }

  if (!validators.correoValido?.(email)) {
    return alert('Error: Ingresa un correo válido.');
  }

  if (!validators.telefonoValido?.(telefono)) {
    return alert('Error: Ingresa un número de teléfono válido (mínimo 10 dígitos).');
  }

  if (!validators.aliasValido?.(alias)) {
    if (errorAlias) errorAlias.textContent = 'Nombre público inválido. Usa 3-20 letras, números o _.';
    return alert('Error: Nombre público inválido. Usa 3-20 letras, números o _.');
  }

  if (password !== confirm) {
    return alert('Error: Las contraseñas no coinciden');
  }

  if (!termsAccepted) {
    if (errorTerms) errorTerms.textContent = 'Debes aceptar los términos para continuar.';
    return alert('Error: Debes aceptar los términos y condiciones.');
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Creando...';
    }

    const res = await fetch(`${AUTH_URL}/api/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        email,
        telefono,
        alias: alias || null,
        password,
        terms_accepted: true,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return alert(`Error: ${data.message}`);
    }

    localStorage.setItem('token', data.token);
    localStorage.removeItem('user');

    const freshUser = typeof window.getAuthUser === 'function'
      ? await window.getAuthUser({ force: true })
      : null;

    if (!freshUser) {
      if (typeof window.clearSession === 'function') window.clearSession();
      return alert('No se pudo validar tu sesión. Intenta nuevamente.');
    }

    location.href = 'participante/dashboard.html';
  } catch (_) {
    alert('Error de conexión');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Registrarme';
    }
  }
}

function initRegistroForm() {
  const inputNombre = document.getElementById('regNombre');
  const inputEmail = document.getElementById('regEmail');
  const inputTelefono = document.getElementById('regTelefono');
  const inputAlias = document.getElementById('regAlias');
  const inputPass = document.getElementById('regPass');
  const inputPass2 = document.getElementById('regPassConfirm');
  const inputTerms = document.getElementById('regTerms');

  if (!inputNombre || !inputEmail || !inputTelefono || !inputPass || !inputPass2) {
    return;
  }

  const errorNombre = document.getElementById('errorNombre');
  const errorEmail = document.getElementById('errorEmail');
  const errorTelefono = document.getElementById('errorTelefono');
  const errorAlias = document.getElementById('errorAlias');
  const errorPass = document.getElementById('errorPass');
  const errorPass2 = document.getElementById('errorPassConfirm');
  const errorTerms = document.getElementById('errorTerms');
  const termsModal = document.getElementById('termsModal');
  const openTermsBtn = document.getElementById('openTermsModal');
  const acceptTermsBtn = document.getElementById('termsAcceptBtn');

  inputNombre.addEventListener('input', () => {
    const valor = inputNombre.value.trim();
    if (!valor) return setFieldState(inputNombre, errorNombre);
    if (!validators.nombreValido?.(valor)) {
      return setFieldState(inputNombre, errorNombre, {
        message: 'Ingresa nombre y apellido, sin abreviaturas.',
        error: true,
      });
    }
    setFieldState(inputNombre, errorNombre, { message: 'Nombre válido', ok: true });
  });

  inputEmail.addEventListener('input', () => {
    const valor = inputEmail.value.trim();
    if (!valor) return setFieldState(inputEmail, errorEmail);
    if (!validators.correoValido?.(valor)) {
      return setFieldState(inputEmail, errorEmail, {
        message: 'Correo no válido.',
        error: true,
      });
    }
    setFieldState(inputEmail, errorEmail, { message: 'Correo válido', ok: true });
  });

  inputTelefono.addEventListener('input', () => {
    const valor = inputTelefono.value.trim();
    if (!valor) return setFieldState(inputTelefono, errorTelefono);
    if (!validators.telefonoValido?.(valor)) {
      return setFieldState(inputTelefono, errorTelefono, {
        message: 'Mínimo 10 dígitos, solo números.',
        error: true,
      });
    }
    setFieldState(inputTelefono, errorTelefono, { message: 'Teléfono válido', ok: true });
  });

  if (inputAlias) {
    inputAlias.addEventListener('input', () => {
      const valor = inputAlias.value.trim();
      if (!valor) return setFieldState(inputAlias, errorAlias);
      if (!validators.aliasValido?.(valor)) {
        return setFieldState(inputAlias, errorAlias, {
          message: '3-20 letras, números o _',
          error: true,
        });
      }
      setFieldState(inputAlias, errorAlias, { message: 'Nombre público válido', ok: true });
    });
  }

  inputPass.addEventListener('input', () => {
    const valor = inputPass.value;
    if (!valor) return setFieldState(inputPass, errorPass);
    if (valor.length < 6) {
      return setFieldState(inputPass, errorPass, {
        message: 'Mínimo 6 caracteres.',
        error: true,
      });
    }
    setFieldState(inputPass, errorPass, { message: 'Contraseña aceptable', ok: true });
  });

  inputPass2.addEventListener('input', () => {
    const valor = inputPass2.value;
    if (!valor) return setFieldState(inputPass2, errorPass2);
    if (valor !== inputPass.value) {
      return setFieldState(inputPass2, errorPass2, {
        message: 'Las contraseñas no coinciden.',
        error: true,
      });
    }
    setFieldState(inputPass2, errorPass2, { message: 'Coinciden', ok: true });
  });

  if (inputTerms) {
    inputTerms.addEventListener('change', () => {
      if (!inputTerms.checked) {
        if (errorTerms) errorTerms.textContent = 'Debes aceptar los términos para continuar.';
      } else if (errorTerms) {
        errorTerms.textContent = '';
      }
    });
  }

  const openTermsModal = () => {
    if (!termsModal) return;
    termsModal.classList.remove('hidden');
    termsModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeTermsModal = () => {
    if (!termsModal) return;
    termsModal.classList.add('hidden');
    termsModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (openTermsBtn) {
    openTermsBtn.addEventListener('click', openTermsModal);
  }

  if (termsModal) {
    const closeBtns = termsModal.querySelectorAll('[data-terms-close]');
    closeBtns.forEach((btn) => btn.addEventListener('click', closeTermsModal));
  }

  if (acceptTermsBtn) {
    acceptTermsBtn.addEventListener('click', () => {
      if (inputTerms) inputTerms.checked = true;
      if (errorTerms) errorTerms.textContent = '';
      closeTermsModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTermsModal();
  });
}

window.registro = registro;
document.addEventListener('DOMContentLoaded', initRegistroForm);
