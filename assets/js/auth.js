function nombreValido(nombre) {
  if (!/^[\p{L} ]+$/u.test(nombre)) return false;

  const partes = String(nombre || '').split(' ').filter((p) => p.length > 0);
  if (partes.length < 2) return false;
  if (partes.some((p) => p.length < 3)) return false;

  const prohibidos = ['asd', 'aaa', 'xxx', 'test', 'fer', 'pep', 'prueba'];
  if (prohibidos.includes(partes[0].toLowerCase())) return false;

  return true;
}

function telefonoValido(telefono) {
  if (!/^[0-9]+$/.test(String(telefono || ''))) return false;
  if (telefono.length < 10) return false;
  if (/^0+$/.test(telefono)) return false;
  return true;
}

function correoValido(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!regex.test(String(email || ''))) return false;

  const [usuario, dominio] = String(email).split('@');
  if (!usuario || !dominio) return false;
  if (usuario.length < 3) return false;
  if (dominio.length < 5) return false;

  const dominiosFalsos = ['example.com', 'test.com', 'fake.com', 'correo.com'];
  if (dominiosFalsos.includes(dominio.toLowerCase())) return false;

  return true;
}

function aliasValido(alias) {
  if (!alias) return true;
  return /^[a-zA-Z0-9_]{3,20}$/.test(alias);
}

function logout() {
  if (typeof window.clearSession === 'function') {
    window.clearSession();
  } else {
    localStorage.clear();
    sessionStorage.clear();
  }
  location.href = '../index.html';
}

window.authValidators = {
  nombreValido,
  telefonoValido,
  correoValido,
  aliasValido,
};

window.logout = logout;
