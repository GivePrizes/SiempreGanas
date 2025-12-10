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



function logout() {
  localStorage.clear();
  location.href = '../index.html';
}