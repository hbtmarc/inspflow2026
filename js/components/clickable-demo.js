// Componente reutilizável de demo clicável para telas com hotspots.
// Mantém implementação simples para facilitar manutenção por dev júnior.

export function renderClickableDemo(container, config) {
  const { imageSrc, hotspots, ctaLabel, ctaRoute } = config;

  if (!container) return;
  if (!Array.isArray(hotspots) || hotspots.length === 0) {
    container.innerHTML = '<p class="story-lead">Nenhum hotspot configurado.</p>';
    return;
  }

  let selectedId = hotspots[0].id;

  container.innerHTML = `
    <section class="demo-menu-layout" aria-label="Demonstração interativa do menu">
      <div class="demo-frame">
        <img src="${imageSrc}" alt="Tela mock de menu de atividades do InspFlow" class="demo-image" loading="lazy" decoding="async">
        <div class="demo-hotspot-layer" role="group" aria-label="Áreas interativas da tela"></div>
      </div>

      <aside class="demo-panel" aria-live="polite" aria-atomic="true">
        <p class="demo-panel-kicker">Explicação da área selecionada</p>
        <h3 class="demo-panel-title" id="demo-panel-title"></h3>
        <p class="demo-panel-body" id="demo-panel-body"></p>
        <p class="demo-panel-next" id="demo-panel-next"></p>
        <button type="button" class="btn btn-primary" id="demo-cta">${ctaLabel}</button>
      </aside>
    </section>
  `;

  const hotspotLayer = container.querySelector('.demo-hotspot-layer');
  const panelTitle = container.querySelector('#demo-panel-title');
  const panelBody = container.querySelector('#demo-panel-body');
  const panelNext = container.querySelector('#demo-panel-next');
  const ctaButton = container.querySelector('#demo-cta');

  function renderPanel(hotspot) {
    panelTitle.textContent = hotspot.title;
    panelBody.textContent = hotspot.body;

    if (hotspot.routeNext) {
      panelNext.textContent = `Próxima etapa sugerida: ${hotspot.routeNext}`;
      panelNext.hidden = false;
    } else {
      panelNext.textContent = '';
      panelNext.hidden = true;
    }
  }

  function updateActiveButton(clickedId) {
    const buttons = hotspotLayer.querySelectorAll('button[data-hotspot-id]');
    buttons.forEach((button) => {
      const isActive = button.dataset.hotspotId === clickedId;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function pulseButton(button) {
    if (!button) return;
    button.classList.remove('is-pulsing');
    void button.offsetWidth;
    button.classList.add('is-pulsing');
    window.setTimeout(() => button.classList.remove('is-pulsing'), 220);
  }

  function selectHotspot(hotspot, shouldPulse) {
    selectedId = hotspot.id;
    renderPanel(hotspot);
    updateActiveButton(hotspot.id);

    if (shouldPulse) {
      const button = hotspotLayer.querySelector(`[data-hotspot-id="${hotspot.id}"]`);
      pulseButton(button);
    }
  }

  hotspots.forEach((hotspot) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'demo-hotspot-btn';
    button.dataset.hotspotId = hotspot.id;
    button.setAttribute('aria-label', hotspot.ariaLabel || hotspot.title);
    button.setAttribute('aria-pressed', 'false');

    button.style.left = `${hotspot.x}%`;
    button.style.top = `${hotspot.y}%`;
    button.style.width = `${hotspot.w}%`;
    button.style.height = `${hotspot.h}%`;

    // Click cobre mouse e também Enter/Espaço no botão nativo.
    button.addEventListener('click', () => selectHotspot(hotspot, true));

    hotspotLayer.appendChild(button);
  });

  const firstHotspot = hotspots.find((item) => item.id === selectedId) || hotspots[0];
  selectHotspot(firstHotspot, false);

  ctaButton.addEventListener('click', () => {
    window.location.hash = ctaRoute;
  });
}
