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

async function registro() {
  const nombre = document.getElementById('nombre').value;
  const email = document.getElementById('regEmail').value;
  const telefono = document.getElementById('telefono').value;
  const password = document.getElementById('regPass').value;
  const confirm = document.getElementById('regPassConfirm').value;
  if (password !== confirm) return alert('❌ Contraseñas no coinciden');
  try {
    const res = await fetch(`${AUTH_URL}/api/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, telefono, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
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