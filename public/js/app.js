const state = {
  observations: [],
  permits: [],
  equipment: [],
  incidents: [],
  challenges: [],
  inspections: [],
  handovers: [],
  contractors: [],
  certifications: [],
  leaderboard: [],
  news: [],
  badges: [],
  userBadges: [],
  stats: null,
  currentTab: 'homeTab',
  currentLibrary: 'tbt',
  areas: [],
  user: null,
  uploadedPhotos: []
};

function parseEvidenceUrls(evidence_urls) {
  if (!evidence_urls) return [];
  if (Array.isArray(evidence_urls)) return evidence_urls;
  if (typeof evidence_urls === 'string') {
    try {
      const parsed = JSON.parse(evidence_urls);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return evidence_urls.includes(',') ? evidence_urls.split(',').map(s => s.trim()) : [evidence_urls];
    }
  }
  return [];
}

const TBT_LINKS = [
  { title: 'Working at Heights', url: '#' },
  { title: 'PPE Usage', url: '#' },
  { title: 'Fire Safety', url: '#' },
  { title: 'Electrical Safety', url: '#' },
  { title: 'Hand Tools Safety', url: '#' },
  { title: 'Scaffold Safety', url: '#' },
  { title: 'Confined Space Entry', url: '#' },
  { title: 'Heat Stress Prevention', url: '#' },
  { title: 'Chemical Handling', url: '#' },
  { title: 'Crane Operations', url: '#' }
];

const JSA_LINKS = [
  { title: 'Welding Operations', url: '#' },
  { title: 'Excavation Work', url: '#' },
  { title: 'Lifting Operations', url: '#' },
  { title: 'Hot Work', url: '#' },
  { title: 'Painting & Coating', url: '#' }
];

const CSM_LINKS = [
  { title: 'Contractor Safety Manual', url: '#' },
  { title: 'Safety Policy', url: '#' },
  { title: 'Emergency Procedures', url: '#' }
];

const CHALLENGE_ICONS = {
  inspection: 'fa-clipboard-check',
  compliance: 'fa-hard-hat',
  training: 'fa-chalkboard-teacher',
  housekeeping: 'fa-broom',
  default: 'fa-tasks'
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  setupEventListeners();
  loadTheme();
  loadLanguage();
  detectDevice();
  loadUser();
  renderColorBanner();
  renderCurrentColorDisplay();
  renderResponsibilities();
  
  await Promise.all([
    loadStats(),
    loadAreas(),
    loadNews(),
    loadChallenges(),
    loadLeaderboard(),
    loadEmergencyContacts()
  ]);
  
  importFromGoogleSheets();
}

async function loadEmergencyContacts() {
  try {
    const res = await fetch('/api/emergency-contacts');
    const contacts = await res.json();
    renderEmergencyContacts(contacts);
  } catch (error) {
    console.error('Error loading emergency contacts:', error);
  }
}

function renderEmergencyContacts(contacts) {
  const container = document.getElementById('emergencyContactsGrid');
  if (!container) return;
  
  container.innerHTML = contacts.map(contact => `
    <a href="tel:${contact.number}" class="emergency-contact-card ${contact.type}">
      <div class="emergency-contact-icon">
        <i class="fas fa-${contact.icon}"></i>
      </div>
      <div class="emergency-contact-name">${contact.name}</div>
      <div class="emergency-contact-number">${contact.number}</div>
    </a>
  `).join('');
}

async function importFromGoogleSheets() {
  const alreadyImported = localStorage.getItem('dataImported');
  if (alreadyImported) return;
  
  try {
    await fetch('/api/import/observations');
    await fetch('/api/import/permits');
    localStorage.setItem('dataImported', 'true');
    console.log('Data imported from Google Sheets');
  } catch (error) {
    console.error('Error importing from Google Sheets:', error);
  }
}

function loadUser() {
  const savedUser = localStorage.getItem('safetyUser');
  if (savedUser) {
    state.user = JSON.parse(savedUser);
    showUserBar();
    updateUserDisplay();
  }
}

function showUserBar() {
  if (state.user) {
    document.getElementById('userPointsBar').style.display = 'flex';
    document.getElementById('logoutBtn').style.display = 'flex';
    document.body.classList.add('has-points-bar');
    updateUserDisplay();
  }
}

function updateUserDisplay() {
  if (!state.user) return;
  
  document.getElementById('userPoints').textContent = state.user.total_points || 0;
  document.getElementById('userStreak').textContent = state.user.current_streak || 0;
  
  const levelBadge = document.getElementById('userLevel');
  levelBadge.textContent = state.user.current_level || 'Bronze';
  levelBadge.className = 'level-badge ' + (state.user.current_level || 'bronze').toLowerCase();
  
  const points = state.user.total_points || 0;
  let progress = 0;
  if (points < 200) progress = (points / 200) * 100;
  else if (points < 500) progress = ((points - 200) / 300) * 100;
  else if (points < 1000) progress = ((points - 500) / 500) * 100;
  else progress = 100;
  
  document.getElementById('levelProgress').style.width = progress + '%';
  
  if (state.user.role === 'admin') {
    document.getElementById('adminSection').style.display = 'block';
  }
}

function detectDevice() {
  const isMobile = window.innerWidth < 768;
  state.isMobile = isMobile;
  document.body.classList.toggle('is-mobile', isMobile);
  document.body.classList.toggle('is-desktop', !isMobile);
  
  window.addEventListener('resize', debounce(() => {
    const newIsMobile = window.innerWidth < 768;
    if (newIsMobile !== state.isMobile) {
      state.isMobile = newIsMobile;
      document.body.classList.toggle('is-mobile', newIsMobile);
      document.body.classList.toggle('is-desktop', !newIsMobile);
    }
  }, 200));
}

function loadLanguage() {
  const lang = localStorage.getItem('appLanguage') || 'en';
  setLanguage(lang, false);
}

function setLanguage(lang, notify = true) {
  localStorage.setItem('appLanguage', lang);
  
  document.documentElement.dir = isRTL(lang) ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  
  updateUIText(lang);
  
  if (notify) {
    const langNames = { en: 'English', ar: 'العربية', ur: 'اردو' };
    setTimeout(() => showToast(`Language: ${langNames[lang]}`), 100);
  }
}

function updateUIText(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[lang] && translations[lang][key]) {
      el.placeholder = translations[lang][key];
    }
  });
  
  const headerTitle = document.querySelector('.header-title h1');
  const headerSubtitle = document.querySelector('.header-subtitle');
  if (headerTitle) headerTitle.textContent = t('appName', lang);
  if (headerSubtitle) headerSubtitle.textContent = t('subtitle', lang);
  
  renderColorBanner();
  renderResponsibilities();
  renderCurrentColorDisplay();
  updateDynamicListsTranslation(lang);
}

function renderColorBanner() {
  const banner = document.getElementById('colorBanner');
  if (!banner) return;
  
  const lang = localStorage.getItem('appLanguage') || 'en';
  const colorInfo = getCurrentMonthColor();
  const monthIndex = new Date().getMonth();
  const monthName = getMonthName(monthIndex, lang);
  const colorName = colorInfo.name[lang] || colorInfo.name['en'];
  
  banner.className = 'color-banner ' + colorInfo.color;
  banner.innerHTML = `
    <div class="color-banner-text">
      <span class="color-banner-label">${t('currentColorCode', lang)}</span>
      <span class="color-banner-month">${monthName} - ${colorName}</span>
    </div>
    <div class="color-banner-badge bg-${colorInfo.color}"></div>
  `;
}

function renderCurrentColorDisplay() {
  const display = document.getElementById('currentColorDisplay');
  if (!display) return;
  
  const colorInfo = getCurrentMonthColor();
  const lang = localStorage.getItem('appLanguage') || 'en';
  const monthIndex = new Date().getMonth();
  const monthName = getMonthName(monthIndex, lang);
  const colorName = colorInfo.name[lang] || colorInfo.name['en'];
  
  display.innerHTML = `
    <div class="current-color-badge bg-${colorInfo.color}">${colorName}</div>
    <div class="current-color-month">${monthName}</div>
  `;
}

function renderResponsibilities() {
  const container = document.getElementById('responsibilitiesContent');
  if (!container) return;
  
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  const roles = [
    { icon: 'fas fa-user-shield', titleKey: 'safetyOfficer', dutiesKey: 'safetyOfficerDuties' },
    { icon: 'fas fa-hard-hat', titleKey: 'supervisor', dutiesKey: 'supervisorDuties' },
    { icon: 'fas fa-user', titleKey: 'worker', dutiesKey: 'workerDuties' }
  ];
  
  container.innerHTML = roles.map(role => {
    const duties = translations[lang][role.dutiesKey] || translations['en'][role.dutiesKey];
    return `
      <div class="responsibility-card">
        <h3><i class="${role.icon}"></i> ${t(role.titleKey, lang)}</h3>
        <ul>${duties.map(duty => `<li>${duty}</li>`).join('')}</ul>
      </div>
    `;
  }).join('');
}

function updateDynamicListsTranslation(lang) {
  const riskBadges = document.querySelectorAll('.risk-badge, [data-risk]');
  riskBadges.forEach(badge => {
    const riskLevel = badge.dataset.risk;
    if (riskLevel) badge.textContent = t(riskLevel.toLowerCase(), lang);
  });
}

function setupEventListeners() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });

  document.querySelectorAll('.library-tab').forEach(tab => {
    tab.addEventListener('click', () => switchLibrary(tab.dataset.library));
  });

  document.querySelectorAll('.leaderboard-tab').forEach(tab => {
    tab.addEventListener('click', () => switchLeaderboardPeriod(tab.dataset.period));
  });

  document.getElementById('searchBtn')?.addEventListener('click', openSearch);
  
  document.getElementById('globalSearch')?.addEventListener('input', debounce(handleGlobalSearch, 300));

  document.getElementById('obsFilterArea')?.addEventListener('change', loadObservations);
  document.getElementById('obsFilterStatus')?.addEventListener('change', loadObservations);
  document.getElementById('obsFilterRisk')?.addEventListener('change', loadObservations);

  document.getElementById('permitFilterArea')?.addEventListener('change', loadPermits);
  document.getElementById('permitFilterType')?.addEventListener('change', loadPermits);

  document.getElementById('equipFilterArea')?.addEventListener('change', loadEquipment);
  document.getElementById('equipFilterType')?.addEventListener('change', loadEquipment);
  
  document.getElementById('incidentFilterStatus')?.addEventListener('change', loadIncidents);
  document.getElementById('incidentFilterSeverity')?.addEventListener('change', loadIncidents);

  document.getElementById('librarySearch')?.addEventListener('input', debounce(renderLibrary, 300));
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
  
  document.getElementById(tabId)?.classList.add('active');
  
  const navBtn = document.querySelector(`[data-tab="${tabId}"]`);
  if (navBtn) navBtn.classList.add('active');
  
  state.currentTab = tabId;

  if (tabId === 'observationsTab' && state.observations.length === 0) loadObservations();
  else if (tabId === 'permitsTab' && state.permits.length === 0) loadPermits();
  else if (tabId === 'equipmentTab' && state.equipment.length === 0) loadEquipment();
  else if (tabId === 'incidentsTab' && state.incidents.length === 0) loadIncidents();
  else if (tabId === 'challengesTab') loadUserChallenges();
  else if (tabId === 'leaderboardTab') loadLeaderboard();
  else if (tabId === 'inspectionsTab' && state.inspections.length === 0) loadInspections();
  else if (tabId === 'handoversTab' && state.handovers.length === 0) loadHandovers();
  else if (tabId === 'contractorsTab') loadContractors();
  else if (tabId === 'certificationsTab' && state.certifications.length === 0) loadCertifications();
  else if (tabId === 'analyticsTab') loadAnalytics();
  else if (tabId === 'libraryTab') renderLibrary();
  else if (tabId === 'profileTab') loadProfile();
  else if (tabId === 'settingsTab') {
    const themeSwitch = document.getElementById('themeSwitch');
    if (themeSwitch) themeSwitch.checked = document.body.classList.contains('dark-mode');
  }
}

function switchLibrary(library) {
  document.querySelectorAll('.library-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.library === library);
  });
  state.currentLibrary = library;
  renderLibrary();
}

function switchLeaderboardPeriod(period) {
  document.querySelectorAll('.leaderboard-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.period === period);
  });
  loadLeaderboard(period);
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    state.stats = await res.json();
    renderStats();
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function renderStats() {
  const stats = state.stats;
  if (!stats) return;
  const lang = localStorage.getItem('appLanguage') || 'en';

  document.getElementById('obsToday').textContent = stats.observationsToday || 0;
  document.getElementById('permitsToday').textContent = stats.permitsToday || 0;
  document.getElementById('equipmentTotal').textContent = stats.equipmentTotal || 0;
  document.getElementById('incidentsOpen').textContent = stats.incidentsOpen || 0;

  const areasList = document.getElementById('topAreasList');
  if (stats.topAreas && stats.topAreas.length > 0) {
    areasList.innerHTML = stats.topAreas.map(item => `
      <div class="stats-item">
        <span class="stats-item-name">${item.area || 'Unknown'}</span>
        <span class="stats-item-value">${item.count}</span>
      </div>
    `).join('');
  } else {
    areasList.innerHTML = `<p class="stats-item-empty" style="color: var(--text-muted); text-align: center; padding: 20px;">${t('noDataYet', lang)}</p>`;
  }
  
  renderAlerts(stats);
}

function renderAlerts(stats) {
  const alertsCard = document.getElementById('alertsCard');
  const alertsList = document.getElementById('alertsList');
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  const alerts = [];
  
  if (stats.expiringEquipmentInspections > 0) {
    alerts.push({
      type: 'warning',
      icon: 'fa-truck',
      text: `${stats.expiringEquipmentInspections} ${t('equipmentInspectionsExpiring', lang)}`
    });
  }
  
  if (stats.expiringCertifications > 0) {
    alerts.push({
      type: 'warning',
      icon: 'fa-certificate',
      text: `${stats.expiringCertifications} ${t('certificationsExpiring', lang)}`
    });
  }
  
  if (stats.incidentsOpen > 0) {
    alerts.push({
      type: 'danger',
      icon: 'fa-exclamation-triangle',
      text: `${stats.incidentsOpen} ${t('openIncidentsAlert', lang)}`
    });
  }
  
  if (alerts.length > 0) {
    alertsCard.style.display = 'block';
    alertsList.innerHTML = alerts.map(alert => `
      <div class="alert-item ${alert.type}">
        <i class="fas ${alert.icon}"></i>
        <span>${alert.text}</span>
      </div>
    `).join('');
  } else {
    alertsCard.style.display = 'none';
  }
}

async function loadNews() {
  try {
    const res = await fetch('/api/news?limit=5');
    state.news = await res.json();
    renderNews();
  } catch (error) {
    console.error('Error loading news:', error);
  }
}

function renderNews() {
  const slider = document.getElementById('newsSlider');
  const content = document.getElementById('newsSliderContent');
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  const pinnedNews = state.news.find(n => n.is_pinned && n.priority === 'high');
  
  if (pinnedNews) {
    slider.style.display = 'block';
    const title = pinnedNews[`title_${lang}`] || pinnedNews.title_en;
    content.innerHTML = `
      <i class="fas fa-bullhorn"></i>
      <div>
        <div class="news-label">${t('alert', lang)}</div>
        <div class="news-text">${title}</div>
      </div>
    `;
  } else {
    slider.style.display = 'none';
  }
}

async function loadChallenges() {
  try {
    const res = await fetch('/api/challenges');
    state.challenges = await res.json();
    renderDailyChallenges();
  } catch (error) {
    console.error('Error loading challenges:', error);
  }
}

async function loadUserChallenges() {
  if (!state.user) {
    renderChallengesNotLoggedIn();
    return;
  }
  
  try {
    const res = await fetch(`/api/challenges/user/${state.user.id}`);
    state.challenges = await res.json();
    renderFullChallenges();
  } catch (error) {
    console.error('Error loading user challenges:', error);
  }
}

function renderDailyChallenges() {
  const list = document.getElementById('dailyChallengesList');
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  if (!state.challenges || state.challenges.length === 0) {
    list.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 16px;">${t('noChallenges', lang)}</p>`;
    return;
  }
  
  const displayChallenges = state.challenges.slice(0, 3);
  
  list.innerHTML = displayChallenges.map(challenge => {
    const title = challenge[`title_${lang}`] || challenge.title_en;
    const icon = CHALLENGE_ICONS[challenge.challenge_type] || CHALLENGE_ICONS.default;
    const completed = challenge.completed;
    
    return `
      <div class="challenge-mini-item ${completed ? 'completed' : ''}" onclick="showChallengeDetail(${challenge.id})">
        <div class="challenge-icon"><i class="fas ${icon}"></i></div>
        <div class="challenge-info">
          <div class="challenge-title">${title}</div>
          <div class="challenge-points">+${challenge.points} ${t('points', lang)}</div>
        </div>
        ${completed ? '<i class="fas fa-check-circle challenge-status"></i>' : ''}
      </div>
    `;
  }).join('');
}

function renderFullChallenges() {
  const list = document.getElementById('challengesList');
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  const completed = state.challenges.filter(c => c.completed).length;
  const total = state.challenges.length;
  const maxPoints = state.challenges.reduce((sum, c) => sum + c.points, 0);
  
  document.getElementById('challengesCompleted').textContent = completed;
  document.getElementById('challengesTotal').textContent = total;
  document.getElementById('challengesMaxPoints').textContent = maxPoints;
  
  list.innerHTML = state.challenges.map(challenge => {
    const title = challenge[`title_${lang}`] || challenge.title_en;
    const desc = challenge[`description_${lang}`] || challenge.description_en || '';
    const icon = CHALLENGE_ICONS[challenge.challenge_type] || CHALLENGE_ICONS.default;
    
    return `
      <div class="challenge-card ${challenge.completed ? 'completed' : ''}" onclick="showChallengeDetail(${challenge.id})">
        <div class="challenge-icon"><i class="fas ${icon}"></i></div>
        <div class="challenge-info">
          <h3>${title}</h3>
          <p>${desc}</p>
        </div>
        <div class="challenge-meta">
          <div class="challenge-points">+${challenge.points}</div>
          ${challenge.requires_photo ? `<div class="challenge-requires"><i class="fas fa-camera"></i> ${t('photoRequired', lang)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderChallengesNotLoggedIn() {
  const list = document.getElementById('challengesList');
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  list.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-lock"></i>
      <p>${t('loginToViewChallenges', lang)}</p>
      <button class="btn-primary" onclick="showLoginModal()">${t('login', lang)}</button>
    </div>
  `;
}

async function loadLeaderboard(period = 'monthly') {
  try {
    const res = await fetch(`/api/leaderboard?period=${period}&limit=10`);
    state.leaderboard = await res.json();
    renderLeaderboard();
    
    const eom = await fetch('/api/employee-of-month');
    const employeeOfMonth = await eom.json();
    renderEmployeeOfMonth(employeeOfMonth);
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
}

function renderLeaderboard() {
  const miniList = document.getElementById('leaderboardMini');
  const fullList = document.getElementById('leaderboardFull');
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  if (!state.leaderboard || state.leaderboard.length === 0) {
    const emptyMsg = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">${t('noDataYet', lang)}</p>`;
    if (miniList) miniList.innerHTML = emptyMsg;
    if (fullList) fullList.innerHTML = emptyMsg;
    return;
  }
  
  const renderItem = (user, index) => {
    const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'default';
    const points = user.monthly_points || user.total_points || 0;
    const initials = (user.name || 'U').substring(0, 2).toUpperCase();
    
    return `
      <div class="leaderboard-item">
        <div class="leaderboard-rank ${rankClass}">${index + 1}</div>
        <div class="leaderboard-avatar">${initials}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-name">${user.name || 'Unknown'}</div>
          <div class="leaderboard-area">${user.area || '-'}</div>
        </div>
        <div class="leaderboard-points">
          <i class="fas fa-star"></i> ${points}
        </div>
      </div>
    `;
  };
  
  if (miniList) {
    miniList.innerHTML = state.leaderboard.slice(0, 3).map(renderItem).join('');
  }
  
  if (fullList) {
    fullList.innerHTML = state.leaderboard.map(renderItem).join('');
  }
}

function renderEmployeeOfMonth(employee) {
  const card = document.getElementById('employeeOfMonthCard');
  
  if (employee && employee.name) {
    card.style.display = 'block';
    document.getElementById('eomName').textContent = employee.name;
    document.getElementById('eomPoints').textContent = employee.monthly_points || employee.total_points || 0;
  } else {
    card.style.display = 'none';
  }
}

async function loadAreas() {
  try {
    const res = await fetch('/api/areas');
    state.areas = await res.json();
    populateAreaFilters();
  } catch (error) {
    console.error('Error loading areas:', error);
  }
}

function populateAreaFilters() {
  const selects = ['obsFilterArea', 'permitFilterArea', 'equipFilterArea'];

  selects.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    
    const currentValue = select.value;
    const firstOption = select.querySelector('option');
    select.innerHTML = '';
    select.appendChild(firstOption);
    
    state.areas.forEach(area => {
      const option = document.createElement('option');
      option.value = area;
      option.textContent = area;
      select.appendChild(option);
    });
    
    select.value = currentValue;
  });
}

async function loadObservations() {
  const list = document.getElementById('observationsList');
  const empty = document.getElementById('observationsEmpty');
  
  list.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
  empty.style.display = 'none';

  const params = new URLSearchParams();
  const area = document.getElementById('obsFilterArea')?.value;
  const status = document.getElementById('obsFilterStatus')?.value;
  const risk = document.getElementById('obsFilterRisk')?.value;

  if (area) params.append('area', area);
  if (status) params.append('status', status);
  if (risk) params.append('risk_level', risk);

  try {
    const res = await fetch(`/api/observations?${params}`);
    state.observations = await res.json();
    renderObservations();
  } catch (error) {
    console.error('Error loading observations:', error);
    list.innerHTML = '<p class="error-message">Failed to load observations</p>';
  }
}

function renderObservations() {
  const list = document.getElementById('observationsList');
  const empty = document.getElementById('observationsEmpty');
  const lang = localStorage.getItem('appLanguage') || 'en';

  if (state.observations.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = state.observations.map(obs => {
    const riskKey = (obs.risk_level || 'low').toLowerCase();
    const translatedRisk = t(riskKey, lang);
    const photos = Array.isArray(obs.evidence_urls) ? obs.evidence_urls : (typeof obs.evidence_urls === 'string' ? JSON.parse(obs.evidence_urls || '[]') : []);
    const hasPhotos = photos.length > 0;
    
    return `
    <div class="card" onclick="showDetailModal('observation', ${obs.id})">
      <div class="card-header">
        <span class="card-title">${obs.code || t('observations', lang)}</span>
        <span class="card-badge badge-${riskKey}" data-risk="${obs.risk_level}">${translatedRisk}</span>
      </div>
      <div class="card-meta">
        <span class="card-meta-item"><i class="fas fa-calendar"></i> ${formatDate(obs.date)}</span>
        <span class="card-meta-item"><i class="fas fa-map-marker-alt"></i> ${obs.area || 'N/A'}</span>
        <span class="card-meta-item"><i class="fas fa-user"></i> ${obs.reporter_name || 'Unknown'}</span>
        ${hasPhotos ? '<span class="card-meta-item"><i class="fas fa-camera"></i></span>' : ''}
      </div>
      ${obs.description ? `<p class="card-description">${truncate(obs.description, 120)}</p>` : ''}
    </div>
  `}).join('');
}

async function loadPermits() {
  const list = document.getElementById('permitsList');
  const empty = document.getElementById('permitsEmpty');
  
  list.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
  empty.style.display = 'none';

  const params = new URLSearchParams();
  const area = document.getElementById('permitFilterArea')?.value;
  const type = document.getElementById('permitFilterType')?.value;

  if (area) params.append('area', area);
  if (type) params.append('permit_type', type);

  try {
    const res = await fetch(`/api/permits?${params}`);
    state.permits = await res.json();
    renderPermits();
  } catch (error) {
    console.error('Error loading permits:', error);
  }
}

function renderPermits() {
  const list = document.getElementById('permitsList');
  const empty = document.getElementById('permitsEmpty');
  const lang = localStorage.getItem('appLanguage') || 'en';

  if (state.permits.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = state.permits.map(permit => {
    const statusKey = (permit.status || 'active').toLowerCase().replace(' ', '');
    const translatedStatus = t(statusKey, lang) || permit.status;
    const permitTypeKey = (permit.permit_type || '').toLowerCase().replace(/\s+/g, '');
    const translatedType = permitTypeKey ? (t(permitTypeKey, lang) || permit.permit_type) : 'N/A';
    
    return `
    <div class="card" onclick="showDetailModal('permit', ${permit.id})">
      <div class="card-header">
        <span class="card-title">${permit.permit_number || t('permits', lang)}</span>
        <span class="card-badge badge-${statusKey}" data-status="${permit.status}">${translatedStatus}</span>
      </div>
      <div class="card-meta">
        <span class="card-meta-item"><i class="fas fa-calendar"></i> ${formatDate(permit.date)}</span>
        <span class="card-meta-item"><i class="fas fa-map-marker-alt"></i> ${permit.area || 'N/A'}</span>
        <span class="card-meta-item"><i class="fas fa-tag"></i> ${translatedType}</span>
      </div>
      ${permit.work_description ? `<p class="card-description">${truncate(permit.work_description, 120)}</p>` : ''}
    </div>
  `}).join('');
}

async function loadEquipment() {
  const list = document.getElementById('equipmentList');
  const empty = document.getElementById('equipmentEmpty');
  
  list.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
  empty.style.display = 'none';

  const params = new URLSearchParams();
  const area = document.getElementById('equipFilterArea')?.value;
  const type = document.getElementById('equipFilterType')?.value;

  if (area) params.append('area', area);
  if (type) params.append('equipment_type', type);

  try {
    const res = await fetch(`/api/equipment?${params}`);
    state.equipment = await res.json();
    renderEquipment();
  } catch (error) {
    console.error('Error loading equipment:', error);
  }
}

function renderEquipment() {
  const list = document.getElementById('equipmentList');
  const empty = document.getElementById('equipmentEmpty');
  const lang = localStorage.getItem('appLanguage') || 'en';

  if (state.equipment.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = state.equipment.map(equip => {
    const statusKey = (equip.status || 'active').toLowerCase().replace(/\s+/g, '');
    const translatedStatus = t(statusKey, lang) || equip.status;
    
    return `
    <div class="card" onclick="showDetailModal('equipment', ${equip.id})">
      <div class="card-header">
        <span class="card-title">${equip.asset_number || t('equipment', lang)}</span>
        <span class="card-badge badge-${statusKey}">${translatedStatus}</span>
      </div>
      <div class="card-meta">
        <span class="card-meta-item"><i class="fas fa-truck"></i> ${equip.equipment_type || 'N/A'}</span>
        <span class="card-meta-item"><i class="fas fa-map-marker-alt"></i> ${equip.area || 'N/A'}</span>
        <span class="card-meta-item"><i class="fas fa-user"></i> ${equip.owner || 'N/A'}</span>
      </div>
    </div>
  `}).join('');
}

async function loadIncidents() {
  const list = document.getElementById('incidentsList');
  const empty = document.getElementById('incidentsEmpty');
  
  list.innerHTML = '<div class="skeleton-card"></div>';
  empty.style.display = 'none';

  const params = new URLSearchParams();
  const status = document.getElementById('incidentFilterStatus')?.value;
  const severity = document.getElementById('incidentFilterSeverity')?.value;

  if (status) params.append('status', status);
  if (severity) params.append('severity', severity);

  try {
    const res = await fetch(`/api/incidents?${params}`);
    state.incidents = await res.json();
    renderIncidents();
  } catch (error) {
    console.error('Error loading incidents:', error);
  }
}

function renderIncidents() {
  const list = document.getElementById('incidentsList');
  const empty = document.getElementById('incidentsEmpty');
  const lang = localStorage.getItem('appLanguage') || 'en';

  if (state.incidents.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = state.incidents.map(incident => {
    const severityClass = (incident.severity || 'minor').toLowerCase().replace('-', '');
    
    return `
    <div class="card" onclick="showDetailModal('incident', ${incident.id})" style="position: relative;">
      <span class="card-badge ${severityClass}" style="position: absolute; top: 12px; right: 12px;">${incident.severity || 'Unknown'}</span>
      <div class="card-header">
        <span class="card-title">${incident.incident_number || 'Incident'}</span>
      </div>
      <div class="card-meta">
        <span class="card-meta-item"><i class="fas fa-calendar"></i> ${formatDate(incident.date)}</span>
        <span class="card-meta-item"><i class="fas fa-map-marker-alt"></i> ${incident.area || 'N/A'}</span>
        <span class="card-meta-item"><i class="fas fa-flag"></i> ${incident.status || 'Open'}</span>
      </div>
      ${incident.description ? `<p class="card-description">${truncate(incident.description, 100)}</p>` : ''}
    </div>
  `}).join('');
}

async function loadInspections() {
  const list = document.getElementById('inspectionsList');
  const empty = document.getElementById('inspectionsEmpty');
  
  list.innerHTML = '<div class="skeleton-card"></div>';
  
  try {
    const res = await fetch('/api/inspections?limit=20');
    state.inspections = await res.json();
    renderInspections();
  } catch (error) {
    console.error('Error loading inspections:', error);
  }
}

function renderInspections() {
  const list = document.getElementById('inspectionsList');
  const empty = document.getElementById('inspectionsEmpty');
  const lang = localStorage.getItem('appLanguage') || 'en';

  if (state.inspections.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = state.inspections.map(insp => `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${insp.template_name || t('inspection', lang)}</span>
        <span class="inspection-status ${(insp.overall_status || 'pass').toLowerCase()}">${insp.overall_status || 'Pass'}</span>
      </div>
      <div class="card-meta">
        <span class="card-meta-item"><i class="fas fa-calendar"></i> ${formatDate(insp.date)}</span>
        <span class="card-meta-item"><i class="fas fa-user"></i> ${insp.inspector_name || 'Unknown'}</span>
        <span class="card-meta-item"><i class="fas fa-clock"></i> ${insp.shift || 'Day'}</span>
      </div>
    </div>
  `).join('');
}

async function loadHandovers() {
  const list = document.getElementById('handoversList');
  const empty = document.getElementById('handoversEmpty');
  
  list.innerHTML = '<div class="skeleton-card"></div>';
  
  try {
    const res = await fetch('/api/handovers?limit=20');
    state.handovers = await res.json();
    renderHandovers();
  } catch (error) {
    console.error('Error loading handovers:', error);
  }
}

function renderHandovers() {
  const list = document.getElementById('handoversList');
  const empty = document.getElementById('handoversEmpty');
  const lang = localStorage.getItem('appLanguage') || 'en';

  if (state.handovers.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = state.handovers.map(h => `
    <div class="card handover-card" style="position: relative;">
      ${h.acknowledged ? '<i class="fas fa-check-circle handover-acknowledged"></i>' : ''}
      <div class="handover-shift">
        <i class="fas fa-exchange-alt"></i>
        ${h.shift_from || 'Day'} → ${h.shift_to || 'Night'}
      </div>
      <div class="card-header">
        <span class="card-title">${h.from_user_name || 'Unknown'} → ${h.to_user_name || 'Next Shift'}</span>
      </div>
      <div class="card-meta">
        <span class="card-meta-item"><i class="fas fa-calendar"></i> ${formatDate(h.date)}</span>
        <span class="card-meta-item"><i class="fas fa-map-marker-alt"></i> ${h.area || 'N/A'}</span>
      </div>
      ${h.pending_tasks ? `<p class="card-description"><strong>${t('pendingTasks', lang)}:</strong> ${truncate(h.pending_tasks, 80)}</p>` : ''}
    </div>
  `).join('');
}

async function loadContractors() {
  const list = document.getElementById('contractorsList');
  const empty = document.getElementById('contractorsEmpty');
  
  list.innerHTML = '<div class="skeleton-card"></div>';
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/contractors?date=${today}`);
    state.contractors = await res.json();
    
    const onSite = state.contractors.filter(c => !c.sign_out_time).length;
    document.getElementById('contractorsOnSite').textContent = onSite;
    
    renderContractors();
  } catch (error) {
    console.error('Error loading contractors:', error);
  }
}

function renderContractors() {
  const list = document.getElementById('contractorsList');
  const empty = document.getElementById('contractorsEmpty');
  const lang = localStorage.getItem('appLanguage') || 'en';

  if (state.contractors.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = state.contractors.map(c => `
    <div class="card" style="position: relative;">
      ${!c.sign_out_time ? '<span class="card-badge" style="background: var(--success); position: absolute; top: 12px; right: 12px;">On Site</span>' : '<span class="card-badge" style="background: var(--text-muted); position: absolute; top: 12px; right: 12px;">Signed Out</span>'}
      <div class="card-header">
        <span class="card-title">${c.contractor_name}</span>
      </div>
      <div class="card-meta">
        <span class="card-meta-item"><i class="fas fa-building"></i> ${c.company || 'N/A'}</span>
        <span class="card-meta-item"><i class="fas fa-map-marker-alt"></i> ${c.area || 'N/A'}</span>
        <span class="card-meta-item"><i class="fas fa-clock"></i> ${formatTime(c.sign_in_time)}</span>
      </div>
      ${!c.sign_out_time ? `<button class="btn-secondary" style="margin-top: 12px; width: 100%;" onclick="signOutContractor(${c.id})">${t('signOut', lang)}</button>` : ''}
    </div>
  `).join('');
}

async function loadCertifications() {
  const list = document.getElementById('certificationsList');
  
  list.innerHTML = '<div class="skeleton-card"></div>';
  
  try {
    const res = await fetch('/api/certifications');
    state.certifications = await res.json();
    renderCertifications();
  } catch (error) {
    console.error('Error loading certifications:', error);
  }
}

function renderCertifications() {
  const list = document.getElementById('certificationsList');
  const lang = localStorage.getItem('appLanguage') || 'en';

  if (state.certifications.length === 0) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-certificate"></i><p>${t('noCertifications', lang)}</p></div>`;
    return;
  }

  list.innerHTML = state.certifications.map(cert => {
    const expiryDate = new Date(cert.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    let badgeClass = '';
    let badgeText = '';
    
    if (daysUntilExpiry < 0) {
      badgeClass = 'expired';
      badgeText = t('expired', lang);
    } else if (daysUntilExpiry <= 30) {
      badgeClass = 'expiring';
      badgeText = `${daysUntilExpiry} ${t('days', lang)}`;
    }
    
    return `
    <div class="card" style="position: relative;">
      ${badgeClass ? `<span class="card-badge ${badgeClass}" style="position: absolute; top: 12px; right: 12px;">${badgeText}</span>` : ''}
      <div class="card-header">
        <span class="card-title">${cert.certification_type}</span>
      </div>
      <div class="card-meta">
        <span class="card-meta-item"><i class="fas fa-user"></i> ${cert.user_name || 'N/A'}</span>
        <span class="card-meta-item"><i class="fas fa-calendar"></i> ${t('expires', lang)}: ${formatDate(cert.expiry_date)}</span>
      </div>
    </div>
  `}).join('');
}

async function loadAnalytics() {
  try {
    const [trends, breakdown] = await Promise.all([
      fetch('/api/analytics/trends?days=30').then(r => r.json()),
      fetch('/api/analytics/risk-breakdown').then(r => r.json())
    ]);
    
    renderAnalyticsCharts(trends, breakdown);
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

function renderAnalyticsCharts(trends, breakdown) {
  const obsCtx = document.getElementById('obsChart')?.getContext('2d');
  if (obsCtx && trends.observations) {
    new Chart(obsCtx, {
      type: 'line',
      data: {
        labels: trends.observations.map(d => formatDate(d.day)),
        datasets: [{
          label: 'Observations',
          data: trends.observations.map(d => d.count),
          borderColor: '#0891b2',
          backgroundColor: 'rgba(8, 145, 178, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }
  
  const riskCtx = document.getElementById('riskChart')?.getContext('2d');
  if (riskCtx && state.stats?.riskDistribution) {
    const colors = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };
    new Chart(riskCtx, {
      type: 'doughnut',
      data: {
        labels: state.stats.riskDistribution.map(r => r.risk_level),
        datasets: [{
          data: state.stats.riskDistribution.map(r => r.count),
          backgroundColor: state.stats.riskDistribution.map(r => colors[r.risk_level] || '#64748b')
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }
  
  const causesDiv = document.getElementById('causesChart');
  if (causesDiv && breakdown.byCause) {
    const maxCount = Math.max(...breakdown.byCause.map(c => c.count));
    causesDiv.innerHTML = breakdown.byCause.slice(0, 5).map(cause => `
      <div class="cause-item">
        <div class="cause-bar">
          <div class="cause-bar-fill" style="width: ${(cause.count / maxCount) * 100}%;"></div>
          <span class="cause-bar-text">${truncate(cause.direct_cause, 25)}</span>
        </div>
        <span class="cause-count">${cause.count}</span>
      </div>
    `).join('');
  }
}

async function loadProfile() {
  if (!state.user) {
    showLoginModal();
    return;
  }
  
  try {
    const res = await fetch(`/api/users/${state.user.id}`);
    const userData = await res.json();
    
    document.getElementById('profileName').textContent = userData.name;
    document.getElementById('profilePosition').textContent = userData.position || userData.area || '';
    document.getElementById('profilePoints').textContent = userData.total_points || 0;
    document.getElementById('profileStreak').textContent = userData.current_streak || 0;
    document.getElementById('profileBadges').textContent = userData.badges?.length || 0;
    
    const levelBadge = document.getElementById('profileLevel');
    levelBadge.textContent = userData.current_level || 'Bronze';
    levelBadge.className = 'level-badge large ' + (userData.current_level || 'bronze').toLowerCase();
    
    renderProfileBadges(userData.badges || []);
    renderProfileActivity(userData.recentPoints || []);
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

function renderProfileBadges(badges) {
  const list = document.getElementById('profileBadgesList');
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  if (badges.length === 0) {
    list.innerHTML = `<p style="color: var(--text-muted); text-align: center;">${t('noBadgesYet', lang)}</p>`;
    return;
  }
  
  list.innerHTML = badges.map(badge => {
    const name = badge[`name_${lang}`] || badge.name_en;
    return `
      <div class="badge-item">
        <div class="badge-icon" style="background: ${badge.color || '#0891b2'};">
          <i class="fas ${badge.icon || 'fa-medal'}"></i>
        </div>
        <span class="badge-name">${name}</span>
      </div>
    `;
  }).join('');
}

function renderProfileActivity(points) {
  const list = document.getElementById('profileActivityList');
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  if (points.length === 0) {
    list.innerHTML = `<p style="color: var(--text-muted); text-align: center;">${t('noActivityYet', lang)}</p>`;
    return;
  }
  
  const icons = {
    observation: 'fa-eye',
    permit: 'fa-clipboard-check',
    challenge: 'fa-gamepad',
    inspection: 'fa-tasks',
    toolbox_talk: 'fa-users'
  };
  
  list.innerHTML = points.slice(0, 10).map(p => `
    <div class="activity-item">
      <div class="activity-icon"><i class="fas ${icons[p.event_type] || 'fa-star'}"></i></div>
      <div class="activity-info">
        <div class="activity-text">${p.description || p.event_type}</div>
        <div class="activity-time">${formatDateTime(p.created_at)}</div>
      </div>
      <span class="activity-points">+${p.points}</span>
    </div>
  `).join('');
}

function renderLibrary() {
  const list = document.getElementById('libraryList');
  const search = document.getElementById('librarySearch')?.value.toLowerCase() || '';
  const lang = localStorage.getItem('appLanguage') || 'en';

  let items = [];
  if (state.currentLibrary === 'tbt') items = TBT_LINKS;
  else if (state.currentLibrary === 'jsa') items = JSA_LINKS;
  else if (state.currentLibrary === 'csm') items = CSM_LINKS;

  const filtered = items.filter(item => item.title.toLowerCase().includes(search));

  if (filtered.length === 0) {
    list.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 40px;">${t('noResults', lang)}</p>`;
    return;
  }

  list.innerHTML = filtered.map(item => `
    <a href="${item.url}" target="_blank" class="library-item">
      <i class="fas fa-file-pdf"></i>
      <span>${item.title}</span>
    </a>
  `).join('');
}

function showAddModal(type) {
  const overlay = document.getElementById('modalOverlay');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  const lang = localStorage.getItem('appLanguage') || 'en';

  overlay.classList.add('active');
  state.uploadedPhotos = [];

  if (type === 'observation') {
    title.textContent = t('addObservation', lang);
    body.innerHTML = getObservationForm(lang);
  } else if (type === 'permit') {
    title.textContent = t('addPermit', lang);
    body.innerHTML = getPermitForm(lang);
  } else if (type === 'equipment') {
    title.textContent = t('addEquipment', lang);
    body.innerHTML = getEquipmentForm(lang);
  } else if (type === 'incident') {
    title.textContent = t('reportIncident', lang);
    body.innerHTML = getIncidentForm(lang);
  } else if (type === 'inspection') {
    title.textContent = t('dailyChecklist', lang);
    loadInspectionForm();
  } else if (type === 'handover') {
    title.textContent = t('shiftHandover', lang);
    body.innerHTML = getHandoverForm(lang);
  } else if (type === 'contractor') {
    title.textContent = t('contractorSignIn', lang);
    body.innerHTML = getContractorForm(lang);
  } else if (type === 'certification') {
    title.textContent = t('addCertification', lang);
    body.innerHTML = getCertificationForm(lang);
  }
}

function getObservationForm(lang) {
  return `
    <form id="observationForm" onsubmit="submitObservation(event)">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('reporterName', lang)} *</label>
          <input type="text" class="form-input" name="reporter_name" required value="${state.user?.name || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">${t('reporterId', lang)}</label>
          <input type="text" class="form-input" name="reporter_id" value="${state.user?.employee_id || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('area', lang)} *</label>
        <select class="form-select" name="area" required>
          <option value="">${t('selectArea', lang)}</option>
          ${state.areas.map(a => `<option value="${a}">${a}</option>`).join('')}
          <option value="__new__">+ ${t('addNewArea', lang)}</option>
        </select>
      </div>
      <div class="form-group" id="newAreaGroup" style="display:none;">
        <label class="form-label">${t('newArea', lang)}</label>
        <input type="text" class="form-input" name="new_area">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('riskLevel', lang)} *</label>
          <select class="form-select" name="risk_level" required>
            <option value="Low">${t('low', lang)}</option>
            <option value="Medium">${t('medium', lang)}</option>
            <option value="High">${t('high', lang)}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('directCause', lang)}</label>
          <select class="form-select" name="direct_cause">
            <option value="">-</option>
            <option value="Unsafe Act">${t('unsafeAct', lang)}</option>
            <option value="Unsafe Condition">${t('unsafeCondition', lang)}</option>
            <option value="PPE Issue">${t('ppeIssue', lang)}</option>
            <option value="Housekeeping">${t('housekeeping', lang)}</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('description', lang)} *</label>
        <textarea class="form-input" name="description" rows="3" required></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">${t('correctiveAction', lang)}</label>
        <textarea class="form-input" name="corrective_action" rows="2"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">${t('evidencePhotos', lang)}</label>
        <input type="file" id="photoUpload" accept="image/*" multiple onchange="handlePhotoUpload(this)">
        <div id="photoPreview" class="photo-preview-grid"></div>
      </div>
      <button type="submit" class="btn-primary form-submit">
        <i class="fas fa-save"></i> ${t('save', lang)}
      </button>
    </form>
  `;
}

function getPermitForm(lang) {
  return `
    <form id="permitForm" onsubmit="submitPermit(event)">
      <div class="form-group">
        <label class="form-label">${t('permitType', lang)} *</label>
        <select class="form-select" name="permit_type" required>
          <option value="Hot Work">${t('hotWork', lang)}</option>
          <option value="Cold Work">${t('coldWork', lang)}</option>
          <option value="Confined Space">${t('confinedSpace', lang)}</option>
          <option value="Excavation">${t('excavation', lang)}</option>
          <option value="Electrical">${t('electrical', lang)}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('area', lang)} *</label>
        <select class="form-select" name="area" required>
          <option value="">${t('selectArea', lang)}</option>
          ${state.areas.map(a => `<option value="${a}">${a}</option>`).join('')}
          <option value="__new__">+ ${t('addNewArea', lang)}</option>
        </select>
      </div>
      <div class="form-group" id="newAreaGroupPermit" style="display:none;">
        <label class="form-label">${t('newArea', lang)}</label>
        <input type="text" class="form-input" name="new_area">
      </div>
      <div class="form-group">
        <label class="form-label">${t('receiverName', lang)} *</label>
        <input type="text" class="form-input" name="receiver_name" required>
      </div>
      <div class="form-group">
        <label class="form-label">${t('workDescription', lang)} *</label>
        <textarea class="form-input" name="work_description" rows="3" required></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">${t('evidencePhotos', lang)}</label>
        <input type="file" id="photoUpload" accept="image/*" multiple onchange="handlePhotoUpload(this)">
        <div id="photoPreview" class="photo-preview-grid"></div>
      </div>
      <button type="submit" class="btn-primary form-submit">
        <i class="fas fa-save"></i> ${t('save', lang)}
      </button>
    </form>
  `;
}

function getEquipmentForm(lang) {
  return `
    <form id="equipmentForm" onsubmit="submitEquipment(event)">
      <div class="form-group">
        <label class="form-label">${t('equipmentType', lang)} *</label>
        <select class="form-select" name="equipment_type" required>
          <option value="Crane">${t('crane', lang)}</option>
          <option value="Forklift">${t('forklift', lang)}</option>
          <option value="Excavator">${t('excavator', lang)}</option>
          <option value="Loader">${t('loader', lang)}</option>
          <option value="Truck">Truck</option>
          <option value="Generator">Generator</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('assetNumber', lang)}</label>
        <input type="text" class="form-input" name="asset_number">
      </div>
      <div class="form-group">
        <label class="form-label">${t('owner', lang)} *</label>
        <input type="text" class="form-input" name="owner" required>
      </div>
      <div class="form-group">
        <label class="form-label">${t('area', lang)} *</label>
        <select class="form-select" name="area" required>
          <option value="">${t('selectArea', lang)}</option>
          ${state.areas.map(a => `<option value="${a}">${a}</option>`).join('')}
          <option value="__new__">+ ${t('addNewArea', lang)}</option>
        </select>
      </div>
      <div class="form-group" id="newAreaGroupEquip" style="display:none;">
        <label class="form-label">${t('newArea', lang)}</label>
        <input type="text" class="form-input" name="new_area">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('internalInspection', lang)}</label>
          <input type="date" class="form-input" name="internal_inspection_date">
        </div>
        <div class="form-group">
          <label class="form-label">${t('thirdPartyInspection', lang)}</label>
          <input type="date" class="form-input" name="third_party_inspection_date">
        </div>
      </div>
      <button type="submit" class="btn-primary form-submit">
        <i class="fas fa-save"></i> ${t('save', lang)}
      </button>
    </form>
  `;
}

function getIncidentForm(lang) {
  return `
    <form id="incidentForm" onsubmit="submitIncident(event)">
      <div class="form-group">
        <label class="form-label">${t('incidentType', lang)} *</label>
        <select class="form-select" name="incident_type" required>
          <option value="Near-Miss">${t('nearMiss', lang)}</option>
          <option value="First Aid">First Aid</option>
          <option value="Medical Treatment">Medical Treatment</option>
          <option value="Lost Time">Lost Time</option>
          <option value="Property Damage">Property Damage</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('severity', lang)} *</label>
        <select class="form-select" name="severity" required>
          <option value="Near-Miss">${t('nearMiss', lang)}</option>
          <option value="Minor">${t('minor', lang)}</option>
          <option value="Major">${t('major', lang)}</option>
          <option value="Critical">${t('critical', lang)}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('area', lang)} *</label>
        <select class="form-select" name="area" required>
          <option value="">${t('selectArea', lang)}</option>
          ${state.areas.map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('description', lang)} *</label>
        <textarea class="form-input" name="description" rows="4" required></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">${t('immediateActions', lang)}</label>
        <textarea class="form-input" name="immediate_actions" rows="2"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">${t('evidencePhotos', lang)}</label>
        <input type="file" id="photoUpload" accept="image/*" multiple onchange="handlePhotoUpload(this)">
        <div id="photoPreview" class="photo-preview-grid"></div>
      </div>
      <button type="submit" class="btn-primary form-submit">
        <i class="fas fa-save"></i> ${t('report', lang)}
      </button>
    </form>
  `;
}

function getHandoverForm(lang) {
  return `
    <form id="handoverForm" onsubmit="submitHandover(event)">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('fromShift', lang)} *</label>
          <select class="form-select" name="shift_from" required>
            <option value="Day">Day</option>
            <option value="Night">Night</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('toShift', lang)} *</label>
          <select class="form-select" name="shift_to" required>
            <option value="Night">Night</option>
            <option value="Day">Day</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('yourName', lang)} *</label>
        <input type="text" class="form-input" name="from_user_name" required value="${state.user?.name || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">${t('receivingOfficer', lang)}</label>
        <input type="text" class="form-input" name="to_user_name">
      </div>
      <div class="form-group">
        <label class="form-label">${t('area', lang)} *</label>
        <select class="form-select" name="area" required>
          <option value="">${t('selectArea', lang)}</option>
          ${state.areas.map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('pendingTasks', lang)}</label>
        <textarea class="form-input" name="pending_tasks" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">${t('safetyConcerns', lang)}</label>
        <textarea class="form-input" name="safety_concerns" rows="2"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">${t('notes', lang)}</label>
        <textarea class="form-input" name="notes" rows="2"></textarea>
      </div>
      <button type="submit" class="btn-primary form-submit">
        <i class="fas fa-save"></i> ${t('save', lang)}
      </button>
    </form>
  `;
}

function getContractorForm(lang) {
  return `
    <form id="contractorForm" onsubmit="submitContractor(event)">
      <div class="form-group">
        <label class="form-label">${t('contractorName', lang)} *</label>
        <input type="text" class="form-input" name="contractor_name" required>
      </div>
      <div class="form-group">
        <label class="form-label">${t('company', lang)} *</label>
        <input type="text" class="form-input" name="company" required>
      </div>
      <div class="form-group">
        <label class="form-label">${t('idNumber', lang)}</label>
        <input type="text" class="form-input" name="id_number">
      </div>
      <div class="form-group">
        <label class="form-label">${t('phone', lang)}</label>
        <input type="tel" class="form-input" name="phone">
      </div>
      <div class="form-group">
        <label class="form-label">${t('purpose', lang)} *</label>
        <input type="text" class="form-input" name="purpose" required>
      </div>
      <div class="form-group">
        <label class="form-label">${t('area', lang)} *</label>
        <select class="form-select" name="area" required>
          <option value="">${t('selectArea', lang)}</option>
          ${state.areas.map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">${t('hostName', lang)}</label>
        <input type="text" class="form-input" name="host_name" value="${state.user?.name || ''}">
      </div>
      <div class="form-row">
        <label class="checkbox-label">
          <input type="checkbox" name="safety_briefing_completed">
          ${t('safetyBriefingCompleted', lang)}
        </label>
        <label class="checkbox-label">
          <input type="checkbox" name="ppe_verified">
          ${t('ppeVerified', lang)}
        </label>
      </div>
      <button type="submit" class="btn-primary form-submit">
        <i class="fas fa-sign-in-alt"></i> ${t('signIn', lang)}
      </button>
    </form>
  `;
}

function getCertificationForm(lang) {
  return `
    <form id="certificationForm" onsubmit="submitCertification(event)">
      <div class="form-group">
        <label class="form-label">${t('workerName', lang)} *</label>
        <input type="text" class="form-input" name="user_name" required>
      </div>
      <div class="form-group">
        <label class="form-label">${t('certificationType', lang)} *</label>
        <input type="text" class="form-input" name="certification_type" required placeholder="e.g., Crane Operator, First Aid">
      </div>
      <div class="form-group">
        <label class="form-label">${t('certificationNumber', lang)}</label>
        <input type="text" class="form-input" name="certification_number">
      </div>
      <div class="form-group">
        <label class="form-label">${t('issuingAuthority', lang)}</label>
        <input type="text" class="form-input" name="issuing_authority">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">${t('issueDate', lang)}</label>
          <input type="date" class="form-input" name="issue_date">
        </div>
        <div class="form-group">
          <label class="form-label">${t('expiryDate', lang)} *</label>
          <input type="date" class="form-input" name="expiry_date" required>
        </div>
      </div>
      <button type="submit" class="btn-primary form-submit">
        <i class="fas fa-save"></i> ${t('save', lang)}
      </button>
    </form>
  `;
}

async function loadInspectionForm() {
  const body = document.getElementById('modalBody');
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  body.innerHTML = '<div class="skeleton-item"></div>';
  
  try {
    const res = await fetch('/api/inspection-templates');
    const templates = await res.json();
    
    if (templates.length === 0) {
      body.innerHTML = `<p style="text-align: center; color: var(--text-muted);">${t('noTemplates', lang)}</p>`;
      return;
    }
    
    const template = templates[0];
    const items = template.items;
    
    body.innerHTML = `
      <form id="inspectionForm" onsubmit="submitInspection(event, ${template.id})">
        <div class="form-group">
          <label class="form-label">${t('inspectorName', lang)} *</label>
          <input type="text" class="form-input" name="inspector_name" required value="${state.user?.name || ''}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">${t('area', lang)} *</label>
            <select class="form-select" name="area" required>
              <option value="">${t('selectArea', lang)}</option>
              ${state.areas.map(a => `<option value="${a}">${a}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">${t('shift', lang)}</label>
            <select class="form-select" name="shift">
              <option value="Day">Day</option>
              <option value="Night">Night</option>
            </select>
          </div>
        </div>
        <h4 style="margin: 16px 0 12px;">${t('checklistItems', lang)}</h4>
        ${items.map(item => `
          <div class="checklist-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-input); border-radius: 8px; margin-bottom: 8px;">
            <input type="checkbox" name="item_${item.id}" id="item_${item.id}">
            <label for="item_${item.id}" style="flex: 1; cursor: pointer;">${item[`text_${lang}`] || item.text_en}</label>
          </div>
        `).join('')}
        <div class="form-group" style="margin-top: 16px;">
          <label class="form-label">${t('notes', lang)}</label>
          <textarea class="form-input" name="notes" rows="2"></textarea>
        </div>
        <button type="submit" class="btn-primary form-submit">
          <i class="fas fa-check"></i> ${t('completeInspection', lang)}
        </button>
      </form>
    `;
  } catch (error) {
    console.error('Error loading inspection form:', error);
    body.innerHTML = `<p style="color: var(--danger);">Error loading form</p>`;
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  state.uploadedPhotos = [];
}

async function handlePhotoUpload(input) {
  const files = input.files;
  const preview = document.getElementById('photoPreview');
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  if (files.length === 0) return;
  
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    
    if (data.urls) {
      state.uploadedPhotos.push(...data.urls);
      
      preview.innerHTML = state.uploadedPhotos.map((url, i) => `
        <div class="photo-preview-item">
          <img src="${url}" alt="Photo ${i + 1}">
          <button type="button" class="photo-preview-remove" onclick="removePhoto(${i})">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error uploading photos:', error);
    showToast(t('errorUploading', lang));
  }
}

function removePhoto(index) {
  state.uploadedPhotos.splice(index, 1);
  const preview = document.getElementById('photoPreview');
  preview.innerHTML = state.uploadedPhotos.map((url, i) => `
    <div class="photo-preview-item">
      <img src="${url}" alt="Photo ${i + 1}">
      <button type="button" class="photo-preview-remove" onclick="removePhoto(${i})">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

async function submitObservation(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const lang = localStorage.getItem('appLanguage') || 'en';

  if (data.area === '__new__' && data.new_area) {
    data.area = data.new_area;
  }
  delete data.new_area;
  
  data.evidence_urls = state.uploadedPhotos;
  if (state.user) data.user_id = state.user.id;

  const submitBtn = form.querySelector('.form-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const res = await fetch('/api/observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Failed to save');

    closeModal();
    showToast(t('observationSaved', lang));
    loadObservations();
    loadStats();
    loadAreas();
    
    if (state.user) {
      state.user.total_points = (state.user.total_points || 0) + 10;
      updateUserDisplay();
      localStorage.setItem('safetyUser', JSON.stringify(state.user));
    }
  } catch (error) {
    console.error('Error:', error);
    showToast(t('errorSaving', lang));
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-save"></i> ${t('save', lang)}`;
  }
}

async function submitPermit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const lang = localStorage.getItem('appLanguage') || 'en';

  if (data.area === '__new__' && data.new_area) {
    data.area = data.new_area;
  }
  delete data.new_area;
  
  data.evidence_urls = state.uploadedPhotos;
  if (state.user) data.user_id = state.user.id;

  const submitBtn = form.querySelector('.form-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const res = await fetch('/api/permits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Failed to save');

    closeModal();
    showToast(t('permitSaved', lang));
    loadPermits();
    loadStats();
    loadAreas();
    
    if (state.user) {
      state.user.total_points = (state.user.total_points || 0) + 8;
      updateUserDisplay();
      localStorage.setItem('safetyUser', JSON.stringify(state.user));
    }
  } catch (error) {
    console.error('Error:', error);
    showToast(t('errorSaving', lang));
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-save"></i> ${t('save', lang)}`;
  }
}

async function submitEquipment(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const lang = localStorage.getItem('appLanguage') || 'en';

  if (data.area === '__new__' && data.new_area) {
    data.area = data.new_area;
  }
  delete data.new_area;

  const submitBtn = form.querySelector('.form-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const res = await fetch('/api/equipment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Failed to save');

    closeModal();
    showToast(t('equipmentSaved', lang));
    loadEquipment();
    loadStats();
    loadAreas();
  } catch (error) {
    console.error('Error:', error);
    showToast(t('errorSaving', lang));
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-save"></i> ${t('save', lang)}`;
  }
}

async function submitIncident(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const lang = localStorage.getItem('appLanguage') || 'en';

  data.evidence_urls = state.uploadedPhotos;
  if (state.user) {
    data.reporter_id = state.user.id;
    data.reporter_name = state.user.name;
  }

  const submitBtn = form.querySelector('.form-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Failed to save');

    closeModal();
    showToast(t('incidentReported', lang));
    loadIncidents();
    loadStats();
  } catch (error) {
    console.error('Error:', error);
    showToast(t('errorSaving', lang));
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-save"></i> ${t('report', lang)}`;
  }
}

async function submitHandover(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const lang = localStorage.getItem('appLanguage') || 'en';

  if (state.user) data.from_user_id = state.user.id;

  const submitBtn = form.querySelector('.form-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const res = await fetch('/api/handovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Failed to save');

    closeModal();
    showToast(t('handoverCreated', lang));
    loadHandovers();
  } catch (error) {
    console.error('Error:', error);
    showToast(t('errorSaving', lang));
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-save"></i> ${t('save', lang)}`;
  }
}

async function submitContractor(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const lang = localStorage.getItem('appLanguage') || 'en';

  data.safety_briefing_completed = form.querySelector('[name="safety_briefing_completed"]').checked;
  data.ppe_verified = form.querySelector('[name="ppe_verified"]').checked;

  const submitBtn = form.querySelector('.form-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const res = await fetch('/api/contractors/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Failed to save');

    closeModal();
    showToast(t('contractorSignedIn', lang));
    loadContractors();
  } catch (error) {
    console.error('Error:', error);
    showToast(t('errorSaving', lang));
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> ${t('signIn', lang)}`;
  }
}

async function submitCertification(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const lang = localStorage.getItem('appLanguage') || 'en';

  const submitBtn = form.querySelector('.form-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const res = await fetch('/api/certifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Failed to save');

    closeModal();
    showToast(t('certificationAdded', lang));
    loadCertifications();
  } catch (error) {
    console.error('Error:', error);
    showToast(t('errorSaving', lang));
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-save"></i> ${t('save', lang)}`;
  }
}

async function submitInspection(e, templateId) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const lang = localStorage.getItem('appLanguage') || 'en';

  const responses = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('item_')) {
      responses[key.replace('item_', '')] = value === 'on';
    }
  }

  const passCount = Object.values(responses).filter(v => v).length;
  const totalCount = Object.keys(responses).length;
  const overallStatus = passCount === totalCount ? 'Pass' : passCount >= totalCount / 2 ? 'Partial' : 'Fail';

  const payload = {
    template_id: templateId,
    inspector_id: state.user?.id,
    inspector_name: data.inspector_name,
    area: data.area,
    shift: data.shift,
    responses: responses,
    overall_status: overallStatus,
    notes: data.notes
  };

  const submitBtn = form.querySelector('.form-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    const res = await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Failed to save');

    closeModal();
    showToast(t('inspectionCompleted', lang));
    loadInspections();
    
    if (state.user) {
      state.user.total_points = (state.user.total_points || 0) + 8;
      updateUserDisplay();
      localStorage.setItem('safetyUser', JSON.stringify(state.user));
    }
  } catch (error) {
    console.error('Error:', error);
    showToast(t('errorSaving', lang));
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fas fa-check"></i> ${t('completeInspection', lang)}`;
  }
}

async function signOutContractor(id) {
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  try {
    await fetch(`/api/contractors/${id}/signout`, { method: 'PUT' });
    showToast(t('contractorSignedOut', lang));
    loadContractors();
  } catch (error) {
    console.error('Error:', error);
    showToast(t('errorSaving', lang));
  }
}

function showDetailModal(type, id) {
  const overlay = document.getElementById('detailModalOverlay');
  const title = document.getElementById('detailModalTitle');
  const body = document.getElementById('detailModalBody');
  const lang = localStorage.getItem('appLanguage') || 'en';

  overlay.classList.add('active');
  body.innerHTML = '<div class="skeleton-item"></div>';

  fetch(`/api/${type}s/${id}`)
    .then(res => res.json())
    .then(data => {
      title.textContent = data.code || data.permit_number || data.asset_number || data.incident_number || t(type, lang);
      
      let html = '<div class="detail-content" id="detailContentPrint">';
      
      html += `<div class="detail-actions">
        <button class="btn-icon" onclick="printDetail()" title="Print / PDF">
          <i class="fas fa-file-pdf"></i>
        </button>
        <button class="btn-icon" onclick="shareDetail()" title="Share">
          <i class="fas fa-share-alt"></i>
        </button>
      </div>`;
      
      const photos = Array.isArray(data.evidence_urls) ? data.evidence_urls : (typeof data.evidence_urls === 'string' && data.evidence_urls ? JSON.parse(data.evidence_urls) : []);
      if (photos.length > 0) {
        html += `
          <div class="detail-section">
            <h4><i class="fas fa-camera"></i> ${t('photos', lang)} (${photos.length})</h4>
            <div class="detail-photos">
              ${photos.map((url, i) => `
                <div class="detail-photo" onclick="openLightbox('${url.replace(/'/g, "\\'")}', ${i}, ${JSON.stringify(photos).replace(/"/g, '&quot;')})">
                  <img src="${url}" alt="Evidence ${i+1}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🖼️</text></svg>'">
                  <div class="photo-overlay"><i class="fas fa-search-plus"></i></div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      
      html += '<div class="detail-grid">';
      
      if (data.date) html += `<div class="detail-item"><label><i class="fas fa-calendar"></i> ${t('date', lang)}</label><span>${formatDate(data.date)}</span></div>`;
      if (data.area) html += `<div class="detail-item"><label><i class="fas fa-map-marker-alt"></i> ${t('area', lang)}</label><span>${data.area}</span></div>`;
      if (data.reporter_name) html += `<div class="detail-item"><label><i class="fas fa-user"></i> ${t('reporter', lang)}</label><span>${data.reporter_name}</span></div>`;
      if (data.reporter_id) html += `<div class="detail-item"><label><i class="fas fa-id-badge"></i> ${t('employeeId', lang)}</label><span>${data.reporter_id}</span></div>`;
      if (data.observation_type) html += `<div class="detail-item"><label><i class="fas fa-tag"></i> ${t('observationType', lang)}</label><span>${data.observation_type}</span></div>`;
      if (data.observation_class) html += `<div class="detail-item"><label><i class="fas fa-folder"></i> ${t('observationClass', lang)}</label><span>${data.observation_class}</span></div>`;
      if (data.risk_level) html += `<div class="detail-item"><label><i class="fas fa-exclamation-triangle"></i> ${t('riskLevel', lang)}</label><span class="card-badge badge-${data.risk_level.toLowerCase()}">${t(data.risk_level.toLowerCase(), lang)}</span></div>`;
      if (data.status) html += `<div class="detail-item"><label><i class="fas fa-clipboard-check"></i> ${t('status', lang)}</label><span class="status-badge status-${data.status.toLowerCase().replace(' ', '-')}">${data.status}</span></div>`;
      if (data.permit_type) html += `<div class="detail-item"><label><i class="fas fa-file-signature"></i> ${t('permitType', lang)}</label><span>${data.permit_type}</span></div>`;
      if (data.receiver_name) html += `<div class="detail-item"><label><i class="fas fa-user-check"></i> ${t('receiverName', lang)}</label><span>${data.receiver_name}</span></div>`;
      if (data.severity) html += `<div class="detail-item"><label><i class="fas fa-thermometer-half"></i> ${t('severity', lang)}</label><span>${data.severity}</span></div>`;
      if (data.likelihood) html += `<div class="detail-item"><label><i class="fas fa-percentage"></i> ${t('likelihood', lang)}</label><span>${data.likelihood}</span></div>`;
      if (data.direct_cause) html += `<div class="detail-item"><label><i class="fas fa-search"></i> ${t('directCause', lang)}</label><span>${data.direct_cause}</span></div>`;
      if (data.root_cause) html += `<div class="detail-item"><label><i class="fas fa-tree"></i> Root Cause</label><span>${data.root_cause}</span></div>`;
      if (data.equipment) html += `<div class="detail-item"><label><i class="fas fa-tools"></i> ${t('equipment', lang)}</label><span>${data.equipment}</span></div>`;
      if (data.equipment_type) html += `<div class="detail-item"><label>${t('equipmentType', lang)}</label><span>${data.equipment_type}</span></div>`;
      if (data.owner) html += `<div class="detail-item"><label>${t('owner', lang)}</label><span>${data.owner}</span></div>`;
      
      html += '</div>';
      
      if (data.description) {
        html += `<div class="detail-section"><h4><i class="fas fa-align-left"></i> ${t('description', lang)}</h4><p class="detail-text">${data.description}</p></div>`;
      }
      
      if (data.corrective_action) {
        html += `<div class="detail-section"><h4><i class="fas fa-wrench"></i> ${t('correctiveAction', lang)}</h4><p class="detail-text">${data.corrective_action}</p></div>`;
      }
      
      if (data.work_description) {
        html += `<div class="detail-section"><h4><i class="fas fa-clipboard-list"></i> ${t('workDescription', lang)}</h4><p class="detail-text">${data.work_description}</p></div>`;
      }
      
      if (data.comments) {
        html += `<div class="detail-section"><h4><i class="fas fa-comment"></i> ${t('comments', lang)}</h4><p class="detail-text">${data.comments}</p></div>`;
      }
      
      html += '</div>';
      body.innerHTML = html;
    })
    .catch(error => {
      console.error('Error:', error);
      body.innerHTML = `<p style="color: var(--danger);">Error loading details</p>`;
    });
}

function openLightbox(url, index, photosJson) {
  const photos = typeof photosJson === 'string' ? JSON.parse(photosJson.replace(/&quot;/g, '"')) : photosJson;
  
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox-overlay';
  lightbox.id = 'lightboxOverlay';
  lightbox.innerHTML = `
    <div class="lightbox-content">
      <button class="lightbox-close" onclick="closeLightbox()"><i class="fas fa-times"></i></button>
      <button class="lightbox-nav lightbox-prev" onclick="navigateLightbox(-1)"><i class="fas fa-chevron-left"></i></button>
      <img src="${url}" alt="Photo" id="lightboxImage">
      <button class="lightbox-nav lightbox-next" onclick="navigateLightbox(1)"><i class="fas fa-chevron-right"></i></button>
      <div class="lightbox-counter">${index + 1} / ${photos.length}</div>
      <div class="lightbox-actions">
        <a href="${url}" download class="btn-icon" title="Download"><i class="fas fa-download"></i></a>
        <button class="btn-icon" onclick="window.open('${url}', '_blank')" title="Open in new tab"><i class="fas fa-external-link-alt"></i></button>
      </div>
    </div>
  `;
  
  document.body.appendChild(lightbox);
  
  window.lightboxState = { photos, currentIndex: index };
  
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  
  document.addEventListener('keydown', handleLightboxKeys);
}

function handleLightboxKeys(e) {
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowLeft') navigateLightbox(-1);
  else if (e.key === 'ArrowRight') navigateLightbox(1);
}

function navigateLightbox(direction) {
  if (!window.lightboxState) return;
  
  const { photos, currentIndex } = window.lightboxState;
  let newIndex = currentIndex + direction;
  
  if (newIndex < 0) newIndex = photos.length - 1;
  if (newIndex >= photos.length) newIndex = 0;
  
  window.lightboxState.currentIndex = newIndex;
  
  document.getElementById('lightboxImage').src = photos[newIndex];
  document.querySelector('.lightbox-counter').textContent = `${newIndex + 1} / ${photos.length}`;
}

function closeLightbox() {
  const lightbox = document.getElementById('lightboxOverlay');
  if (lightbox) lightbox.remove();
  document.removeEventListener('keydown', handleLightboxKeys);
  window.lightboxState = null;
}

async function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function exportObservationsToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  showToast('Generating PDF with images, please wait...');
  
  try {
    const logoImg = await loadImageAsBase64('/img/CAT.jpeg');
    if (logoImg) {
      doc.addImage(logoImg, 'JPEG', 14, 10, 25, 25);
    }
    
    doc.setFontSize(20);
    doc.setTextColor(0, 131, 143);
    doc.text('Safety Observations Report', logoImg ? 45 : 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, logoImg ? 45 : 14, 28);
    doc.text('Saudi Safety Group - CAT Project (Aramco)', logoImg ? 45 : 14, 34);
    
    const res = await fetch('/api/observations');
    const observations = await res.json();
    
    const tableData = observations.slice(0, 100).map(obs => [
      obs.code || '-',
      new Date(obs.date).toLocaleDateString(),
      obs.area || '-',
      (obs.description || '').substring(0, 50) + (obs.description?.length > 50 ? '...' : ''),
      obs.risk_level || '-',
      obs.status || 'Open'
    ]);
    
    doc.autoTable({
      startY: 45,
      head: [['Code', 'Date', 'Area', 'Description', 'Risk', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 131, 143] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 22 },
        2: { cellWidth: 28 },
        3: { cellWidth: 60 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 }
      }
    });
    
    const obsWithPhotos = observations.filter(obs => {
      const urls = parseEvidenceUrls(obs.evidence_urls);
      return urls.length > 0;
    }).slice(0, 20);
    
    if (obsWithPhotos.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(0, 131, 143);
      doc.text('Photo Evidence', 14, 20);
      
      let yPos = 35;
      const pageHeight = doc.internal.pageSize.height;
      
      for (const obs of obsWithPhotos) {
        const urls = parseEvidenceUrls(obs.evidence_urls);
        if (urls.length === 0) continue;
        
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`${obs.code || 'Observation'} - ${obs.area || 'N/A'} (${obs.risk_level || 'N/A'})`, 14, yPos);
        yPos += 5;
        
        let xPos = 14;
        for (const url of urls.slice(0, 3)) {
          try {
            const imgData = await loadImageAsBase64(url);
            if (imgData) {
              doc.addImage(imgData, 'JPEG', xPos, yPos, 55, 40);
              xPos += 60;
            }
          } catch (e) {
            console.log('Could not load image:', url);
          }
        }
        yPos += 50;
      }
    }
    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
      doc.text('Confidential - Aramco CAT Project', 14, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`safety-observations-${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('PDF exported successfully with photos!');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    showToast('Failed to export PDF');
  }
}

async function exportPermitsToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  showToast('Generating PDF, please wait...');
  
  try {
    const logoImg = await loadImageAsBase64('/img/CAT.jpeg');
    if (logoImg) {
      doc.addImage(logoImg, 'JPEG', 14, 10, 25, 25);
    }
    
    doc.setFontSize(20);
    doc.setTextColor(0, 131, 143);
    doc.text('Work Permits Report', logoImg ? 45 : 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, logoImg ? 45 : 14, 28);
    doc.text('Saudi Safety Group - CAT Project (Aramco)', logoImg ? 45 : 14, 34);
    
    const res = await fetch('/api/permits');
    const permits = await res.json();
    
    const tableData = permits.map(permit => [
      permit.permit_number || '-',
      new Date(permit.date).toLocaleDateString(),
      permit.area || '-',
      permit.permit_type || '-',
      permit.receiver_name || '-',
      permit.status || 'Open'
    ]);
    
    doc.autoTable({
      startY: 45,
      head: [['Permit #', 'Date', 'Area', 'Type', 'Receiver', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 131, 143] },
      styles: { fontSize: 8, cellPadding: 2 }
    });
    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
      doc.text('Confidential - Aramco CAT Project', 14, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`work-permits-${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('PDF exported successfully');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    showToast('Failed to export PDF');
  }
}

async function exportDashboardToPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  showToast('Generating Dashboard PDF, please wait...');
  
  try {
    const logoImg = await loadImageAsBase64('/img/CAT.jpeg');
    if (logoImg) {
      doc.addImage(logoImg, 'JPEG', 14, 10, 25, 25);
    }
    
    doc.setFontSize(22);
    doc.setTextColor(0, 131, 143);
    doc.text('Safety Dashboard Report', logoImg ? 45 : 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, logoImg ? 45 : 14, 28);
    doc.text('Saudi Safety Group - CAT Project (Aramco)', logoImg ? 45 : 14, 34);
    
    const statsRes = await fetch('/api/stats');
    const stats = await statsRes.json();
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Key Performance Indicators', 14, 50);
    
    doc.autoTable({
      startY: 55,
      head: [['Metric', 'Value']],
      body: [
        ['Total Observations', stats.totalObservations || 0],
        ['Observations Today', stats.observationsToday || 0],
        ['Total Permits', stats.totalPermits || 0],
        ['Permits Today', stats.permitsToday || 0],
        ['Open Incidents', stats.openIncidents || 0],
        ['Equipment Count', stats.equipmentCount || 0],
        ['Contractors On-site', stats.contractorsOnSite || 0]
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 131, 143] },
      styles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 50 } }
    });
    
    const obsRes = await fetch('/api/observations?limit=20');
    const observations = await obsRes.json();
    
    doc.addPage();
    if (logoImg) {
      doc.addImage(logoImg, 'JPEG', 14, 10, 20, 20);
    }
    doc.setFontSize(14);
    doc.setTextColor(0, 131, 143);
    doc.text('Recent Observations', logoImg ? 40 : 14, 20);
    
    const obsData = observations.map(obs => [
      obs.code || '-',
      new Date(obs.date).toLocaleDateString(),
      obs.area || '-',
      obs.risk_level || '-'
    ]);
    
    doc.autoTable({
      startY: 35,
      head: [['Code', 'Date', 'Area', 'Risk Level']],
      body: obsData,
      theme: 'striped',
      headStyles: { fillColor: [0, 131, 143] },
      styles: { fontSize: 9 }
    });
    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
      doc.text('Confidential - Aramco CAT Project', 14, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`safety-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Dashboard PDF exported successfully');
  } catch (error) {
    console.error('Error exporting PDF:', error);
    showToast('Failed to export PDF');
  }
}

function printDetail() {
  const content = document.getElementById('detailContentPrint');
  if (!content) return;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Safety Report - CAT Project</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #00838f; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { color: #00838f; margin: 0; }
        .header p { color: #666; margin: 5px 0; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
        .detail-item { padding: 10px; background: #f5f5f5; border-radius: 4px; }
        .detail-item label { font-weight: bold; display: block; color: #333; margin-bottom: 4px; }
        .detail-section { margin: 20px 0; }
        .detail-section h4 { color: #00838f; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        .detail-photos { display: flex; flex-wrap: wrap; gap: 10px; }
        .detail-photo img { max-width: 200px; max-height: 150px; object-fit: cover; border: 1px solid #ddd; }
        .card-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .badge-high { background: #ffebee; color: #c62828; }
        .badge-medium { background: #fff3e0; color: #ef6c00; }
        .badge-low { background: #e8f5e9; color: #2e7d32; }
        .detail-actions { display: none; }
        .photo-overlay { display: none; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Safety Observer Pro</h1>
        <p>Saudi Safety Group - CAT Project</p>
        <p>Report Generated: ${new Date().toLocaleString()}</p>
      </div>
      ${content.innerHTML}
      <div class="footer">
        <p>This document was generated by Safety Observer Pro</p>
        <p>Aramco CAT Project - Confidential</p>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

function shareDetail() {
  const title = document.getElementById('detailModalTitle')?.textContent || 'Safety Report';
  const url = window.location.href;
  
  if (navigator.share) {
    navigator.share({ title, text: `Safety Report: ${title}`, url })
      .catch(err => console.log('Share failed:', err));
  } else {
    navigator.clipboard.writeText(`${title}\n${url}`);
    showToast('Link copied to clipboard');
  }
}

function closeDetailModal() {
  document.getElementById('detailModalOverlay').classList.remove('active');
}

function showChallengeDetail(id) {
  if (!state.user) {
    showLoginModal();
    return;
  }
  
  const challenge = state.challenges.find(c => c.id === id);
  if (!challenge || challenge.completed) return;
  
  const lang = localStorage.getItem('appLanguage') || 'en';
  const title = challenge[`title_${lang}`] || challenge.title_en;
  const desc = challenge[`description_${lang}`] || challenge.description_en || '';
  
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div class="challenge-icon" style="margin: 0 auto 16px; width: 60px; height: 60px; font-size: 24px;">
        <i class="fas ${CHALLENGE_ICONS[challenge.challenge_type] || CHALLENGE_ICONS.default}"></i>
      </div>
      <p style="color: var(--text-secondary);">${desc}</p>
      <div class="challenge-points" style="font-size: 24px; margin-top: 12px;">+${challenge.points} ${t('points', lang)}</div>
    </div>
    ${challenge.requires_photo ? `
      <div class="form-group">
        <label class="form-label">${t('uploadEvidence', lang)} *</label>
        <input type="file" id="challengePhotoUpload" accept="image/*" multiple onchange="handlePhotoUpload(this)" required>
        <div id="photoPreview" class="photo-preview-grid"></div>
      </div>
    ` : ''}
    <div class="form-group">
      <label class="form-label">${t('notes', lang)}</label>
      <textarea class="form-input" id="challengeNotes" rows="2"></textarea>
    </div>
    <button class="btn-primary" style="width: 100%;" onclick="completeChallenge(${id})">
      <i class="fas fa-check"></i> ${t('completeChallenge', lang)}
    </button>
  `;
  
  state.uploadedPhotos = [];
  overlay.classList.add('active');
}

async function completeChallenge(id) {
  const challenge = state.challenges.find(c => c.id === id);
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  if (challenge.requires_photo && state.uploadedPhotos.length === 0) {
    showToast(t('photoRequired', lang));
    return;
  }
  
  const notes = document.getElementById('challengeNotes')?.value || '';
  
  try {
    const res = await fetch('/api/challenges/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: state.user.id,
        challenge_id: id,
        evidence_urls: state.uploadedPhotos,
        notes: notes
      })
    });
    
    const result = await res.json();
    
    if (result.success) {
      closeModal();
      showToast(`+${result.points_awarded} ${t('points', lang)}!`);
      
      state.user.total_points = (state.user.total_points || 0) + result.points_awarded;
      state.user.current_level = result.new_level;
      state.user.current_streak = result.streak;
      updateUserDisplay();
      localStorage.setItem('safetyUser', JSON.stringify(state.user));
      
      if (result.new_badges && result.new_badges.length > 0) {
        showBadgeEarned(result.new_badges[0]);
      }
      
      loadUserChallenges();
      loadChallenges();
    } else {
      showToast(result.error || t('errorSaving', lang));
    }
  } catch (error) {
    console.error('Error:', error);
    showToast(t('errorSaving', lang));
  }
}

function showBadgeEarned(badge) {
  const popup = document.getElementById('badgePopup');
  const icon = document.getElementById('badgePopupIcon');
  const name = document.getElementById('badgePopupName');
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  icon.innerHTML = `<i class="fas ${badge.icon || 'fa-medal'}"></i>`;
  icon.style.background = badge.color || '#fbbf24';
  name.textContent = badge[`name_${lang}`] || badge.name_en;
  
  popup.style.display = 'flex';
}

function closeBadgePopup() {
  document.getElementById('badgePopup').style.display = 'none';
}

function showLoginModal() {
  document.getElementById('loginModalOverlay').classList.add('active');
}

function closeLoginModal() {
  document.getElementById('loginModalOverlay').classList.remove('active');
}

async function handleLogin(e) {
  e.preventDefault();
  const employeeId = document.getElementById('loginEmployeeId').value;
  const password = document.getElementById('loginPassword').value;
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId, password })
    });
    
    const data = await res.json();
    
    if (data.user) {
      state.user = data.user;
      localStorage.setItem('safetyUser', JSON.stringify(data.user));
      closeLoginModal();
      showUserBar();
      showToast(t('welcomeBack', lang) + ', ' + data.user.name + '!');
      loadUserChallenges();
    } else {
      showToast(data.error || t('invalidCredentials', lang));
    }
  } catch (error) {
    console.error('Error:', error);
    showToast(t('errorLoggingIn', lang));
  }
}

function showRegisterForm() {
  const lang = localStorage.getItem('appLanguage') || 'en';
  document.getElementById('loginModal').querySelector('.modal-header h3').textContent = t('register', lang);
  document.getElementById('loginModal').querySelector('.modal-body').innerHTML = `
    <form id="registerForm" onsubmit="handleRegister(event)">
      <div class="form-group">
        <label>${t('employeeId', lang)} *</label>
        <input type="text" class="form-input" id="regEmployeeId" required>
      </div>
      <div class="form-group">
        <label>${t('fullName', lang)} *</label>
        <input type="text" class="form-input" id="regName" required>
      </div>
      <div class="form-group">
        <label>${t('email', lang)}</label>
        <input type="email" class="form-input" id="regEmail">
      </div>
      <div class="form-group">
        <label>${t('area', lang)}</label>
        <select class="form-select" id="regArea">
          <option value="">${t('selectArea', lang)}</option>
          ${state.areas.map(a => `<option value="${a}">${a}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>${t('password', lang)} *</label>
        <input type="password" class="form-input" id="regPassword" required>
      </div>
      <button type="submit" class="btn-primary btn-block">${t('register', lang)}</button>
      <p class="login-register-link">
        ${t('haveAccount', lang)}
        <a href="#" onclick="showLoginForm()">${t('login', lang)}</a>
      </p>
    </form>
  `;
}

function showLoginForm() {
  const lang = localStorage.getItem('appLanguage') || 'en';
  document.getElementById('loginModal').querySelector('.modal-header h3').textContent = t('login', lang);
  document.getElementById('loginModal').querySelector('.modal-body').innerHTML = `
    <form id="loginForm" onsubmit="handleLogin(event)">
      <div class="form-group">
        <label>${t('employeeId', lang)}</label>
        <input type="text" class="form-input" id="loginEmployeeId" required placeholder="e.g., 8222802">
      </div>
      <div class="form-group">
        <label>${t('password', lang)}</label>
        <input type="password" class="form-input" id="loginPassword" required>
      </div>
      <button type="submit" class="btn-primary btn-block">${t('login', lang)}</button>
      <p class="login-register-link">
        ${t('noAccount', lang)}
        <a href="#" onclick="showRegisterForm()">${t('register', lang)}</a>
      </p>
    </form>
  `;
}

async function handleRegister(e) {
  e.preventDefault();
  const lang = localStorage.getItem('appLanguage') || 'en';
  
  const data = {
    employee_id: document.getElementById('regEmployeeId').value,
    name: document.getElementById('regName').value,
    email: document.getElementById('regEmail').value,
    area: document.getElementById('regArea').value,
    password: document.getElementById('regPassword').value
  };
  
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    
    if (result.id) {
      showToast(t('registrationSuccess', lang));
      showLoginForm();
    } else {
      showToast(result.error || t('errorRegistering', lang));
    }
  } catch (error) {
    console.error('Error:', error);
    showToast(t('errorRegistering', lang));
  }
}

function showProfile() {
  if (state.user) {
    switchTab('profileTab');
  } else {
    showLoginModal();
  }
}

function logout() {
  const lang = localStorage.getItem('appLanguage') || 'en';
  const confirmMsg = lang === 'ar' ? 'هل تريد تسجيل الخروج؟' : 
                     lang === 'ur' ? 'کیا آپ لاگ آؤٹ کرنا چاہتے ہیں؟' : 
                     'Are you sure you want to logout?';
  
  if (confirm(confirmMsg)) {
    state.user = null;
    localStorage.removeItem('safetyUser');
    document.getElementById('userPointsBar').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    switchTab('homeTab');
    showLoginModal();
    const successMsg = lang === 'ar' ? 'تم تسجيل الخروج بنجاح' :
                       lang === 'ur' ? 'کامیابی سے لاگ آؤٹ ہو گیا' :
                       'Logged out successfully';
    showToast(successMsg, 'success');
  }
}

function showQuickActions() {
  document.getElementById('quickActionsOverlay').style.display = 'flex';
}

function hideQuickActions() {
  document.getElementById('quickActionsOverlay').style.display = 'none';
}

function openSearch() {
  document.getElementById('searchOverlay').classList.add('active');
  document.getElementById('globalSearch').focus();
}

function closeSearch() {
  const lang = localStorage.getItem('appLanguage') || 'en';
  document.getElementById('searchOverlay').classList.remove('active');
  document.getElementById('globalSearch').value = '';
  document.getElementById('searchResults').innerHTML = `<p class="search-hint">${t('startTypingToSearch', lang)}</p>`;
}

async function handleGlobalSearch(e) {
  const query = e.target.value.trim();
  const results = document.getElementById('searchResults');

  if (query.length < 2) {
    results.innerHTML = '<p class="search-hint">Start typing to search...</p>';
    return;
  }

  results.innerHTML = '<div class="skeleton-item"></div>';

  try {
    const [obsRes, permRes, equipRes] = await Promise.all([
      fetch(`/api/observations?search=${encodeURIComponent(query)}&limit=5`),
      fetch(`/api/permits?search=${encodeURIComponent(query)}&limit=5`),
      fetch(`/api/equipment?search=${encodeURIComponent(query)}&limit=5`)
    ]);

    const observations = await obsRes.json();
    const permits = await permRes.json();
    const equipment = await equipRes.json();

    let html = '';

    if (observations.length > 0) {
      html += '<h4 style="margin: 0 0 12px; color: var(--text-secondary);">Observations</h4>';
      html += observations.map(o => `
        <div class="card" style="margin-bottom: 8px; cursor: pointer;" onclick="closeSearch(); showDetailModal('observation', ${o.id});">
          <div class="card-header">
            <span class="card-title">${o.code || 'Observation'}</span>
            <span class="card-badge badge-${(o.risk_level || 'low').toLowerCase()}">${o.risk_level || 'Unknown'}</span>
          </div>
        </div>
      `).join('');
    }

    if (permits.length > 0) {
      html += '<h4 style="margin: 16px 0 12px; color: var(--text-secondary);">Permits</h4>';
      html += permits.map(p => `
        <div class="card" style="margin-bottom: 8px; cursor: pointer;" onclick="closeSearch(); showDetailModal('permit', ${p.id});">
          <div class="card-header">
            <span class="card-title">${p.permit_number || 'Permit'}</span>
          </div>
        </div>
      `).join('');
    }

    if (equipment.length > 0) {
      html += '<h4 style="margin: 16px 0 12px; color: var(--text-secondary);">Equipment</h4>';
      html += equipment.map(e => `
        <div class="card" style="margin-bottom: 8px; cursor: pointer;" onclick="closeSearch(); showDetailModal('equipment', ${e.id});">
          <div class="card-header">
            <span class="card-title">${e.asset_number || 'Equipment'}</span>
          </div>
        </div>
      `).join('');
    }

    if (!html) {
      html = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">No results found</p>';
    }

    results.innerHTML = html;
  } catch (error) {
    console.error('Search error:', error);
    results.innerHTML = '<p style="text-align: center; color: var(--danger);">Search failed</p>';
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  const themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) themeSwitch.checked = isDark;
  
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  }
}

function loadTheme() {
  const theme = localStorage.getItem('theme');
  const isDark = theme === 'dark';
  
  if (isDark) {
    document.body.classList.add('dark-mode');
  }
  
  const themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) themeSwitch.checked = isDark;
  
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function showRiskMatrix() {
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = 'Risk Matrix';
  document.getElementById('modalBody').innerHTML = `
    <div style="text-align: center;">
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <tr style="background: var(--text-primary); color: var(--bg-card);">
          <th style="padding: 8px; border: 1px solid var(--border);">Likelihood / Severity</th>
          <th style="padding: 8px; border: 1px solid var(--border);">1</th>
          <th style="padding: 8px; border: 1px solid var(--border);">2</th>
          <th style="padding: 8px; border: 1px solid var(--border);">3</th>
          <th style="padding: 8px; border: 1px solid var(--border);">4</th>
          <th style="padding: 8px; border: 1px solid var(--border);">5</th>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid var(--border); font-weight: 600;">5</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #fbbf24;">M</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #f97316;">H</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #ef4444;">H</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #dc2626;">E</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #dc2626;">E</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid var(--border); font-weight: 600;">4</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #22c55e;">L</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #fbbf24;">M</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #f97316;">H</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #ef4444;">H</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #dc2626;">E</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid var(--border); font-weight: 600;">3</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #22c55e;">L</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #22c55e;">L</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #fbbf24;">M</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #f97316;">H</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #ef4444;">H</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid var(--border); font-weight: 600;">2</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #22c55e;">L</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #22c55e;">L</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #22c55e;">L</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #fbbf24;">M</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #f97316;">H</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid var(--border); font-weight: 600;">1</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #22c55e;">L</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #22c55e;">L</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #22c55e;">L</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #22c55e;">L</td>
          <td style="padding: 8px; border: 1px solid var(--border); background: #fbbf24;">M</td>
        </tr>
      </table>
      <div style="margin-top: 16px; display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; font-size: 13px;">
        <span><span style="display: inline-block; width: 16px; height: 16px; background: #22c55e; border-radius: 4px; vertical-align: middle;"></span> Low</span>
        <span><span style="display: inline-block; width: 16px; height: 16px; background: #fbbf24; border-radius: 4px; vertical-align: middle;"></span> Medium</span>
        <span><span style="display: inline-block; width: 16px; height: 16px; background: #f97316; border-radius: 4px; vertical-align: middle;"></span> High</span>
        <span><span style="display: inline-block; width: 16px; height: 16px; background: #dc2626; border-radius: 4px; vertical-align: middle;"></span> Extreme</span>
      </div>
    </div>
  `;
  overlay.classList.add('active');
}

function showGPSLocation() {
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = 'GPS Location';
  const body = document.getElementById('modalBody');
  body.innerHTML = '<p style="text-align: center; padding: 40px;">Getting location...</p>';
  overlay.classList.add('active');

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        body.innerHTML = `
          <div style="text-align: center;">
            <i class="fas fa-map-marker-alt" style="font-size: 48px; color: var(--primary); margin-bottom: 16px;"></i>
            <p style="font-size: 16px; margin-bottom: 8px;">Your Location:</p>
            <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">
              Lat: ${latitude.toFixed(6)}<br>Long: ${longitude.toFixed(6)}
            </p>
            <a href="https://www.google.com/maps?q=${latitude},${longitude}" target="_blank" class="btn-primary" style="text-decoration: none; display: inline-block;">
              <i class="fas fa-external-link-alt"></i> Open in Maps
            </a>
          </div>
        `;
      },
      (err) => {
        body.innerHTML = `<p style="text-align: center; color: var(--danger); padding: 40px;">Unable to get location: ${err.message}</p>`;
      }
    );
  } else {
    body.innerHTML = '<p style="text-align: center; color: var(--danger); padding: 40px;">Geolocation is not supported</p>';
  }
}

function showEmergencyProcedures() {
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = 'Emergency Procedures';
  document.getElementById('modalBody').innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <a href="tel:911" class="emergency-btn" style="text-decoration: none;">
        <i class="fas fa-ambulance"></i> Emergency Services: 911
      </a>
      <a href="tel:+966500000000" class="emergency-btn" style="text-decoration: none; background: var(--warning);">
        <i class="fas fa-fire-extinguisher"></i> Fire Emergency
      </a>
      <a href="tel:+966500000000" class="emergency-btn" style="text-decoration: none; background: var(--primary);">
        <i class="fas fa-hard-hat"></i> Safety Office
      </a>
    </div>
    <div style="margin-top: 24px;">
      <h4 style="margin-bottom: 12px; color: var(--text-primary);">In Case of Emergency:</h4>
      <ol style="padding-left: 20px; color: var(--text-secondary); line-height: 1.8;">
        <li>Stay calm and assess the situation</li>
        <li>Call emergency services if needed</li>
        <li>Evacuate if required</li>
        <li>Report to your supervisor</li>
        <li>Follow site emergency procedures</li>
      </ol>
    </div>
  `;
  overlay.classList.add('active');
}

function showColorCode() {
  const months = [
    { name: 'January', color: '#22c55e' },
    { name: 'February', color: '#ef4444' },
    { name: 'March', color: '#3b82f6' },
    { name: 'April', color: '#eab308' },
    { name: 'May', color: '#22c55e' },
    { name: 'June', color: '#ef4444' },
    { name: 'July', color: '#3b82f6' },
    { name: 'August', color: '#eab308' },
    { name: 'September', color: '#22c55e' },
    { name: 'October', color: '#ef4444' },
    { name: 'November', color: '#3b82f6' },
    { name: 'December', color: '#eab308' }
  ];

  const currentMonth = new Date().getMonth();

  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = 'Monthly Color Code';
  document.getElementById('modalBody').innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
      ${months.map((m, i) => `
        <div style="padding: 12px; background: ${m.color}; color: white; border-radius: 8px; text-align: center; font-weight: 600; font-size: 12px; ${i === currentMonth ? 'box-shadow: 0 0 0 3px var(--text-primary);' : ''}">
          ${m.name}
        </div>
      `).join('')}
    </div>
    <p style="margin-top: 16px; text-align: center; color: var(--text-secondary); font-size: 13px;">
      Current month highlighted with border
    </p>
  `;
  overlay.classList.add('active');
}

function showWeather() {
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = 'Weather';
  document.getElementById('modalBody').innerHTML = `
    <div class="weather-card">
      <i class="fas fa-sun" style="font-size: 48px; margin-bottom: 16px;"></i>
      <div class="weather-temp">38°C</div>
      <div class="weather-desc">Hot & Sunny</div>
      <div class="weather-details">
        <span><i class="fas fa-tint"></i> Humidity: 25%</span>
        <span><i class="fas fa-wind"></i> Wind: 15 km/h</span>
      </div>
    </div>
    <div style="margin-top: 16px; padding: 16px; background: rgba(239,68,68,0.1); border-radius: 8px; border-left: 4px solid var(--danger);">
      <h4 style="color: var(--danger); margin-bottom: 8px;"><i class="fas fa-exclamation-triangle"></i> Heat Warning</h4>
      <p style="font-size: 13px; color: var(--text-secondary);">High temperatures expected. Ensure workers take regular breaks and stay hydrated.</p>
    </div>
  `;
  overlay.classList.add('active');
}

function showNotifications() {
  const lang = localStorage.getItem('appLanguage') || 'en';
  const overlay = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = t('notifications', lang);
  document.getElementById('modalBody').innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fas fa-bell" style="font-size: 48px; margin-bottom: 16px;"></i>
      <p>${t('noNotifications', lang)}</p>
    </div>
  `;
  overlay.classList.add('active');
}

function showAdminPanel() {
  const lang = localStorage.getItem('appLanguage') || 'en';
  showToast(t('adminFeatureComingSoon', lang));
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
         date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

window.showAddModal = showAddModal;
window.closeModal = closeModal;
window.closeDetailModal = closeDetailModal;
window.submitObservation = submitObservation;
window.submitPermit = submitPermit;
window.submitEquipment = submitEquipment;
window.submitIncident = submitIncident;
window.submitHandover = submitHandover;
window.submitContractor = submitContractor;
window.submitCertification = submitCertification;
window.submitInspection = submitInspection;
window.closeSearch = closeSearch;
window.switchTab = switchTab;
window.showRiskMatrix = showRiskMatrix;
window.showGPSLocation = showGPSLocation;
window.showEmergencyProcedures = showEmergencyProcedures;
window.showColorCode = showColorCode;
window.showWeather = showWeather;
window.handlePhotoUpload = handlePhotoUpload;
window.removePhoto = removePhoto;
window.showQuickActions = showQuickActions;
window.hideQuickActions = hideQuickActions;
window.showProfile = showProfile;
window.showNotifications = showNotifications;
window.showLoginModal = showLoginModal;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showRegisterForm = showRegisterForm;
window.showLoginForm = showLoginForm;
window.showChallengeDetail = showChallengeDetail;
window.completeChallenge = completeChallenge;
window.closeBadgePopup = closeBadgePopup;
window.signOutContractor = signOutContractor;
window.showDetailModal = showDetailModal;
window.showAdminPanel = showAdminPanel;
