// frontend/assets/js/admin/comprobantes.js

const API_URL = window.API_URL || '';

function agruparComprobantesPorSorteo(comprobantes) {
  const mapa = new Map();

  for (const c of comprobantes) {
    const id = c.sorteo_id;
    if (!mapa.has(id)) {
      mapa.set(id, {
        sorteo_id: id,
        sorteo: c.sorteo,
        comprobantes: [],
      });
    }
    mapa.get(id).comprobantes.push(c);
  }

  return Array.from(mapa.values());
}

// Estado para evitar parpadeo
let yaPintoAlgo = false;
let ultimoHTML = '';

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '$0';
  return `$${amount.toLocaleString('es-CO')}`;
}

function formatReferralIdentifier(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return /^\d+$/.test(normalized) ? `ID ${normalized}` : `@${normalized}`;
}

// Mini estado "actualizando..." sin borrar el contenedor
function setMiniEstado(texto) {
  const contenedor = document.getElementById('comprobantes');
  if (!contenedor) return;

  let el = contenedor.querySelector('.mini-estado');
  if (!el) {
    el = document.createElement('div');
    el.className = 'mini-estado';
    contenedor.prepend(el);
  }

  el.textContent = texto || '';
  el.style.display = texto ? 'block' : 'none';
}

function construirHTML(grupos) {
  if (!grupos.length) {
    return '<p>No hay pendientes.</p>';
  }

  const mapMetodo = (m) => {
    if (!m) return 'manual';
    if (m === 'nequi_qr') return 'Nequi QR';
    if (m === 'nequi_key') return 'Nequi llave';
    if (m === 'comprobante') return 'Con comprobante';
    return m;
  };

  return grupos
    .map((grupo) => {
      const items = grupo.comprobantes
        .map(
          (c) => `
          <li class="comprobante-item">
            <div class="comprobante-info">
              <strong>#${c.numero}</strong> - ${c.usuario} (${c.telefono})
              <br>
              ${
                c.comprobante_url
                  ? `<a href="${c.comprobante_url}" target="_blank" class="link">Ver comprobante</a>`
                  : `<span class="text-muted">Sin comprobante (Ya pagó)</span>`
              }
              <br>
              <small>Método: ${mapMetodo(c.pago_metodo)}</small>
              ${
                c.pagador_nombre || c.pagador_telefono
                  ? `<br><small>Pagador: ${c.pagador_nombre || '—'} · ${c.pagador_telefono || '—'}</small>`
                  : ''
              }
              <br>
              <small>${new Date(c.fecha).toLocaleString()}</small>
            </div>
            <div class="comprobante-actions">
              <button class="btn-green" onclick="aprobar(${c.id})">Aprobar</button>
              <button class="btn-red" onclick="rechazar(${c.id})">Rechazar</button>
            </div>
          </li>
        `
        )
        .join('');

      return `
        <article class="sg-card comprobante-group">
          <header class="comprobante-group-header">
            <h3>${grupo.sorteo}</h3>
            <span class="badge">${grupo.comprobantes.length} pendiente(s)</span>
          </header>
          <ul class="comprobante-list">
            ${items}
          </ul>
        </article>
      `;
    })
    .join('');
}

export async function cargarComprobantes() {
  const contenedor = document.getElementById('comprobantes');
  if (!contenedor) return;

  if (!yaPintoAlgo) {
    contenedor.innerHTML = '<p class="loading">Cargando comprobantes...</p>';
  } else {
    setMiniEstado('Actualizando...');
  }

  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/api/admin/comprobantes`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  setMiniEstado('');

  if (res.status === 401 || res.status === 403) {
    contenedor.innerHTML =
      '<p>No tienes permisos o tu sesión expiró. Vuelve a iniciar sesión.</p>';
    yaPintoAlgo = true;
    ultimoHTML = contenedor.innerHTML;
    return;
  }

  if (!res.ok) {
    console.error('Error al cargar comprobantes:', res.status);

    if (!yaPintoAlgo) {
      contenedor.innerHTML = '<p>Error al cargar comprobantes.</p>';
      ultimoHTML = contenedor.innerHTML;
    }
    yaPintoAlgo = true;
    return;
  }

  const data = await res.json();
  const grupos = agruparComprobantesPorSorteo(data);

  const nuevoHTML = construirHTML(grupos);

  if (nuevoHTML !== ultimoHTML) {
    contenedor.innerHTML = nuevoHTML;
    ultimoHTML = nuevoHTML;
  }

  yaPintoAlgo = true;
}

async function leerRespuesta(res, fallbackMessage) {
  let payload = null;

  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    throw new Error(payload?.error || fallbackMessage);
  }

  return payload;
}

function buildApprovalAlertMessage(data) {
  const blocks = [];
  const referral = data?.live_referidos?.referral;
  const totalAprobados = Number(data?.live_referidos?.total_aprobados || 0);
  const nuevasOperaciones = Array.isArray(data?.live_referidos?.nuevas_operaciones)
    ? data.live_referidos.nuevas_operaciones
    : [];

  if (referral?.referidorAlias || referral?.referidorNombre) {
    const referidor = referral.referidorAlias
      ? formatReferralIdentifier(referral.referidorAlias)
      : referral.referidorNombre;
    const totalText = totalAprobados > 0
      ? ` Ya va en ${totalAprobados} compra${totalAprobados === 1 ? '' : 's'} referida${totalAprobados === 1 ? '' : 's'} aprobada${totalAprobados === 1 ? '' : 's'}.`
      : '';
    blocks.push(`Referido Live reconocido para ${referidor}.${totalText}`);
  }

  if (nuevasOperaciones.length) {
    const resumen = nuevasOperaciones
      .map((op) => {
        const meta = Number(op.minimoReferidos || 0);
        const monto = formatMoney(op.monto);
        return `- Pago Live creado: ${meta} compra${meta === 1 ? '' : 's'} referida${meta === 1 ? '' : 's'} -> ${monto}`;
      })
      .join('\n');
    blocks.push(`Se generaron operaciones en admin cuentas:\n${resumen}`);
  }

  const referralProgram = data?.referidos_programa || null;
  const referralProgramReferrer = referralProgram?.referral || null;
  const totalValidados = Number(referralProgram?.total_validados || 0);
  const nuevasRecompensas = Array.isArray(referralProgram?.nuevas_recompensas)
    ? referralProgram.nuevas_recompensas
    : [];

  if (
    referralProgramReferrer?.referrerCode
    || referralProgramReferrer?.referrerAlias
    || referralProgramReferrer?.referrerNombre
  ) {
    const referidor = referralProgramReferrer.referrerCode
      ? referralProgramReferrer.referrerCode
      : referralProgramReferrer.referrerAlias
        ? formatReferralIdentifier(referralProgramReferrer.referrerAlias)
        : referralProgramReferrer.referrerNombre;
    const totalText = totalValidados > 0
      ? ` Ahora lleva ${totalValidados} compra${totalValidados === 1 ? '' : 's'} validada${totalValidados === 1 ? '' : 's'}.`
      : '';
    blocks.push(`Programa de socios reconocido para ${referidor}.${totalText}`);
  }

  if (nuevasRecompensas.length) {
    const resumen = nuevasRecompensas
      .map((reward) => {
        const meta = Number(reward.minimoValidados || 0);
        const monto = formatMoney(reward.monto);
        return `- ${reward.tierNombre || 'Nivel'}: ${meta} validados -> ${monto}`;
      })
      .join('\n');
    blocks.push(`Se generaron pagos del programa de socios:\n${resumen}`);
  }

  if (Array.isArray(data?.warnings) && data.warnings.length) {
    blocks.push(data.warnings.join('\n'));
  }

  if (!blocks.length) return '';
  return `Comprobante aprobado.\n\n${blocks.join('\n\n')}`;
}

async function aprobar(id) {
  if (!confirm('¿Aprobar?')) return;
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_URL}/api/admin/comprobantes/aprobar/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await leerRespuesta(res, 'No se pudo aprobar el comprobante.');

    const approvalMessage = buildApprovalAlertMessage(data);
    if (approvalMessage) {
      alert(approvalMessage);
    }

    await cargarComprobantes();
  } catch (error) {
    console.error('Error aprobando comprobante:', error);
    alert(error.message || 'No se pudo aprobar el comprobante.');
  }
}

async function rechazar(id) {
  if (!confirm('¿Rechazar?')) return;
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_URL}/api/admin/comprobantes/rechazar/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    await leerRespuesta(res, 'No se pudo rechazar el comprobante.');
    await cargarComprobantes();
  } catch (error) {
    console.error('Error rechazando comprobante:', error);
    alert(error.message || 'No se pudo rechazar el comprobante.');
  }
}

window.aprobar = aprobar;
window.rechazar = rechazar;
