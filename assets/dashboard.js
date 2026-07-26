(() => {
  const elements = {
    overlay: document.querySelector('#auth-overlay'),
    form: document.querySelector('#auth-form'),
    input: document.querySelector('#dashboard-key'),
    error: document.querySelector('#auth-error'),
    refresh: document.querySelector('#refresh-button'),
    logout: document.querySelector('#logout-button'),
    notice: document.querySelector('#dashboard-notice'),
    total: document.querySelector('#total-visits'),
    today: document.querySelector('#today-visits'),
    week: document.querySelector('#week-visits'),
    average: document.querySelector('#daily-average'),
    todayLabel: document.querySelector('#today-label'),
    updated: document.querySelector('#last-updated'),
    chart: document.querySelector('#bar-chart'),
    dailyList: document.querySelector('#daily-list'),
    pages: document.querySelector('#top-pages'),
    sources: document.querySelector('#top-sources')
  };

  const escapeHTML = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Number(value || 0));
  const formatDate = (isoDate, options = { month: 'short', day: 'numeric' }) => {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', options).format(new Date(year, month - 1, day));
  };

  const DASHBOARD_KEY = 'marcellganteng';
  const getKey = () => DASHBOARD_KEY;
  const setLoading = (loading) => {
    elements.refresh.disabled = loading;
    elements.refresh.textContent = loading ? 'Refreshing…' : 'Refresh';
  };

  const showNotice = (message = '') => {
    elements.notice.hidden = !message;
    elements.notice.textContent = message;
  };

  const renderChart = (days) => {
    const max = Math.max(1, ...days.map((day) => day.visits));
    elements.chart.innerHTML = days.map((day) => {
      const height = Math.max(day.visits ? 5 : 1.5, (day.visits / max) * 100);
      return `
        <div class="bar-column" title="${escapeHTML(day.date)}: ${day.visits} visits">
          <strong>${formatNumber(day.visits)}</strong>
          <div class="bar-track"><div class="bar-fill" style="height:${height}%"></div></div>
          <span>${escapeHTML(formatDate(day.date))}</span>
        </div>`;
    }).join('');
  };

  const renderDaily = (days) => {
    const recent = [...days].reverse().slice(0, 7);
    elements.dailyList.innerHTML = recent.length
      ? recent.map((day) => `
          <div class="daily-row">
            <span>${escapeHTML(formatDate(day.date, { weekday: 'short', month: 'short', day: 'numeric' }))}</span>
            <strong>${formatNumber(day.visits)}</strong>
          </div>`).join('')
      : '<div class="empty-state">No visits recorded yet.</div>';
  };

  const renderRanking = (element, items) => {
    element.innerHTML = items.length
      ? items.map((item, index) => `
          <div class="ranking-row">
            <div><i class="rank-number">${index + 1}</i><span title="${escapeHTML(item.label)}">${escapeHTML(item.label)}</span></div>
            <strong>${formatNumber(item.visits)}</strong>
          </div>`).join('')
      : '<div class="empty-state">No data yet.</div>';
  };

  const render = (data) => {
    elements.total.textContent = formatNumber(data.totalVisits);
    elements.today.textContent = formatNumber(data.todayVisits);
    elements.week.textContent = formatNumber(data.last7Days);
    elements.average.textContent = Number(data.dailyAverage || 0).toFixed(1);
    elements.todayLabel.textContent = formatDate(data.today, { weekday: 'long', month: 'short', day: 'numeric' });
    elements.updated.textContent = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
    renderChart(data.last14Days || []);
    renderDaily(data.last14Days || []);
    renderRanking(elements.pages, data.topPages || []);
    renderRanking(elements.sources, data.topSources || []);
    showNotice(data.note || '');
  };

  const loadStats = async (key = getKey()) => {
    if (!key) {
      elements.overlay.hidden = false;
      elements.input.focus();
      return;
    }

    setLoading(true);
    elements.error.textContent = '';

    try {
      const response = await fetch('/api/stats', {
        headers: { 'x-dashboard-key': key },
        cache: 'no-store'
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);

      elements.overlay.hidden = true;
      render(data);
    } catch (error) {
      elements.overlay.hidden = false;
      elements.error.textContent = error.message;
    } finally {
      setLoading(false);
    }
  };

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    loadStats(elements.input.value.trim());
  });

  elements.refresh.addEventListener('click', () => loadStats());
  elements.logout.addEventListener('click', () => {
    elements.input.value = '';
    elements.overlay.hidden = false;
    elements.input.focus();
  });

  loadStats();
})();
