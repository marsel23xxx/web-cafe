const { getStore } = require('@netlify/blobs');

const todayISO = () => new Date().toISOString().slice(0, 10);

const extractSource = (referrer) => {
  if (!referrer) return 'Direct';
  try {
    const hostname = new URL(referrer).hostname.replace(/^www\./, '');
    return hostname || 'Direct';
  } catch {
    return 'Direct';
  }
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const path = typeof payload.path === 'string' && payload.path.startsWith('/')
    ? payload.path.slice(0, 200)
    : '/';
  const source = extractSource(typeof payload.referrer === 'string' ? payload.referrer : '');

  try {
    const store = getStore('analytics');
    const date = todayISO();
    const data = (await store.get('data', { type: 'json' })) || { totalVisits: 0, days: {} };

    if (!data.days[date]) data.days[date] = { visits: 0, pages: {}, sources: {} };

    data.days[date].visits += 1;
    data.days[date].pages[path] = (data.days[date].pages[path] || 0) + 1;
    data.days[date].sources[source] = (data.days[date].sources[source] || 0) + 1;
    data.totalVisits += 1;

    await store.setJSON('data', data);

    return { statusCode: 204, body: '' };
  } catch (error) {
    console.error('visit function error:', error);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: `Server error: ${error.message}` })
    };
  }
};
