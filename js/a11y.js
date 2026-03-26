const liveRegion = document.getElementById('live-region');

export function announce(message) {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  window.setTimeout(() => {
    liveRegion.textContent = message;
  }, 20);
}

export function updateAriaCurrent(activeId) {
  const links = document.querySelectorAll('[data-scene-link]');
  links.forEach((link) => {
    const isActive = link.getAttribute('href') === `#${activeId}`;
    link.setAttribute('aria-current', String(isActive));
  });
}
