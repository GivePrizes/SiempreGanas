// --- Cambio entre login / registro ---

function showLogin() {
  const loginForm = document.getElementById('loginForm');
  const registroForm = document.getElementById('registroForm');
  if (loginForm && registroForm) {
    loginForm.classList.remove('hidden');
    registroForm.classList.add('hidden');
  }
}

function showRegistro() {
  const loginForm = document.getElementById('loginForm');
  const registroForm = document.getElementById('registroForm');
  if (loginForm && registroForm) {
    registroForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

// --- Login ---

async function login() {
  const email = document.getElementById('loginEmail')?.value?.trim().toLowerCase();
  const password = document.getElementById('loginPass')?.value;

  try {
    const res = await fetch(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Mostrar modal de bienvenida
      if (typeof showWelcomeModal === 'function') {
        showWelcomeModal();
      }
      const redirectUrl = data.user.rol === 'admin' 
        ? 'admin/panel.html'
        : 'participante/dashboard.html';

      // RedirecciÃ³n segÃºn rol (con delay mayor para permitir ver bien el modal)
      setTimeout(() => {
        location.href = redirectUrl;
      }, 7000);
    } else {
      alert('âŒ ' + data.message);
    }
  } catch (err) {
    alert('âŒ Error de conexiÃ³n');
  }
}

// --- Validaciones ---

function nombreValido(nombre) {
  if (!/^[a-zA-ZÃ¡Ã©Ã­Ã³ÃºÃÃ‰ÃÃ“ÃšÃ±Ã‘ ]+$/.test(nombre)) return false;

  const partes = nombre.split(" ").filter(p => p.length > 0);
  if (partes.length < 2) return false;
  if (partes.some(p => p.length < 3)) return false;

  const prohibidos = ["asd", "aaa", "xxx", "test", "fer", "pep", "prueba"];
  if (prohibidos.includes(partes[0].toLowerCase())) return false;

  return true;
}

function telefonoValido(telefono) {
  if (!/^[0-9]+$/.test(telefono)) return false;
  if (telefono.length < 10) return false;
  if (/^0+$/.test(telefono)) return false;
  return true;
}

function correoValido(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!regex.test(email)) return false;

  const [usuario, dominio] = email.split("@");
  if (!usuario || !dominio) return false;
  if (usuario.length < 3) return false;
  if (dominio.length < 5) return false;

  const dominiosFalsos = ["example.com", "test.com", "fake.com", "correo.com"];
  if (dominiosFalsos.includes(dominio.toLowerCase())) return false;

  return true;
}

function aliasValido(alias) {
  if (!alias) return true;
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(alias)) return false;
  return true;
}

// --- Registro ---

async function registro() {
  const nombre   = document.getElementById('regNombre')?.value.trim();
  const email    = document.getElementById('regEmail')?.value?.trim().toLowerCase();
  const telefono = document.getElementById('regTelefono')?.value.trim();
  const alias    = document.getElementById('regAlias')?.value.trim();
  const password = document.getElementById('regPass')?.value;
  const confirm  = document.getElementById('regPassConfirm')?.value;
  const termsAccepted = document.getElementById('regTerms')?.checked;
  const errorTerms = document.getElementById('errorTerms') || null;
  const errorAlias = document.getElementById('errorAlias') || null;

  if (!nombreValido(nombre)) {
    return alert("âŒ Ingresa tu nombre real (mÃ­nimo nombre y apellido).");
  }

  if (!correoValido(email)) {
    return alert("âŒ Ingresa un correo vÃ¡lido.");
  }

  if (!telefonoValido(telefono)) {
    return alert("âŒ Ingresa un nÃºmero de telÃ©fono vÃ¡lido (mÃ­nimo 10 dÃ­gitos).");
  }

  if (!aliasValido(alias)) {
    if (errorAlias) errorAlias.textContent = 'Nombre pÃºblico invÃ¡lido. Usa 3â€“20 letras, nÃºmeros o _';
    return alert('âŒ Nombre pÃºblico invÃ¡lido. Usa 3â€“20 letras, nÃºmeros o _.');
  }

  if (password !== confirm) {
    return alert('âŒ ContraseÃ±as no coinciden');
  }

  if (!termsAccepted) {
    if (errorTerms) errorTerms.textContent = 'Debes aceptar los tÃ©rminos para continuar.';
    return alert('âŒ Debes aceptar los tÃ©rminos y condiciones.');
  }

  try {
    const res = await fetch(`${AUTH_URL}/api/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, telefono, alias: alias || null, password, terms_accepted: true })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Mostrar modal de bienvenida
      if (typeof showWelcomeModal === 'function') {
        showWelcomeModal();
      }
      
      // RedirecciÃ³n con delay mayor
      setTimeout(() => {
        location.href = 'participante/dashboard.html';
      }, 7000);
    } else {
      alert('âŒ ' + data.message);
    }
  } catch (err) {
    alert('âŒ Error de conexiÃ³n');
  }
}

// --- Logout ---

function logout() {
  console.log('Logout ejecutado');
  localStorage.clear();
  sessionStorage.clear();
  location.href = '../index.html';
}

// --- ValidaciÃ³n en vivo SOLO si existe el formulario de registro ---

document.addEventListener('DOMContentLoaded', () => {
  const inputNombre   = document.getElementById('regNombre');
  const inputEmail    = document.getElementById('regEmail');
  const inputTelefono = document.getElementById('regTelefono');
  const inputAlias    = document.getElementById('regAlias');
  const inputPass     = document.getElementById('regPass');
  const inputPass2    = document.getElementById('regPassConfirm');
  const inputTerms    = document.getElementById('regTerms');

  // Si no estamos en login.html con el formulario de registro, no hacer nada
  if (!inputNombre || !inputEmail || !inputTelefono || !inputPass || !inputPass2) {
    return;
  }

  const errorNombre   = document.getElementById('errorNombre') || null;
  const errorEmail    = document.getElementById('errorEmail') || null;
  const errorTelefono = document.getElementById('errorTelefono') || null;
  const errorAlias    = document.getElementById('errorAlias') || null;
  const errorPass     = document.getElementById('errorPass') || null;
  const errorPass2    = document.getElementById('errorPassConfirm') || null;
  const errorTerms    = document.getElementById('errorTerms') || null;

  inputNombre.addEventListener('input', () => {
    const valor = inputNombre.value.trim();
    if (!valor) {
      if (errorNombre) errorNombre.textContent = '';
      inputNombre.classList.remove('input-error', 'input-ok');
    } else if (!nombreValido(valor)) {
      if (errorNombre) errorNombre.textContent = 'Ingresa nombre y apellido, sin abreviaturas.';
      inputNombre.classList.add('input-error');
      inputNombre.classList.remove('input-ok');
    } else {
      if (errorNombre) errorNombre.textContent = 'âœ“ Nombre vÃ¡lido';
      inputNombre.classList.add('input-ok');
      inputNombre.classList.remove('input-error');
    }
  });

  inputEmail.addEventListener('input', () => {
    const valor = inputEmail.value.trim();
    if (!valor) {
      if (errorEmail) errorEmail.textContent = '';
      inputEmail.classList.remove('input-error', 'input-ok');
    } else if (!correoValido(valor)) {
      if (errorEmail) errorEmail.textContent = 'Correo no vÃ¡lido.';
      inputEmail.classList.add('input-error');
      inputEmail.classList.remove('input-ok');
    } else {
      if (errorEmail) errorEmail.textContent = 'âœ“ Correo vÃ¡lido';
      inputEmail.classList.add('input-ok');
      inputEmail.classList.remove('input-error');
    }
  });

  inputTelefono.addEventListener('input', () => {
    const valor = inputTelefono.value.trim();
    if (!valor) {
      if (errorTelefono) errorTelefono.textContent = '';
      inputTelefono.classList.remove('input-error', 'input-ok');
    } else if (!telefonoValido(valor)) {
      if (errorTelefono) errorTelefono.textContent = 'MÃ­nimo 10 dÃ­gitos, solo nÃºmeros.';
      inputTelefono.classList.add('input-error');
      inputTelefono.classList.remove('input-ok');
    } else {
      if (errorTelefono) errorTelefono.textContent = 'âœ“ TelÃ©fono vÃ¡lido';
      inputTelefono.classList.add('input-ok');
      inputTelefono.classList.remove('input-error');
    }
  });

  if (inputAlias) {
    inputAlias.addEventListener('input', () => {
      const valor = inputAlias.value.trim();
      if (!valor) {
        if (errorAlias) errorAlias.textContent = '';
        inputAlias.classList.remove('input-error', 'input-ok');
      } else if (!aliasValido(valor)) {
        if (errorAlias) errorAlias.textContent = '3â€“20 letras, nÃºmeros o _';
        inputAlias.classList.add('input-error');
        inputAlias.classList.remove('input-ok');
      } else {
        if (errorAlias) errorAlias.textContent = 'âœ“ Nombre pÃºblico vÃ¡lido';
        inputAlias.classList.add('input-ok');
        inputAlias.classList.remove('input-error');
      }
    });
  }

  inputPass.addEventListener('input', () => {
    const valor = inputPass.value;
    if (!valor) {
      if (errorPass) errorPass.textContent = '';
      inputPass.classList.remove('input-error', 'input-ok');
    } else if (valor.length < 6) {
      if (errorPass) errorPass.textContent = 'MÃ­nimo 6 caracteres.';
      inputPass.classList.add('input-error');
      inputPass.classList.remove('input-ok');
    } else {
      if (errorPass) errorPass.textContent = 'âœ“ ContraseÃ±a aceptable';
      inputPass.classList.add('input-ok');
      inputPass.classList.remove('input-error');
    }
  });

  inputPass2.addEventListener('input', () => {
    const valor = inputPass2.value;
    if (!valor) {
      if (errorPass2) errorPass2.textContent = '';
      inputPass2.classList.remove('input-error', 'input-ok');
    } else if (valor !== inputPass.value) {
      if (errorPass2) errorPass2.textContent = 'Las contraseÃ±as no coinciden.';
      inputPass2.classList.add('input-error');
      inputPass2.classList.remove('input-ok');
    } else {
      if (errorPass2) errorPass2.textContent = 'âœ“ Coinciden';
      inputPass2.classList.add('input-ok');
      inputPass2.classList.remove('input-error');
    }
  });

  if (inputTerms) {
    inputTerms.addEventListener('change', () => {
      if (!inputTerms.checked) {
        if (errorTerms) errorTerms.textContent = 'Debes aceptar los tÃ©rminos para continuar.';
      } else {
        if (errorTerms) errorTerms.textContent = '';
      }
    });
  }

  // --- Modal tÃ©rminos ---
  const termsModal = document.getElementById('termsModal');
  const openTermsBtn = document.getElementById('openTermsModal');
  const acceptTermsBtn = document.getElementById('termsAcceptBtn');

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
});


