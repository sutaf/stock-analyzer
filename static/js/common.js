// ─── Theme ───
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
}

// ─── Watchlist (localStorage) ───
function getWatchlist() {
  return JSON.parse(localStorage.getItem('watchlist') || '[]');
}

function addToWatchlist(item) {
  const list = getWatchlist();
  const key = item.ticker || item.code;
  if (list.find(w => (w.ticker || w.code) === key)) return false;
  list.push(item);
  localStorage.setItem('watchlist', JSON.stringify(list));
  return true;
}

function removeFromWatchlist(key) {
  let list = getWatchlist();
  list = list.filter(w => (w.ticker || w.code) !== key);
  localStorage.setItem('watchlist', JSON.stringify(list));
}

function renderWatchlist(containerId, onClick) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const list = getWatchlist();
  if (list.length === 0) {
    container.innerHTML = '<p style="color:var(--text3);font-size:0.85rem;">관심종목이 없습니다. 분석 후 추가해보세요.</p>';
    return;
  }
  container.innerHTML = list.map(item => {
    const key = item.ticker || item.code;
    return `<span class="watchlist-tag" data-key="${escapeHtml(key)}">
      <span class="tag-name" style="cursor:pointer">${escapeHtml(item.name || key)}</span>
      <span class="remove" title="삭제">\u2716</span>
    </span>`;
  }).join('');

  container.querySelectorAll('.tag-name').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.closest('.watchlist-tag').dataset.key;
      if (onClick) onClick(key);
    });
  });
  container.querySelectorAll('.remove').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = el.closest('.watchlist-tag').dataset.key;
      removeFromWatchlist(key);
      renderWatchlist(containerId, onClick);
    });
  });
}

// ─── Recent searches (localStorage) ───
function getRecentSearches(type) {
  return JSON.parse(localStorage.getItem(`recent_${type}`) || '[]');
}

function addRecentSearch(type, item) {
  let list = getRecentSearches(type);
  const key = item.ticker || item.code || item;
  list = list.filter(r => (r.ticker || r.code || r) !== key);
  list.unshift(item);
  if (list.length > 5) list.pop();
  localStorage.setItem(`recent_${type}`, JSON.stringify(list));
}

// ─── Utility ───
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatNumber(num, decimals = 2) {
  if (num == null) return '-';
  if (Math.abs(num) >= 1e12) return (num / 1e12).toFixed(1) + 'T';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (Math.abs(num) >= 1e4) return num.toLocaleString('ko-KR', { maximumFractionDigits: decimals });
  return Number(num).toFixed(decimals);
}

function formatKRW(num) {
  if (num == null) return '-';
  return Math.round(num).toLocaleString('ko-KR') + '\uC6D0';
}

function getGradeBadge(grade) {
  const map = {
    'Strong Buy': 'badge-strong-buy',
    'Buy': 'badge-buy',
    'Hold': 'badge-hold',
    'Sell': 'badge-sell',
    'Strong Sell': 'badge-strong-sell',
  };
  const cls = map[grade] || 'badge-hold';
  return `<span class="badge ${cls}">${escapeHtml(grade)}</span>`;
}

function getChangeClass(pct) {
  return pct >= 0 ? 'change-up' : 'change-down';
}

function getChangeText(pct) {
  if (pct == null) return '-';
  return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
}

function getScoreClass(score) {
  if (score >= 65) return 'high';
  if (score >= 45) return 'mid';
  return 'low';
}

// ─── Keep-alive ping (prevents Render free-tier from sleeping while user is active) ───
// Render free instance spins down after ~15 min of no requests. Ping every 10 min
// while the tab is visible to keep it warm during active use. (For 24/7 uptime,
// set up an external cron service like UptimeRobot — see README.)
(function () {
  const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes
  let lastPing = Date.now();

  function ping() {
    // Skip if tab is hidden — no need to keep warm for invisible tabs
    if (document.hidden) return;
    fetch('/health', { method: 'GET', cache: 'no-store' })
      .then(() => { lastPing = Date.now(); })
      .catch(() => {});
  }

  // Initial ping on page load
  setTimeout(ping, 30 * 1000);  // 30s after load
  setInterval(ping, PING_INTERVAL);

  // Also ping when tab regains visibility if it's been a while
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastPing > PING_INTERVAL) {
      ping();
    }
  });
})();

// ─── Init ───
document.addEventListener('DOMContentLoaded', initTheme);
