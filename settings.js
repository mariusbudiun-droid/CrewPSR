// ── Theme names ───────────────────────────────────────────────
const THEMES = [
  { id: 'ocean',    label: '🌊 Ocean Blue'  },
  { id: 'midnight', label: '🌙 Midnight'    },
  { id: 'sunset',   label: '🌅 Sunset'      },
  { id: 'forest',   label: '🌿 Forest'      },
  { id: 'rose',     label: '🌸 Rose'        },
  { id: 'slate',    label: '🩶 Slate'       },
];

function setTheme(theme, mode) {
  if (theme !== undefined) APP.themeName = theme;
  if (mode  !== undefined) APP.themeMode = mode;
  save();
  applyTheme();
  renderSettings();
}

function applyTheme() {
  const name = APP.themeName || 'ocean';
  const mode = APP.themeMode || 'system';
  document.documentElement.setAttribute('data-theme', name);
  document.documentElement.setAttribute('data-mode',  mode);
}

function renderSettings() {
  const rEl = document.getElementById('settingRoster');
  if (rEl) rEl.textContent = APP.roster ? `Roster ${APP.roster}` : '-';

  const dEl = document.getElementById('settingDate');
  if (dEl) dEl.textContent = APP.refDate || '-';

  const vEl = document.getElementById('settingSchedVersion');
  if (vEl) vEl.textContent = `${SCHEDULE.version} • ${SCHEDULE.period}`;

  // Theme selectors
  const tSel = document.getElementById('themeNameSelect');
  if (tSel) tSel.value = APP.themeName || 'ocean';
  const mSel = document.getElementById('themeModeSelect');
  if (mSel) mSel.value = APP.themeMode || 'system';

  const n = APP.notif || {};
  const enabled = document.getElementById('notifEnabled');
  if (enabled) enabled.checked = !!n.enabled;
  document.getElementById('notifOptions').style.display = n.enabled ? 'block' : 'none';
  document.getElementById('notifReport').checked = n.report !== false;
  document.getElementById('notifDep').value = n.dep || 'first';
  document.getElementById('notifArr').value = n.arr || 'last';
}

function setNotifPref(key, val) {
  if (!APP.notif) APP.notif = {};
  APP.notif[key] = val;
  save();
  renderSettings();
  if (APP.notif.enabled) scheduleAllNotifications();
}

function changeSetting(type) {
  const title = document.getElementById('settingModalTitle');
  const body  = document.getElementById('settingModalBody');

  if (type === 'roster') {
    title.textContent = 'Change Roster';
    const opts = Array.from({ length: 16 }, (_, i) =>
      `<option value="${i+1}" ${APP.roster == i+1 ? 'selected' : ''}>Roster ${i+1}</option>`
    ).join('');
    body.innerHTML = `
      <select id="chRoster">${opts}</select>
      <button class="btn" onclick="APP.roster=parseInt(document.getElementById('chRoster').value);save();renderSettings();renderHome();closeModal('settingModal')">Save</button>
      <button class="btn secondary" onclick="closeModal('settingModal')">Cancel</button>`;

  } else if (type === 'date') {
    title.textContent = 'Change Cycle Date';
    body.innerHTML = `
      <input type="date" id="chDate" value="${APP.refDate || ''}">
      <button class="btn" onclick="APP.refDate=document.getElementById('chDate').value;save();renderSettings();renderHome();renderCalendar();closeModal('settingModal')">Save</button>
      <button class="btn secondary" onclick="closeModal('settingModal')">Cancel</button>`;

  } else if (type === 'pin') {
    title.textContent = 'Sicurezza Accesso';
    body.innerHTML = `
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">Scegli come proteggere la Crew Directory</div>
      <label class="inp-label">Tipo di protezione</label>
      <select id="secType"
        onchange="document.getElementById('secPinF').style.display=this.value==='pin'?'block':'none';document.getElementById('secPassF').style.display=this.value==='password'?'block':'none'"
        style="margin-bottom:10px">
        <option value="pin" ${!APP.usePassword?'selected':''}>PIN 4 cifre</option>
        <option value="password" ${APP.usePassword?'selected':''}>Password testo libero</option>
      </select>
      <div id="secPinF" style="${APP.usePassword?'display:none':''}">
        <label class="inp-label">Nuovo PIN 4 cifre</label>
        <input type="password" id="newPinTxt" maxlength="4" inputmode="numeric" placeholder="es. 1234"
          style="text-align:center;letter-spacing:6px;font-size:20px;margin-bottom:8px">
      </div>
      <div id="secPassF" style="${APP.usePassword?'':'display:none'}">
        <label class="inp-label">Nuova Password</label>
        <input type="password" id="newPassTxt" placeholder="Inserisci password" style="margin-bottom:8px">
      </div>
      <button class="btn" onclick="
        const t=document.getElementById('secType').value;
        if(t==='pin'){const v=document.getElementById('newPinTxt').value;if(v.length!==4||isNaN(v)){alert('Il PIN deve essere di 4 cifre');return;}APP.pin=v;APP.usePassword=false;APP.password=null;}
        else{const v=document.getElementById('newPassTxt').value.trim();if(!v){alert('Inserisci una password');return;}APP.password=v;APP.usePassword=true;APP.pin=null;}
        save();closeModal('settingModal');renderSettings();">Salva</button>
      <button class="btn secondary" onclick="closeModal('settingModal')">Annulla</button>`;
  }

  document.getElementById('settingModal').classList.add('open');
}

// ── Sync UI ───────────────────────────────────────────────────
function renderSyncScreen() {
  const el = document.getElementById('syncScreenContent');
  if (!el) return;

  if (!APP.syncLoggedIn) {
    el.innerHTML = `
      <div style="font-size:13px;color:var(--text2);margin-bottom:20px;line-height:1.6">
        Sync your roster with colleagues. See who you fly with each day, and share your calendar with teammates.
      </div>
      <button onclick="showSyncLogin()"
        style="width:100%;padding:14px;border-radius:12px;border:none;background:var(--blue);
               font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;
               color:white;cursor:pointer">
        🔗 Login / Register
      </button>`;
    return;
  }

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <div style="background:var(--blue);color:white;width:36px;height:36px;border-radius:10px;
                  display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800">
        ${APP.syncCrewCode?.slice(0,2) || '?'}
      </div>
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--text)">${APP.syncCrewCode || ''}</div>
        <div style="font-size:12px;color:var(--green)">✓ Connected</div>
      </div>
      <button onclick="syncLogout();renderSyncScreen()"
        style="margin-left:auto;padding:6px 12px;border-radius:8px;border:1px solid var(--border);
               background:none;font-family:'Outfit',sans-serif;font-size:12px;
               color:var(--text3);cursor:pointer">Logout</button>
    </div>
    <button onclick="syncPushThenShow()"
      style="width:100%;padding:11px;border-radius:10px;border:1.5px solid var(--blue);
             background:var(--blue-lt);font-family:'Outfit',sans-serif;font-size:13px;
             font-weight:700;color:var(--blue);cursor:pointer;margin-bottom:8px">
      ☁️ Sync my roster now
    </button>
    <button onclick="showPendingRequestsBadge()"
      style="width:100%;padding:11px;border-radius:10px;border:1px solid var(--border);
             background:none;font-family:'Outfit',sans-serif;font-size:13px;
             font-weight:600;color:var(--text2);cursor:pointer;margin-bottom:8px"
      id="pendingReqBtn">
      📬 Access requests
    </button>
    <button onclick="showRequestAccess()"
      style="width:100%;padding:11px;border-radius:10px;border:1px solid var(--border);
             background:none;font-family:'Outfit',sans-serif;font-size:13px;
             font-weight:600;color:var(--text2);cursor:pointer;margin-bottom:8px">
      🔍 Request access to someone's roster
    </button>
    <button onclick="openSharedView()"
      style="width:100%;padding:11px;border-radius:10px;border:1px solid var(--border);
             background:none;font-family:'Outfit',sans-serif;font-size:13px;
             font-weight:600;color:var(--text2);cursor:pointer;margin-bottom:8px">
      👀 View shared rosters
    </button>
    <button onclick="showSharingManager()"
      style="width:100%;padding:11px;border-radius:10px;border:1px solid var(--border);
             background:none;font-family:'Outfit',sans-serif;font-size:13px;
             font-weight:600;color:var(--text2);cursor:pointer">
      👥 Manage my shares
    </button>`;
}

async function syncPushThenShow() {
  const el = document.getElementById('syncScreenContent');
  if (el) {
    const btn = el.querySelector('button');
    if (btn) { btn.textContent = '⏳ Syncing…'; btn.disabled = true; }
  }
  try {
    const res = await syncPushAssignments();
    renderSyncScreen();
    if (res.ok) {
      alert('✅ Roster synced successfully!');
    } else {
      alert('❌ Sync failed: ' + (res.error || 'Unknown error'));
    }
  } catch(e) {
    renderSyncScreen();
    alert('❌ Sync error: ' + e.message);
  }
}
window.syncPushThenShow = syncPushThenShow;

function showSyncLogin() {
  document.getElementById('settingModalTitle').textContent = 'Roster Sync';
  document.getElementById('settingModalBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
      <button onclick="showSyncRegisterForm()"
        style="padding:14px;border-radius:12px;border:1.5px solid var(--blue);
               background:var(--blue-lt);font-family:'Outfit',sans-serif;
               font-size:14px;font-weight:700;color:var(--blue);cursor:pointer;text-align:left">
        ✨ Register — first time
        <div style="font-size:11px;font-weight:400;color:var(--text2);margin-top:3px">Create your account (requires approval)</div>
      </button>
      <button onclick="showSyncLoginForm()"
        style="padding:14px;border-radius:12px;border:1px solid var(--border);
               background:var(--surface);font-family:'Outfit',sans-serif;
               font-size:14px;font-weight:600;color:var(--text);cursor:pointer;text-align:left">
        🔑 Login — already registered
      </button>
    </div>
    <button class="btn secondary" onclick="closeModal('settingModal')">Cancel</button>`;
  document.getElementById('settingModal').classList.add('open');
}
window.showSyncLogin = showSyncLogin;

function showSyncRegisterForm() {
  document.getElementById('settingModalTitle').textContent = 'Register';
  document.getElementById('settingModalBody').innerHTML = `
    <label class="inp-label">Crew Code (e.g. ABCDE)</label>
    <input id="regCode" type="text" maxlength="6" placeholder="ABCDE"
      style="text-transform:uppercase;letter-spacing:2px;font-weight:700">
    <label class="inp-label">Display Name</label>
    <input id="regName" type="text" placeholder="Your first name">
    <label class="inp-label">Roster Number</label>
    <select id="regRoster">
      ${Array.from({length:16},(_,i)=>`<option value="${i+1}">Roster ${i+1}</option>`).join('')}
    </select>
    <label class="inp-label">PIN (4 digits — for sync login)</label>
    <input id="regPin" type="password" inputmode="numeric" maxlength="4" placeholder="1234"
      style="text-align:center;letter-spacing:6px;font-size:20px">
    <div id="regMsg" style="font-size:12px;margin-top:4px;display:none"></div>
    <button class="btn" style="margin-top:4px" onclick="_doRegister()">Register →</button>
    <button class="btn secondary" onclick="showSyncLogin()">← Back</button>`;
  document.getElementById('settingModal').classList.add('open');
}
window.showSyncRegisterForm = showSyncRegisterForm;

async function _doRegister() {
  const code  = document.getElementById('regCode').value.toUpperCase().trim();
  const name  = document.getElementById('regName').value.trim();
  const roster= parseInt(document.getElementById('regRoster').value);
  const pin   = document.getElementById('regPin').value;
  const msg   = document.getElementById('regMsg');

  if (!code || code.length < 3) { msg.textContent='Enter your crew code'; msg.style.color='var(--red)'; msg.style.display='block'; return; }
  if (!name) { msg.textContent='Enter your name'; msg.style.color='var(--red)'; msg.style.display='block'; return; }
  if (pin.length !== 4 || isNaN(pin)) { msg.textContent='PIN must be 4 digits'; msg.style.color='var(--red)'; msg.style.display='block'; return; }

  msg.textContent='Registering…'; msg.style.color='var(--text2)'; msg.style.display='block';

  const res = await syncRegister(code, name, roster, pin);
  if (res.ok) {
    msg.textContent='✅ Registered! Waiting for approval by Marius. You\'ll be able to login once approved.';
    msg.style.color='var(--green)'; msg.style.display='block';
    setTimeout(() => closeModal('settingModal'), 3000);
  } else {
    msg.textContent='❌ ' + res.error; msg.style.color='var(--red)'; msg.style.display='block';
  }
}
window._doRegister = _doRegister;

function showSyncLoginForm() {
  document.getElementById('settingModalTitle').textContent = 'Login';
  document.getElementById('settingModalBody').innerHTML = `
    <label class="inp-label">Crew Code</label>
    <input id="loginCode" type="text" maxlength="6" placeholder="ABCDE"
      style="text-transform:uppercase;letter-spacing:2px;font-weight:700">
    <label class="inp-label">PIN</label>
    <input id="loginPin" type="password" inputmode="numeric" maxlength="4" placeholder="1234"
      style="text-align:center;letter-spacing:6px;font-size:20px">
    <div id="loginMsg" style="font-size:12px;margin-top:4px;display:none"></div>
    <button class="btn" style="margin-top:4px" onclick="_doLogin()">Login →</button>
    <button class="btn secondary" onclick="showSyncLogin()">← Back</button>`;
  document.getElementById('settingModal').classList.add('open');
}
window.showSyncLoginForm = showSyncLoginForm;

async function _doLogin() {
  const code = document.getElementById('loginCode').value.toUpperCase().trim();
  const pin  = document.getElementById('loginPin').value;
  const msg  = document.getElementById('loginMsg');
  msg.textContent='Logging in…'; msg.style.color='var(--text2)'; msg.style.display='block';
  const res = await syncLogin(code, pin);
  if (res.ok) {
    msg.textContent='✅ Logged in!'; msg.style.color='var(--green)'; msg.style.display='block';
    setTimeout(() => { closeModal('settingModal'); renderSettings(); renderSyncScreen(); }, 1000);
  } else {
    msg.textContent='❌ ' + res.error; msg.style.color='var(--red)'; msg.style.display='block';
  }
}
window._doLogin = _doLogin;

async function showSharingManager() {
  document.getElementById('settingModalTitle').textContent = 'Sharing';
  document.getElementById('settingModalBody').innerHTML = `<div style="font-size:13px;color:var(--text2);padding:8px 0">Loading…</div>`;
  document.getElementById('settingModal').classList.add('open');

  const shares = await syncGetMyShares().catch(() => []);

  const rows = shares.length
    ? shares.map(s => `
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--text)">${s.display_name}</div>
            <div style="font-size:11px;color:var(--text3)">${s.crew_code}</div>
          </div>
          <button onclick="syncRevokeShare('${s.crew_code}').then(()=>showSharingManager())"
            style="padding:6px 12px;border-radius:8px;border:1px solid var(--red);
                   background:none;font-family:'Outfit',sans-serif;font-size:12px;
                   color:var(--red);cursor:pointer">Revoke</button>
        </div>`).join('')
    : '<div style="font-size:13px;color:var(--text3);padding:8px 0">No active shares yet.</div>';

  document.getElementById('settingModalBody').innerHTML = `
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px;line-height:1.5">
      You share your roster with these colleagues. They can see your full current week.
    </div>
    <div style="margin-bottom:16px">${rows}</div>
    <div style="font-weight:700;color:var(--text);font-size:13px;margin-bottom:8px">Share with a new colleague</div>
    <input id="shareTargetCode" type="text" maxlength="6" placeholder="Their crew code"
      style="text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:8px">
    <div id="shareMsg" style="font-size:12px;margin-bottom:8px;display:none"></div>
    <button class="btn" onclick="_doShare()" style="margin-bottom:8px">Share →</button>
    <button class="btn secondary" onclick="closeModal('settingModal')">Done</button>`;
}
window.showSharingManager = showSharingManager;

async function _doShare() {
  const code = document.getElementById('shareTargetCode').value.toUpperCase().trim();
  const msg  = document.getElementById('shareMsg');
  if (!code) return;
  msg.textContent='Sharing…'; msg.style.color='var(--text2)'; msg.style.display='block';
  const res = await syncShareWith(code);
  if (res.ok) {
    msg.textContent=`✅ Now sharing with ${res.name}`; msg.style.color='var(--green)'; msg.style.display='block';
    setTimeout(() => showSharingManager(), 1500);
  } else {
    msg.textContent='❌ ' + res.error; msg.style.color='var(--red)'; msg.style.display='block';
  }
}
window._doShare = _doShare;

// ── Update password gate ──────────────────────────────────────
const UPDATE_PWD = 'crewpsr_beta';

function _checkUpdateWithPwd() {
  const pwd = prompt('Enter update password:');
  if (pwd === null) return;
  if (pwd === UPDATE_PWD) {
    checkForUpdates();
  } else {
    alert('Incorrect password.');
  }
}
window._checkUpdateWithPwd = _checkUpdateWithPwd;

// ── Sharing request UI ────────────────────────────────────────
async function showRequestAccess() {
  document.getElementById('settingModalTitle').textContent = 'Request Access';
  document.getElementById('settingModalBody').innerHTML = `
    <div style="font-size:13px;color:var(--text2);margin-bottom:14px;line-height:1.5">
      Send a request to a colleague to see their roster. They'll approve it in the app.
    </div>
    <label class="inp-label">Their crew code</label>
    <input id="reqTargetCode" type="text" maxlength="6" placeholder="ABCDE"
      style="text-transform:uppercase;letter-spacing:2px;font-weight:700">
    <div id="reqMsg" style="font-size:12px;margin-top:4px;display:none"></div>
    <button class="btn" onclick="_doRequestAccess()" style="margin-top:4px">Send request →</button>
    <button class="btn secondary" onclick="closeModal('settingModal')">Cancel</button>`;
  document.getElementById('settingModal').classList.add('open');
}
window.showRequestAccess = showRequestAccess;

async function _doRequestAccess() {
  const code = document.getElementById('reqTargetCode').value.toUpperCase().trim();
  const msg  = document.getElementById('reqMsg');
  if (!code) return;
  msg.textContent = 'Sending…'; msg.style.color = 'var(--text2)'; msg.style.display = 'block';
  const res = await syncRequestAccess(code);
  if (res.ok) {
    msg.textContent = `✅ Request sent to ${res.name}. They'll approve it shortly.`;
    msg.style.color = 'var(--green)'; msg.style.display = 'block';
    setTimeout(() => closeModal('settingModal'), 2500);
  } else {
    msg.textContent = '❌ ' + res.error; msg.style.color = 'var(--red)'; msg.style.display = 'block';
  }
}
window._doRequestAccess = _doRequestAccess;

async function showPendingRequests() {
  document.getElementById('settingModalTitle').textContent = 'Access Requests';
  document.getElementById('settingModalBody').innerHTML = `<div style="color:var(--text2);font-size:13px;padding:8px 0">Loading…</div>`;
  document.getElementById('settingModal').classList.add('open');

  const reqs = await syncGetPendingRequests().catch(() => []);

  if (!reqs.length) {
    document.getElementById('settingModalBody').innerHTML = `
      <div style="font-size:13px;color:var(--text3);padding:12px 0">No pending requests.</div>
      <button class="btn secondary" onclick="closeModal('settingModal')">Close</button>`;
    return;
  }

  const rows = reqs.map(r => `
    <div style="padding:12px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px">
        ${r.display_name} <span style="font-size:11px;color:var(--text3);font-weight:400">${r.crew_code} · R${r.roster_num}</span>
      </div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:8px">Wants to see your roster</div>
      <div style="display:flex;gap:8px">
        <button onclick="_approveReq('${r.request_id}','${r.crew_code}',false)"
          style="flex:1;padding:9px;border-radius:9px;border:none;background:var(--blue);
                 font-family:'Outfit',sans-serif;font-size:12px;font-weight:700;color:white;cursor:pointer">
          ✅ Share mine only
        </button>
        <button onclick="_approveReq('${r.request_id}','${r.crew_code}',true)"
          style="flex:1;padding:9px;border-radius:9px;border:none;background:var(--green);
                 font-family:'Outfit',sans-serif;font-size:12px;font-weight:700;color:white;cursor:pointer">
          🔄 Share both ways
        </button>
        <button onclick="_declineReq('${r.request_id}')"
          style="padding:9px 12px;border-radius:9px;border:1px solid var(--border);
                 background:none;font-family:'Outfit',sans-serif;font-size:12px;
                 color:var(--text3);cursor:pointer">✕</button>
      </div>
    </div>`).join('');

  document.getElementById('settingModalBody').innerHTML = rows +
    `<button class="btn secondary" style="margin-top:12px" onclick="closeModal('settingModal')">Done</button>`;
}
window.showPendingRequests = showPendingRequests;

async function _approveReq(reqId, requesterCode, mutual) {
  const rows = await _supa(`profiles?crew_code=eq.${requesterCode}&select=id`).catch(() => []);
  if (!rows?.length) return;
  await syncApproveRequest(reqId, rows[0].id, mutual);
  showPendingRequests();
}
window._approveReq = _approveReq;

async function _declineReq(reqId) {
  await syncDeclineRequest(reqId);
  showPendingRequests();
}
window._declineReq = _declineReq;

// Expose _supa for admin calls from settings
window._supa = typeof _supa !== 'undefined' ? _supa : null;

async function showPendingRequestsBadge() {
  showPendingRequests();
  // Update badge count
  const reqs = await syncGetPendingRequests().catch(() => []);
  const btn = document.getElementById('pendingReqBtn');
  if (btn && reqs.length) {
    btn.innerHTML = `📬 Access requests <span style="background:var(--red);color:white;border-radius:10px;padding:1px 7px;font-size:11px;margin-left:6px">${reqs.length}</span>`;
  }
}
window.showPendingRequestsBadge = showPendingRequestsBadge;

async function openSharedView() {
  const profiles = await syncGetSharedWithMe().catch(() => []);
  if (!profiles.length) {
    alert('No one has shared their roster with you yet.\nSend a request first, or ask a colleague to share.');
    return;
  }
  _showSharedViewPicker(profiles);
}
window.openSharedView = openSharedView;

function _showSharedViewPicker(profiles) {
  document.getElementById('settingModalTitle').textContent = 'Shared Rosters';
  const rows = profiles.map(p => `
    <button onclick="closeModal('settingModal');openSharedSlides('${p.crew_code}','${p.display_name}',${p.roster_num},'${p.id}')"
      style="width:100%;display:flex;align-items:center;gap:12px;padding:14px;
             border-radius:12px;border:1px solid var(--border);background:var(--surface);
             font-family:'Outfit',sans-serif;cursor:pointer;text-align:left;margin-bottom:8px">
      <div style="background:var(--blue);color:white;width:36px;height:36px;border-radius:10px;
                  display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;flex-shrink:0">
        ${p.crew_code.slice(0,2)}
      </div>
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--text)">${p.display_name}</div>
        <div style="font-size:12px;color:var(--text3)">${p.crew_code} · Roster ${p.roster_num}</div>
      </div>
      <span style="margin-left:auto;color:var(--text3);font-size:18px">›</span>
    </button>`).join('');
  document.getElementById('settingModalBody').innerHTML = rows +
    `<button class="btn secondary" onclick="closeModal('settingModal')">Cancel</button>`;
  document.getElementById('settingModal').classList.add('open');
}

async function openSharedSlides(crewCode, displayName, rosterNum, profileId) {
  // Remove existing if any
  document.getElementById('sharedRosterScreen')?.remove();

  const screen = document.createElement('div');
  screen.id = 'sharedRosterScreen';
  screen.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:200;display:flex;flex-direction:column;overflow:hidden';

  screen.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;
                padding-top:max(14px,env(safe-area-inset-top));
                background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0">
      <button onclick="document.getElementById('sharedRosterScreen').remove()"
        style="padding:8px 14px;border-radius:10px;border:1.5px solid var(--border);
               background:var(--bg);font-family:'Outfit',sans-serif;font-size:14px;
               font-weight:600;color:var(--text);cursor:pointer">‹ Back</button>
      <div style="display:flex;align-items:center;gap:8px;flex:1">
        <div style="background:var(--blue);color:white;width:32px;height:32px;border-radius:8px;
                    display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0">
          ${crewCode.slice(0,2)}
        </div>
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text)">${displayName}</div>
          <div style="font-size:11px;color:var(--text3)">${crewCode} · Roster ${rosterNum}</div>
        </div>
      </div>
    </div>
    <div id="sharedLoading" style="flex:1;display:flex;align-items:center;justify-content:center;
         flex-direction:column;gap:12px;color:var(--text3)">
      <div style="width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--blue);
                  border-radius:50%;animation:spin 0.8s linear infinite"></div>
      <div style="font-size:13px">Loading roster…</div>
    </div>`;

  document.body.appendChild(screen);

  const assignments = await syncGetProfileAssignments(profileId).catch(() => []);

  // Remove loading, add slider
  screen.querySelector('#sharedLoading').remove();

  const sliderHtml = `
    <div id="sharedDots" style="display:flex;justify-content:center;gap:6px;
         padding:8px 0 4px;flex-shrink:0"></div>
    <div style="flex:1;overflow:hidden;position:relative" id="sharedSliderWrap">
      <div id="sharedSlides" style="display:flex;height:100%;transition:transform 0.3s ease;
           will-change:transform"></div>
    </div>`;
  screen.insertAdjacentHTML('beforeend', sliderHtml);

  _buildSharedSlides(assignments, rosterNum, crewCode);
}
window.openSharedSlides = openSharedSlides;

function _buildSharedSlides(assignments, rosterNum, crewCode) {
  const slidesEl = document.getElementById('sharedSlides');
  const dotsEl   = document.getElementById('sharedDots');
  const wrap     = document.getElementById('sharedSliderWrap');
  if (!slidesEl || !dotsEl) return;

  const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DAYS_S   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const now = new Date();
  const dates = [];
  for (let i = -2; i <= 7; i++) {
    const d = new Date(now); d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0,10));
  }

  // Index by date string
  const byDate = {};
  for (const a of assignments) {
    // date field may come as "2026-04-22" or "2026-04-22T00:00:00"
    const key = (a.date || '').slice(0,10);
    byDate[key] = a;
  }

  let currentIdx = 2;

  dates.forEach((ds, idx) => {
    const d       = new Date(ds + 'T12:00:00');
    const dow     = DAYS_S[d.getDay()];
    const isToday = idx === 2;
    const entry   = byDate[ds];

    // Build duty content
    let heroClass = isToday ? 'var(--blue)' : 'var(--text2)';
    let dutyLabel = 'Day off 🌿';
    let dutyColor = 'var(--off)';
    let dutyDetails = '';

    if (entry && entry.assignment && entry.assignment !== 'OFF') {
      const a = entry.assignment;
      if (a === 'HSBY') {
        dutyLabel = 'Home Standby';
        dutyColor = 'var(--yellow)';
        if (entry.details?.start) dutyDetails = `<div style="font-size:12px;opacity:0.8;margin-top:2px">${entry.details.start} – ${entry.details.end}</div>`;
      } else if (a === 'AD') {
        dutyLabel = 'Airport Duty';
        dutyColor = 'var(--red)';
        if (entry.details?.start) dutyDetails = `<div style="font-size:12px;opacity:0.8;margin-top:2px">${entry.details.start} – ${entry.details.end}</div>`;
      } else if (a === 'AL')   { dutyLabel = 'Annual Leave';       dutyColor = 'var(--off)'; }
      else if (a === 'SICK')   { dutyLabel = 'Sick Leave';          dutyColor = 'var(--red)'; }
      else if (a === 'VTO')    { dutyLabel = 'Voluntary Time Off';  dutyColor = 'var(--off)'; }
      else if (a === 'PL')     { dutyLabel = 'Parental Leave';      dutyColor = 'var(--off)'; }
      else if (a === 'UL')     { dutyLabel = 'Unpaid Leave';        dutyColor = 'var(--text3)'; }
      else if (['A1E','A1L','A2E','A2L','CUSTOM'].includes(a)) {
        dutyLabel = a === 'A1E' ? '✈ Aereo 1 Early'
                  : a === 'A1L' ? '✈ Aereo 1 Late'
                  : a === 'A2E' ? '✈ Aereo 2 Early'
                  : a === 'A2L' ? '✈ Aereo 2 Late'
                  : '✈ Custom';
        dutyColor = (a.endsWith('L')) ? 'var(--late)' : 'var(--early)';
      } else {
        dutyLabel = a; dutyColor = 'var(--text2)';
      }
    }

    // Flight rows
    const flights = entry?.flights || [];
    const flightHtml = flights.filter(f=>f.from&&f.to).map(f => `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:8px 16px;border-bottom:1px solid var(--border)">
        <span style="font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:800;color:var(--text)">${f.from}→${f.to}</span>
        <span style="font-size:12px;color:var(--text2);font-family:'JetBrains Mono',monospace">${f.dep||''}–${f.arr||''}</span>
      </div>`).join('');

    const slide = document.createElement('div');
    slide.style.cssText = 'min-width:100%;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column';
    slide.innerHTML = `
      <div style="background:var(--surface);margin:12px 16px 0;border-radius:16px;
                  border:1px solid var(--border);overflow:hidden">
        <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;
                    align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;
                        letter-spacing:1px">${dow}</div>
            <div style="font-size:26px;font-weight:800;color:${heroClass};line-height:1.1">${d.getDate()} ${MONTHS_S[d.getMonth()]}</div>
            <div style="font-size:11px;color:var(--text3)">${d.getFullYear()}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:800;color:${dutyColor}">${dutyLabel}</div>
            ${dutyDetails}
            ${isToday ? '<div style="font-size:10px;background:var(--blue);color:white;border-radius:6px;padding:2px 8px;margin-top:4px;display:inline-block;font-weight:700">TODAY</div>' : ''}
          </div>
        </div>
        ${flightHtml ? `<div>${flightHtml}</div>` : ''}
      </div>`;

    slidesEl.appendChild(slide);

    // Dot
    const dot = document.createElement('div');
    dot.style.cssText = `width:${isToday?8:6}px;height:${isToday?8:6}px;border-radius:50%;
      background:${isToday?'var(--blue)':'var(--border2)'};cursor:pointer;transition:all 0.2s`;
    dot.onclick = () => goShared(idx);
    dotsEl.appendChild(dot);
  });

  function goShared(idx) {
    idx = Math.max(0, Math.min(dates.length - 1, idx));
    currentIdx = idx;
    slidesEl.style.transform = `translateX(-${idx * 100}%)`;
    dotsEl.querySelectorAll('div').forEach((d, i) => {
      d.style.background = i === idx ? 'var(--blue)' : 'var(--border2)';
      d.style.width  = i === idx ? '8px' : '6px';
      d.style.height = i === idx ? '8px' : '6px';
    });
  }

  // Swipe — attach to wrapper, not slides
  if (wrap) {
    let startX = 0, startY = 0, dragging = false;
    wrap.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dragging = true;
    }, { passive: true });
    wrap.addEventListener('touchend', e => {
      if (!dragging) return;
      dragging = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        goShared(currentIdx + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
  }

  goShared(currentIdx);
}

window.renderSyncScreen = renderSyncScreen;
