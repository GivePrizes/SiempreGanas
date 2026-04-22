const API_URL = window.API_URL || '';
const REFERRAL_REFRESH_WINDOW_MS = 60000;

let lastFetchAt = 0;
let listenersBound = false;

function hideReferralSummary() {
  const box = document.getElementById('referralMini');
  if (box) {
    box.hidden = true;
  }
}

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '$0';
  return `$${amount.toLocaleString('es-CO')}`;
}

function getInviteText(code) {
  return `Usa mi codigo ${code} en el Live de Mathome. Si tu compra queda validada, cuenta para el programa de socios.`;
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    if (typeof window.mostrarToast === 'function') {
      window.mostrarToast(successMessage);
    } else {
      alert(successMessage);
    }
  } catch {
    if (typeof window.mostrarToast === 'function') {
      window.mostrarToast('No se pudo copiar. Intenta de nuevo.');
    }
  }
}

function bindReferralActions() {
  if (listenersBound) return;

  const codeButton = document.getElementById('btnCopyReferralCode');
  const inviteButton = document.getElementById('btnCopyReferralInvite');

  codeButton?.addEventListener('click', async () => {
    const code = String(codeButton.dataset.code || '').trim();
    if (!code) return;
    await copyText(code, 'Codigo copiado');
  });

  inviteButton?.addEventListener('click', async () => {
    const code = String(inviteButton.dataset.code || '').trim();
    if (!code) return;
    await copyText(getInviteText(code), 'Texto de invitacion copiado');
  });

  listenersBound = true;
}

function renderReferralSummary(data, { visible = true } = {}) {
  const box = document.getElementById('referralMini');
  const title = document.getElementById('referralMiniTitle');
  const meta = document.getElementById('referralMiniMeta');
  const pending = document.getElementById('referralMiniPending');
  const bar = document.getElementById('referralMiniBar');
  const code = document.getElementById('referralCodeValue');
  const btnCopyCode = document.getElementById('btnCopyReferralCode');
  const btnCopyInvite = document.getElementById('btnCopyReferralInvite');

  if (!box || !title || !meta || !pending || !bar || !code || !btnCopyCode || !btnCopyInvite) {
    return;
  }

  if (!visible) {
    box.hidden = true;
    return;
  }

  if (data?.enabled === false) {
    box.hidden = true;
    return;
  }

  const totalValidados = Number(data?.total_validados || 0);
  const currentTier = data?.current_tier || null;
  const nextTier = data?.next_tier || null;
  const pendingAmount = Number(data?.pending_rewards?.amount || 0);
  const referralCode = String(data?.referral_code || '').trim();

  const currentTierName = currentTier?.nombre || 'Aun sin nivel';
  const progressPercent = nextTier?.minimo_validados
    ? Math.max(
        0,
        Math.min(100, Math.round((totalValidados / Number(nextTier.minimo_validados || 1)) * 100))
      )
    : 100;

  box.hidden = false;
  title.textContent = `${totalValidados} referido${totalValidados === 1 ? '' : 's'} validado${totalValidados === 1 ? '' : 's'}`;

  if (nextTier?.nombre) {
    meta.textContent = `${currentTierName}. Te faltan ${nextTier.faltan} para ${nextTier.nombre}.`;
  } else {
    meta.textContent = `${currentTierName}. Ya estás en el nivel más alto.`;
  }

  pending.textContent = pendingAmount > 0
    ? `Pendiente: ${formatMoney(pendingAmount)}`
    : 'Sin pendientes';

  bar.style.width = `${progressPercent}%`;
  code.textContent = referralCode || 'Sin código';
  btnCopyCode.dataset.code = referralCode;
  btnCopyInvite.dataset.code = referralCode;
  btnCopyCode.disabled = !referralCode;
  btnCopyInvite.disabled = !referralCode;
}

export async function cargarResumenReferidos({ force = false, visible = true } = {}) {
  try {
    if (!visible) {
      hideReferralSummary();
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const now = Date.now();
    if (!force && now - lastFetchAt < REFERRAL_REFRESH_WINDOW_MS) {
      return;
    }

    lastFetchAt = now;
    bindReferralActions();

    const res = await fetch(`${API_URL}/api/referidos/resumen`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return;

    const data = await res.json();
    renderReferralSummary(data, { visible });
  } catch (err) {
    console.error('Error cargando referidos:', err);
  }
}
