// Componente reutilizável para fluxos operacionais (stepper/timeline).
// Conteúdo e estados vêm de JSON para manter a manutenção simples.

function statusLabel(status) {
  if (status === 'concluido') return 'Concluído';
  if (status === 'bloqueio') return 'Bloqueio';
  return 'Andamento';
}

function statusIcon(status) {
  if (status === 'concluido') return '✓';
  if (status === 'bloqueio') return '!';
  return '•';
}

export function renderFlowMap(container, flowData) {
  if (!container) return;

  const { titulo, descricao, layout, stages, cta } = flowData || {};
  if (!Array.isArray(stages) || stages.length === 0) {
    container.innerHTML = '<p class="story-lead">Fluxo sem etapas configuradas.</p>';
    return;
  }

  let selectedIndex = 0;

  container.innerHTML = `
    <section class="flow-map flow-map--${layout || 'stepper'}" aria-label="${titulo || 'Fluxo operacional'}">
      <header class="flow-map-header">
        <h2 class="flow-map-title">${titulo || 'Fluxo operacional'}</h2>
        <p class="flow-map-description">${descricao || ''}</p>
      </header>

      <div class="flow-map-layout">
        <div class="flow-track" role="group" aria-label="Etapas do fluxo"></div>

        <aside class="flow-panel" aria-live="polite" aria-atomic="true">
          <p class="flow-panel-kicker">Etapa selecionada</p>
          <h3 class="flow-panel-title" id="flow-panel-title"></h3>
          <p class="flow-panel-status" id="flow-panel-status"></p>
          <p class="flow-panel-resumo" id="flow-panel-resumo"></p>
          <p class="flow-panel-detalhes" id="flow-panel-detalhes"></p>
          <div class="flow-panel-trava-wrap" id="flow-panel-trava-wrap">
            <p class="flow-panel-trava-title">O que trava?</p>
            <p class="flow-panel-trava" id="flow-panel-trava"></p>
          </div>
          <div>
            <p class="flow-panel-criteria-title">Critérios desta etapa</p>
            <ul class="flow-panel-criteria" id="flow-panel-criteria"></ul>
          </div>
        </aside>
      </div>

      <footer class="flow-map-controls" aria-label="Controles internos do fluxo">
        <button type="button" class="btn" data-flow-action="prev">Etapa anterior</button>
        <button type="button" class="btn" data-flow-action="next">Próxima etapa</button>
        <button type="button" class="btn btn-primary" data-flow-action="cta">${cta?.label || 'Continuar'}</button>
      </footer>
    </section>
  `;

  const track = container.querySelector('.flow-track');
  const panelTitle = container.querySelector('#flow-panel-title');
  const panelStatus = container.querySelector('#flow-panel-status');
  const panelResumo = container.querySelector('#flow-panel-resumo');
  const panelDetalhes = container.querySelector('#flow-panel-detalhes');
  const panelTrava = container.querySelector('#flow-panel-trava');
  const panelTravaWrap = container.querySelector('#flow-panel-trava-wrap');
  const panelCriteria = container.querySelector('#flow-panel-criteria');
  const prevBtn = container.querySelector('[data-flow-action="prev"]');
  const nextBtn = container.querySelector('[data-flow-action="next"]');
  const ctaBtn = container.querySelector('[data-flow-action="cta"]');

  function pulseButton(button) {
    button.classList.remove('is-pulsing');
    void button.offsetWidth;
    button.classList.add('is-pulsing');
    window.setTimeout(() => button.classList.remove('is-pulsing'), 220);
  }

  function updateButtons() {
    const buttons = track.querySelectorAll('button[data-stage-index]');
    buttons.forEach((button, index) => {
      const isActive = index === selectedIndex;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    prevBtn.disabled = selectedIndex === 0;
    nextBtn.disabled = selectedIndex === stages.length - 1;
  }

  function renderPanel() {
    const stage = stages[selectedIndex];
    if (!stage) return;

    panelTitle.textContent = stage.label;
    panelStatus.textContent = `Status: ${statusLabel(stage.status)}`;
    panelStatus.dataset.status = stage.status;
    panelResumo.textContent = stage.resumo || '';
    panelDetalhes.textContent = stage.detalhes || '';

    if (stage.oQueTrava) {
      panelTrava.textContent = stage.oQueTrava;
      panelTravaWrap.hidden = false;
    } else {
      panelTrava.textContent = '';
      panelTravaWrap.hidden = true;
    }

    const criteria = Array.isArray(stage.criterios) ? stage.criterios : [];
    panelCriteria.innerHTML = criteria.map((item) => `<li>${item}</li>`).join('');
  }

  function selectStage(index, shouldPulse = false) {
    if (index < 0 || index >= stages.length) return;
    selectedIndex = index;
    updateButtons();
    renderPanel();

    if (shouldPulse) {
      const activeButton = track.querySelector(`button[data-stage-index="${index}"]`);
      if (activeButton) pulseButton(activeButton);
    }
  }

  track.innerHTML = stages
    .map((stage, index) => {
      return `
        <button
          type="button"
          class="flow-stage-btn"
          data-stage-index="${index}"
          aria-pressed="false"
          aria-label="Etapa ${stage.label}, status ${statusLabel(stage.status)}"
        >
          <span class="flow-stage-icon flow-stage-icon--${stage.status}" aria-hidden="true">${statusIcon(stage.status)}</span>
          <span class="flow-stage-text">
            <strong>${stage.label}</strong>
            <small>${statusLabel(stage.status)}</small>
          </span>
        </button>
      `;
    })
    .join('');

  track.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('button[data-stage-index]') : null;
    if (!button) return;
    const index = Number(button.dataset.stageIndex);
    selectStage(index, true);
  });

  prevBtn.addEventListener('click', () => selectStage(selectedIndex - 1, true));
  nextBtn.addEventListener('click', () => selectStage(selectedIndex + 1, true));
  ctaBtn.addEventListener('click', () => {
    if (cta?.route) {
      window.location.hash = cta.route;
    }
  });

  selectStage(0, false);
}
