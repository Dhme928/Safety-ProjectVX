// My Observations App - main logic
// All browser code is wrapped so it’s safe if this file is linted in Node, etc.
(function () {
  if (typeof document === 'undefined') return;

  // -------------------- Small helpers --------------------

  function $(selector) {
    return document.querySelector(selector);
  }

  function $all(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  // Very small CSV parser that understands quotes and commas.
  function parseCSV(text) {
    const rows = [];
    let current = [];
    let value = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (char === '"' && next === '"') {
          value += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          value += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          current.push(value.trim());
          value = '';
        } else if (char === '\n') {
          current.push(value.trim());
          rows.push(current);
          current = [];
          value = '';
        } else if (char !== '\r') {
          value += char;
        }
      }
    }
    if (value.length || current.length) {
      current.push(value.trim());
      rows.push(current);
    }
    return rows.filter(r => r.length > 0);
  }
  // Small helper for safe HTML text in dynamically-built cards
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function findColumnIndex(headers, candidates) {
    if (!headers) return -1;
    const lower = headers.map(h => (h || '').toLowerCase().trim());
    for (const c of candidates) {
      const target = c.toLowerCase();
      const idx = lower.findIndex(h => h === target);
      if (idx !== -1) return idx;
    }
    for (const c of candidates) {
      const target = c.toLowerCase();
      const idx = lower.findIndex(h => h.includes(target));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function parseSheetDate(value) {
    if (!value) return null;
    let d = new Date(value);
    if (!isNaN(d.getTime())) return d;

    const parts = value.split(/[\/\-]/).map(p => p.trim());
    if (parts.length === 3) {
      let [a, b, c] = parts;
      if (c.length === 4) {
        const day = parseInt(a, 10);
        const month = parseInt(b, 10) - 1;
        const year = parseInt(c, 10);
        d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
    return null;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function isSameDay(a, b) {
    return (
      a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function isSameMonth(a, b) {
    return (
      a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth()
    );
  }

  function daysBetween(a, b) {
    const ms = startOfDay(a) - startOfDay(b);
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  // -------------------- Global state --------------------

  const state = {
    darkMode: false,
    observations: [],
    observationsLoaded: false,
    lastHeatSummary: null,
    lastWindSummary: null
  };

  const obsFilterState = {
    range: 'today',
    risk: '',
    status: '',
    search: ''
  };

  // -------------------- Tab navigation --------------------

  // track whether observations have been loaded at least once
  let observationsInitialized = false;

  function openTab(evt, tabId) {
    // hide all tab contents
    $all('.tab-content').forEach(sec => {
      sec.classList.remove('active');
      sec.style.display = 'none';
    });

    // show the selected tab
    const target = $('#' + tabId);
    if (target) {
      target.classList.add('active');
      target.style.display = 'block';
    }

    // update active state on bottom nav buttons
    const navButtons = $all('.nav-button');
    navButtons.forEach(btn => btn.classList.remove('active'));

    if (evt && evt.currentTarget) {
      evt.currentTarget.classList.add('active');
    } else {
      const match = navButtons.find(btn => btn.dataset.tab === tabId);
      if (match) match.classList.add('active');
    }

    // lazy-load heavy iframe (Tasks form)
    if (tabId === 'TasksTab') {
      initTasksIframe();
    }

    // 🔥 lazy-load observations ONLY when Observations tab is opened
    if (tabId === 'ObservationsTab' && !observationsInitialized) {
      observationsInitialized = true;
      loadObservations();
    }
  }

  // keep this so HTML can still call openTab if needed
  window.openTab = openTab;


  // expose for inline onclick (just in case)
  window.openTab = openTab;

  function setupNav() {
    $all('.nav-button').forEach(btn => {
      const tabId = btn.dataset.tab;
      if (!tabId) return;
      btn.addEventListener('click', e => openTab(e, tabId));
    });
    // default
    openTab(null, 'HomeTab');
  }

  // -------------------- Accordions --------------------

function setupAccordions() {
  const accordions = $all('.accordion');

  accordions.forEach(btn => {
    // 🔹 Skip rows that are used as modal triggers (no expand/collapse)
    if (btn.classList.contains('accordion-modal')) return;

    btn.addEventListener('click', () => {
      const panel = btn.nextElementSibling;
      if (!panel) return;

      const isOpen = panel.style.display === 'block';

      // close all
      accordions.forEach(otherBtn => {
        if (otherBtn.classList.contains('accordion-modal')) return;
        const otherPanel = otherBtn.nextElementSibling;
        if (!otherPanel) return;
        otherBtn.classList.remove('active');
        otherPanel.style.display = 'none';
      });

      // toggle clicked
      if (!isOpen) {
        btn.classList.add('active');
        panel.style.display = 'block';
      }
    });
  });
}



  // -------------------- Modals --------------------

  function showLeaderboardModal() {
    const modal = $('#leaderboardModal');
    if (modal) modal.classList.add('show');
  }

  function hideLeaderboardModal() {
    const modal = $('#leaderboardModal');
    if (modal) modal.classList.remove('show');
  }

  function showEmergencyContactsModal() {
    const modal = $('#emergencyContactsModal');
    if (modal) modal.classList.add('show');
  }

  function hideEmergencyContactsModal() {
    const modal = $('#emergencyContactsModal');
    if (modal) modal.classList.remove('show');
  }

  window.showLeaderboardModal = showLeaderboardModal;
  window.hideLeaderboardModal = hideLeaderboardModal;
  window.showEmergencyContactsModal = showEmergencyContactsModal;
  window.hideEmergencyContactsModal = hideEmergencyContactsModal;

  function setupModals() {
    $all('.modal').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    });
  }

  // -------------------- Dark / light mode --------------------

  function applyDarkMode(dark) {
    const body = document.body;
    const modeIcon = $('#modeIcon');
    state.darkMode = dark;
    if (dark) {
      body.classList.add('dark-mode');
      if (modeIcon) modeIcon.className = 'fas fa-sun';
    } else {
      body.classList.remove('dark-mode');
      if (modeIcon) modeIcon.className = 'fas fa-moon';
    }
    try {
      localStorage.setItem('safetyAppDarkMode', dark ? '1' : '0');
    } catch (_) {}
  }

  function toggleDarkMode() {
    applyDarkMode(!state.darkMode);
  }

  window.toggleDarkMode = toggleDarkMode;

  function setupDarkMode() {
    let stored = null;
    try {
      stored = localStorage.getItem('safetyAppDarkMode');
    } catch (_) {}
    if (stored === '1') {
      applyDarkMode(true);
    } else {
      applyDarkMode(false);
    }
    const toggle = $('.mode-toggle');
    if (toggle) {
      toggle.addEventListener('click', toggleDarkMode);
    }
  }

  // -------------------- GPS helper --------------------

  function getGPSLocation() {
    const resultEl = $('#locationResult');
    if (!navigator.geolocation) {
      if (resultEl) {
        resultEl.textContent = 'Geolocation not supported on this device.';
      }
      return;
    }

    if (resultEl) {
      resultEl.textContent = 'Getting location...';
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const link = `https://maps.google.com/?q=${latitude},${longitude}`;
        if (resultEl) {
          resultEl.innerHTML = `
            <strong>Location:</strong> ${latitude.toFixed(5)}, ${longitude.toFixed(5)}
            <br><a href="${link}" target="_blank">Open in Google Maps</a>
          `;
        }
      },
      err => {
        if (resultEl) {
          resultEl.textContent = 'Unable to get location: ' + err.message;
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
  window.getGPSLocation = getGPSLocation;
function getRotatingColorForCurrentMonth() {
  try {
    const m = new Date().getMonth(); // 0 = Jan ... 11 = Dec
    const map = {
      0: 'Yellow', // Jan
      1: 'Red',    // Feb
      2: 'Blue',   // Mar
      3: 'Green',  // Apr
      4: 'Yellow', // May
      5: 'Red',    // Jun
      6: 'Blue',   // Jul
      7: 'Green',  // Aug
      8: 'Yellow', // Sep
      9: 'Red',    // Oct
      10: 'Blue',  // Nov
      11: 'Green'  // Dec
    };
    return map[m] || window.DEFAULT_MONTH_COLOR_NAME || 'White';
  } catch (e) {
    return window.DEFAULT_MONTH_COLOR_NAME || 'White';
  }
}
function applyMonthColorBadge(el, name) {
  const label = (name || '').trim() || 'N/A';

  el.textContent = label;
  el.classList.add('month-color-badge');
  el.classList.remove('color-red', 'color-blue', 'color-green', 'color-yellow');

  const lower = label.toLowerCase();
  if (lower.includes('red')) el.classList.add('color-red');
  else if (lower.includes('blue')) el.classList.add('color-blue');
  else if (lower.includes('green')) el.classList.add('color-green');
  else if (lower.includes('yellow')) el.classList.add('color-yellow');
}

  // -------------------- EOM + Leaderboard --------------------

async function loadEomAndLeaderboard() {
  const url = window.EOM_SHEET_URL;
  const eomNameEl = $('#employeeOfMonth');
  const colorNameEl = $('#colorName');
  const leaderboardMini = $('#homeLeaderboardMini');
  const leaderboardContainer = $('#leaderboardContainer');

  if (!url) {
    if (eomNameEl) eomNameEl.textContent = 'Configure EOM_SHEET_URL in js/data.js';
    if (colorNameEl) {
      const fallback = getRotatingColorForCurrentMonth();
      applyMonthColorBadge(colorNameEl, fallback);
    }
    if (leaderboardMini) leaderboardMini.textContent = 'No leaderboard data.';
    if (leaderboardContainer) leaderboardContainer.textContent = 'No leaderboard data.';
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCSV(text);
    if (!rows.length) throw new Error('Empty sheet');

    const headers = rows[0];
    const body = rows.slice(1).filter(r => r.some(c => c && c.trim() !== ''));

    if (!body.length) throw new Error('No data rows');

    const idxMonth = findColumnIndex(headers, ['Month', 'Period']);
    const idxColor = findColumnIndex(headers, ['Color', 'Color Code']);
    const idxEomName = findColumnIndex(headers, ['Employee', 'Employee of Month', 'Name']);
    const idxPoints = findColumnIndex(headers, ['Points', 'Score']);

    const current = body[0];

    const eomName = idxEomName !== -1 ? current[idxEomName] : '';
    const colorFromSheet = idxColor !== -1 ? current[idxColor] : '';
    const fallbackColor = getRotatingColorForCurrentMonth();
    const finalColorName = (colorFromSheet && colorFromSheet.trim()) || fallbackColor;

    if (eomNameEl) eomNameEl.textContent = eomName || 'Not set';
    if (colorNameEl) {
      applyMonthColorBadge(colorNameEl, finalColorName);
    }

    const leaderboardItems = body.slice(0, 50).map(row => ({
      name: idxEomName !== -1 ? row[idxEomName] : row[0],
      points: idxPoints !== -1 ? row[idxPoints] : ''
    })).filter(p => p.name);

    // ---------- Top 3 mini card with medals ----------
    if (leaderboardMini) {
      if (!leaderboardItems.length) {
        leaderboardMini.textContent = 'No leaderboard data.';
      } else {
        leaderboardMini.innerHTML = leaderboardItems
          .slice(0, 3)
          .map((p, i) => {
            const medalClass =
              i === 0 ? 'medal-gold' :
              i === 1 ? 'medal-silver' :
              i === 2 ? 'medal-bronze' : '';

            return `
              <div class="leaderboard-mini-item">
                <div class="leaderboard-mini-left">
                  <span class="leaderboard-medal ${medalClass}">
                    <i class="fas fa-medal"></i>
                  </span>
                  <div class="leaderboard-mini-text">
                    <div class="leaderboard-name">${p.name}</div>
                    ${p.points ? `<div class="leaderboard-points">${p.points} pts</div>` : ''}
                  </div>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    // ---------- Full leaderboard in modal ----------
    if (leaderboardContainer) {
      if (!leaderboardItems.length) {
        leaderboardContainer.textContent = 'No leaderboard data.';
      } else {
        leaderboardContainer.innerHTML = leaderboardItems
          .map((p, i) => `
            <div class="leaderboard-row">
              <span class="leaderboard-rank">#${i + 1}</span>
              <span class="leaderboard-row-name">${p.name}</span>
              ${p.points ? `<span class="leaderboard-row-points">${p.points} pts</span>` : ''}
            </div>
          `)
          .join('');
      }
    }
  } catch (err) {
    console.error('EOM/Leaderboard error:', err);
    if (eomNameEl) eomNameEl.textContent = 'Error loading data';
    if (colorNameEl) {
      const fallback = getRotatingColorForCurrentMonth();
      applyMonthColorBadge(colorNameEl, fallback);
    }
    if (leaderboardMini) leaderboardMini.textContent = 'Error loading leaderboard.';
    if (leaderboardContainer) leaderboardContainer.textContent = 'Error loading leaderboard.';
  }
}

  // -------------------- TBT of the day + TBT/JSA libraries --------------------

  function pickTbtOfDay(list) {
    if (!list || !list.length) return null;
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = dayOfYear % list.length;
    return list[index];
  }

  function setupTbtOfDay() {
    const list = Array.isArray(window.tbtData) ? window.tbtData : [];
    const tbtSection = $('#homeTbtSection');
    const tbtContent = $('#homeTbtContent');
    const tbtPanel = $('#tbtPanel');

    if (!list.length) {
      if (tbtContent) tbtContent.textContent = 'No TBT data configured. Add items in js/data.js.';
      if (tbtPanel) tbtPanel.textContent = 'No TBT data configured.';
      return;
    }

    const todayTbt = pickTbtOfDay(list);
    if (tbtContent && todayTbt) {
      tbtContent.innerHTML = `
        <div class="tbt-title">${todayTbt.title}</div>
        <a href="${todayTbt.link}" class="tbt-link" target="_blank">Open TBT document</a>
      `;
    }

    if (tbtPanel) {
      tbtPanel.innerHTML = list.map(item => `
        <div class="tbt-item">
          <i class="fas fa-book-open"></i>
          <a href="${item.link}" target="_blank">${item.title}</a>
        </div>
      `).join('');
    }
  }

  // ---- Library cards (JSA & TBT) ----

  // Build one expandable "news-style" card for a library document
  function createLibraryDocCard(item, type) {
    const safeTitle = escapeHtml(item.title || '');
    const safeLink = item.link || '#';

    const desc =
      type === 'jsa'
        ? 'Job Safety Analysis document for specific site activities.'
        : 'Tool Box Talk document for daily or weekly safety briefings.';

    return `
      <article class="announcement-card library-doc-card" data-link="${safeLink}">
        <div class="card-title clickable">
          <span>${safeTitle}</span>
          <i class="fas fa-chevron-down toggle-icon"></i>
        </div>
        <div class="card-content">
          <p style="margin-bottom:0.5rem;">${desc}</p>
          <button type="button" class="library-open-btn">
            Open "${safeTitle}"
          </button>
        </div>
      </article>
    `;
  }

  // Attach expand/collapse + Open button behaviour to cards inside a container
  function wireLibraryCards(container) {
    if (!container) return;

    const cards = Array.from(container.querySelectorAll('.library-doc-card'));

    cards.forEach(card => {
      const titleEl = card.querySelector('.card-title');
      const contentEl = card.querySelector('.card-content');
      const icon = card.querySelector('.toggle-icon');
      const btn = card.querySelector('.library-open-btn');
      const link = card.dataset.link;

      if (contentEl) {
        // start collapsed
        contentEl.style.display = 'none';
      }

      if (titleEl && contentEl) {
        titleEl.addEventListener('click', () => {
          const isOpen = card.classList.contains('open');

          // close all other cards first
          cards.forEach(other => {
            other.classList.remove('open');
            const otherContent = other.querySelector('.card-content');
            const otherIcon = other.querySelector('.toggle-icon');
            if (otherContent) otherContent.style.display = 'none';
            if (otherIcon) otherIcon.classList.remove('rotated');
          });

          if (!isOpen) {
            card.classList.add('open');
            contentEl.style.display = 'block';
            if (icon) icon.classList.add('rotated');
          }
        });
      }

      if (btn && link) {
        btn.addEventListener('click', ev => {
          ev.stopPropagation();
          window.open(link, '_blank');
        });
      }
    });
  }

  // TBT library: search + cards
function setupTbtLibrary() {
  const list = Array.isArray(window.tbtData) ? window.tbtData : [];
  const container = $('#tbtLibraryList');
  const search = $('#tbtSearch');
  if (!container) return;

  function render(filter) {
    const q = (filter || '').toLowerCase();
    const filtered = list.filter(item =>
      !q || (item.title && item.title.toLowerCase().includes(q))
    );

    if (!filtered.length) {
      container.innerHTML = '<p class="text-muted">No TBT found for this search.</p>';
      return;
    }

    container.innerHTML = filtered
      .map(item => `
        <div class="library-item-card">
          <div class="library-item-header">
            <div class="library-item-title">
              <i class="fas fa-book-open"></i>
              <span>${item.title}</span>
            </div>
            <i class="fas fa-chevron-down library-item-toggle"></i>
          </div>
          <div class="library-item-body">
            <a href="${item.link}" target="_blank" class="library-item-open-button">
              <i class="fas fa-external-link-alt"></i>
              Open "${item.title}"
            </a>
          </div>
        </div>
      `)
      .join('');

    const cards = Array.from(container.querySelectorAll('.library-item-card'));

    cards.forEach(card => {
      const headerEl = card.querySelector('.library-item-header');
      const bodyEl = card.querySelector('.library-item-body');
      const toggleIcon = card.querySelector('.library-item-toggle');
      if (!headerEl || !bodyEl) return;

      // start collapsed
      bodyEl.style.display = 'none';

      headerEl.addEventListener('click', () => {
        const isOpen = bodyEl.style.display === 'block';

        // 🔒 close all cards first
        cards.forEach(c => {
          const b = c.querySelector('.library-item-body');
          const i = c.querySelector('.library-item-toggle');
          if (b) b.style.display = 'none';
          if (i) i.classList.remove('rotated');
        });

        // then open the one that was clicked (if it was closed)
        if (!isOpen) {
          bodyEl.style.display = 'block';
          if (toggleIcon) toggleIcon.classList.add('rotated');
        }
      });
    });
  }

  if (!list.length) {
    container.textContent = 'No TBT items found.';
    return;
  }

  render('');

  if (search) {
    search.addEventListener('input', () => {
      render(search.value);
    });
  }
}
  // JSA library: search + cards
function setupJsaLibrary() {
  const list = Array.isArray(window.jsaData) ? window.jsaData : [];
  const container = $('#jsaListContainer');
  const search = $('#jsaSearch');
  if (!container) return;

  function render(filter) {
    const q = (filter || '').toLowerCase();
    const filtered = list.filter(item =>
      !q || (item.title && item.title.toLowerCase().includes(q))
    );

    if (!filtered.length) {
      container.innerHTML = '<p class="text-muted">No JSA found for this search.</p>';
      return;
    }

    container.innerHTML = filtered
      .map(item => `
        <div class="library-item-card">
          <div class="library-item-header">
            <div class="library-item-title">
              <i class="fas fa-clipboard-list"></i>
              <span>${item.title}</span>
            </div>
            <i class="fas fa-chevron-down library-item-toggle"></i>
          </div>
          <div class="library-item-body">
            <a href="${item.link}" target="_blank" class="library-item-open-button">
              <i class="fas fa-external-link-alt"></i>
              Open "${item.title}"
            </a>
          </div>
        </div>
      `)
      .join('');

    const cards = Array.from(container.querySelectorAll('.library-item-card'));

    cards.forEach(card => {
      const headerEl = card.querySelector('.library-item-header');
      const bodyEl = card.querySelector('.library-item-body');
      const toggleIcon = card.querySelector('.library-item-toggle');
      if (!headerEl || !bodyEl) return;

      bodyEl.style.display = 'none';

      headerEl.addEventListener('click', () => {
        const isOpen = bodyEl.style.display === 'block';

        // 🔒 close all JSA cards first
        cards.forEach(c => {
          const b = c.querySelector('.library-item-body');
          const i = c.querySelector('.library-item-toggle');
          if (b) b.style.display = 'none';
          if (i) i.classList.remove('rotated');
        });

        if (!isOpen) {
          bodyEl.style.display = 'block';
          if (toggleIcon) toggleIcon.classList.add('rotated');
        }
      });
    });
  }

  if (!list.length) {
    container.textContent = 'No JSA found.';
    return;
  }

  render('');

  if (search) {
    search.addEventListener('input', () => {
      render(search.value);
    });
  }
}
  // Switch between "menu" / JSA view / TBT view
function setupLibrarySwitcher() {
  const chooser = $('#libraryChooser');
  const content = $('#libraryContent');
  const backBtn = $('#libraryBackButton');
  const titleEl = $('#libraryTitle');
  const jsaSearchWrapper = $('#libraryJsaSearchWrapper');
  const tbtSearchWrapper = $('#libraryTbtSearchWrapper');
  const tbtList = $('#tbtLibraryList');
  const jsaList = $('#jsaListContainer');

  if (!chooser || !content || !backBtn || !titleEl || !tbtList || !jsaList) return;

  function showChooser() {
    chooser.style.display = 'flex';
    content.style.display = 'none';

    if (jsaSearchWrapper) jsaSearchWrapper.style.display = 'none';
    if (tbtSearchWrapper) tbtSearchWrapper.style.display = 'none';
    jsaList.style.display = 'none';
    tbtList.style.display = 'none';
  }

  function openLibrary(type) {
    chooser.style.display = 'none';
    content.style.display = 'block';

    if (type === 'jsa') {
      titleEl.textContent = 'Job Safety Analysis Library';
      if (jsaSearchWrapper) jsaSearchWrapper.style.display = 'block';
      if (tbtSearchWrapper) tbtSearchWrapper.style.display = 'none';
      jsaList.style.display = 'block';
      tbtList.style.display = 'none';
    } else if (type === 'tbt') {
      titleEl.textContent = 'Tool Box Talk Library';
      if (jsaSearchWrapper) jsaSearchWrapper.style.display = 'none';
      if (tbtSearchWrapper) tbtSearchWrapper.style.display = 'block';
      jsaList.style.display = 'none';
      tbtList.style.display = 'block';
    }

    // scroll to top of content
    content.scrollTop = 0;
  }

  backBtn.addEventListener('click', showChooser);

  $all('.library-choice-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.library;
      openLibrary(type);
    });
  });

  // Default state
  showChooser();
}
  // -------------------- Tools (KPI / Heat / Wind) --------------------

  // Heat index formula: convert C to F, apply NOAA formula, back to C
  function calculateHeatIndexC(tempC, humidity) {
    if (tempC == null || humidity == null) return null;
    const T = tempC * 9 / 5 + 32;
    const R = humidity;

    const HI =
      -42.379 +
      2.04901523 * T +
      10.14333127 * R -
      0.22475541 * T * R -
      0.00683783 * T * T -
      0.05481717 * R * R +
      0.00122874 * T * T * R +
      0.00085282 * T * R * R -
      0.00000199 * T * T * R * R;

    const C = (HI - 32) * 5 / 9;
    return C;
  }

  function classifyHeatRisk(heatIndexC) {
    if (heatIndexC == null || isNaN(heatIndexC)) return { label: '--', level: 'unknown' };
    if (heatIndexC < 27) return { label: 'Safe', level: 'safe' };
    if (heatIndexC < 32) return { label: 'Caution', level: 'caution' };
    if (heatIndexC < 41) return { label: 'Extreme Caution', level: 'warning' };
    if (heatIndexC < 54) return { label: 'Danger', level: 'danger' };
    return { label: 'Extreme Danger', level: 'extreme' };
  }

  function classifyWindRisk(speed) {
    if (speed == null || isNaN(speed)) return { label: '--', level: 'unknown' };
    // Saudi Aramco CSM I-11: Manbaskets limit is 32 km/h
    if (speed < 20) return { label: 'Safe for normal work', level: 'safe' };
    if (speed < 32) return { label: 'Caution – Approaching man-basket limit', level: 'caution' };
    return { label: 'STOP Man-basket Operations (>32km/h)', level: 'danger' };
  }

function calculateHeatIndex() {
  const tempInput = $('#inputTemp');
  const humInput = $('#inputHumidity');
  const valueEl = $('#heatIndexValue');
  const levelEl = $('#heatRiskLevel');
  const listEl = $('#heatRecommendationsList');
  const homeHeat = $('#homeHeatSummary');
  const cardEl = $('#heatIndexResultCard');

  if (!tempInput || !humInput || !valueEl || !levelEl || !listEl || !cardEl) return;

  const t = parseFloat(tempInput.value);
  const h = parseFloat(humInput.value);

  // If fields are empty or not numbers, reset card + home card
  if (isNaN(t) || isNaN(h)) {
    valueEl.textContent = '--';
    levelEl.textContent = '--';
    listEl.innerHTML = '<li>Enter temperature and humidity to see results.</li>';

    cardEl.style.backgroundColor = '';
    cardEl.style.color = '';
    cardEl.style.borderColor = '';

    levelEl.style.backgroundColor = '';
    levelEl.style.color = '';
    listEl.style.color = '';

    if (homeHeat) {
      homeHeat.textContent = '--';
      const homeHeatCard = homeHeat.closest('.home-env-card');
      if (homeHeatCard) {
        homeHeatCard.style.backgroundColor = '';
        homeHeatCard.style.color = '';
        homeHeatCard.style.border = '';
      }
    }
    return;
  }

  const heatC = calculateHeatIndexC(t, h);
  const risk = classifyHeatRisk(heatC);

  if (heatC == null || isNaN(heatC)) {
    valueEl.textContent = '--';
    levelEl.textContent = '--';
    listEl.innerHTML = '<li>Enter temperature and humidity to see results.</li>';

    cardEl.style.backgroundColor = '';
    cardEl.style.color = '';
    cardEl.style.borderColor = '';

    levelEl.style.backgroundColor = '';
    levelEl.style.color = '';
    listEl.style.color = '';

    if (homeHeat) {
      homeHeat.textContent = '--';
      const homeHeatCard = homeHeat.closest('.home-env-card');
      if (homeHeatCard) {
        homeHeatCard.style.backgroundColor = '';
        homeHeatCard.style.color = '';
        homeHeatCard.style.border = '';
      }
    }
    return;
  }

  const rounded = Math.round(heatC);
  valueEl.textContent = `${rounded}°C`;

  // 🔁 Lowest category in UI is Caution (no "Safe")
  let label = risk && risk.label ? risk.label : 'Caution';
  if (label === 'Safe') label = 'Caution';

  // Default styling
  let bg = '#22c55e';
  let textColor = '#ffffff';
  let tagBg = 'rgba(15,23,42,0.30)';
  let tagColor = '#ffffff';

  let details = {
    symptoms: '',
    workRest: '',
    water: '',
    controls: ''
  };

  switch (label) {
    case 'Caution':
    case 'Safe':
      bg = '#22c55e'; // green
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.3)';
      tagColor = '#ffffff';
      details = {
        symptoms: 'Comfortable to warm. Mild fatigue or heat cramps possible.',
        workRest: 'Normal work for acclimatized workers. Encourage short breaks in shade.',
        water: '250–500 ml every 20–30 minutes.',
        controls: 'Ensure water and shade, use buddy system, brief workers on early heat symptoms.'
      };
      break;

    case 'Extreme Caution':
      bg = '#facc15'; // yellow
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.4)';
      tagColor = '#ffffff';
      details = {
        symptoms: 'Headache, weakness, nausea, possible heat exhaustion.',
        workRest: 'Plan work/rest cycles, especially for heavy work and new workers.',
        water: 'At least 500 ml every 20 minutes.',
        controls: 'Increase supervision, enforce shaded breaks, shift heavy tasks to cooler hours.'
      };
      break;

    case 'Danger':
      bg = '#f97316'; // orange
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.45)';
      tagColor = '#ffffff';
      details = {
        symptoms: 'Dizziness, confusion, heat exhaustion likely if unprotected.',
        workRest: 'Reduce heavy work; short work/rest (e.g. 30/30 min) per site GI.',
        water: '500–750 ml every 15–20 minutes.',
        controls: 'Dedicated heat-stress watch, cooling areas, limit non-essential outdoor tasks.'
      };
      break;

    case 'Extreme Danger':
      bg = '#dc2626'; // red
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.5)';
      tagColor = '#ffffff';
      details = {
        symptoms: 'Collapse, loss of consciousness, heat stroke possible.',
        workRest: 'Stop non-essential outdoor work. Only life-saving work with management approval.',
        water: '500–1000 ml plus immediate medical evaluation for any symptoms.',
        controls: 'Activate emergency response, rapid cooling, follow site heat-stress / GI procedure.'
      };
      break;

    default:
      bg = '#64748b';
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.35)';
      tagColor = '#ffffff';
      details = {
        symptoms: 'Check inputs and site heat-stress guideline.',
        workRest: 'Follow site GI / CSM recommendations.',
        water: 'Ensure regular drinking schedule is in place.',
        controls: 'Consult HSE for correct category and controls.'
      };
      break;
  }

  // 👉 Tools tab card colors
  cardEl.style.backgroundColor = bg;
  cardEl.style.color = textColor;
  cardEl.style.borderColor = 'rgba(15,23,42,0.15)';

  levelEl.textContent = label;
  levelEl.style.backgroundColor = tagBg;
  levelEl.style.color = tagColor;

  listEl.style.color = textColor;
  listEl.innerHTML = `
    <li><strong>Symptoms:</strong> ${details.symptoms}</li>
    <li><strong>Work / Rest Periods:</strong> ${details.workRest}</li>
    <li><strong>Min. Water Needed:</strong> ${details.water}</li>
    <li><strong>Progressive Controls:</strong> ${details.controls}</li>
  `;

  // 👉 Home tab mini card (same color)
  if (homeHeat) {
    homeHeat.textContent = `${label} (${rounded}°C HI)`;
    state.lastHeatSummary = homeHeat.textContent;

    const homeHeatCard = homeHeat.closest('.home-env-card');
    if (homeHeatCard) {
      homeHeatCard.style.backgroundColor = bg;
      homeHeatCard.style.color = '#ffffff';
      homeHeatCard.style.border = '1px solid rgba(15,23,42,0.20)';
    }
  }
}

  window.calculateHeatIndex = calculateHeatIndex;

function calculateWindSafety() {
  const windInput = $('#inputWind');
  const valueEl = $('#windValue');
  const levelEl = $('#windRiskLevel');
  const listEl = $('#windRecommendationsList');
  const homeWind = $('#homeWindSummary');
  const cardEl = $('#windSpeedResultCard');

  if (!windInput || !valueEl || !levelEl || !listEl || !cardEl) return;

  const v = parseFloat(windInput.value);

  // Reset state if invalid
  if (v == null || isNaN(v)) {
    valueEl.textContent = '--';
    levelEl.textContent = '--';
    listEl.innerHTML = '<li>Enter wind speed to see limits.</li>';

    cardEl.style.backgroundColor = '';
    cardEl.style.color = '';
    cardEl.style.borderColor = '';

    levelEl.style.backgroundColor = '';
    levelEl.style.color = '';
    listEl.style.color = '';

    if (homeWind) {
      homeWind.textContent = '--';
      const homeWindCard = homeWind.closest('.home-env-card');
      if (homeWindCard) {
        homeWindCard.style.backgroundColor = '';
        homeWindCard.style.color = '';
        homeWindCard.style.border = '';
      }
    }
    return;
  }

  const risk = classifyWindRisk(v); // your existing helper

  valueEl.textContent = `${v.toFixed(0)} km/h`;

  // Default: green (safe)
  let bg = '#22c55e';
  let textColor = '#ffffff';
  let tagBg = 'rgba(15,23,42,0.30)';
  let tagColor = '#ffffff';

  let details = {
    operations: '',
    manbasket: '',
    monitoring: '',
    controls: ''
  };

  switch (risk.level) {
    case 'safe':
      // 🟢 Safe – normal work
      bg = '#22c55e';
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.35)';
      tagColor = '#ffffff';
      details = {
        operations: 'Normal crane and equipment operations allowed per approved lift plan.',
        manbasket: 'Personnel platforms allowed below 32 km/h with full pre-use checks.',
        monitoring: 'Check wind at least every 30 minutes and whenever conditions change.',
        controls: 'Ensure calibrated anemometer, clear communications, follow CSM I-11 limits.'
      };
      break;

    case 'caution':
      // 🟡 Caution – approaching limit
      bg = '#facc15';
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.45)';
      tagColor = '#ffffff';
      details = {
        operations: 'Limit or postpone non-essential lifts; reduce radius / load where possible.',
        manbasket: 'Review the need for man-basket; be ready to suspend if speed increases.',
        monitoring: 'Continuous monitoring with readings logged; watch for gusts.',
        controls: 'Brief crew, extend exclusion zone, supervisor to approve each lift individually.'
      };
      break;

    case 'danger':
      // 🔴 Danger – above man-basket limit
      bg = '#dc2626';
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.55)';
      tagColor = '#ffffff';
      details = {
        operations: 'Suspend non-critical crane / lifting operations until wind returns to safe limits.',
        manbasket: 'STOP all man-basket / personnel platform operations and lower basket safely.',
        monitoring: 'Continue monitoring; only restart when wind is stable back in safe range.',
        controls: 'Notify supervisor / HSE, apply Stop Work Authority, barricade the area per CSM.'
      };
      break;

    default:
      bg = '#64748b';
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.40)';
      tagColor = '#ffffff';
      details = {
        operations: 'Check input values and refer to site wind-limit guideline.',
        manbasket: 'Follow man-basket limits from CSM / GI.',
        monitoring: 'Keep monitoring until a clear category is confirmed.',
        controls: 'Consult HSE for correct limits and required controls.'
      };
      break;
  }

  // 👉 Tools tab card
  cardEl.style.backgroundColor = bg;
  cardEl.style.color = textColor;
  cardEl.style.borderColor = 'rgba(15,23,42,0.15)';

  levelEl.textContent = risk.label;
  levelEl.style.backgroundColor = tagBg;
  levelEl.style.color = tagColor;

  listEl.style.color = textColor;
  listEl.innerHTML = `
    <li><strong>Crane &amp; Equipment:</strong> ${details.operations}</li>
    <li><strong>Man-basket / Personnel:</strong> ${details.manbasket}</li>
    <li><strong>Monitoring:</strong> ${details.monitoring}</li>
    <li><strong>Required Controls:</strong> ${details.controls}</li>
  `;

  // 👉 Home tab mini card
  if (homeWind) {
    homeWind.textContent = `${risk.label} (${v.toFixed(0)} km/h)`;
    state.lastWindSummary = homeWind.textContent;

    const homeWindCard = homeWind.closest('.home-env-card');
    if (homeWindCard) {
      homeWindCard.style.backgroundColor = bg;
      homeWindCard.style.color = '#ffffff';
      homeWindCard.style.border = '1px solid rgba(15,23,42,0.20)';
    }
  }
}

  window.calculateWindSafety = calculateWindSafety;

  function setupTools() {
    const kpiBtn = document.querySelector('[data-tool="kpi"]');
    const heatBtn = document.querySelector('[data-tool="heat"]');
    const windBtn = document.querySelector('[data-tool="wind"]');
    const kpiSection = $('#kpiSection');
    const heatSection = $('#heatStressSection');
    const windSection = $('#windSpeedSection');

    function setActive(tool) {
      [kpiBtn, heatBtn, windBtn].forEach(btn => btn && btn.classList.remove('active-tool'));
      if (tool === 'kpi' && kpiBtn) kpiBtn.classList.add('active-tool');
      if (tool === 'heat' && heatBtn) heatBtn.classList.add('active-tool');
      if (tool === 'wind' && windBtn) windBtn.classList.add('active-tool');

      if (kpiSection) kpiSection.style.display = tool === 'kpi' ? 'block' : 'none';
      if (heatSection) heatSection.style.display = tool === 'heat' ? 'block' : 'none';
      if (windSection) windSection.style.display = tool === 'wind' ? 'block' : 'none';
    }

    if (kpiBtn) kpiBtn.addEventListener('click', () => setActive('kpi'));
    if (heatBtn) heatBtn.addEventListener('click', () => setActive('heat'));
    if (windBtn) windBtn.addEventListener('click', () => setActive('wind'));

    // expose for old inline onclick, if it exists
    window.switchTool = setActive;

    // default
    setActive('kpi');
  }

// -------------------- Observations (CSV) --------------------

async function loadObservations() {
  const url = window.OBSERVATIONS_SHEET_CSV_URL;
  const emptyState = $('#observationsEmptyState');
  if (!url) {
    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.querySelector('p').textContent =
        'No observations sheet configured. Set OBSERVATIONS_SHEET_CSV_URL in js/data.js.';
    }
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCSV(text);
    if (!rows.length) throw new Error('Empty sheet');

    const headers = rows[0];
    const body = rows.slice(1).filter(r => r.some(c => c && c.trim() !== ''));

    const idxCode = findColumnIndex(headers, ['Code']);
    const idxDate = findColumnIndex(headers, ['Date']);
    const idxDay = findColumnIndex(headers, ['Day']);
    const idxGroup = findColumnIndex(headers, ['Group #', 'Group', 'Group No', 'Group Number']);

    const idxType = findColumnIndex(headers, ['Activity Type', 'Observation Types', 'Observation Type']);
    const idxClass = findColumnIndex(headers, ['Observation Class']);
    const idxObsTypes = findColumnIndex(headers, ['Observation Types']);

    const idxInjuryFlag = findColumnIndex(headers, ['Injury/No Injury', 'Injury / No Injury']);
    const idxInjuryType = findColumnIndex(headers, ['Type of Injury', 'Injury Type']);

    const idxDesc = findColumnIndex(headers, ['Description', 'Details']);
    const idxName = findColumnIndex(headers, ['Name', 'Observer', 'Reported By']);
    const idxId = findColumnIndex(headers, ['ID', 'Badge', 'Iqama']);
    const idxPosition = findColumnIndex(headers, ['Position', 'Job Title']);

    const idxDirect = findColumnIndex(headers, ['Direct Cause']);
    const idxRoot = findColumnIndex(headers, ['Root Cause']);
    const idxEquip = findColumnIndex(headers, ['Equipment / Tool', 'Equipment', 'Tool']);

    const idxArea = findColumnIndex(headers, ['Area', 'Location']);
    const idxLikelihood = findColumnIndex(headers, ['Likelihood']);
    const idxSeverity = findColumnIndex(headers, ['Severity']);
    const idxRaRate = findColumnIndex(headers, ['RA Rate', 'Risk Rate']);
    const idxRaLevel = findColumnIndex(headers, ['RA Level', 'Risk Level']);
    const idxStatus = findColumnIndex(headers, ['Report Status', 'Status']);
    const idxGi = findColumnIndex(headers, ['GI Number #', 'GI Number', 'GI #']);
    const idxComments = findColumnIndex(headers, ['Comments', 'Comment']);

    const observations = body.map(row => {
      const dateRaw = idxDate !== -1 ? row[idxDate] : '';
      const date = parseSheetDate(dateRaw);
      const groupVal = idxGroup !== -1 ? (row[idxGroup] || '') : '';

      return {
        // Basic identifiers
        code: idxCode !== -1 ? (row[idxCode] || '') : '',
        date,
        dateRaw,
        day: idxDay !== -1 ? (row[idxDay] || '') : '',
        group: groupVal,

        // Type / classification
        type: idxType !== -1 ? (row[idxType] || '') : '',
        obsClass: idxClass !== -1 ? (row[idxClass] || '') : '',
        obsTypes: idxObsTypes !== -1 ? (row[idxObsTypes] || '') : '',

        // Injury info
        injuryFlag: idxInjuryFlag !== -1 ? (row[idxInjuryFlag] || '') : '',
        injuryType: idxInjuryType !== -1 ? (row[idxInjuryType] || '') : '',

        // Description & person
        description: idxDesc !== -1 ? (row[idxDesc] || '') : '',

        // 👇 Reporter is always the group name
        reporter: groupVal,
        id: idxId !== -1 ? (row[idxId] || '') : '',
        position: idxPosition !== -1 ? (row[idxPosition] || '') : '',

        // Causes
        directCause: idxDirect !== -1 ? (row[idxDirect] || '') : '',
        rootCause: idxRoot !== -1 ? (row[idxRoot] || '') : '',

        // Equipment / area
        equipment: idxEquip !== -1 ? (row[idxEquip] || '') : '',
        area: idxArea !== -1 ? (row[idxArea] || '') : '',

        // Risk assessment
        likelihood: idxLikelihood !== -1 ? (row[idxLikelihood] || '') : '',
        severity: idxSeverity !== -1 ? (row[idxSeverity] || '') : '',
        raRate: idxRaRate !== -1 ? (row[idxRaRate] || '') : '',
        raLevel: idxRaLevel !== -1 ? (row[idxRaLevel] || '') : '',
        status: idxStatus !== -1 ? (row[idxStatus] || '') : '',

        // GI / comments
        giNumber: idxGi !== -1 ? (row[idxGi] || '') : '',
        comments: idxComments !== -1 ? (row[idxComments] || '') : ''
      };
    });

    state.observations = observations;
    state.observationsLoaded = true;

    updateHomeFromObservations();
    setupObservationsFilters();
    renderObservationsList();
  } catch (err) {
    console.error('Observations load error:', err);
    const list = $('#observationsList');
    if (list) list.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
  }
}

function updateHomeFromObservations() {
  const obs = state.observations;
  if (!obs.length) return;
  const today = startOfDay(new Date());

  const todayObs = obs.filter(o => o.date && isSameDay(o.date, today));
  const observersToday = new Set(todayObs.map(o => o.reporter).filter(Boolean)).size;
  const highRiskOpen = obs.filter(o => {
    const level = (o.raLevel || '').toLowerCase();
    const status = (o.status || '').toLowerCase();
    return level.includes('high') && !status.includes('close');
  }).length;

  const observersEl = $('#homeObserversToday');
  const obsTodayEl = $('#homeObservationsToday');
  const highRiskEl = $('#homeHighRiskOpen');

  if (observersEl) observersEl.textContent = observersToday || '--';
  if (obsTodayEl) obsTodayEl.textContent = todayObs.length || '--';
  if (highRiskEl) highRiskEl.textContent = highRiskOpen || '0';
}

function filterObservationsForRange(list, range) {
  if (!range || range === 'all') return list.slice();
  const today = startOfDay(new Date());

  return list.filter(o => {
    if (!o.date) return false;
    if (range === 'today') return isSameDay(o.date, today);
    if (range === 'week') return Math.abs(daysBetween(o.date, today)) <= 7;
    if (range === 'month') return isSameMonth(o.date, today);
    return true;
  });
}

function updateObservationsSummary() {
  const obs = state.observations;
  const monthObs = filterObservationsForRange(obs, 'month');

  const openCount = monthObs.filter(o =>
    (o.status || '').toLowerCase().includes('open') ||
    (o.status || '').toLowerCase().includes('progress')
  ).length;

  const closedCount = monthObs.filter(o =>
    (o.status || '').toLowerCase().includes('close')
  ).length;

  const thisMonthEl = $('#obsCountMonth');
  const openEl = $('#obsCountOpen');
  const closedEl = $('#obsCountClosed');

  if (thisMonthEl) thisMonthEl.textContent = monthObs.length || '0';
  if (openEl) openEl.textContent = openCount || '0';
  if (closedEl) closedEl.textContent = closedCount || '0';
}

function setupObservationsFilters() {
  const rangeButtons = $all('.obs-filter-chip');
  const riskSelect = $('#obsFilterRisk');
  const statusSelect = $('#obsFilterStatus');
  const searchInput = $('#obsSearch');

  rangeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      rangeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      obsFilterState.range = btn.dataset.range || 'today';
      renderObservationsList();
    });
  });

  if (riskSelect) {
    riskSelect.addEventListener('change', () => {
      obsFilterState.risk = riskSelect.value || '';
      renderObservationsList();
    });
  }
  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      obsFilterState.status = statusSelect.value || '';
      renderObservationsList();
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      obsFilterState.search = searchInput.value.toLowerCase();
      renderObservationsList();
    });
  }

  const openSheetBtn = $('#openSheetButton');
  if (openSheetBtn) {
    openSheetBtn.addEventListener('click', () => {
      const url = window.OBSERVATIONS_FULL_SHEET_URL || window.OBSERVATIONS_SHEET_CSV_URL;
      if (url) window.open(url, '_blank');
    });
  }
}

function renderObservationsList() {
  const listEl = $('#observationsList');
  const emptyState = $('#observationsEmptyState');
  if (!listEl) return;

  let obs = (state.observations || []).map((o, idx) => ({
    ...o,
    _index: idx
  }));

  if (!obs.length) {
    listEl.innerHTML = `
      <div class="obs-empty">
        <i class="fas fa-info-circle"></i>
        <p>No observations loaded yet.</p>
      </div>
    `;
    if (emptyState) emptyState.style.display = 'block';
    updateObservationsSummary();
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // Apply filters
  obs = filterObservationsForRange(obs, obsFilterState.range);

  if (obsFilterState.risk) {
    const r = obsFilterState.risk.toLowerCase();
    obs = obs.filter(o => (o.raLevel || '').toLowerCase().includes(r));
  }
  if (obsFilterState.status) {
    const s = obsFilterState.status.toLowerCase();
    obs = obs.filter(o => (o.status || '').toLowerCase().includes(s));
  }
  if (obsFilterState.search) {
    const q = obsFilterState.search;
    obs = obs.filter(o => {
      return (
        (o.area || '').toLowerCase().includes(q) ||
        (o.type || '').toLowerCase().includes(q) ||
        (o.obsClass || '').toLowerCase().includes(q) ||
        (o.reporter || '').toLowerCase().includes(q) ||
        (o.description || '').toLowerCase().includes(q)
      );
    });
  }

  if (!obs.length) {
    listEl.innerHTML = `
      <div class="obs-empty">
        <i class="fas fa-info-circle"></i>
        <p>No observations match the selected filters.</p>
      </div>
    `;
    updateObservationsSummary();
    return;
  }

  const cardsHtml = obs.map(o => {
    const risk = (o.raLevel || '').toLowerCase();
    const status = (o.status || '').toLowerCase();

    // Stripe on left side of card (light theme colors set in CSS)
    let cardRiskClass = 'risk-neutral';
    if (risk.includes('high')) cardRiskClass = 'risk-high';
    else if (risk.includes('medium')) cardRiskClass = 'risk-medium';
    else if (risk.includes('low')) cardRiskClass = 'risk-low';

    // Small pill badge for RA level
    let badgeRiskClass = 'badge-neutral';
    if (risk.includes('high')) badgeRiskClass = 'badge-high';
    else if (risk.includes('medium')) badgeRiskClass = 'badge-medium';
    else if (risk.includes('low')) badgeRiskClass = 'badge-low';

    let statusClass = 'status-other';
    if (status.includes('open') || status.includes('progress')) statusClass = 'status-open';
    if (status.includes('close')) statusClass = 'status-closed';

    const dateText = o.date
      ? o.date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      : (o.dateRaw || '');

    return `
      <article class="obs-card ${cardRiskClass}" data-obs-index="${o._index}">
        <header class="obs-card-header">
          <div class="obs-card-date">${dateText}</div>
          <div class="obs-card-badges">
            <span class="badge ${badgeRiskClass}">${o.raLevel || 'No RA'}</span>
            <span class="status-pill ${statusClass}">${o.status || 'No status'}</span>
          </div>
        </header>
        <div class="obs-card-body">
          <div class="obs-main-line">
            <span class="obs-type">${o.type || o.obsClass || 'Observation'}</span>
            <span class="obs-area">${o.area || ''}</span>
          </div>
          <p class="obs-description">${o.description || ''}</p>
        </div>
        <footer class="obs-card-footer">
          <span class="obs-reporter">
            <i class="fas fa-users"></i>
            ${o.group || o.reporter || 'Unknown group'}
          </span>
        </footer>
      </article>
    `;
  }).join('');

  listEl.innerHTML = cardsHtml;
  updateObservationsSummary();

  // Click handler → open detail modal
  const cards = Array.from(listEl.querySelectorAll('.obs-card'));
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const idxStr = card.getAttribute('data-obs-index');
      if (!idxStr) return;
      const idx = parseInt(idxStr, 10);
      const obsItem = state.observations[idx];
      if (obsItem) {
        showObservationDetail(obsItem);
      }
    });
  });
}

function showObservationDetail(obs) {
  const modal = $('#observationDetailModal');
  const body = $('#observationDetailBody');
  if (!modal || !body) return;

  const dateText = obs.date
    ? obs.date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : (obs.dateRaw || '');

  // Helper for rows
  const row = (label, value) => {
    if (!value) return '';
    return `
      <div class="obs-detail-row">
        <div class="obs-detail-label">${label}</div>
        <div class="obs-detail-value">${value}</div>
      </div>
    `;
  };

  // ---------- header pills (Code / RA / Status) ----------

  // RA level class
  const raText = (obs.raLevel || '').toLowerCase();
  let raChipClass = 'obs-header-pill ra-neutral';
  if (raText.includes('high')) raChipClass = 'obs-header-pill ra-high';
  else if (raText.includes('medium')) raChipClass = 'obs-header-pill ra-medium';
  else if (raText.includes('low')) raChipClass = 'obs-header-pill ra-low';

  // Status class (Open = green, Closed = red)
  const statusText = (obs.status || '').toLowerCase();
  let statusChipClass = 'obs-header-pill status-other';
  if (statusText.includes('open') || statusText.includes('progress')) {
    statusChipClass = 'obs-header-pill status-open';
  } else if (statusText.includes('close')) {
    statusChipClass = 'obs-header-pill status-closed';
  }

  // Observation Class – mark Negative in red
  const obsClassValue = obs.obsClass || '';
  const obsClassHtml = obsClassValue
    ? `<span class="obs-class-value ${
        /negative/i.test(obsClassValue) ? 'negative' : ''
      }">${obsClassValue}</span>`
    : '';

  body.innerHTML = `
    <div class="obs-detail-header-line">
      <div class="obs-header-left">
        ${obs.code ? `<span class="obs-header-pill code">Code: ${obs.code}</span>` : ''}
      </div>
      <div class="obs-header-right">
        ${obs.raLevel ? `<span class="${raChipClass}">${obs.raLevel}</span>` : ''}
        ${obs.status ? `<span class="${statusChipClass}">${obs.status}</span>` : ''}
      </div>
    </div>

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Overview</div>
      <div class="obs-detail-grid">
        ${row('Date', dateText)}
        ${row('Day', obs.day)}
        ${row('Area', obs.area)}
        ${row('Activity Type', obs.type)}
        ${row('Observation Class', obsClassHtml)}
        ${row('Observation Types', obs.obsTypes)}
      </div>
    </section>

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Description</div>
      <div class="obs-detail-description-box">
        ${obs.description || 'No description provided.'}
      </div>
    </section>

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Person / Group</div>
      <div class="obs-detail-grid">
        ${row('Group / Reporter', obs.group || obs.reporter)}
        ${row('Injury/No Injury', obs.injuryFlag)}
        ${row('Type of Injury', obs.injuryType)}
        ${row('ID', obs.id)}
        ${row('Position', obs.position)}
      </div>
    </section>

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Causes &amp; Risk</div>
      <div class="obs-detail-grid">
        ${row('Direct Cause', obs.directCause)}
        ${row('Root Cause', obs.rootCause)}
        ${row('Equipment / Tool', obs.equipment)}
        ${row('Likelihood', obs.likelihood)}
        ${row('Severity', obs.severity)}
        ${row('RA Rate', obs.raRate)}
        ${row('RA Level', obs.raLevel)}
        ${row('GI Number #', obs.giNumber)}
        ${row('Comments', obs.comments)}
      </div>
    </section>
  `;

  modal.classList.add('show');
}

function hideObservationDetailModal() {
  const modal = $('#observationDetailModal');
  if (modal) modal.classList.remove('show');
}

window.showObservationDetail = showObservationDetail;
window.hideObservationDetailModal = hideObservationDetailModal;


  // -------------------- News --------------------

// -------------------- News --------------------

  // -------------------- News --------------------

// -------------------- News --------------------

  async function loadNews() {
    const url = window.NEWS_SHEET_CSV_URL;
    const container = $('#AnnouncementsContainer');
    const loading = $('#newsLoading');

    if (!container) return;

    if (!url) {
      container.innerHTML =
        '<p class="text-muted">Configure NEWS_SHEET_CSV_URL in js/data.js to load news.</p>';
      return;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const rows = parseCSV(text);
      if (!rows.length) throw new Error('Empty sheet');

      const headers = rows[0];
      const body = rows.slice(1).filter(r => r.some(c => c && c.trim() !== ''));

      const idxDate = findColumnIndex(headers, ['Date']);
      const idxTitle = findColumnIndex(headers, ['Title', 'Subject']);
      const idxContent = findColumnIndex(headers, ['Description', 'Content', 'Details', 'Body']);

      if (loading) loading.style.display = 'none';

      if (!body.length) {
        container.innerHTML = '<p class="text-muted">No news found.</p>';
        return;
      }

      // Build cards
      container.innerHTML = body.map(row => {
        const d = idxDate !== -1 ? (row[idxDate] || '') : '';
        const t = idxTitle !== -1 ? (row[idxTitle] || '') : 'No Title';
        let c = idxContent !== -1 ? (row[idxContent] || '') : '';

        // Normalise "empty" content
        const raw = (c || '').trim();
        const hasRealDetails = raw && raw.toLowerCase() !== 'no details';

        if (!hasRealDetails) {
          c = 'No details.'; // what you saw before
        }

        const cardClasses = ['announcement-card'];
        if (!hasRealDetails) cardClasses.push('no-details');

        return `
          <div class="${cardClasses.join(' ')}">
            <div class="card-date">${d}</div>
            <div class="card-title${hasRealDetails ? ' clickable' : ''}">
              ${t}
              ${hasRealDetails ? '<i class="fas fa-chevron-down toggle-icon"></i>' : ''}
            </div>
            <div class="card-content">${c}</div>
          </div>
        `;
      }).join('');

      // Attach click handlers (only when there are real details)
      $all('.announcement-card').forEach(card => {
        const titleEl = card.querySelector('.card-title.clickable');
        const contentEl = card.querySelector('.card-content');
        const icon = card.querySelector('.toggle-icon');

        if (!titleEl || !contentEl) return;

        // start collapsed
        card.classList.remove('open');
        contentEl.style.display = 'none';

        titleEl.addEventListener('click', () => {
          const isOpen = card.classList.toggle('open');
          contentEl.style.display = isOpen ? 'block' : 'none';
          if (icon) icon.classList.toggle('rotated', isOpen);
        });
      });
    } catch (err) {
      console.error('News load error:', err);
      if (loading) loading.style.display = 'none';
      container.innerHTML = `
        <div class="announcement-card no-details">
          <div class="card-date">Error</div>
          <div class="card-title">Failed to fetch news</div>
          <div class="card-content">
            Check the <strong>NEWS_SHEET_CSV_URL</strong> in js/data.js or your network connection.
          </div>
        </div>
      `;
    }
  }


  // -------------------- Tasks iframe (lazy load) --------------------

 let tasksIframeInitialized = false;

function initTasksIframe() {
  if (tasksIframeInitialized) return;
  const iframe = $('#tasksIframe');
  if (!iframe) return;

  // First choice: use the configured Google Form URL
  if (window.TASKS_FORM_EMBED_URL) {
    iframe.src = window.TASKS_FORM_EMBED_URL;
  }
  // Fallback: if you ever set data-src in HTML
  else if (iframe.dataset && iframe.dataset.src) {
    iframe.src = iframe.dataset.src;
  }

  tasksIframeInitialized = true;
}

  // -------------------- Floating Add Observation button --------------------

  function setupAddObservationButton() {
    const btn = $('#addObservationButton');
    if (!btn) return;
    // URL comes from js/data.js (ADD_OBSERVATION_FORM_URL), but we also
    // left a fallback href in HTML. Here we just ensure it matches.
    if (window.ADD_OBSERVATION_FORM_URL) {
      btn.href = window.ADD_OBSERVATION_FORM_URL;
    }
  }

  // -------------------- Init app --------------------

  function initApp() {
    setupDarkMode();
    setupNav();
    setupAccordions();
    setupModals();
    setupAddObservationButton();
    setupTbtOfDay();
    setupTbtLibrary();
    setupJsaLibrary();
    setupLibrarySwitcher();   // 👈 NEW
    setupTools();
    loadEomAndLeaderboard();
    loadObservations();
    loadNews();


    // If we already have summaries from tools, reflect in Home
    const homeHeat = $('#homeHeatSummary');
    const homeWind = $('#homeWindSummary');
    if (homeHeat && state.lastHeatSummary) homeHeat.textContent = state.lastHeatSummary;
    if (homeWind && state.lastWindSummary) homeWind.textContent = state.lastWindSummary;
  }

  document.addEventListener('DOMContentLoaded', initApp);
})();
// =========================================
// Central configuration & data for the safety app
// All URLs & safety libraries live here so app.js
// can focus on logic + UI.
// =========================================

// ========== GOOGLE FORMS (EMBEDS & LINKS) ==========

// Daily tasks / checklist form (embedded in Tasks tab)
window.TASKS_FORM_EMBED_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSezm0wWTdEsvkIdnzhfpRf0G37tZzqbY-AF-BHfbXXiLr2rKA/viewform?embedded=true';

// Add new observation form (used by floating green button)
window.ADD_OBSERVATION_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfYED_4UfHcmWn0fQOjtR5s8A0-Bhr4dwpe-80GjKkLeTR_Lw/viewform?usp=header';

// ========== GOOGLE SHEETS (CSV & VIEW LINKS) ==========

// Employee of the Month + Leaderboard sheet (CSV)
window.EOM_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0Km9p6XYDDxyGYSFfUjDjhdKMtr_hFvCiJ-U5_24_-QKrGsexZ4v3dxzKp0K1XZenNsiV7CiNmQEt/pub?output=csv';

// Observations main data sheet (CSV)
window.OBSERVATIONS_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXlN-sE-IkQJLMaVOvRGSBYNLsDvwZTD15w7rarTIXBGoacF0C5_eiI7OmFs__zA8jtlwhy0ULLZ8N/pub?output=csv';

// News / Announcements sheet (CSV)
window.NEWS_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1_SwxL5f4mWF5kd2yofCMCEE_WQp_2eroHDhXXPXtw1U/export?format=csv&gid=0';

// Full observations HTML sheet (opened when user taps
// "Open full data sheet" button in Observations tab)
window.OBSERVATIONS_FULL_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXlN-sE-IkQJLMaVOvRGSBYNLsDvwZTD15w7rarTIXBGoacF0C5_eiI7OmFs__zA8jtlwhy0ULLZ8N/pubhtml';

// Optional default color code of the month (used as
// fallback if EOM sheet has no value for this month)
window.DEFAULT_MONTH_COLOR_NAME = 'White';

// =========================================
// TBT LIBRARY
// =========================================
//
// Each item: { title: "TBT Title", link: "Google Drive link" }

window.tbtData = [
  { title: "TBT of The Day Alcohol and Drugs", link: "https://drive.google.com/file/d/1uIGAjyY2UuxdkWToEGqMoF-L1Q9cIn5c/view?usp=drivesdk" },
  { title: "TBT of The Day Biohazard infection materials", link: "https://drive.google.com/file/d/1wUY8mlaEXOroUK5IoPPbBpym97Jdjfm4/view?usp=drivesdk" },
  { title: "TBT of The Day Cold Weather", link: "https://drive.google.com/file/d/1QOp3TVAb-si19p-taHpPjSwEfXs1O5us/view?usp=drivesdk" },
  { title: "TBT of The Day Compressed Gas", link: "https://drive.google.com/file/d/1a7tLsOI7Re7QAWDivisUFdakbvpSEYOt/view?usp=drivesdk" },
  { title: "TBT of The Day Construction Fires", link: "https://drive.google.com/file/d/1nXBiIuAEjs4om2NwASqfyhtT-8IUBpGt/view?usp=drivesdk" },
  { title: "TBT of The Day Corrosive Materials", link: "https://drive.google.com/file/d/1VaFxPYhYt0Ho8blbkGQi2S4ubsT882ge/view?usp=drivesdk" },
  { title: "TBT of The Day Dangerously reactive material", link: "https://drive.google.com/file/d/16CNFN5iuf3YFyVW-tYNVQgHkRu8z8deg/view?usp=drivesdk" },
  { title: "TBT of The Day Dial before you Dig", link: "https://drive.google.com/file/d/1YlWyaHh2lPoum-OYYoJ2qP8t948qwLZI/view?usp=drivesdk" },
  { title: "TBT of The Day Driving in Reverse", link: "https://drive.google.com/file/d/1QzLSWz3CFfjGdmj62OsFdvT5IcV_lrqJ/view?usp=drivesdk" },
  { title: "TBT of The Day Emergency Response", link: "https://drive.google.com/file/d/1bWiXimPy6SmqbtEs5LxJE9zvS765GSzN/view?usp=drivesdk" },
  { title: "TBT of The Day Equipment Guards", link: "https://drive.google.com/file/d/1i4o3HHM6O2EPJ1hf-2IQ97_AREDCMIDr/view?usp=drivesdk" },
  { title: "TBT of The Day Exercise and Health", link: "https://drive.google.com/file/d/13pnUXqSmGNuXHAGKG7TyKhwryEWbtAaO/view?usp=drivesdk" },
  { title: "TBT of The Day Eye Protection", link: "https://drive.google.com/file/d/13HufH-DcwH-P-pEZZKTUNzHSo2lzyzLa/view?usp=drivesdk" },
  { title: "TBT of The Day Fall Protection", link: "https://drive.google.com/file/d/1RPpUrSAzCOE8uGUlE1sCXH0woxxzJqw4/view?usp=drivesdk" },
  { title: "TBT of The Day Fire Prevention", link: "https://drive.google.com/file/d/1Sz8Kobsyj3Sib4vhKvY2JDPjJUs2MERC/view?usp=drivesdk" },
  { title: "TBT of The Day First Aid Kit", link: "https://drive.google.com/file/d/1g50xudoRJVXxXvum4vbNaEebSvM_Kkyo/view?usp=drivesdk" },
  { title: "TBT of The Day First aid kits Naloxia", link: "https://drive.google.com/file/d/1XQ8Zy1xI621BA2oktxLesZiXh0DiWFER/view?usp=drivesdk" },
  { title: "TBT of The Day Ground Stability", link: "https://drive.google.com/file/d/1afLmut5ReTTZspJqEBd2sg1pAxq9y3F0/view?usp=drivesdk" },
  { title: "TBT of The Day Hand Protection", link: "https://drive.google.com/file/d/1NeYb6ZIpm8sqU-VcyLDqrOwDvHnmZwrq/view?usp=drivesdk" },
  { title: "TBT of The Day Hand tools", link: "https://drive.google.com/file/d/1L9n9G5HRo4Gi0bw_g-7eBxsrtBi7ADPG/view?usp=drivesdk" },
  { title: "TBT of The Day Hand Tools and PPE", link: "https://drive.google.com/file/d/1CrvCgTI0uMztvKsEGgafHwJNQoWBaF-K/view?usp=drivesdk" },
  { title: "TBT of The Day Hearing Conservation", link: "https://drive.google.com/file/d/19_gZ3vWtx1Vx56Nyx7z3BEB3I5XdvZ6y/view?usp=drivesdk" },
  { title: "TBT of The Day Heat Stress", link: "https://drive.google.com/file/d/1FlnBFJR3oWVlmvaptbvEHurdVrZHm7hh/view?usp=drivesdk" },
  { title: "TBT of The Day HID and Driving Awareness", link: "https://drive.google.com/file/d/1NHrzYkF5AfIG7sxgu1Vf8pU5XsWhThfK/view?usp=drivesdk" },
  { title: "TBT of The Day High Pressure Equipment Safety", link: "https://drive.google.com/file/d/1Z6dYVSGFeGXc5ByA7tV0XRXmHVI3V3L0/view?usp=drivesdk" },
  { title: "TBT of The Day Housekeeping", link: "https://drive.google.com/file/d/1tRet-AThes-9zgXQruo9c-MTgw-_zVdc/view?usp=drivesdk" },
  { title: "TBT of The Day How to Inspect your Gloves", link: "https://drive.google.com/file/d/1HLmzQDnDGtEY4xamLE7rTWdH9islH0Fu/view?usp=drivesdk" },
  { title: "TBT of The Day Indoor Hazards", link: "https://drive.google.com/file/d/1vU2WmuBBceUufEX0dAnd65aXmodHT5LF/view?usp=drivesdk" },
  { title: "TBT of The Day Insects Bites", link: "https://drive.google.com/file/d/1ajVsD83kZMpMKsDYSqpNI0WK2MpEgxyx/view?usp=drivesdk" },
  { title: "TBT of The Day Lead Material", link: "https://drive.google.com/file/d/1SNT0t6LarP-UcZUPNR-hrb7JwEPy6cXG/view?usp=drivesdk" },
  { title: "TBT of The Day Manual Handling", link: "https://drive.google.com/file/d/1RV69YCoHVqPHouy5tF9c7ab5aDG8pmo9/view?usp=drivesdk" },
  { title: "TBT of The Day Mechanical Equipment", link: "https://drive.google.com/file/d/1XZ_xQ7bCqdJXqfbrPkMXUbF4IcCw3q7_/view?usp=drivesdk" },
  { title: "TBT of The Day Noise", link: "https://drive.google.com/file/d/1nFQ0Pm5bj1Cgi660JrpZ-iy_N2CCF4cl/view?usp=drivesdk" },
  { title: "TBT of The Day Office Safety", link: "https://drive.google.com/file/d/11hHS314Vh_dfCYOo9r3QCGmjD4zlT4Ok/view?usp=drivesdk" },
  { title: "TBT of The Day Personal Protection Equipment", link: "https://drive.google.com/file/d/1yizSxE4ZIYufBkJ7Pq3wl7GGFvSY4bUo/view?usp=drivesdk" },
  { title: "TBT of The Day Plant and Machinery", link: "https://drive.google.com/file/d/1fQJRLO1M6GmjjdHpqW-uL1pMPnnrdPLQ/view?usp=drivesdk" },
  { title: "TBT of The Day Qualified Operators", link: "https://drive.google.com/file/d/1eBVA8jJivO8dV2Se9_ZdrplOtKxf_Xwu/view?usp=drivesdk" },
  { title: "TBT of The Day Reporting Accidents", link: "https://drive.google.com/file/d/1grVco6aH7hLEmAGc9x7qbLSbrOyGxSGb/view?usp=drivesdk" },
  { title: "TBT of The Day Risk Assessment", link: "https://drive.google.com/file/d/1lZ7V6W8ylA3TVRo4Zm3fF8sYNTw3LfnW/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Lifting of Objects", link: "https://drive.google.com/file/d/1pZkmeepCfjVOoovZLf35fh1QFjhyVSg7/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Operation of MEWP", link: "https://drive.google.com/file/d/1HsJ7pCokUIVSdyyCvPpbDUFAQQiqNeh9/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Operation of Pneumatic Tools", link: "https://drive.google.com/file/d/1bfxwvthfR2pABZKiiZ-wwEd2jUXcv7HX/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Operation Portable power tools", link: "https://drive.google.com/file/d/1rg7ZjUSYJPasy_47p5cRTrWui7oHO1rp/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Operation of Scaffolding", link: "https://drive.google.com/file/d/1SXUjbENSXzhfIvJIFkwEQopqecTZihNq/view?usp=drivesdk" },
  { title: "TBT of The Day Safe operation of tools", link: "https://drive.google.com/file/d/1syflkSRazQJJvY5B9ESzAcns0SyQQzQZ/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Work on roof", link: "https://drive.google.com/file/d/12T4MbPdMW_p-Vtpw9RK4_eo2c1v4FttH/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Work Practice", link: "https://drive.google.com/file/d/1gVXFDHisfRTRQoTBAXdyZK_0NCGxxjCB/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Work with hand tools", link: "https://drive.google.com/file/d/1HNC7ldy8c4F3veRMN0ZFNGhH2q5fiScR/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working Practice Construction", link: "https://drive.google.com/file/d/14VqfTpa6exin7SmjJS3j9vZwZLh5-dNs/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working with Electrical Equipment", link: "https://drive.google.com/file/d/1DDxelLTZAeeb2sJEWfhKF0UNFhmQmjhM/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working with Drill, Concrete, Core Cutting , Chipping", link: "https://drive.google.com/file/d/1uadL2bi--xLbRL-yM3zpHWAGi60uxZ_n/view?usp=drivesdk" },
  { title: "TBT of The Day Safe working with Heavy Equipment", link: "https://drive.google.com/file/d/1xMOCzvFQlFls88pj9ecBYZzRIp03c9BH/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working with Heavy Tools", link: "https://drive.google.com/file/d/1M7894AHqrSmj4gSzdTYFa8RnJet4mPic/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working with ladders", link: "https://drive.google.com/file/d/1b7Mepx2_zUDylghCKtq_I6xUAsdKGyOx/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working with traffic routes", link: "https://drive.google.com/file/d/1eUzcDAb-xIUVexEtZUiNS0vHZ_oFfq8x/view?usp=drivesdk" },
  { title: "TBT of The Day Safe Working with Vehicle", link: "https://drive.google.com/file/d/1vJ2svjwJ9XgXtBF0eMvAeLLjfCaV-5-a/view?usp=drivesdk" },
  { title: "TBT of The Day Safety Awareness", link: "https://drive.google.com/file/d/1yWrqcoXxBOZetGmkxgsShPZCWQSkKA_G/view?usp=drivesdk" },
  { title: "TBT of The Day Safety in Industrial area", link: "https://drive.google.com/file/d/1dH1XY6hAJz296ymAIF6u3vCWYzUASx1e/view?usp=drivesdk" },
  { title: "TBT of The Day Scaffolding", link: "https://drive.google.com/file/d/1tL8epcXq_yJqG5wzHpfql7ufxLToi9SL/view?usp=drivesdk" },
  { title: "TBT of The Day Slips, Trips and Falls", link: "https://drive.google.com/file/d/1F7TNF2sKAwLKN__Sei7BF3JDpzVkcFEP/view?usp=drivesdk" },
  { title: "TBT of The Day Smoke and Toxic Gases", link: "https://drive.google.com/file/d/1NiNlYJL9iOkYGCqe9lMUldj1I7mHTpZz/view?usp=drivesdk" },
  { title: "TBT of The Day Suitable Tools", link: "https://drive.google.com/file/d/1Azg5I-8yd7XFf7GscvZ0NqNqWefKHPKm/view?usp=drivesdk" },
  { title: "TBT of The Day Traffic Route", link: "https://drive.google.com/file/d/1oGI1MpGDbaxYLip7no8_ox5nq5lVzScE/view?usp=drivesdk" },
  { title: "TBT of The Day Use of Compressed Gas", link: "https://drive.google.com/file/d/1HSCKjDvErdFP3SX9WgbUvaVThZbT5FdW/view?usp=drivesdk" },
  { title: "TBT of The Day Use of PPE", link: "https://drive.google.com/file/d/1vnXmG5di_9iVLCHvOLfbTofkBBpVqAAx/view?usp=drivesdk" },
  { title: "TBT of The Day Vehicle and Transportation", link: "https://drive.google.com/file/d/1gW-NPGfujHFXbbRvj1n-MOH_i3xm7Q2m/view?usp=drivesdk" },
  { title: "TBT of The Day Vehicle movement on site", link: "https://drive.google.com/file/d/1gAmc2WO_smXxVUxGwjFvLBmI3kcRrMlp/view?usp=drivesdk" },
  { title: "TBT of The Day Walking on uneven ground", link: "https://drive.google.com/file/d/1vN5ZabdcpY3RJfIxRjWJHT3sejVfl5hP/view?usp=drivesdk" },
  { title: "TBT of The Day Welding, Cutting and Grinding", link: "https://drive.google.com/file/d/1oM-xIISFvS5VcterChmJzvmmC7gMiFL0/view?usp=drivesdk" },
  { title: "TBT of The Day Workplace safety plan", link: "https://drive.google.com/file/d/1enLU0T27BLTNotJuCiIp0O206n4VWXQo/view?usp=drivesdk" },
  { title: "TBT of The Day Working at Height", link: "https://drive.google.com/file/d/1IQXxqEvuUcLOdwZtGt9j7_fg7SG91oyl/view?usp=drivesdk" },
  { title: "TBT of The Day Working in cold environments", link: "https://drive.google.com/file/d/1D3VpCDuZMyFCIHVd1XufmEqN_s_cqAi0/view?usp=drivesdk" },
  { title: "TBT of The Day Working in Confined Spaces", link: "https://drive.google.com/file/d/1mUuYt5TonFky6vwUeKaM7NVTL-xRBA4c/view?usp=drivesdk" },
  { title: "TBT of The Day Working near Excavations", link: "https://drive.google.com/file/d/1-fsjfModLdme2Xw_alZgiWZ5-rnbEIFR/view?usp=drivesdk" },
  { title: "TBT of The Day Working on bridges", link: "https://drive.google.com/file/d/1YaIuC4cltwTfS7TiJU7VYIf6XeKZqSo-/view?usp=drivesdk" },
  { title: "TBT of The Day Working on moving vehicle", link: "https://drive.google.com/file/d/1sGLUH42ud5I9i_o1jMtpH_S-eu5TJ1J3/view?usp=drivesdk" },
  { title: "TBT of The Day Working with Hazardous Materials", link: "https://drive.google.com/file/d/1gYF6cUISYjUZF_pLEKadmPbe49YM2_ph/view?usp=drivesdk" }
];

// =========================================
// JSA LIBRARY
// =========================================
//
// Each item: { title: "JSA Title", link: "Google Drive link" }

window.jsaData = [
  { title: "Abrasive Blasting And Coating", link: "https://drive.google.com/file/d/1tZBj37GGJ7h9uRYDI5TIL04OkNrEMoLu/view?usp=drivesdk" },
  { title: "Backfilling Levelling And Compaction", link: "https://drive.google.com/file/d/1I32miHCfXBzETNx5UePxwHY4f9Fi-Fd1/view?usp=drivesdk" },
  { title: "Backfilling Levelling And Compaction Around Concrete Guards", link: "https://drive.google.com/file/d/1Fiei1faeqkuNCxR_-FMOlBF66w1ELC-0/view?usp=drivesdk" },
  { title: "Bolt Tightening And Torquing Activity", link: "https://drive.google.com/file/d/1iEyD5UObnaZ0TppEgmsAI-I0ELKYzdik/view?usp=drivesdk" },
  { title: "Cable Laying in Electrical Manhole", link: "https://drive.google.com/file/d/1Wp8i107zfvQfBgmo3w87FicqkbJ-YlzX/view?usp=drivesdk" },
  { title: "Checking Lifting Cables", link: "https://drive.google.com/file/d/1HTuLhegqg63HDC0g4LYLHRZvvsvKlgMj/view?usp=drivesdk" },
  { title: "Civil Work for HDD Road Crossing and Survey Works", link: "https://drive.google.com/file/d/1ZCt-ymqSm538XKifw7IGveIgSBklV-FM/view?usp=drivesdk" },
  { title: "Coating and Painting", link: "https://drive.google.com/file/d/11Hvb1voK2OvES76nYruhbkI00OZIa2bO/view?usp=drivesdk" },
  { title: "Cold Cutting Activity", link: "https://drive.google.com/file/d/1w8dkyJ4_KdrXhMvBKffpSmWLvGYRD_PS/view?usp=drivesdk" },
  { title: "Conductor and MLDT Installation", link: "https://drive.google.com/file/d/1DrsTymUDKM_g_vQ3Cp80mW9iyM6G4Wmx/view?usp=drivesdk" },
  { title: "Concrete Cutting and Demolition", link: "https://drive.google.com/file/d/13rKL8nwFYmPC-gMMHhpgmW-Ht-gTgbFa/view?usp=drivesdk" },
  { title: "Concrete Pouring Work", link: "https://drive.google.com/file/d/1jBzQEzvUibCXixT_OBMKHXwS35KKYdlC/view?usp=drivesdk" },
  { title: "Conduit And Drain Pipe Installation", link: "https://drive.google.com/file/d/1DkYftrZ9soByBRmZtmkA6iFm8wvTu3CT/view?usp=drivesdk" },
  { title: "Culvert Installation Activities", link: "https://drive.google.com/file/d/1H1_apctHNyH1f_k18oaXZXVj78W0bdZs/view?usp=drivesdk" },
  { title: "Cutting and Bevelling Work", link: "https://drive.google.com/file/d/1SGg1kNsHSxEH0LJcitBFDDCRglfGbNnI/view?usp=drivesdk" },
  { title: "Driving Off Road", link: "https://drive.google.com/file/d/1F0_hFnmHPdAmEzAgCbgUTpzxSWjAtRoI/view?usp=drivesdk" },
  { title: "Duct Bank and Marker Installation", link: "https://drive.google.com/file/d/1n819UkZXVgKGB_-8xSz0T8tSCxd2G9pg/view?usp=drivesdk" },
  { title: "E & I Calibrations and Instrument Testing", link: "https://drive.google.com/file/d/1tZvf-B8gJbQUoKdsjkCYmZPJq8LXS_Oq/view?usp=drivesdk" },
  { title: "E & I Cable Laying and Termination Activities", link: "https://drive.google.com/file/d/1Q06KpF1_psWnnAQ_52MJjnrFQoxRn2Eq/view?usp=drivesdk" },
  { title: "E & I Installation Activities", link: "https://drive.google.com/file/d/1N7uxi_5adFadC0uYfC92k7m9lLkQRsI9/view?usp=drivesdk" },
  { title: "E & I Installation Inside Substation", link: "https://drive.google.com/file/d/1FObIYqXr49dSXvK7mUbR_HdrqKvBruGw/view?usp=drivesdk" },
  { title: "Electro Mechanical QA QC Activities", link: "https://drive.google.com/file/d/1hIJPnTAQ5FU6ku6iZ2er3SvB3IU-7qxB/view?usp=drivesdk" },
  { title: "Equipment Pre commissioning", link: "https://drive.google.com/file/d/1cX3uHpn4RUZHicjnabgxgcV5bgHqUqf0/view?usp=drivesdk" },
  { title: "Excavation And Trenching Activities", link: "https://drive.google.com/file/d/1G3ewcaKqsKsK7kIpRi7ErZ5UuFmSQQo2/view?usp=drivesdk" },
  { title: "Fabrication and Erection of Steel Structure", link: "https://drive.google.com/file/d/1euR77zoBmj1yfJXt2qgLUa4uIvmM75TU/view?usp=drivesdk" },
  { title: "Field Joint Coating Activities", link: "https://drive.google.com/file/d/1y31FL8RQehGLE977fqIrGIqJKdP5_MzA/view?usp=drivesdk" },
  { title: "Flare KO Drum Installation Activities", link: "https://drive.google.com/file/d/16d3e27BHovQUgatctfDpCjuTCmLxivlO/view?usp=drivesdk" },
  { title: "Hand Excavation", link: "https://drive.google.com/file/d/1x0Lao8Pgyz-nuBwajEhM--XKN-wAzVKZ/view?usp=drivesdk" },
  { title: "Hand Excavation and Excavation Around Existing Facilities", link: "https://drive.google.com/file/d/1w1YUqFPVW2n0kfrxGb9QrEXvB6dA2uoY/view?usp=drivesdk" },
  { title: "Handling and Loading of Heavy Equipment Onto Low Bed Trailer", link: "https://drive.google.com/file/d/1tHMeXuDF_arQ5mdUsCYFJ56tTn9fKe8N/view?usp=drivesdk" },
  { title: "Heavy Equipment Movement", link: "https://drive.google.com/file/d/1-yoZFdAYQ2MZ4caqon3qSr7nqi3HbdAj/view?usp=drivesdk" },
  { title: "Heavy Equipment Operation", link: "https://drive.google.com/file/d/1FgI8uQUibNo1sWZTuyLD-xAxulS7VXaM/view?usp=drivesdk" },
  { title: "Heavy Equipment Operation and Manoeuvring in Work Site", link: "https://drive.google.com/file/d/1NDCoBZy-ayELHILwPgGD_sSz69Wo_AUS/view?usp=drivesdk" },
  { title: "Heavy Equipment Pre Moblisation", link: "https://drive.google.com/file/d/1sHt503_Kd3iBdkO0YB-BVGK2Ks0WJ4mT/view?usp=drivesdk" },
  { title: "Heavy Equipment Pre Mobilisation", link: "https://drive.google.com/file/d/1pB-AyExXgstZKyz8_wkowB_kWAUfBDbi/view?usp=drivesdk" },
  { title: "Heavy Vehicle Driving", link: "https://drive.google.com/file/d/151Q44VXIvTXh1xyYIm94sHN6IIessdle/view?usp=drivesdk" },
  { title: "Heavy Vehicle Movement inside Refinery", link: "https://drive.google.com/file/d/1hzCw1qzOr23pOEfRPhyiRUzs1Jhl5pHV/view?usp=drivesdk" },
  { title: "Heavy Vehicle Operation", link: "https://drive.google.com/file/d/18ocXGqE6DeXfne-4wtZne56-gI4z2s8U/view?usp=drivesdk" },
  { title: "Holiday and Defect Repair Activities", link: "https://drive.google.com/file/d/1o-Q_n8EI7dWIPzQ0QD8LfSyVDamZSrwH/view?usp=drivesdk" },
  { title: "Hot Tapping Activities", link: "https://drive.google.com/file/d/1fw5O9cFYtJ39uyX-ggTNHYODHHeCsZ0z/view?usp=drivesdk" },
  { title: "Hot Work Inside Refinery", link: "https://drive.google.com/file/d/1WRi44gyMgYrPplrW7xKmtSd2mm5sr8S7/view?usp=drivesdk" },
  { title: "Hot Work with Cold Cutting Activities", link: "https://drive.google.com/file/d/1l3GUHqLDi3H_gwLyputynWJwMQ37g6qx/view?usp=drivesdk" },
  { title: "Housekeeping Activities", link: "https://drive.google.com/file/d/1C8YqNAkt6xGh7lqG51WivOGsyR3OullG/view?usp=drivesdk" },
  { title: "Hydrotesting of Pipe Line", link: "https://drive.google.com/file/d/1_aQ8-UiNhlv6rcMFf98KcEEGs5ARH2vV/view?usp=drivesdk" },
  { title: "Installation of Cable Tray and Ladder", link: "https://drive.google.com/file/d/1uKNobEawMyCUN-DuhktF7TqN7bW5nKbu/view?usp=drivesdk" },
  { title: "Installation of Control Valve,  PSV, MOV, Blind Blind Flange and Vent Valve", link: "https://drive.google.com/file/d/1hc_32uUlTOZYw93kB7GvTaylor/view?usp=drivesdk" },
  { title: "Installation of Electrical Panel and Switchgear", link: "https://drive.google.com/file/d/1qvrydnktRL-HpmJ8Gn0czpWMEitnRrH_/view?usp=drivesdk" },
  { title: "Installation of Fence and Gates", link: "https://drive.google.com/file/d/1aSUh2xIfxV29R0hIJrKbqG4U6ZlQKp0I/view?usp=drivesdk" },
  { title: "Installation of Fire Water Facility", link: "https://drive.google.com/file/d/1uKG2pcIP-BPcXc-EDjvFb5afpRLEaQgs/view?usp=drivesdk" },
  { title: "Installation of Flare Stack Foundation", link: "https://drive.google.com/file/d/1TXa6CQf5AFE_YrRFpv_b2G7nlILCYay4/view?usp=drivesdk" },
  { title: "Installation of Pipe Rack and Piping", link: "https://drive.google.com/file/d/1_rjTyict8TdTQMS0sRs5sH3CHfDIlbbA/view?usp=drivesdk" },
  { title: "Installation of Piping on Sleepers", link: "https://drive.google.com/file/d/1cJb0pd7FBeZm9uhRkfgKWcFa1QgGnPIW/view?usp=drivesdk" },
  { title: "Installation of Pneumatic and Hydraulic Tubing", link: "https://drive.google.com/file/d/1MPiCD2x8c2mNw-fWHM4AtbKJK-YuPQiz/view?usp=drivesdk" },
  { title: "Installation of Process Vessel and Drum", link: "https://drive.google.com/file/d/1d0C5PdgVld6V9UhxqNz70dKkTWNyNjc5/view?usp=drivesdk" },
  { title: "Installation of Pumps", link: "https://drive.google.com/file/d/1XrXF9QQWSWku0Srl2L_PVQINGNPL9Ldr/view?usp=drivesdk" },
  { title: "Installation of Rigid and Flexible Pavement", link: "https://drive.google.com/file/d/1OGKyNVgw0_DTFUWxyV7oQXtTaCNJ3d18/view?usp=drivesdk" },
  { title: "Installation of Steel Structure", link: "https://drive.google.com/file/d/13G0U5DsfgvCaVxPCDb6VK3jGKJzq2k3l/view?usp=drivesdk" },
  { title: "Installation of Structural Foundations", link: "https://drive.google.com/file/d/1tbN7i0_8SJ1gsCwO6v5LyOzJVXFZNR5a/view?usp=drivesdk" },
  { title: "Installation of Valve and Spectacle Blind", link: "https://drive.google.com/file/d/1pvcFZz3uL8RqIOvk4u7QYlX0dbcdRFSw/view?usp=drivesdk" },
  { title: "Loading and Unloading of Material", link: "https://drive.google.com/file/d/1X1y8uFvhlZz-oN3rZ4HeaZ3b5XHMiDC7/view?usp=drivesdk" },
  { title: "Manual Handling Activities", link: "https://drive.google.com/file/d/1YG5MBO06LH9xvKfGda6uH_jJkmB8J5tZ/view?usp=drivesdk" },
  { title: "Operation of Crane", link: "https://drive.google.com/file/d/1uRgWkF0IDSChVffa8593v5-hMxhCRplQ/view?usp=drivesdk" },
  { title: "Operation of MEWP", link: "https://drive.google.com/file/d/1G3wKCUw0bL4PWi7GC1C3_OYJ3KpJTLID/view?usp=drivesdk" },
  { title: "Operation of Side Boom", link: "https://drive.google.com/file/d/1k9XShTrx72jVh41RvB6O2EGHGCskkZt7/view?usp=drivesdk" },
  { title: "Pneumatic Hydrotesting of Pipe", link: "https://drive.google.com/file/d/1pzKiw_gXf7pBDMkpfJFhWIPs0TM2VYv7/view?usp=drivesdk" },
  { title: "Pre Commissioning Activities", link: "https://drive.google.com/file/d/1p43MDV3Udpz4kpThFue3rKOqLQ7cOv1u/view?usp=drivesdk" },
  { title: "Radiography Testing Activities", link: "https://drive.google.com/file/d/1dPUuxlB-UWw6bK5QN3DoZRi9Ku_3qgXK/view?usp=drivesdk" },
  { title: "Reinstatement and Backfilling Activities", link: "https://drive.google.com/file/d/1rVid9aLGgbSj_sOcnpOMhUtLHD0AxwCj/view?usp=drivesdk" },
  { title: "Road Crossing and Culvert Construction", link: "https://drive.google.com/file/d/1INH-uif3SCd3QylY2bp7sTl2HqE9Z_t1/view?usp=drivesdk" },
  { title: "Scaffolding Erection and Dismantling", link: "https://drive.google.com/file/d/1JYXU3ENYWZ9BF9HfCaTUTVuForzYiUXt/view?usp=drivesdk" },
  { title: "Structural Steel Erection", link: "https://drive.google.com/file/d/1Q0otf_fesdi-6rGpBlO3oOPD5mmt8xxx/view?usp=drivesdk" },
  { title: "Substation Civil Works", link: "https://drive.google.com/file/d/17zpuDsadYp6zW6J0KDkDU7LHGTkBm5A4/view?usp=drivesdk" },
  { title: "Tie-in and Hot Tap Activities", link: "https://drive.google.com/file/d/1__MYES5_npv2x6pv3ROJcymdZgkLquLm/view?usp=drivesdk" },
  { title: "Traffic Management and Flagman Duties", link: "https://drive.google.com/file/d/1bIPfM02kJri4zZlC2VUnMbYdfRrF_WA3/view?usp=drivesdk" },
  { title: "Vehicle Movement inside Plant", link: "https://drive.google.com/file/d/1Swpghi0IHWvvwkuqdowJmA1nta8l9p42/view?usp=drivesdk" },
  { title: "Welding and Fabrication Activities", link: "https://drive.google.com/file/d/1C6LFChQtQm2f4Sgkk4_fwluIF-oyr5u5/view?usp=drivesdk" }
];
