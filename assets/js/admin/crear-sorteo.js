const API_URL = window.API_URL;

const VALID_TIPOS_PRODUCTO = new Set(['pantalla', 'combo', 'juegos']);
const VALID_MODALIDADES = new Set(['normal', 'live']);
const VALID_LIVE_PRIZE_TYPES = new Set(['efectivo', 'extra', 'otro']);

const DEFAULT_LIVE_PRIZES = [
  { tipo: 'efectivo', nombre: 'Premio 1', monto: '10000', descripcion: '' },
  { tipo: 'efectivo', nombre: 'Premio 2', monto: '20000', descripcion: '' },
  { tipo: 'efectivo', nombre: 'Premio 3', monto: '30000', descripcion: '' },
  { tipo: 'efectivo', nombre: 'Premio 4', monto: '60000', descripcion: '' },
  { tipo: 'efectivo', nombre: 'Premio mayor', monto: '80000', descripcion: '' },
];

const DEFAULT_LIVE_REFERRAL_RULES = [
  {
    minimo_referidos: '2',
    recompensa_monto: '5000',
    descripcion: 'Pago parcial por dos referidos aprobados.',
  },
  {
    minimo_referidos: '3',
    recompensa_monto: '12500',
    descripcion: 'Devuelve el valor completo de entrada cuando se completa el ciclo.',
  },
];

let modoEdicion = false;
let sorteoId = null;
let estadoActual = 'activo';
let imagenActualUrl = null;
let livePremiosState = [];
let liveReferidosState = [];

function getTipoProductoValue() {
  const input = document.getElementById('tipo_producto');
  const value = String(input?.value || '').trim().toLowerCase();
  return VALID_TIPOS_PRODUCTO.has(value) ? value : 'pantalla';
}

function getModalidadValue() {
  const input = document.getElementById('modalidad');
  const value = String(input?.value || '').trim().toLowerCase();
  return VALID_MODALIDADES.has(value) ? value : 'normal';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizarNumeroDecimal(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const cleaned = raw.replace(/[^\d,.-]/g, '');
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const decimalPos = Math.max(lastComma, lastDot);

  if (decimalPos === -1) {
    return cleaned.replace(/[.,]/g, '');
  }

  const integerPart = cleaned.slice(0, decimalPos).replace(/[.,]/g, '');
  const decimalPart = cleaned.slice(decimalPos + 1).replace(/[.,]/g, '');
  return `${integerPart || '0'}.${decimalPart || '0'}`;
}

function parseCantidadNumeros(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+$/.test(normalized)) return null;

  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parsePrecioNumero(value) {
  const normalized = normalizarNumeroDecimal(value);
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : null;
}

function parseMontoNoNegativo(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const normalized = normalizarNumeroDecimal(raw);
  if (!normalized && raw !== '0') return null;

  const parsed = Number(normalized ?? raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Number(parsed.toFixed(2));
}

function sanitizeText(value) {
  return String(value ?? '').trim();
}

function normalizeLivePrizeRow(raw = {}) {
  const tipo = String(raw.tipo || '').trim().toLowerCase();
  return {
    tipo: VALID_LIVE_PRIZE_TYPES.has(tipo) ? tipo : 'efectivo',
    nombre: sanitizeText(raw.nombre),
    monto: sanitizeText(raw.monto),
    descripcion: sanitizeText(raw.descripcion),
  };
}

function normalizeLiveReferralRuleRow(raw = {}) {
  return {
    minimo_referidos: sanitizeText(raw.minimo_referidos),
    recompensa_monto: sanitizeText(raw.recompensa_monto),
    descripcion: sanitizeText(raw.descripcion),
  };
}

function mostrarToast(mensaje) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = mensaje;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3200);
}

async function readResponseData(resp) {
  const text = await resp.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function renderTipoProductoHelp() {
  const help = document.getElementById('tipoProductoHelp');
  if (!help) return;

  const tipoProducto = getTipoProductoValue();

  if (tipoProducto === 'combo') {
    help.textContent = 'Combo: usalo para paquetes con varias pantallas, beneficios o accesos en una misma ronda.';
    return;
  }

  if (tipoProducto === 'juegos') {
    help.textContent = 'Juegos: usalo para cuentas gamer, monedas, membresias, keys o beneficios relacionados con gaming.';
    return;
  }

  help.textContent = 'Pantalla: usalo para una cuenta individual o acceso principal de una sola plataforma.';
}

function renderModalidadHelp() {
  const help = document.getElementById('modalidadHelp');
  if (!help) return;

  if (getModalidadValue() === 'live') {
    help.textContent = 'Live: evento en vivo con premios ordenados, reglas de referidos y cierre manual controlado por admin.';
    return;
  }

  help.textContent = 'Normal: sorteo clasico del flujo actual, sin configuracion avanzada de evento en vivo.';
}

function renderFechaSorteoHelp() {
  const label = document.getElementById('fechaSorteoLabel');
  const help = document.getElementById('fechaSorteoHelp');
  const input = document.getElementById('fecha_sorteo');
  if (!label || !help || !input) return;

  if (getModalidadValue() === 'live') {
    label.textContent = 'Fecha estimada del Live (opcional)';
    help.textContent =
      'Opcional. La fecha y hora real del evento se programa despues, cuando el sorteo ya este lleno.';
    input.required = false;
    return;
  }

  label.textContent = 'Fecha del sorteo';
  help.textContent = 'Para sorteos normales, esta fecha sigue siendo obligatoria.';
  input.required = true;
}

function initPreviewImagen() {
  const input = document.getElementById('imagen');
  const preview = document.getElementById('previewImagen');

  if (!input || !preview) return;

  input.addEventListener('change', () => {
    const file = input.files?.[0];

    if (!file) {
      if (modoEdicion && imagenActualUrl) {
        preview.innerHTML = `<img src="${imagenActualUrl}" alt="Imagen actual del sorteo">`;
      } else {
        preview.innerHTML = '<span>Sin imagen seleccionada</span>';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      preview.innerHTML = `<img src="${event.target?.result || ''}" alt="Previsualizacion">`;
    };
    reader.readAsDataURL(file);
  });
}

function initTipoProductoUI() {
  const input = document.getElementById('tipo_producto');
  if (!input) return;

  renderTipoProductoHelp();
  input.addEventListener('change', renderTipoProductoHelp);
}

function ensureLiveDefaults() {
  if (!livePremiosState.length) {
    livePremiosState = DEFAULT_LIVE_PRIZES.map((row) => ({ ...row }));
  }

  if (!liveReferidosState.length) {
    liveReferidosState = DEFAULT_LIVE_REFERRAL_RULES.map((row) => ({ ...row }));
  }
}

function renderLivePremios() {
  const list = document.getElementById('livePremiosList');
  if (!list) return;

  if (!livePremiosState.length) {
    list.innerHTML = '<div class="live-repeater-empty">Todavia no has agregado premios para este Live.</div>';
    return;
  }

  list.innerHTML = livePremiosState
    .map((row, index) => `
      <article class="live-repeater-item" data-live-premio-index="${index}">
        <div class="live-repeater-item__header">
          <h4 class="live-repeater-item__title">Premio #${index + 1}</h4>
          <button type="button" class="btn btn-danger btn-sm" data-remove-live-premio="${index}">
            Quitar
          </button>
        </div>

        <div class="form-row-inline">
          <div class="form-group">
            <label>Tipo</label>
            <select data-live-premio-field="tipo">
              <option value="efectivo" ${row.tipo === 'efectivo' ? 'selected' : ''}>Efectivo</option>
              <option value="extra" ${row.tipo === 'extra' ? 'selected' : ''}>Extra</option>
              <option value="otro" ${row.tipo === 'otro' ? 'selected' : ''}>Otro</option>
            </select>
          </div>
          <div class="form-group">
            <label>Monto</label>
            <input
              type="text"
              inputmode="decimal"
              placeholder="Ej: 10000"
              value="${escapeHtml(row.monto)}"
              data-live-premio-field="monto"
            >
          </div>
        </div>

        <div class="form-group">
          <label>Nombre del premio</label>
          <input
            type="text"
            placeholder="Ej: Premio mayor, Bonus sorpresa, Cuenta extra"
            value="${escapeHtml(row.nombre)}"
            data-live-premio-field="nombre"
          >
        </div>

        <div class="form-group">
          <label>Descripcion interna</label>
          <textarea
            rows="2"
            placeholder="Opcional. Nota interna para el admin."
            data-live-premio-field="descripcion"
          >${escapeHtml(row.descripcion)}</textarea>
        </div>
      </article>
    `)
    .join('');
}

function renderLiveReferidos() {
  const list = document.getElementById('liveReferidosList');
  if (!list) return;

  if (!liveReferidosState.length) {
    list.innerHTML = '<div class="live-repeater-empty">Todavia no has agregado reglas de referidos para este Live.</div>';
    return;
  }

  list.innerHTML = liveReferidosState
    .map((row, index) => `
      <article class="live-repeater-item" data-live-regla-index="${index}">
        <div class="live-repeater-item__header">
          <h4 class="live-repeater-item__title">Regla #${index + 1}</h4>
          <button type="button" class="btn btn-danger btn-sm" data-remove-live-regla="${index}">
            Quitar
          </button>
        </div>

        <div class="form-row-inline">
          <div class="form-group">
            <label>Minimo de referidos</label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Ej: 2"
              value="${escapeHtml(row.minimo_referidos)}"
              data-live-regla-field="minimo_referidos"
            >
          </div>
          <div class="form-group">
            <label>Monto a pagar</label>
            <input
              type="text"
              inputmode="decimal"
              placeholder="Ej: 5000"
              value="${escapeHtml(row.recompensa_monto)}"
              data-live-regla-field="recompensa_monto"
            >
          </div>
        </div>

        <div class="form-group">
          <label>Descripcion</label>
          <input
            type="text"
            placeholder="Ej: Pago parcial por 2 referidos"
            value="${escapeHtml(row.descripcion)}"
            data-live-regla-field="descripcion"
          >
        </div>
      </article>
    `)
    .join('');
}

function renderLiveSection({ seedDefaults = false } = {}) {
  const section = document.getElementById('liveConfigSection');
  if (!section) return;

  const isLive = getModalidadValue() === 'live';
  section.hidden = !isLive;

  renderModalidadHelp();
  renderFechaSorteoHelp();

  if (!isLive) return;

  if (seedDefaults) {
    ensureLiveDefaults();
  }

  renderLivePremios();
  renderLiveReferidos();
}

function initModalidadUI() {
  const input = document.getElementById('modalidad');
  if (!input) return;

  renderLiveSection({ seedDefaults: false });
  input.addEventListener('change', () => {
    renderLiveSection({ seedDefaults: true });
  });
}

function initLiveBuilders() {
  const premiosList = document.getElementById('livePremiosList');
  const reglasList = document.getElementById('liveReferidosList');

  document.getElementById('btnAgregarPremioLive')?.addEventListener('click', () => {
    livePremiosState.push({
      tipo: 'efectivo',
      nombre: '',
      monto: '',
      descripcion: '',
    });
    renderLivePremios();
  });

  document.getElementById('btnAgregarReglaReferido')?.addEventListener('click', () => {
    liveReferidosState.push({
      minimo_referidos: '',
      recompensa_monto: '',
      descripcion: '',
    });
    renderLiveReferidos();
  });

  premiosList?.addEventListener('input', (event) => {
    const field = event.target?.dataset?.livePremioField;
    const container = event.target?.closest('[data-live-premio-index]');
    if (!field || !container) return;

    const index = Number.parseInt(container.dataset.livePremioIndex || '', 10);
    if (!Number.isInteger(index) || !livePremiosState[index]) return;

    livePremiosState[index][field] = event.target.value;
  });

  premiosList?.addEventListener('change', (event) => {
    const field = event.target?.dataset?.livePremioField;
    const container = event.target?.closest('[data-live-premio-index]');
    if (!field || !container) return;

    const index = Number.parseInt(container.dataset.livePremioIndex || '', 10);
    if (!Number.isInteger(index) || !livePremiosState[index]) return;

    livePremiosState[index][field] = event.target.value;
  });

  premiosList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-live-premio]');
    if (!button) return;

    const index = Number.parseInt(button.dataset.removeLivePremio || '', 10);
    if (!Number.isInteger(index)) return;

    livePremiosState.splice(index, 1);
    renderLivePremios();
  });

  reglasList?.addEventListener('input', (event) => {
    const field = event.target?.dataset?.liveReglaField;
    const container = event.target?.closest('[data-live-regla-index]');
    if (!field || !container) return;

    const index = Number.parseInt(container.dataset.liveReglaIndex || '', 10);
    if (!Number.isInteger(index) || !liveReferidosState[index]) return;

    liveReferidosState[index][field] = event.target.value;
  });

  reglasList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-live-regla]');
    if (!button) return;

    const index = Number.parseInt(button.dataset.removeLiveRegla || '', 10);
    if (!Number.isInteger(index)) return;

    liveReferidosState.splice(index, 1);
    renderLiveReferidos();
  });
}

function collectLivePayload() {
  const modalidad = getModalidadValue();
  const isLive = modalidad === 'live';

  const liveConfig = {
    beneficio_entrada_nombre: sanitizeText(document.getElementById('beneficio_entrada_nombre')?.value),
    beneficio_entrada_descripcion: sanitizeText(document.getElementById('beneficio_entrada_descripcion')?.value),
    permite_premios_extra: Boolean(document.getElementById('live_permite_premios_extra')?.checked),
  };

  if (!isLive) {
    return {
      modalidad,
      live_config: liveConfig,
      live_prizes: [],
      live_referral_rules: [],
    };
  }

  const premios = livePremiosState
    .map((row) => normalizeLivePrizeRow(row))
    .filter((row) => row.nombre || row.monto || row.descripcion);

  if (!premios.length) {
    return { error: 'Agrega al menos un premio para el sorteo Live.' };
  }

  for (const [index, premio] of premios.entries()) {
    if (!premio.nombre) {
      return { error: `El premio #${index + 1} necesita un nombre.` };
    }

    if (premio.monto) {
      const parsed = parseMontoNoNegativo(premio.monto);
      if (parsed == null) {
        return { error: `El monto del premio #${index + 1} no es valido.` };
      }
      premio.monto = parsed.toFixed(2);
    } else {
      premio.monto = '';
    }
  }

  const referralRules = liveReferidosState
    .map((row) => normalizeLiveReferralRuleRow(row))
    .filter((row) => row.minimo_referidos || row.recompensa_monto || row.descripcion);

  for (const [index, rule] of referralRules.entries()) {
    const minimo = parseCantidadNumeros(rule.minimo_referidos);
    const monto = parseMontoNoNegativo(rule.recompensa_monto);

    if (!minimo) {
      return { error: `La regla de referidos #${index + 1} necesita un minimo valido.` };
    }

    if (monto == null) {
      return { error: `La regla de referidos #${index + 1} necesita un monto valido.` };
    }

    rule.minimo_referidos = String(minimo);
    rule.recompensa_monto = monto.toFixed(2);
  }

  return {
    modalidad,
    live_config: liveConfig,
    live_prizes: premios,
    live_referral_rules: referralRules,
  };
}

async function cargarSorteoParaEditar(id) {
  const token = localStorage.getItem('token');
  if (!token) {
    mostrarToast('Sesion no valida. Inicia sesion nuevamente.');
    return;
  }

  try {
    const resp = await fetch(`${API_URL}/api/sorteos/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      console.error('Error cargando sorteo para editar:', resp.status);
      mostrarToast('No se pudo cargar el sorteo para edicion.');
      return;
    }

    const s = await resp.json();

    document.getElementById('descripcion').value = s.descripcion || '';
    document.getElementById('premio').value = s.premio || '';
    document.getElementById('tipo_producto').value = s.tipo_producto || 'pantalla';
    document.getElementById('modalidad').value = s.modalidad || 'normal';
    document.getElementById('cantidad_numeros').value = s.cantidad_numeros || '';
    document.getElementById('precio_numero').value = s.precio_numero || '';

    if (document.getElementById('fecha_sorteo')) {
      document.getElementById('fecha_sorteo').value = s.fecha_sorteo
        ? String(s.fecha_sorteo).substring(0, 10)
        : '';
    }

    const liveConfig = s.live_config || {};
    document.getElementById('beneficio_entrada_nombre').value = liveConfig.beneficio_entrada_nombre || '';
    document.getElementById('beneficio_entrada_descripcion').value = liveConfig.beneficio_entrada_descripcion || '';
    document.getElementById('live_permite_premios_extra').checked =
      liveConfig.permite_premios_extra !== false;

    livePremiosState = Array.isArray(s.live_prizes)
      ? s.live_prizes.map((row) => normalizeLivePrizeRow(row))
      : [];

    liveReferidosState = Array.isArray(s.live_referral_rules)
      ? s.live_referral_rules.map((row) => normalizeLiveReferralRuleRow(row))
      : [];

    estadoActual = s.estado || 'activo';
    imagenActualUrl = s.imagen_url || null;

    const preview = document.getElementById('previewImagen');
    if (preview) {
      if (imagenActualUrl) {
        preview.innerHTML = `<img src="${imagenActualUrl}" alt="Imagen actual del sorteo">`;
      } else {
        preview.innerHTML = '<span>Sin imagen</span>';
      }
    }

    const titulo = document.querySelector('h2');
    if (titulo) {
      titulo.textContent = 'Editar sorteo';
    }

    const btn = document.querySelector('#formCrearSorteo button[type="submit"]');
    if (btn) {
      btn.textContent = 'Guardar cambios';
    }

    renderTipoProductoHelp();
    renderLiveSection({ seedDefaults: false });
    renderFechaSorteoHelp();
  } catch (err) {
    console.error(err);
    mostrarToast('Error de conexion al cargar el sorteo.');
  }
}

async function enviarFormulario(event) {
  event.preventDefault();

  const descripcion = sanitizeText(document.getElementById('descripcion').value);
  const premio = sanitizeText(document.getElementById('premio').value);
  const cantidad_numeros = document.getElementById('cantidad_numeros').value;
  const precio_numero = document.getElementById('precio_numero').value;
  const fecha_sorteo = document.getElementById('fecha_sorteo').value;
  const tipo_producto = getTipoProductoValue();
  const imagenInput = document.getElementById('imagen');
  const submitBtn = document.querySelector('#formCrearSorteo button[type="submit"]');
  const cantidadNumeros = parseCantidadNumeros(cantidad_numeros);
  const precioNumero = parsePrecioNumero(precio_numero);
  const isLive = getModalidadValue() === 'live';
  const livePayload = collectLivePayload();

  if (!descripcion || !premio || !cantidad_numeros || !precio_numero || (!fecha_sorteo && !isLive)) {
    mostrarToast('Por favor completa todos los campos obligatorios.');
    return;
  }

  if (!cantidadNumeros) {
    mostrarToast('La cantidad de numeros debe ser un entero mayor que 0.');
    return;
  }

  if (!precioNumero) {
    mostrarToast('El precio por numero debe ser mayor que 0.');
    return;
  }

  if (livePayload.error) {
    mostrarToast(livePayload.error);
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    mostrarToast('Sesion no valida. Inicia sesion nuevamente.');
    return;
  }

  const oldBtnText = submitBtn?.textContent || 'Guardar sorteo';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = modoEdicion ? 'Guardando cambios...' : 'Guardando...';
  }

  const payload = {
    descripcion,
    premio,
    cantidad_numeros: String(cantidadNumeros),
    precio_numero: precioNumero.toFixed(2),
    fecha_sorteo: fecha_sorteo || '',
    tipo_producto,
    modalidad: livePayload.modalidad,
    live_config: livePayload.live_config,
    live_prizes: livePayload.live_prizes,
    live_referral_rules: livePayload.live_referral_rules,
  };

  try {
    if (!modoEdicion) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        const finalValue = typeof value === 'object' ? JSON.stringify(value) : value;
        formData.append(key, finalValue);
      });

      if (imagenInput.files?.[0]) {
        formData.append('imagen', imagenInput.files[0]);
      }

      const resp = await fetch(`${API_URL}/api/sorteos/crear`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await readResponseData(resp);

      if (!resp.ok || data?.error) {
        console.error('Error creando sorteo:', data?.error || data);
        mostrarToast(data?.error || 'Error al crear el sorteo.');
        return;
      }

      mostrarToast('Sorteo creado correctamente.');
      setTimeout(() => {
        window.location.href = 'panel.html';
      }, 1200);
      return;
    }

    payload.estado = estadoActual;
    const hasNewImage = Boolean(imagenInput.files?.[0]);
    let resp;

    if (hasNewImage) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        const finalValue = typeof value === 'object' ? JSON.stringify(value) : value;
        formData.append(key, finalValue);
      });
      formData.append('imagen', imagenInput.files[0]);

      resp = await fetch(`${API_URL}/api/sorteos/${sorteoId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    } else {
      resp = await fetch(`${API_URL}/api/sorteos/${sorteoId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    }

    const data = await readResponseData(resp);

    if (!resp.ok || data?.error) {
      console.error('Error actualizando sorteo:', data?.error || data);
      mostrarToast(data?.error || 'Error al actualizar el sorteo.');
      return;
    }

    mostrarToast('Sorteo actualizado correctamente.');
    setTimeout(() => {
      window.location.href = 'panel.html';
    }, 1200);
  } catch (err) {
    console.error(err);
    mostrarToast(
      modoEdicion
        ? 'Error de conexion al actualizar el sorteo.'
        : 'Error de conexion al crear el sorteo.'
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = oldBtnText;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initPreviewImagen();
  initTipoProductoUI();
  initLiveBuilders();
  initModalidadUI();
  renderFechaSorteoHelp();

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (id) {
    modoEdicion = true;
    sorteoId = id;
    cargarSorteoParaEditar(id);
  }

  const form = document.getElementById('formCrearSorteo');
  if (form) {
    form.addEventListener('submit', enviarFormulario);
  }
});
