// Componente reutilizável para comparação SAP x InspFlow por cenário.
// Estrutura orientada a botões e filtros para navegação simples e acessível.

function statusLabel(status) {
  if (status === 'alinhado') return 'Alinhado';
  if (status === 'atencao') return 'Atenção';
  return 'Divergente';
}

function pulseElement(element) {
  if (!element) return;
  element.classList.remove('is-pulsing');
  void element.offsetWidth;
  element.classList.add('is-pulsing');
  window.setTimeout(() => element.classList.remove('is-pulsing'), 220);
}

function countByStatus(items) {
  return items.reduce(
    (acc, item) => {
      if (item.status === 'alinhado') acc.alinhado += 1;
      if (item.status === 'atencao') acc.atencao += 1;
      if (item.status === 'divergente') acc.divergente += 1;
      return acc;
    },
    { alinhado: 0, atencao: 0, divergente: 0 }
  );
}

export function renderPlannerCompare(container, compareData, scenariosData) {
  if (!container) return;

  const scenarios = scenariosData?.scenarios || [];
  const itemsByScenario = compareData?.itemsByScenario || {};
  const defaultScenario = scenariosData?.defaultScenario || scenarios[0]?.id;

  if (!scenarios.length) {
    container.innerHTML = '<p class="story-lead">Sem cenários para comparação.</p>';
    return;
  }

  const state = {
    scenario: defaultScenario,
    statusFilter: 'todos',
    selectedItemId: null,
  };

  container.innerHTML = `
    <section class="planner-compare" aria-label="Conciliação entre SAP e InspFlow">
      <header class="planner-head">
        <h2 class="planner-title">Reconciliação de planejamento SAP x InspFlow</h2>
        <p class="planner-lead">Compare cenário, identifique divergências e priorize decisões com impacto operacional visível.</p>
      </header>

      <div class="planner-controls">
        <div class="planner-control-group" role="group" aria-label="Seletor de cenário">
          <span class="planner-control-label">Cenário</span>
          <div id="planner-scenario-chips" class="planner-chip-row"></div>
        </div>

        <div class="planner-control-group" role="group" aria-label="Filtro de status">
          <span class="planner-control-label">Filtro rápido</span>
          <div id="planner-status-chips" class="planner-chip-row"></div>
        </div>
      </div>

      <div id="planner-summary-strip" class="planner-summary-strip" aria-live="polite"></div>

      <div class="planner-compare-head" aria-hidden="true">
        <span>Item</span>
        <span>Coluna SAP</span>
        <span>Coluna InspFlow</span>
      </div>

      <div id="planner-list" class="planner-list" role="list" aria-label="Itens de comparação"></div>

      <aside class="planner-detail" aria-live="polite" aria-atomic="true">
        <p class="planner-detail-kicker">Detalhes do item selecionado</p>
        <h3 id="planner-detail-title" class="planner-detail-title"></h3>
        <p id="planner-detail-meta" class="planner-detail-meta"></p>
        <p id="planner-detail-impact" class="planner-detail-impact"></p>

        <details class="planner-detail-box" open>
          <summary>Explicação</summary>
          <p id="planner-detail-explanation"></p>
        </details>

        <details class="planner-detail-box" open>
          <summary>Recomendação</summary>
          <p id="planner-detail-recommendation"></p>
        </details>
      </aside>

      <footer class="planner-footer">
        <button type="button" id="planner-cta" class="btn btn-primary">Ir para painel gerencial</button>
      </footer>
    </section>
  `;

  const scenarioChips = container.querySelector('#planner-scenario-chips');
  const statusChips = container.querySelector('#planner-status-chips');
  const summaryStrip = container.querySelector('#planner-summary-strip');
  const list = container.querySelector('#planner-list');

  const detailTitle = container.querySelector('#planner-detail-title');
  const detailMeta = container.querySelector('#planner-detail-meta');
  const detailImpact = container.querySelector('#planner-detail-impact');
  const detailExplanation = container.querySelector('#planner-detail-explanation');
  const detailRecommendation = container.querySelector('#planner-detail-recommendation');

  const ctaButton = container.querySelector('#planner-cta');

  const statusOptions = [
    { id: 'todos', label: 'Todos' },
    { id: 'alinhado', label: 'Alinhados' },
    { id: 'atencao', label: 'Atenção' },
    { id: 'divergente', label: 'Divergentes' },
  ];

  function getCurrentScenarioItems() {
    return itemsByScenario[state.scenario] || [];
  }

  function getFilteredItems() {
    const items = getCurrentScenarioItems();
    if (state.statusFilter === 'todos') return items;
    return items.filter((item) => item.status === state.statusFilter);
  }

  function ensureSelectedItem(filteredItems) {
    const found = filteredItems.some((item) => item.id === state.selectedItemId);
    if (!found) {
      state.selectedItemId = filteredItems[0]?.id || null;
    }
  }

  function renderChipGroup(target, options, selectedId, keyName) {
    target.innerHTML = options
      .map((option) => {
        const isActive = option.id === selectedId;
        return `
          <button
            type="button"
            class="planner-chip ${isActive ? 'is-active' : ''}"
            data-chip-key="${keyName}"
            data-chip-id="${option.id}"
            aria-pressed="${isActive}"
          >
            ${option.label}
          </button>
        `;
      })
      .join('');
  }

  function renderSummary(items) {
    const counts = countByStatus(items);
    summaryStrip.innerHTML = `
      <span class="planner-pill planner-pill--alinhado">Alinhados: <strong>${counts.alinhado}</strong></span>
      <span class="planner-pill planner-pill--atencao">Atenção: <strong>${counts.atencao}</strong></span>
      <span class="planner-pill planner-pill--divergente">Divergentes: <strong>${counts.divergente}</strong></span>
    `;
  }

  function renderDetails(item) {
    if (!item) {
      detailTitle.textContent = 'Nenhum item no filtro';
      detailMeta.textContent = '';
      detailImpact.textContent = 'Ajuste cenário ou status para continuar.';
      detailExplanation.textContent = '';
      detailRecommendation.textContent = '';
      return;
    }

    detailTitle.textContent = item.title;
    detailMeta.textContent = `${item.category} · ${statusLabel(item.status)}`;
    detailMeta.dataset.status = item.status;
    detailImpact.textContent = `Impacto: ${item.impact}`;
    detailExplanation.textContent = item.explanation;
    detailRecommendation.textContent = item.recommendation;
  }

  function renderList(filteredItems) {
    list.innerHTML = filteredItems
      .map((item) => {
        const isActive = item.id === state.selectedItemId;
        return `
          <button
            type="button"
            class="planner-row ${isActive ? 'is-active' : ''} planner-row--${item.status}"
            data-item-id="${item.id}"
            aria-pressed="${isActive}"
            role="listitem"
          >
            <span class="planner-cell planner-cell--title">
              <strong>${item.title}</strong>
              <small>${item.category}</small>
              <em class="planner-status planner-status--${item.status}">${statusLabel(item.status)}</em>
            </span>
            <span class="planner-cell planner-cell--sap">${item.sapValue}</span>
            <span class="planner-cell planner-cell--inspflow">${item.inspflowValue}</span>
          </button>
        `;
      })
      .join('');

    const selected = filteredItems.find((item) => item.id === state.selectedItemId);
    renderDetails(selected);
  }

  function refreshUI() {
    const scenarioItems = getCurrentScenarioItems();
    const filtered = getFilteredItems();

    ensureSelectedItem(filtered);

    renderChipGroup(scenarioChips, scenarios, state.scenario, 'scenario');
    renderChipGroup(statusChips, statusOptions, state.statusFilter, 'status');
    renderSummary(scenarioItems);
    renderList(filtered);
  }

  scenarioChips.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('button[data-chip-key="scenario"]') : null;
    if (!button) return;

    state.scenario = button.dataset.chipId;
    state.selectedItemId = null;
    pulseElement(button);
    refreshUI();
  });

  statusChips.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('button[data-chip-key="status"]') : null;
    if (!button) return;

    state.statusFilter = button.dataset.chipId;
    state.selectedItemId = null;
    pulseElement(button);
    refreshUI();
  });

  list.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('button[data-item-id]') : null;
    if (!button) return;

    state.selectedItemId = button.dataset.itemId;
    pulseElement(button);
    refreshUI();
  });

  ctaButton.addEventListener('click', () => {
    window.location.hash = 'painel-gerencial';
  });

  refreshUI();
}
