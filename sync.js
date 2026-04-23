// ══════════════════════════════════════════════════════════════
// CrewPSR — Supabase Sync
// sync.js — loaded after app.js
// ══════════════════════════════════════════════════════════════

const SUPA_URL = 'https://wudxxjidvajrfutgvnoa.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZHh4amlkdmFqcmZ1dGd2bm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MzkwNjQsImV4cCI6MjA5MjUxNTA2NH0.HwbS7g4cjK3IV_J7bvsTLKExfnCd_qGOd_m-AcB4PMo';

// ── Low-level fetch helper ────────────────────────────────────
async function _supa(path, opts = {}) {
  const headers = {
    apikey: SUPA_ANON,
    Authorization: `Bearer ${SUPA_ANON}`,
    'Content-Type': 'application/json',
    Prefer: opts.prefer || 'return=representation',
    ...(opts.headers || {}),
  };

  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...opts,
    headers,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Supabase ${res.status}: ${errText}`);
  }

  if (res.status === 204) return null;

  const text = await res.text().catch(() => '');
  if (!text || !text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Supabase invalid JSON response: ${text.slice(0, 200)}`);
  }
}

// ── State ─────────────────────────────────────────────────────
let _syncProfile = null;
let _syncEnabled = false;
let _sharedProfiles = [];
let _dayDetailCache = {};

// ── Registration / Login ─────────────────────────────────────
async function syncRegister(crewCode, displayName, rosterNum, pin) {
  crewCode = (crewCode || '').toUpperCase().trim();
  displayName = (displayName || '').trim();
  const pinHash = await _hashPin(pin);

  try {
    await _supa('profiles', {
      method: 'POST',
      body: JSON.stringify({
        crew_code: crewCode,
        display_name: displayName,
        roster_num: rosterNum,
        pin_hash: pinHash,
      }),
    });

    return { ok: true, approved: false };
  } catch (e) {
    if (e.message.includes('23505')) {
      return { ok: false, error: 'Crew code already registered.' };
    }
    return { ok: false, error: e.message };
  }
}

async function syncLogin(crewCode, pin) {
  crewCode = (crewCode || '').toUpperCase().trim();

  const rows = await _supa(
    `profiles?crew_code=eq.${encodeURIComponent(crewCode)}&select=*`
  );

  if (!rows || rows.length === 0) {
    return { ok: false, error: 'Crew code not found.' };
  }

  const profile = rows[0];

  if (!profile.approved) {
    return { ok: false, error: 'Account pending approval. Please contact Marius.' };
  }

  const match = await _verifyPin(pin, profile.pin_hash);
  if (!match) {
    return { ok: false, error: 'Incorrect PIN.' };
  }

  _syncProfile = profile;
  _syncEnabled = true;

  APP.syncProfileId = profile.id;
  APP.syncCrewCode = profile.crew_code;
  APP.syncLoggedIn = true;

  save();
  await _loadSharedProfiles();

  return { ok: true, profile };
}

function syncLogout() {
  _syncProfile = null;
  _syncEnabled = false;
  _sharedProfiles = [];
  _dayDetailCache = {};

  APP.syncProfileId = null;
  APP.syncCrewCode = null;
  APP.syncLoggedIn = false;

  save();

  if (typeof renderSettings === 'function') renderSettings();
  if (typeof renderSyncScreen === 'function') renderSyncScreen();
}

// ── Push assignments to Supabase ─────────────────────────────
async function syncPushAssignments() {
  if (!APP.syncLoggedIn || !APP.syncProfileId) {
    return { ok: false, error: 'Not logged in' };
  }

  const assignments = APP.assignments || {};
  const customFlights = APP.customFlights || {};
  const assignDetails = APP.assignDetails || {};

  const rows = Object.keys(assignments).map(date => ({
    profile_id: APP.syncProfileId,
    date,
    assignment: assignments[date],
    details: assignDetails[date] || null,
    flights: customFlights[date] || null,
    updated_at: new Date().toISOString(),
  }));

  if (!rows.length) return { ok: true };

  await _supa(`assignments?profile_id=eq.${APP.syncProfileId}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  });

  for (let i = 0; i < rows.length; i += 50) {
    await _supa('assignments', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify(rows.slice(i, i + 50)),
    });
  }

  _dayDetailCache = {};
  return { ok: true };
}

// ── Fetch colleagues flying on a given date ──────────────────
async function syncGetColleaguesOnDate(ds) {
  if (!APP.syncLoggedIn) return [];
  if (_dayDetailCache[ds]) return _dayDetailCache[ds];

  const profiles = await _supa(
    'profiles?approved=eq.true&select=id,crew_code,display_name,roster_num'
  ).catch(() => []);

  const profileIds = profiles
    .map(p => p.id)
    .filter(id => id !== APP.syncProfileId);

  if (!profileIds.length) return [];

  const assignments = await _supa(
    `assignments?date=eq.${ds}&profile_id=in.(${profileIds.join(',')})&select=profile_id,assignment,details,flights`
  ).catch(() => []);

  const myFlights = APP.customFlights?.[ds] || [];
  const myRoutes = new Set(
    myFlights
      .filter(f => f && f.from && f.to)
      .map(f => `${f.from}-${f.to}`)
  );

  const result = [];

  for (const a of assignments) {
    if (!a.assignment || a.assignment === 'OFF') continue;
    if (['AL', 'VTO', 'SICK', 'UL', 'PL', 'HSBY', 'AD'].includes(a.assignment)) continue;

    const profile = profiles.find(p => p.id === a.profile_id);
    if (!profile) continue;

    const theirFlights = a.flights || [];
    const theirRoutes = new Set(
      theirFlights
        .filter(f => f && f.from && f.to)
        .map(f => `${f.from}-${f.to}`)
    );

    const hasCommon = [...myRoutes].some(r => theirRoutes.has(r));

    if (myRoutes.size > 0 && !hasCommon) continue;
    if (myRoutes.size === 0 && theirRoutes.size === 0) continue;

    result.push({
      crew_code: profile.crew_code,
      display_name: profile.display_name,
      roster_num: profile.roster_num,
      assignment: a.assignment,
      details: a.details,
      flights: a.flights,
    });
  }

  _dayDetailCache[ds] = result;
  setTimeout(() => {
    delete _dayDetailCache[ds];
  }, 5 * 60 * 1000);

  return result;
}

// ── Sharing ──────────────────────────────────────────────────
async function syncShareWith(targetCrewCode) {
  if (!APP.syncLoggedIn || !APP.syncProfileId) {
    return { ok: false, error: 'Not logged in' };
  }

  targetCrewCode = (targetCrewCode || '').toUpperCase().trim();

  const rows = await _supa(
    `profiles?crew_code=eq.${encodeURIComponent(targetCrewCode)}&select=id,display_name`
  ).catch(() => []);

  if (!rows?.length) {
    return { ok: false, error: 'Crew code not found.' };
  }

  const target = rows[0];

  try {
    await _supa('sharing_permissions', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        owner_id: APP.syncProfileId,
        viewer_id: target.id,
      }),
    });

    return { ok: true, name: target.display_name };
  } catch (e) {
    if (e.message.includes('23505')) {
      return { ok: true, name: target.display_name };
    }
    return { ok: false, error: e.message };
  }
}

async function syncRevokeShare(targetCrewCode) {
  if (!APP.syncLoggedIn || !APP.syncProfileId) return;

  targetCrewCode = (targetCrewCode || '').toUpperCase().trim();

  const rows = await _supa(
    `profiles?crew_code=eq.${encodeURIComponent(targetCrewCode)}&select=id`
  ).catch(() => []);

  if (!rows?.length) return;

  await _supa(
    `sharing_permissions?owner_id=eq.${APP.syncProfileId}&viewer_id=eq.${rows[0].id}`,
    {
      method: 'DELETE',
      prefer: 'return=minimal',
    }
  ).catch(() => {});
}

async function syncGetMyShares() {
  if (!APP.syncLoggedIn) return [];

  const rows = await _supa(
    `sharing_permissions?owner_id=eq.${APP.syncProfileId}&select=viewer_id,profiles!sharing_permissions_viewer_id_fkey(crew_code,display_name)`
  ).catch(() => []);

  return (rows || []).map(r => ({
    crew_code: r.profiles?.crew_code,
    display_name: r.profiles?.display_name,
  }));
}

async function _loadSharedProfiles() {
  if (!APP.syncLoggedIn) return;

  const rows = await _supa(
    `sharing_permissions?viewer_id=eq.${APP.syncProfileId}&select=owner_id,profiles!sharing_permissions_owner_id_fkey(crew_code,display_name,roster_num)`
  ).catch(() => []);

  _sharedProfiles = (rows || []).map(r => r.profiles).filter(Boolean);
}

// ── PIN hashing ──────────────────────────────────────────────
async function _hashPin(pin) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(String(pin) + 'crewpsr_salt')
  );

  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function _verifyPin(pin, hash) {
  return (await _hashPin(pin)) === hash;
}

// ── Auto-restore session on app load ─────────────────────────
async function syncRestoreSession() {
  if (!APP.syncLoggedIn || !APP.syncProfileId) return;

  await _loadSharedProfiles().catch(() => {});
  _syncEnabled = true;
}

// ── Access request flow ──────────────────────────────────────
async function syncRequestAccess(targetCrewCode) {
  if (!APP.syncLoggedIn || !APP.syncProfileId) {
    return { ok: false, error: 'Not logged in' };
  }

  targetCrewCode = (targetCrewCode || '').toUpperCase().trim();

  const rows = await _supa(
    `profiles?crew_code=eq.${encodeURIComponent(targetCrewCode)}&select=id,display_name`
  ).catch(() => []);

  if (!rows?.length) {
    return { ok: false, error: 'Crew code not found.' };
  }

  const target = rows[0];

  try {
    const existing = await _supa(
      `access_requests?requester_id=eq.${APP.syncProfileId}&owner_id=eq.${target.id}&select=id,status`
    ).catch(() => []);

    if (existing?.length) {
      await _supa(`access_requests?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify({ status: 'pending' }),
      });
    } else {
      await _supa('access_requests', {
        method: 'POST',
        prefer: 'return=minimal',
        body: JSON.stringify({
          requester_id: APP.syncProfileId,
          owner_id: target.id,
          status: 'pending',
        }),
      });
    }

    return { ok: true, name: target.display_name };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function syncGetPendingRequests() {
  if (!APP.syncLoggedIn) return [];

  const rows = await _supa(
    `access_requests?owner_id=eq.${APP.syncProfileId}&status=eq.pending&select=id,requester_id,profiles!access_requests_requester_id_fkey(crew_code,display_name,roster_num)`
  ).catch(() => []);

  return (rows || []).map(r => ({
    request_id: r.id,
    requester_id: r.requester_id,
    crew_code: r.profiles?.crew_code,
    display_name: r.profiles?.display_name,
    roster_num: r.profiles?.roster_num,
  }));
}

async function syncApproveRequest(requestId, requesterId, mutual) {
  if (!APP.syncLoggedIn || !APP.syncProfileId) return;

  await _supa(`access_requests?id=eq.${requestId}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'approved' }),
  }).catch(() => {});

  const ex1 = await _supa(
    `sharing_permissions?owner_id=eq.${APP.syncProfileId}&viewer_id=eq.${requesterId}&select=id`
  ).catch(() => []);

  if (!ex1?.length) {
    await _supa('sharing_permissions', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        owner_id: APP.syncProfileId,
        viewer_id: requesterId,
      }),
    }).catch(() => {});
  }

  if (mutual) {
    const ex2 = await _supa(
      `sharing_permissions?owner_id=eq.${requesterId}&viewer_id=eq.${APP.syncProfileId}&select=id`
    ).catch(() => []);

    if (!ex2?.length) {
      await _supa('sharing_permissions', {
        method: 'POST',
        prefer: 'return=minimal',
        body: JSON.stringify({
          owner_id: requesterId,
          viewer_id: APP.syncProfileId,
        }),
      }).catch(() => {});
    }
  }
}

async function syncDeclineRequest(requestId) {
  await _supa(`access_requests?id=eq.${requestId}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ status: 'declined' }),
  }).catch(() => {});
}

async function syncGetSharedWithMe() {
  if (!APP.syncLoggedIn) return [];

  const rows = await _supa(
    `sharing_permissions?viewer_id=eq.${APP.syncProfileId}&select=owner_id,profiles!sharing_permissions_owner_id_fkey(crew_code,display_name,roster_num)`
  ).catch(() => []);

  return (rows || []).map(r => r.profiles).filter(Boolean);
}

async function syncGetProfileAssignments(profileId) {
  if (!profileId) return [];

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 2);

  const to = new Date(now);
  to.setDate(to.getDate() + 7);

  const fmt = d => d.toISOString().slice(0, 10);

  const rows = await _supa(
    `assignments?profile_id=eq.${profileId}&date=gte.${fmt(from)}&date=lte.${fmt(to)}&select=date,assignment,details,flights&order=date.asc`
  ).catch(() => []);

  return rows || [];
}

// ── Expose globals ───────────────────────────────────────────
window.syncRegister = syncRegister;
window.syncLogin = syncLogin;
window.syncLogout = syncLogout;
window.syncPushAssignments = syncPushAssignments;
window.syncGetColleaguesOnDate = syncGetColleaguesOnDate;
window.syncShareWith = syncShareWith;
window.syncRevokeShare = syncRevokeShare;
window.syncGetMyShares = syncGetMyShares;
window.syncRestoreSession = syncRestoreSession;

window.syncRequestAccess = syncRequestAccess;
window.syncGetPendingRequests = syncGetPendingRequests;
window.syncApproveRequest = syncApproveRequest;
window.syncDeclineRequest = syncDeclineRequest;
window.syncGetSharedWithMe = syncGetSharedWithMe;
window.syncGetProfileAssignments = syncGetProfileAssignments;
