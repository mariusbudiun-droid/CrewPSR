// ══════════════════════════════════════════════════════════════
// PERSISTENCE
// ══════════════════════════════════════════════════════════════
function save() {
  localStorage.setItem('crewpsr_v1', JSON.stringify(APP));
}

function load() {
  try {
    const r = localStorage.getItem('crewpsr_v1');
    if (r) {
      APP = { ...APP, ...JSON.parse(r) };
      return true;
    }
  } catch (e) {}
  return false;
}
