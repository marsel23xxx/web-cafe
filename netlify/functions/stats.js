const { getStore } = require('@netlify/blobs');

const todayISO = () => new Date().toISOString().slice(0, 10);

const isoDaysAgo = (n) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - n);
  return date.toISOString().slice(0, 10);
};

const rankEntries = (map, limit = 5) =>
  Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, visits]) => ({ label, visits }));

exports.handler = async (event) => {
  const expectedKey = process.env.DASHBOARD_KEY;
  if (!expectedKey) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Dashboard key not configured on the server' })
    };
  }

  const providedKey = event.headers['x-dashboard-key'] || event.headers['X-Dashboard-Key'];
  if (providedKey !== expectedKey) {
    return {
      statusCode: 401,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized: invalid dashboard key' })
    };
  }

  try {
    const store = getStore('analytics');
    const data = (await store.get('data', { type: 'json' })) || { totalVisits: 0, days: {} };

    const today = todayISO();
    const last14Dates = Array.from({ length: 14 }, (_, i) => isoDaysAgo(13 - i));
    const last14Days = last14Dates.map((date) => ({ date, visits: data.days[date]?.visits || 0 }));
    const last7Days = last14Dates.slice(-7).reduce((sum, date) => sum + (data.days[date]?.visits || 0), 0);

    const activeDays = Object.values(data.days).filter((day) => day.visits > 0).length;
    const dailyAverage = activeDays ? data.totalVisits / activeDays : 0;

    const pageTotals = {};
    const sourceTotals = {};
    Object.values(data.days).forEach((day) => {
      Object.entries(day.pages || {}).forEach(([page, count]) => {
        pageTotals[page] = (pageTotals[page] || 0) + count;
      });
      Object.entries(day.sources || {}).forEach(([source, count]) => {
        sourceTotals[source] = (sourceTotals[source] || 0) + count;
      });
    });

    const body = {
      totalVisits: data.totalVisits,
      todayVisits: data.days[today]?.visits || 0,
      today,
      last7Days,
      dailyAverage,
      last14Days,
      topPages: rankEntries(pageTotals),
      topSources: rankEntries(sourceTotals)
    };

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    };
  } catch (error) {
    console.error('stats function error:', error);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: `Server error: ${error.message}` })
    };
  }
};
