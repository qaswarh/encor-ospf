document.addEventListener('DOMContentLoaded', function () {
  // --- 1. Live Glossary Search (Whole-Word Boundary) ---
  var glossarySearch = document.getElementById('glossarySearch');
  var glossaryNoResults = document.getElementById('glossaryNoResults');
  var glossaryOspf = document.getElementById('glossaryOspf');

  function filterGlossary() {
    if (!glossarySearch) return;
    var query = glossarySearch.value.trim();
    var cards = glossaryOspf.querySelectorAll('.term-card');
    var cats = glossaryOspf.querySelectorAll('.glossary-cat');
    var visibleCount = 0;

    if (!query) {
      cards.forEach(function (c) { c.classList.remove('hidden'); });
      cats.forEach(function (cat) { cat.classList.remove('hidden'); });
      if (glossaryNoResults) glossaryNoResults.classList.add('hidden');
      return;
    }

    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('\\b' + escaped, 'i');

    cards.forEach(function (card) {
      var match = regex.test(card.textContent);
      card.classList.toggle('hidden', !match);
      if (match) visibleCount++;
    });

    cats.forEach(function (cat) {
      var next = cat.nextElementSibling;
      var hasVisible = false;
      while (next && !next.classList.contains('glossary-cat')) {
        if (next.classList.contains('term-card') && !next.classList.contains('hidden')) {
          hasVisible = true;
          break;
        }
        next = next.nextElementSibling;
      }
      cat.classList.toggle('hidden', !hasVisible);
    });

    if (glossaryNoResults) {
      glossaryNoResults.classList.toggle('hidden', visibleCount > 0);
    }
  }

  if (glossarySearch) {
    glossarySearch.addEventListener('input', filterGlossary);
  }

  // --- 2. OSPF Area & LSA Matrix Data ---
  var areaConfigs = {
    'standard': {
      title: 'Area 1 — Standard Area',
      abrAction: 'Floods Type 3, 4, and 5 LSAs into Area 1',
      defaultRoute: null,
      asbrAllowed: true,
      asbrNote: 'Redistributes External Routes (Type 5)',
      lsas: { 1: 'ALLOWED', 2: 'ALLOWED', 3: 'ALLOWED', 4: 'ALLOWED', 5: 'ALLOWED', 7: 'N/A' },
      ios: '! Standard Area (Default — no special area command needed)\nrouter ospf 1\n network 10.1.0.0 0.0.255.255 area 1'
    },
    'stub': {
      title: 'Area 1 — Stub Area',
      abrAction: 'Blocks Type 4 & 5; injects O*IA 0.0.0.0/0 default route',
      defaultRoute: 'Default Route: O*IA 0.0.0.0/0 (via ABR)',
      asbrAllowed: false,
      asbrNote: 'ASBR Forbidden in Stub Areas (Type 5 blocked)',
      lsas: { 1: 'ALLOWED', 2: 'ALLOWED', 3: 'ALLOWED', 4: 'BLOCKED', 5: 'BLOCKED', 7: 'N/A' },
      ios: '! Configure on ALL routers inside Area 1 (ABR + R2)\nrouter ospf 1\n area 1 stub'
    },
    'totally-stubby': {
      title: 'Area 1 — Totally Stubby Area (Cisco)',
      abrAction: 'Blocks Type 3, 4 & 5; injects O*IA 0.0.0.0/0 default route',
      defaultRoute: 'Default Route: O*IA 0.0.0.0/0 (Only inter-area route)',
      asbrAllowed: false,
      asbrNote: 'ASBR Forbidden in Totally Stubby Areas',
      lsas: { 1: 'ALLOWED', 2: 'ALLOWED', 3: 'BLOCKED', 4: 'BLOCKED', 5: 'BLOCKED', 7: 'N/A' },
      ios: '! On ABR:\nrouter ospf 1\n area 1 stub no-summary\n\n! On Internal Routers (R2):\nrouter ospf 1\n area 1 stub'
    },
    'nssa': {
      title: 'Area 1 — NSSA (Not-So-Stubby Area)',
      abrAction: 'Blocks Type 4 & 5 from Area 0; translates R3 Type 7 → Type 5',
      defaultRoute: 'Optional Default: O*N2 0.0.0.0/0 (with default-information-originate)',
      asbrAllowed: true,
      asbrNote: 'Allowed! Redistributes External Routes as Type 7 LSAs',
      lsas: { 1: 'ALLOWED', 2: 'ALLOWED', 3: 'ALLOWED', 4: 'BLOCKED', 5: 'BLOCKED', 7: 'ALLOWED' },
      ios: '! Configure on ALL routers inside Area 1 (ABR + R2 + R3)\nrouter ospf 1\n area 1 nssa\n! Optional default route from ABR:\n area 1 nssa default-information-originate'
    },
    'totally-nssa': {
      title: 'Area 1 — Totally NSSA (Cisco)',
      abrAction: 'Blocks Type 3, 4 & 5; injects O*IA 0.0.0.0/0 + allows local Type 7',
      defaultRoute: 'Default Route: O*IA 0.0.0.0/0 (Automatic on ABR)',
      asbrAllowed: true,
      asbrNote: 'Allowed! Redistributes External Routes as Type 7 LSAs',
      lsas: { 1: 'ALLOWED', 2: 'ALLOWED', 3: 'BLOCKED', 4: 'BLOCKED', 5: 'BLOCKED', 7: 'ALLOWED' },
      ios: '! On ABR:\nrouter ospf 1\n area 1 nssa no-summary\n\n! On Internal Routers & Local ASBR (R2, R3):\nrouter ospf 1\n area 1 nssa'
    }
  };

  var areaSelect = document.getElementById('areaTypeSelect');

  function updateAreaExplorer() {
    var cfg = areaConfigs[areaSelect.value];
    document.getElementById('area1Title').textContent = cfg.title;
    document.getElementById('abrActionText').textContent = cfg.abrAction;

    var badge = document.getElementById('r2DefaultBadge');
    if (cfg.defaultRoute) {
      badge.textContent = cfg.defaultRoute;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }

    var asbrBox = document.getElementById('localAsbrBox');
    asbrBox.classList.toggle('disabled-asbr', !cfg.asbrAllowed);
    document.getElementById('localAsbrNote').textContent = cfg.asbrNote;

    [1, 2, 3, 4, 5, 7].forEach(function (num) {
      var status = cfg.lsas[num];
      var card = document.getElementById('lsa-' + num);
      var stEl = document.getElementById('st-' + num);
      card.classList.remove('lsa-allowed', 'lsa-blocked', 'lsa-na');
      if (status === 'ALLOWED') card.classList.add('lsa-allowed');
      else if (status === 'BLOCKED') card.classList.add('lsa-blocked');
      else card.classList.add('lsa-na');
      stEl.textContent = status;
    });

    document.getElementById('iosConfigPre').textContent = cfg.ios;
  }

  areaSelect.addEventListener('change', updateAreaExplorer);
  // --- 3. Interactive 8-State OSPF Adjacency Stepper ---
  var ospfStates = [
    { name: '1. Down', desc: 'No Hello packets received from neighbor yet. Router sends multicast Hellos (224.0.0.5 / ff02::5) out OSPF-enabled interfaces.' },
    { name: '2. Attempt', desc: 'Used only on manually configured NBMA neighbors. Router sends unicast Hellos and waits for a reply.' },
    { name: '3. Init', desc: 'Router receives a Hello packet from a neighbor, but its own Router ID is NOT yet listed inside the neighbor\'s Hello packet.' },
    { name: '4. 2-Way', desc: 'Bidirectional communication confirmed (own Router ID seen in neighbor\'s Hello). DR and BDR election happens here on multi-access links. DROTHER-to-DROTHER neighbors intentionally stay in 2-Way.' },
    { name: '5. ExStart', desc: 'Master/Slave relationship is negotiated using empty DBD (Database Description) packets. Highest Router ID becomes Master. Common stuck cause: MTU mismatch.' },
    { name: '6. Exchange', desc: 'Routers exchange DBD packets containing LSA headers (summary of their LSDB) to see which LSAs are missing or newer.' },
    { name: '7. Loading', desc: 'Routers send LSR (Link-State Request) packets for missing LSAs; neighbors reply with full LSU (Link-State Update) packets, acknowledged via LSAck.' },
    { name: '8. Full', desc: 'LSDBs are 100% synchronized between neighbors. SPF (Dijkstra) algorithm runs to populate the routing table.' }
  ];

  var pillsContainer = document.getElementById('statePills');
  var detailBox = document.getElementById('stateDetail');

  ospfStates.forEach(function (st, idx) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'state-pill' + (idx === 7 ? ' active' : '');
    btn.textContent = st.name;
    btn.addEventListener('click', function () {
      pillsContainer.querySelectorAll('.state-pill').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      detailBox.innerHTML = '<strong>' + st.name + ':</strong> ' + st.desc;
    });
    pillsContainer.appendChild(btn);
  });

  detailBox.innerHTML = '<strong>' + ospfStates[7].name + ':</strong> ' + ospfStates[7].desc;

  // Close parent modal on Esc key when embedded in 4any1
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && window.parent !== window) {
      window.parent.postMessage('closeOspfModal', '*');
    }
  });

  updateAreaExplorer();
});
