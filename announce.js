// ══════════════════════════════════════════════════════════════
// ANNOUNCEMENT — recurring launch popup for everyone
// ══════════════════════════════════════════════════════════════
//
// A broadcast message shown at every app open, until the owner removes it.
// Used right now to ask colleagues to send their eCrew roster screenshot on
// WhatsApp so the new season's schedule can be rebuilt by comparing rosters.
//
// Users can close it each time ("Più tardi"); it comes back on the next open.
// To TURN IT OFF for everyone, set APPEAL_ACTIVE = false (or remove this file)
// and ship an app update — there's no per-user "seen" flag anymore.

const APPEAL_ACTIVE = true;                 // flip to false to stop showing it
const APPEAL_WA_NUMBER = '393407894585';

// Message pre-filled in WhatsApp when a colleague taps the button. They still
// attach the screenshot themselves (a link can't pre-attach an image).
const APPEAL_WA_TEXT =
  "Ciao Marius! Ecco il mio roster eCrew per aggiornare lo schedule CrewPSR 📋 (allego lo screenshot)";

function openScheduleAppeal() {
  const title = document.getElementById('settingModalTitle');
  const body  = document.getElementById('settingModalBody');
  if (!title || !body) return;

  const waUrl = `https://wa.me/${APPEAL_WA_NUMBER}?text=${encodeURIComponent(APPEAL_WA_TEXT)}`;

  title.textContent = '📋 Aiutami con lo schedule';
  body.innerHTML = `
    <div style="font-size:13px;color:var(--text);line-height:1.65;margin-bottom:14px">
      Da novembre cambiano gli orari dei voli. Invece di cercarli uno a uno,
      sto ricostruendo lo schedule <strong>confrontando i roster di più
      colleghi</strong>.
    </div>

    <div style="background:var(--blue-lt);border:1px solid var(--blue);border-radius:12px;
                padding:12px 14px;margin-bottom:14px;font-size:13px;color:var(--text);line-height:1.6">
      Se vuoi dare una mano, mandami su WhatsApp lo screenshot del tuo roster.
    </div>

    <div style="background:var(--yellow-lt);border-left:3px solid var(--yellow);
                border-radius:8px;padding:10px 12px;margin-bottom:16px;font-size:12px;
                line-height:1.5;color:var(--text2)">
      ⚠️ Mi serve il roster di <strong>eCrew</strong> (il piano mensile) —
      lo stesso che usi per importare il roster nell'app.
    </div>

    <a href="${waUrl}" target="_blank" rel="noopener noreferrer"
       onclick="_appealGoWhatsApp()"
       style="display:flex;align-items:center;justify-content:center;gap:8px;
              text-decoration:none;background:#25D366;color:white;
              font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;
              padding:14px;border-radius:12px;margin-bottom:8px">
      📲 Invia il mio roster su WhatsApp
    </a>
    <button class="btn secondary" onclick="closeModal('settingModal')">Più tardi</button>
    <div style="font-size:11px;color:var(--text3);text-align:center;margin-top:10px">
      Grazie! 🙏
    </div>
  `;
  document.getElementById('settingModal').classList.add('open');
}

function _appealGoWhatsApp() {
  // The link opens WhatsApp on its own; we just close the modal behind them.
  setTimeout(() => closeModal('settingModal'), 100);
}

// Called from initApp() at launch. Shows the appeal on every open, but never on
// top of the release-notes popup (which also uses settingModal) and never to
// the owner in Marius mode.
function autoShowScheduleAppealIfNeeded() {
  if (!APPEAL_ACTIVE) return;
  if (APP && APP.mariusMode) return; // owner doesn't need to message himself

  // Release notes auto-show ~800ms in; wait a bit longer, and if that modal is
  // already open, skip the appeal this launch instead of clobbering it.
  setTimeout(() => {
    const modal = document.getElementById('settingModal');
    if (modal && modal.classList.contains('open')) return;
    openScheduleAppeal();
  }, 1300);
}

window.openScheduleAppeal = openScheduleAppeal;
window.autoShowScheduleAppealIfNeeded = autoShowScheduleAppealIfNeeded;
window._appealGoWhatsApp = _appealGoWhatsApp;
