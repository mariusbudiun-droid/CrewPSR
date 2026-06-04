// ══════════════════════════════════════════════════════════════
// RELEASE NOTES — what's new popup
// ══════════════════════════════════════════════════════════════
//
// Shown on first launch after an update. Tracks "last seen version" in
// localStorage; if it differs from APP_VERSION, the user sees every release
// note between the two. Closing the popup updates the marker.
//
// To add a new release: prepend an entry to RELEASES (newest first).
// Keep notes short, user-friendly, in English, emoji-prefixed for scanning.

const RELEASES = [
  {
    version: '1.11.4',
    date: 'May 2026',
    title: 'Schedule V3 — June to September',
    notes: [
      "✈️ Flight schedule updated to V3 (01 Jun – 24 Sep 2026)",
      "🆕 Monday A1 Early now has 4 flights — added PSR-MXP/MXP-PSR (11:05/12:55)",
      "🔄 Tuesday A1 Early & Wednesday A2 Early: PSR-TIA replaced by PSR-AHO (Alghero)",
      "🔄 Saturday A1 Late: PSR-TRN replaced by PSR-AHO (Alghero)",
    ],
  },
  {
    version: '1.11.3',
    date: 'May 2026',
    title: 'Release notes are here',
    notes: [
      "🆕 You'll now see a quick popup after every update telling you what's new",
      "📋 Find the full history anytime under More → Info → Release notes",
    ],
  },
  {
    version: '1.11.2',
    date: 'May 2026',
    title: 'Auto-updates & better offline',
    notes: [
      "🚀 App updates itself now — no more 'Check for Updates' tap needed",
      "📷 Smarter roster setup — upload a screenshot and the app finds your cycle day automatically",
      "✈️ Better offline — app opens instantly even with no signal",
      "⏱️ Heads up: roster import can take up to 1 minute. Please don't close the app while AI is reading",
    ],
  },
  {
    version: '1.10.3',
    date: 'May 2026',
    title: 'Swap days from roster',
    notes: [
      "🔄 If you gave a shift away and Ryanair shows OFF, the app now marks it as 'Swap' automatically when you import the roster",
    ],
  },
  {
    version: '1.10.0',
    date: 'May 2026',
    title: 'Roster import is back',
    notes: [
      "🤖 Roster import via screenshot is now powered by Google Gemini",
      "🧹 Removed the 'paste text' option — screenshot is the only way now (it works much better)",
    ],
  },
  {
    version: '1.9.11',
    date: 'May 2026',
    title: 'Mark a swap manually',
    notes: [
      "🔄 New 'OFF (Swap)' option in Edit leave — mark a day off when you gave your shift to a colleague",
      "📅 The day appears green on the calendar with 'Swap' label, and the day detail shows colleagues who were off and could have taken your shift",
    ],
  },
  {
    version: '1.9.10',
    date: 'May 2026',
    title: 'More airports recognised',
    notes: [
      "📍 Expanded the airport database from ~35 to ~180 airports across Europe, Morocco, Israel, and Jordan — your statistics now correctly classify flights to HHN, AHO, and many others",
    ],
  },
  {
    version: '1.9.9',
    date: 'May 2026',
    title: 'Schedule V2 — May 2026',
    notes: [
      "✈️ Flight schedule updated to V2 (05 May – 30 May 2026)",
      "🔄 Monday A1 Late: PSR-CTA replaced by PSR-MXP",
      "🔄 Thursday A1 Late & A2 Early: PSR-BGY replaced by PSR-MXP, Thursday A2 Early report time changed to 06:20",
    ],
  },
];

// Returns the list of releases the user hasn't seen yet (since their last visit).
function getUnseenReleases() {
  const lastSeen = localStorage.getItem('crewpsr_last_seen_version');
  if (!lastSeen) {
    // First time we ever check — show just the current release, not the whole history.
    // (User wouldn't want a giant popup on first install.)
    return RELEASES.slice(0, 1);
  }
  // Find the index of the last-seen version in the list. Return everything newer than it.
  const idx = RELEASES.findIndex(r => r.version === lastSeen);
  if (idx === -1) {
    // User on a version we don't have in our list — show only the current one.
    return RELEASES.slice(0, 1);
  }
  return RELEASES.slice(0, idx);
}

function markReleasesSeen() {
  if (RELEASES.length === 0) return;
  localStorage.setItem('crewpsr_last_seen_version', RELEASES[0].version);
}

// Renders the popup. Pass `allHistory=true` to show every release in our history
// (used by the "Release notes" item in the Info menu).
function showReleaseNotes(allHistory = false) {
  const list = allHistory ? RELEASES : getUnseenReleases();
  if (list.length === 0) return;

  const cards = list.map(r => `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;
                padding:14px 16px;margin-bottom:12px">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
        <span style="font-size:15px;font-weight:800;color:var(--text)">v${r.version}</span>
        <span style="font-size:11px;color:var(--text3)">${r.date}</span>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--blue);margin-bottom:8px">${r.title}</div>
      <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:var(--text2)">
        ${r.notes.map(n => `<li style="margin-bottom:4px">${n}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  const titleText = allHistory ? 'Release notes' : (list.length === 1 ? "What's new" : "What's new (recent updates)");

  // Build the modal — we use settingModal which is already in index.html
  document.getElementById('settingModalTitle').textContent = titleText;
  document.getElementById('settingModalBody').innerHTML = `
    <div style="max-height:65vh;overflow-y:auto;margin-bottom:14px">
      ${cards}
    </div>
    <button class="btn" onclick="_closeReleaseNotes()">Got it</button>
  `;
  document.getElementById('settingModal').classList.add('open');
}

function _closeReleaseNotes() {
  closeModal('settingModal');
  markReleasesSeen();
}

// Auto-show on launch if there are unseen releases.
// Called from app.js after init.
function autoShowReleasesIfNeeded() {
  const unseen = getUnseenReleases();
  if (unseen.length > 0) {
    // Small delay so the home renders first and the popup feels less abrupt.
    setTimeout(() => showReleaseNotes(false), 800);
  }
}

window.showReleaseNotes = showReleaseNotes;
window.autoShowReleasesIfNeeded = autoShowReleasesIfNeeded;
window._closeReleaseNotes = _closeReleaseNotes;
