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

// ─── Portfolio positions (localStorage) ───
function getPortfolio() {
  return JSON.parse(localStorage.getItem('portfolio') || '[]');
}

function savePortfolio(list) {
  localStorage.setItem('portfolio', JSON.stringify(list));
}

function addPortfolioPosition(pos) {
  // pos: { type, ticker, name, buy_price, quantity, buy_date, notes }
  const list = getPortfolio();
  list.push({ ...pos, id: Date.now() + '-' + Math.random().toString(36).slice(2, 8) });
  savePortfolio(list);
}

function removePortfolioPosition(id) {
  savePortfolio(getPortfolio().filter(p => p.id !== id));
}

// ─── Price alerts (localStorage) ───
function getAlerts() {
  return JSON.parse(localStorage.getItem('alerts') || '[]');
}

function saveAlerts(list) {
  localStorage.setItem('alerts', JSON.stringify(list));
}

function addAlert(alert) {
  // alert: { type, ticker, condition: 'above'|'below', threshold, enabled }
  const list = getAlerts();
  list.push({ ...alert, id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), enabled: true });
  saveAlerts(list);
}

function removeAlert(id) {
  saveAlerts(getAlerts().filter(a => a.id !== id));
}

function toggleAlert(id) {
  const list = getAlerts();
  const a = list.find(a => a.id === id);
  if (a) { a.enabled = !a.enabled; saveAlerts(list); }
}

// Check triggered alerts on page load — call with a function that fetches current price.
// Uses sessionStorage to avoid spamming the same notification repeatedly.
async function checkAlertsOnLoad() {
  const alerts = getAlerts().filter(a => a.enabled);
  if (alerts.length === 0) return;
  const triggeredSession = JSON.parse(sessionStorage.getItem('alerts_triggered') || '[]');

  for (const a of alerts) {
    if (triggeredSession.includes(a.id)) continue;
    try {
      const endpoint = a.type === 'kr'
        ? `/api/analyze/kr/${encodeURIComponent(a.ticker)}`
        : `/api/analyze/us/${encodeURIComponent(a.ticker)}`;
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.error || data.close == null) continue;
      const price = data.close;
      const hit = (a.condition === 'above' && price >= a.threshold) ||
                  (a.condition === 'below' && price <= a.threshold);
      if (hit) {
        showAlertToast(a, price, data.name || data.ticker);
        triggeredSession.push(a.id);
        sessionStorage.setItem('alerts_triggered', JSON.stringify(triggeredSession));
      }
    } catch (_) { /* skip */ }
  }
}

function showAlertToast(alert, currentPrice, name) {
  const curr = alert.type === 'kr' ? '₩' : '$';
  const condLabel = alert.condition === 'above' ? '이상' : '이하';
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; top:80px; right:20px; max-width:340px; z-index:9999;
    background:var(--bg2); border:1px solid var(--primary); border-left:4px solid var(--primary);
    border-radius:var(--radius); box-shadow:0 8px 24px rgba(37,99,235,0.25);
    padding:14px 18px; font-size:0.88rem; animation:slideInRight 0.3s ease-out;`;
  toast.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
      <div>
        <div style="font-weight:800;margin-bottom:4px;">🔔 가격 알림</div>
        <div><strong>${escapeHtml(alert.ticker)}</strong> (${escapeHtml(name || '')})</div>
        <div style="margin-top:6px;color:var(--text2);">
          ${curr}${alert.threshold.toLocaleString()} ${condLabel} 도달<br>
          현재: <strong style="color:var(--primary);">${curr}${Number(currentPrice).toLocaleString()}</strong>
        </div>
      </div>
      <button style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:1.1rem;line-height:1;" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 8000);
}

// ─── Shared markdown renderer for AI reports / Q&A answers ───
// Supports: headings, ordered/unordered lists, tables, blockquotes, hr, bold/italic/code.
function renderMarkdown(md) {
  if (!md) return '';

  // Preprocessing: if Claude wrote "1. A  2. B  3. C" all on one line,
  // split each numbered item onto its own line so the list renderer picks it up.
  md = md.replace(/(\S)[ \t]+(\d+)\.[ \t]+(?=\*\*)/g, '$1\n\n$2. ');

  const lines = md.split('\n');
  const out = [];
  let i = 0;
  let olOpen = false;
  let ulOpen = false;
  let buffer = [];

  const applyInline = (s) => {
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
    s = s.replace(/`([^`]+)`/g, '<code style="background:var(--bg3);padding:2px 6px;border-radius:4px;font-size:0.88em;">$1</code>');
    return s;
  };

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    const text = buffer.join(' ').trim();
    if (text) out.push(`<p>${applyInline(text)}</p>`);
    buffer = [];
  };
  const closeLists = () => {
    if (ulOpen) { out.push('</ul>'); ulOpen = false; }
    if (olOpen) { out.push('</ol>'); olOpen = false; }
  };
  const ensureUl = () => { if (olOpen) { out.push('</ol>'); olOpen = false; } if (!ulOpen) { out.push('<ul>'); ulOpen = true; } };
  const ensureOl = () => { if (ulOpen) { out.push('</ul>'); ulOpen = false; } if (!olOpen) { out.push('<ol>'); olOpen = true; } };

  const isTableSeparator = (s) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(s);
  const splitRow = (s) => s.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());

  while (i < lines.length) {
    const rawLine = lines[i].replace(/\r$/, '');

    // Table: current line has pipes and next line is separator
    if (rawLine.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushBuffer(); closeLists();
      const header = splitRow(rawLine);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i++;
      }
      let html = '<div style="overflow-x:auto;margin:16px 0;"><table class="md-table" style="width:100%;border-collapse:collapse;font-size:0.9rem;">';
      html += '<thead><tr>' + header.map(h => `<th style="padding:10px 14px;text-align:left;border-bottom:2px solid var(--border);font-weight:700;background:var(--bg3);">${applyInline(escapeHtml(h))}</th>`).join('') + '</tr></thead>';
      html += '<tbody>' + rows.map(r => '<tr>' + r.map(c => `<td style="padding:10px 14px;border-bottom:1px solid var(--border);">${applyInline(escapeHtml(c))}</td>`).join('') + '</tr>').join('') + '</tbody>';
      html += '</table></div>';
      out.push(html);
      continue;
    }

    const esc = escapeHtml(rawLine);

    // Horizontal rule
    if (/^(---+|\*\*\*+)$/.test(rawLine.trim())) { flushBuffer(); closeLists(); out.push('<hr>'); i++; continue; }

    // Headings
    let m;
    if ((m = esc.match(/^####\s+(.+)$/))) { flushBuffer(); closeLists(); out.push(`<h4>${applyInline(m[1])}</h4>`); i++; continue; }
    if ((m = esc.match(/^###\s+(.+)$/)))  { flushBuffer(); closeLists(); out.push(`<h3>${applyInline(m[1])}</h3>`); i++; continue; }
    if ((m = esc.match(/^##\s+(.+)$/)))   { flushBuffer(); closeLists(); out.push(`<h2>${applyInline(m[1])}</h2>`); i++; continue; }
    if ((m = esc.match(/^#\s+(.+)$/)))    { flushBuffer(); closeLists(); out.push(`<h2>${applyInline(m[1])}</h2>`); i++; continue; }

    // Ordered list: "1. ..." or "1) ..."
    if ((m = esc.match(/^\s*(\d+)[.)]\s+(.+)$/))) {
      flushBuffer();
      ensureOl();
      out.push(`<li>${applyInline(m[2])}</li>`);
      i++;
      continue;
    }

    // Unordered list
    if ((m = esc.match(/^\s*[-*]\s+(.+)$/))) {
      flushBuffer();
      ensureUl();
      out.push(`<li>${applyInline(m[1])}</li>`);
      i++;
      continue;
    }

    // Blockquote
    if ((m = esc.match(/^>\s+(.+)$/))) {
      flushBuffer(); closeLists();
      out.push(`<blockquote>${applyInline(m[1])}</blockquote>`);
      i++;
      continue;
    }

    // Blank line
    if (rawLine.trim() === '') {
      flushBuffer(); closeLists();
      i++;
      continue;
    }

    // Regular paragraph line
    if (olOpen || ulOpen) closeLists();
    buffer.push(esc);
    i++;
  }

  flushBuffer(); closeLists();
  return out.join('\n');
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  // Check alerts in background 3s after load (don't block UI)
  setTimeout(() => { checkAlertsOnLoad().catch(() => {}); }, 3000);
});
