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
  const email = document.getElementById('loginEmail')?.value;
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

      // Redirección según rol
      if (data.user.rol === 'admin') {
        location.href = 'admin/panel.html';
      } else {
        location.href = 'participante/dashboard.html';
      }
    } else {
      alert('❌ ' + data.message);
    }
  } catch (err) {
    alert('❌ Error de conexión');
  }
}

// --- Validaciones ---

function nombreValido(nombre) {
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/.test(nombre)) return false;

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

// --- Registro ---

async function registro() {
  const nombre   = document.getElementById('regNombre')?.value.trim();
  const email    = document.getElementById('regEmail')?.value.trim();
  const telefono = document.getElementById('regTelefono')?.value.trim();
  const password = document.getElementById('regPass')?.value;
  const confirm  = document.getElementById('regPassConfirm')?.value;

  if (!nombreValido(nombre)) {
    return alert("❌ Ingresa tu nombre real (mínimo nombre y apellido).");
  }

  if (!correoValido(email)) {
    return alert("❌ Ingresa un correo válido.");
  }

  if (!telefonoValido(telefono)) {
    return alert("❌ Ingresa un número de teléfono válido (mínimo 10 dígitos).");
  }

  if (password !== confirm) {
    return alert('❌ Contraseñas no coinciden');
  }

  try {
    const res = await fetch(`${AUTH_URL}/api/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, telefono, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      location.href = 'participante/dashboard.html';
    } else {
      alert('❌ ' + data.message);
    }
  } catch (err) {
    alert('❌ Error de conexión');
  }
}

// --- Logout ---

function logout() {
  localStorage.clear();
  location.href = '../index.html';
}

// --- Validación en vivo SOLO si existe el formulario de registro ---

document.addEventListener('DOMContentLoaded', () => {
  const inputNombre   = document.getElementById('regNombre');
  const inputEmail    = document.getElementById('regEmail');
  const inputTelefono = document.getElementById('regTelefono');
  const inputPass     = document.getElementById('regPass');
  const inputPass2    = document.getElementById('regPassConfirm');

  // Si no estamos en login.html con el formulario de registro, no hacer nada
  if (!inputNombre || !inputEmail || !inputTelefono || !inputPass || !inputPass2) {
    return;
  }

  const errorNombre   = document.getElementById('errorNombre') || null;
  const errorEmail    = document.getElementById('errorEmail') || null;
  const errorTelefono = document.getElementById('errorTelefono') || null;
  const errorPass     = document.getElementById('errorPass') || null;
  const errorPass2    = document.getElementById('errorPassConfirm') || null;

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
      if (errorNombre) errorNombre.textContent = '✓ Nombre válido';
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
      if (errorEmail) errorEmail.textContent = 'Correo no válido.';
      inputEmail.classList.add('input-error');
      inputEmail.classList.remove('input-ok');
    } else {
      if (errorEmail) errorEmail.textContent = '✓ Correo válido';
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
      if (errorTelefono) errorTelefono.textContent = 'Mínimo 10 dígitos, solo números.';
      inputTelefono.classList.add('input-error');
      inputTelefono.classList.remove('input-ok');
    } else {
      if (errorTelefono) errorTelefono.textContent = '✓ Teléfono válido';
      inputTelefono.classList.add('input-ok');
      inputTelefono.classList.remove('input-error');
    }
  });

  inputPass.addEventListener('input', () => {
    const valor = inputPass.value;
    if (!valor) {
      if (errorPass) errorPass.textContent = '';
      inputPass.classList.remove('input-error', 'input-ok');
    } else if (valor.length < 6) {
      if (errorPass) errorPass.textContent = 'Mínimo 6 caracteres.';
      inputPass.classList.add('input-error');
      inputPass.classList.remove('input-ok');
    } else {
      if (errorPass) errorPass.textContent = '✓ Contraseña aceptable';
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
      if (errorPass2) errorPass2.textContent = 'Las contraseñas no coinciden.';
      inputPass2.classList.add('input-error');
      inputPass2.classList.remove('input-ok');
    } else {
      if (errorPass2) errorPass2.textContent = '✓ Coinciden';
      inputPass2.classList.add('input-ok');
      inputPass2.classList.remove('input-error');
    }
  });
});
