async function login() {
  const email = document.getElementById('loginEmail')?.value?.trim().toLowerCase();
  const password = document.getElementById('loginPass')?.value;
  const btn = document.getElementById('loginBtn');

  if (!email || !password) {
    return alert('Ingresa correo y contraseña.');
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Entrando...';
  }

  try {
    const res = await fetch(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
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

    location.href = freshUser.rol === 'admin'
      ? 'admin/panel.html'
      : 'participante/dashboard.html';
  } catch (_) {
    alert('Error de conexión');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Entra al momento';
    }
  }
}

window.login = login;
