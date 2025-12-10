function showLogin() {
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('registroForm').classList.add('hidden');
}

function showRegistro() {
  document.getElementById('registroForm').classList.remove('hidden');
  document.getElementById('loginForm').classList.add('hidden');
}

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPass').value;
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

//  Función de validación de teléfono (FUERA de registro)
function telefonoValido(telefono) {
  // Solo números
  if (!/^[0-9]+$/.test(telefono)) return false;

  // Longitud mínima 10 dígitos
  if (telefono.length < 10) return false;

  // Evitar números obvios o inválidos
  if (/^0+$/.test(telefono)) return false;

  return true;
}

//  Función de validación de correo (FUERA de registro)
function correoValido(email) {
  // Regex avanzado que valida emails reales
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

  if (!regex.test(email)) return false;

  // evitar correos muy falsos tipo "aaa@aaa.com"
  const [usuario, dominio] = email.split("@");

  if (usuario.length < 3) return false;
  if (dominio.length < 5) return false;

  // Evitar dominios sospechosos o ficticios
  const dominiosFalsos = ["example.com", "test.com", "fake.com", "correo.com"];
  if (dominiosFalsos.includes(dominio.toLowerCase())) return false;

  return true;
}



//  Función de validación de nombre (FUERA de registro)
function nombreValido(nombre) {
  // Solo letras y espacios
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ ]+$/.test(nombre)) return false;

  const partes = nombre.split(" ").filter(p => p.length > 0);

  // Debe haber al menos 2 partes: Nombre + Apellido
  if (partes.length < 2) return false;

  // Cada palabra debe tener al menos 3 letras
  if (partes.some(p => p.length < 3)) return false;

  // Evitar nombres muy comunes o cortos tipo: "fer", "asd", "xx"
  const prohibidos = ["asd", "aaa", "xxx", "test", "fer", "pep", "prueba"];
  if (prohibidos.includes(partes[0].toLowerCase())) return false;

  return true;
}

async function registro() {
  // Obtener valores del formulario
  const nombre   = document.getElementById('regNombre').value.trim();
  const email    = document.getElementById('regEmail').value;
  const telefono = document.getElementById('regTelefono').value;
  const password = document.getElementById('regPass').value;
  const confirm  = document.getElementById('regPassConfirm').value;

  // Validar nombre real
  if (!nombreValido(nombre)) {
    return alert("❌ Ingresa tu nombre real (mínimo nombre y apellido).");
  }

  // Validar teléfono
  if (!telefonoValido(telefono)) {
    return alert("❌ Ingresa un número de teléfono válido (mínimo 10 dígitos).");
  }

  // Validar correo
  if (!correoValido(email)) {
    return alert("❌ Ingresa un correo válido.");
  }


  //  Validar contraseñas
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
      localStorage.setItem('user', JSON.stringify(data.user)); // útil
      location.href = 'participante/dashboard.html';
    } else {
      alert('❌ ' + data.message);
    }
  } catch (err) {
    alert('❌ Error de conexión');
  }
}

// Cuando el DOM ya está cargado
document.addEventListener('DOMContentLoaded', () => {
  const inputNombre   = document.getElementById('regNombre');
  const inputEmail    = document.getElementById('regEmail');
  const inputTelefono = document.getElementById('regTelefono');
  const inputPass     = document.getElementById('regPass');
  const inputPass2    = document.getElementById('regPassConfirm');

  // Nombre: validar mientras escribe
  inputNombre.addEventListener('input', () => {
    const msg = document.getElementById('errorNombre');
    const valor = inputNombre.value.trim();

    if (!valor) {
      msg.textContent = '';
      inputNombre.classList.remove('input-error', 'input-ok');
      return;
    }

    if (!nombreValido(valor)) {
      msg.textContent = 'Ingresa nombre y apellido, sin abreviaturas.';
      inputNombre.classList.add('input-error');
      inputNombre.classList.remove('input-ok');
    } else {
      msg.textContent = '✓ Nombre válido';
      inputNombre.classList.add('input-ok');
      inputNombre.classList.remove('input-error');
    }
  });

  // Email: validar mientras escribe
  inputEmail.addEventListener('input', () => {
    const msg = document.getElementById('errorEmail');
    const valor = inputEmail.value.trim();

    if (!valor) {
      msg.textContent = '';
      inputEmail.classList.remove('input-error', 'input-ok');
      return;
    }

    if (!correoValido(valor)) {
      msg.textContent = 'Correo no válido.';
      inputEmail.classList.add('input-error');
      inputEmail.classList.remove('input-ok');
    } else {
      msg.textContent = '✓ Correo válido';
      inputEmail.classList.add('input-ok');
      inputEmail.classList.remove('input-error');
    }
  });

  // Teléfono: validar mientras escribe
  inputTelefono.addEventListener('input', () => {
    const msg = document.getElementById('errorTelefono');
    const valor = inputTelefono.value.trim();

    if (!valor) {
      msg.textContent = '';
      inputTelefono.classList.remove('input-error', 'input-ok');
      return;
    }

    if (!telefonoValido(valor)) {
      msg.textContent = 'Mínimo 10 dígitos, solo números.';
      inputTelefono.classList.add('input-error');
      inputTelefono.classList.remove('input-ok');
    } else {
      msg.textContent = '✓ Teléfono válido';
      inputTelefono.classList.add('input-ok');
      inputTelefono.classList.remove('input-error');
    }
  });

  // Contraseña: solo comprobar longitud mínima (opcional)
  inputPass.addEventListener('input', () => {
    const msg = document.getElementById('errorPass');
    const valor = inputPass.value;

    if (!valor) {
      msg.textContent = '';
      inputPass.classList.remove('input-error', 'input-ok');
      return;
    }

    if (valor.length < 6) {
      msg.textContent = 'Mínimo 6 caracteres.';
      inputPass.classList.add('input-error');
      inputPass.classList.remove('input-ok');
    } else {
      msg.textContent = '✓ Contraseña aceptable';
      inputPass.classList.add('input-ok');
      inputPass.classList.remove('input-error');
    }
  });

  // Confirmación de contraseña: que coincida
  inputPass2.addEventListener('input', () => {
    const msg = document.getElementById('errorPassConfirm');
    const valor = inputPass2.value;

    if (!valor) {
      msg.textContent = '';
      inputPass2.classList.remove('input-error', 'input-ok');
      return;
    }

    if (valor !== inputPass.value) {
      msg.textContent = 'Las contraseñas no coinciden.';
      inputPass2.classList.add('input-error');
      inputPass2.classList.remove('input-ok');
    } else {
      msg.textContent = '✓ Coinciden';
      inputPass2.classList.add('input-ok');
      inputPass2.classList.remove('input-error');
    }
  });
});



function logout() {
  localStorage.clear();
  location.href = '../index.html';
}