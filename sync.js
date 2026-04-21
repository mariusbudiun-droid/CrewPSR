// ══════════════════════════════════════════════════════════════
// CrewPSR — Supabase Sync
// sync.js — loaded after app.js
// ══════════════════════════════════════════════════════════════

const SUPA_URL  = 'https://abywawanxryiptcclszg.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFieXdhd2FueHJ5aXB0Y2Nsc3pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3ODIxMzIsImV4cCI6MjA5MjM1ODEzMn0.H5xrJALFhB3omyiYZgmhG6l57N4MduNvtqxSKrQbxzg';

// ── Low-level fetch helper ────────────────────────────────────
async function _supa(path, opts = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'apikey':        SUPA_ANON,
      'Authorization': `Bearer ${SUPA_ANON}`,
      'Content-Type':  'application/json',
      'Prefer':        opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

// ── State ─────────────────────────────────────────────────────
let _syncProfile   = null; // current user's profile row
let _syncEnabled   = false;
let _sharedProfiles = [];  // profiles that have shared with me
let _dayDetailCache = {};  // ds → [{crew_code, display_name, roster_num, assignment, flights}]

// ── Registration / Login ──────────────────────────────────────
async function syncRegister(crewCode, displayName, rosterNum, pin) {
  crewCode = crewCode.toUpperCase().trim();
  const pinHash = await _hashPin(pin);
  try {
    const rows = await _supa('profiles', {
      method: 'POST',
      body: JSON.stringify({ crew_code: crewCode, display_name: displayName, roster_num: rosterNum, pin_hash: pinHash }),
    });
    return { ok: true, approved: false };
  } catch (e) {
    if (e.message.includes('23505')) return { ok: false, error: 'Crew code already registered.' };
    return { ok: false, error: e.message };
  }
}

async function syncLogin(crewCode, pin) {
  crewCode = crewCode.toUpperCase().trim();
  const rows = await _supa(`profiles?crew_code=eq.${encodeURIComponent(crewCode)}&select=*`);
  if (!rows || rows.length === 0) return { ok: false, error: 'Crew code not found.' };
  const profile = rows[0];
  if (!profile.approved) return { ok: false, error: 'Account pending approval. Please contact Marius.' };
  const match = await _verifyPin(pin, profile.pin_hash);
  if (!match) return { ok: false, error: 'Incorrect PIN.' };
  _syncProfile = profile;
  APP.syncProfileId  = profile.id;
  APP.syncCrewCode   = profile.crew_code;
  APP.syncLoggedIn   = true;
  save();
  await _loadSharedProfiles();
  return { ok: true, profile };
}

function syncLogout() {
  _syncProfile    = null;
  _syncEnabled    = false;
  _sharedProfiles = [];
  _dayDetailCache = {};
  APP.syncProfileId = null;
  APP.syncCrewCode  = null;
  APP.syncLoggedIn  = false;
  save();
  renderSettings();
}

// ── Push assignments to Supabase ──────────────────────────────
async function syncPushAssignments() {
  if (!APP.syncLoggedIn || !APP.syncProfileId) return { ok: false, error: 'Not logged in' };

  const assignments   = APP.assignments   || {};
  const customFlights = APP.customFlights || {};
  const assignDetails = APP.assignDetails || {};

  const rows = Object.keys(assignments).map(date => ({
    profile_id: APP.syncProfileId,
    date,
    assignment: assignments[date],
    details:    assignDetails[date] || null,
    flights:    customFlights[date] || null,
    updated_at: new Date().toISOString(),
  }));

  if (!rows.length) return { ok: true };

  // Upsert in batches of 100
  for (let i = 0; i < rows.length; i += 100) {
    await _supa('assignments', {
      method:  'POST',
      prefer:  'resolution=merge-duplicates,return=minimal',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body:    JSON.stringify(rows.slice(i, i + 100)),
    });
  }
  return { ok: true };
}

// ── Fetch colleagues flying on a given date ───────────────────
async function syncGetColleaguesOnDate(ds) {
  if (!APP.syncLoggedIn) return [];
  if (_dayDetailCache[ds]) return _dayDetailCache[ds];

  // Get all approved profiles (to know who is registered)
  const profiles = await _supa('profiles?approved=eq.true&select=id,crew_code,display_name,roster_num').catch(() => []);

  // Get their assignments for this date
  const profileIds = profiles.map(p => p.id).filter(id => id !== APP.syncProfileId);
  if (!profileIds.length) return [];

  const assignments = await _supa(
    `assignments?date=eq.${ds}&profile_id=in.(${profileIds.join(',')})&select=profile_id,assignment,details,flights`
  ).catch(() => []);

  const result = [];
  for (const a of assignments) {
    const profile = profiles.find(p => p.id === a.profile_id);
    if (!profile) continue;
    result.push({
      crew_code:    profile.crew_code,
      display_name: profile.display_name,
      roster_num:   profile.roster_num,
      assignment:   a.assignment,
      details:      a.details,
      flights:      a.flights,
    });
  }

  _dayDetailCache[ds] = result;
  // Clear cache entry after 5 min
  setTimeout(() => { delete _dayDetailCache[ds]; }, 5 * 60 * 1000);
  return result;
}

// ── Sharing ───────────────────────────────────────────────────
async function syncShareWith(targetCrewCode) {
  if (!APP.syncLoggedIn) return { ok: false, error: 'Not logged in' };
  targetCrewCode = targetCrewCode.toUpperCase().trim();
  const rows = await _supa(`profiles?crew_code=eq.${encodeURIComponent(targetCrewCode)}&select=id,display_name`).catch(() => []);
  if (!rows?.length) return { ok: false, error: 'Crew code not found.' };
  const target = rows[0];
  try {
    await _supa('sharing_permissions', {
      method: 'POST',
      body: JSON.stringify({ owner_id: APP.syncProfileId, viewer_id: target.id }),
    });
    return { ok: true, name: target.display_name };
  } catch (e) {
    if (e.message.includes('23505')) return { ok: false, error: 'Already shared.' };
    return { ok: false, error: e.message };
  }
}

async function syncRevokeShare(targetCrewCode) {
  if (!APP.syncLoggedIn) return;
  targetCrewCode = targetCrewCode.toUpperCase().trim();
  const rows = await _supa(`profiles?crew_code=eq.${encodeURIComponent(targetCrewCode)}&select=id`).catch(() => []);
  if (!rows?.length) return;
  await _supa(`sharing_permissions?owner_id=eq.${APP.syncProfileId}&viewer_id=eq.${rows[0].id}`, {
    method: 'DELETE',
    prefer: 'return=minimal',
  }).catch(() => {});
}

async function syncGetMyShares() {
  if (!APP.syncLoggedIn) return [];
  const rows = await _supa(
    `sharing_permissions?owner_id=eq.${APP.syncProfileId}&select=viewer_id,profiles!sharing_permissions_viewer_id_fkey(crew_code,display_name)`
  ).catch(() => []);
  return (rows || []).map(r => ({
    crew_code:    r.profiles?.crew_code,
    display_name: r.profiles?.display_name,
  }));
}

async function _loadSharedProfiles() {
  if (!APP.syncLoggedIn) return;
  // Profiles that have shared with me (I can see their full data)
  const rows = await _supa(
    `sharing_permissions?viewer_id=eq.${APP.syncProfileId}&select=owner_id,profiles!sharing_permissions_owner_id_fkey(crew_code,display_name,roster_num)`
  ).catch(() => []);
  _sharedProfiles = (rows || []).map(r => r.profiles).filter(Boolean);
}

// ── PIN hashing (simple, client-side) ────────────────────────
// Note: for a PWA we use a simple SHA-256 — not bcrypt (no Node crypto in browser)
async function _hashPin(pin) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin + 'crewpsr_salt'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function _verifyPin(pin, hash) {
  return (await _hashPin(pin)) === hash;
}

// ── Auto-restore session on app load ─────────────────────────
async function syncRestoreSession() {
  if (!APP.syncLoggedIn || !APP.syncProfileId) return;
  // Just re-load shared profiles; the profile ID is already in APP
  await _loadSharedProfiles().catch(() => {});
  _syncEnabled = true;
}

// ── Expose globals ────────────────────────────────────────────
window.syncRegister          = syncRegister;
window.syncLogin             = syncLogin;
window.syncLogout            = syncLogout;
window.syncPushAssignments   = syncPushAssignments;
window.syncGetColleaguesOnDate = syncGetColleaguesOnDate;
window.syncShareWith         = syncShareWith;
window.syncRevokeShare       = syncRevokeShare;
window.syncGetMyShares       = syncGetMyShares;
window.syncRestoreSession    = syncRestoreSession;

// ── Access request flow ───────────────────────────────────────

// B sends a request to A
async function syncRequestAccess(targetCrewCode) {
  if (!APP.syncLoggedIn) return { ok: false, error: 'Not logged in' };
  targetCrewCode = targetCrewCode.toUpperCase().trim();

  const rows = await _supa(`profiles?crew_code=eq.${encodeURIComponent(targetCrewCode)}&select=id,display_name`).catch(() => []);
  if (!rows?.length) return { ok: false, error: 'Crew code not found.' };
  const target = rows[0];

  // Use sharing_permissions table with a pending flag
  // We repurpose it: pending = viewer has requested, owner hasn't accepted yet
  // Add a `pending` column handled via upsert with status field
  // Actually: insert with pending=true, owner approves by setting pending=false
  try {
    await _supa('access_requests', {
      method: 'POST',
      body: JSON.stringify({
        requester_id: APP.syncProfileId,
        owner_id:     target.id,
        status:       'pending',
      }),
    });
    return { ok: true, name: target.display_name };
  } catch(e) {
    if (e.message.includes('23505')) return { ok: false, error: 'Request already sent.' };
    return { ok: false, error: e.message };
  }
}

// A fetches pending requests directed at them
async function syncGetPendingRequests() {
  if (!APP.syncLoggedIn) return [];
  const rows = await _supa(
    `access_requests?owner_id=eq.${APP.syncProfileId}&status=eq.pending&select=id,requester_id,profiles!access_requests_requester_id_fkey(crew_code,display_name,roster_num)`
  ).catch(() => []);
  return (rows || []).map(r => ({
    request_id:   r.id,
    crew_code:    r.profiles?.crew_code,
    display_name: r.profiles?.display_name,
    roster_num:   r.profiles?.roster_num,
  }));
}

// A approves a request → creates sharing_permission both ways if mutual desired
async function syncApproveRequest(requestId, requesterId, mutual) {
  if (!APP.syncLoggedIn) return;
  // Mark request as approved
  await _supa(`access_requests?id=eq.${requestId}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ status: 'approved' }),
  }).catch(() => {});

  // Grant requester view of my data (I share with them)
  await _supa('sharing_permissions', {
    method: 'POST',
    body: JSON.stringify({ owner_id: APP.syncProfileId, viewer_id: requesterId }),
  }).catch(() => {});

  if (mutual) {
    // Also grant me view of their data (they share with me)
    await _supa('sharing_permissions', {
      method: 'POST',
      body: JSON.stringify({ owner_id: requesterId, viewer_id: APP.syncProfileId }),
    }).catch(() => {});
  }
}

async function syncDeclineRequest(requestId) {
  await _supa(`access_requests?id=eq.${requestId}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ status: 'declined' }),
  }).catch(() => {});
}

// Fetch profiles that have shared with me (I can see their slides)
async function syncGetSharedWithMe() {
  if (!APP.syncLoggedIn) return [];
  const rows = await _supa(
    `sharing_permissions?viewer_id=eq.${APP.syncProfileId}&select=owner_id,profiles!sharing_permissions_owner_id_fkey(crew_code,display_name,roster_num)`
  ).catch(() => []);
  return (rows || []).map(r => r.profiles).filter(Boolean);
}

// Fetch 10-day window of assignments for a given profile
async function syncGetProfileAssignments(profileId) {
  const now = new Date();
  const from = new Date(now); from.setDate(from.getDate() - 2);
  const to   = new Date(now); to.setDate(to.getDate() + 7);
  const fmt  = d => d.toISOString().slice(0, 10);

  const rows = await _supa(
    `assignments?profile_id=eq.${profileId}&date=gte.${fmt(from)}&date=lte.${fmt(to)}&select=date,assignment,details,flights&order=date.asc`
  ).catch(() => []);
  return rows || [];
}

window.syncRequestAccess       = syncRequestAccess;
window.syncGetPendingRequests  = syncGetPendingRequests;
window.syncApproveRequest      = syncApproveRequest;
window.syncDeclineRequest      = syncDeclineRequest;
window.syncGetSharedWithMe     = syncGetSharedWithMe;
window.syncGetProfileAssignments = syncGetProfileAssignments;
