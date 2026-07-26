(() => {
  const header = document.querySelector('.site-header');
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.primary-nav');
  const year = document.querySelector('#year');

  if (year) year.textContent = new Date().getFullYear();

  const setHeaderState = () => header?.classList.toggle('scrolled', window.scrollY > 10);
  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  navToggle?.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });

  nav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      document.body.classList.remove('menu-open');
      navToggle?.setAttribute('aria-expanded', 'false');
    });
  });

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            currentObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 })
    : null;

  document.querySelectorAll('.reveal').forEach((element) => {
    if (observer) observer.observe(element);
    else element.classList.add('is-visible');
  });

  // Count one visit per browser every 30 minutes. The endpoint stores no IP address.
  const trackVisit = () => {
    const storageKey = 'nusa_brew_last_visit';
    const now = Date.now();
    const previous = Number(localStorage.getItem(storageKey) || 0);
    const thirtyMinutes = 30 * 60 * 1000;

    if (now - previous < thirtyMinutes) return;
    localStorage.setItem(storageKey, String(now));

    const payload = JSON.stringify({
      path: window.location.pathname || '/',
      referrer: document.referrer || 'Direct'
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/visit', new Blob([payload], { type: 'application/json' }));
      return;
    }

    fetch('/api/visit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(() => undefined);
  };

  if (window.location.protocol !== 'file:') trackVisit();
})();
