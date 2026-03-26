// Renderizador reutilizável do painel de KPIs com filtros client-side.
// Tudo vem de JSON e atualiza instantaneamente sem backend.

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

function formatTTI(value) {
  return `${value.toFixed(1)} s`;
}

function formatINP(value) {
  return `${Math.round(value)} ms`;
}

function classifyMetric(metric, value) {
  if (metric === 'taxaAbertura') {
    if (value >= 80) return 'ok';
    if (value >= 65) return 'atencao';
    return 'bloqueio';
  }

  if (metric === 'ttiEstimado') {
    if (value <= 2.0) return 'ok';
    if (value <= 2.8) return 'atencao';
    return 'bloqueio';
  }

  if (metric === 'inpEstimado') {
    if (value <= 180) return 'ok';
    if (value <= 260) return 'atencao';
    return 'bloqueio';
  }

  return 'ok';
}

function aggregateData(records) {
  const base = {
    taxaAbertura: 0,
    sessoes: 0,
    ttiEstimado: 0,
    inpEstimado: 0,
    itensConcluidos: 0,
    itensComBloqueio: 0,
    gargalos: { aprovacao: 0, recurso: 0, qualidade: 0 },
  };

  if (!records.length) return base;

  let weightedTaxa = 0;
  let weightedTTI = 0;
  let weightedINP = 0;

  records.forEach((entry) => {
    const weight = entry.sessoes || 0;

    base.sessoes += entry.sessoes || 0;
    base.itensConcluidos += entry.itensConcluidos || 0;
    base.itensComBloqueio += entry.itensComBloqueio || 0;

    weightedTaxa += (entry.taxaAbertura || 0) * weight;
    weightedTTI += (entry.ttiEstimado || 0) * weight;
    weightedINP += (entry.inpEstimado || 0) * weight;

    const gargalos = entry.gargalos || {};
    base.gargalos.aprovacao += gargalos.aprovacao || 0;
    base.gargalos.recurso += gargalos.recurso || 0;
    base.gargalos.qualidade += gargalos.qualidade || 0;
  });

  const totalWeight = Math.max(base.sessoes, 1);
  base.taxaAbertura = weightedTaxa / totalWeight;
  base.ttiEstimado = weightedTTI / totalWeight;
  base.inpEstimado = weightedINP / totalWeight;

  return base;
}

function sortBottlenecks(gargalos) {
  return [
    { key: 'Aprovação pendente', value: gargalos.aprovacao || 0 },
    { key: 'Dependência de recurso', value: gargalos.recurso || 0 },
    { key: 'Ajuste de qualidade', value: gargalos.qualidade || 0 },
  ].sort((a, b) => b.value - a.value);
}

export function renderKpiPanel(container, kpiData) {
  if (!container) return;

  const filtros = kpiData?.filtros;
  const registros = kpiData?.registros || [];
  if (!filtros || !registros.length) {
    container.innerHTML = '<p class="story-lead">Sem dados de KPI para exibir.</p>';
    return;
  }

  const state = {
    periodo: filtros.periodo[0]?.id || 'hoje',
    area: filtros.area[0]?.id || 'todas',
    status: filtros.status[0]?.id || 'todos',
  };

  container.innerHTML = `
    <section class="kpi-panel" aria-label="Painel gerencial interativo">
      <header class="kpi-header">
        <h2 class="kpi-title">Painel gerencial de execução</h2>
        <p class="kpi-lead">Leitura rápida dos principais indicadores com filtros por período, área e status.</p>
      </header>

      <section class="kpi-filters" aria-label="Filtros do painel">
        <div class="kpi-filter-group" role="group" aria-label="Filtro de período">
          <span class="kpi-filter-label">Período</span>
          <div class="kpi-chip-row" id="kpi-filter-periodo"></div>
        </div>

        <div class="kpi-filter-group">
          <label class="kpi-filter-label" for="kpi-area-select">Área</label>
          <select id="kpi-area-select" class="kpi-select"></select>
        </div>

        <div class="kpi-filter-group" role="group" aria-label="Filtro de status">
          <span class="kpi-filter-label">Status</span>
          <div class="kpi-chip-row" id="kpi-filter-status"></div>
        </div>
      </section>

      <div id="kpi-live-region" class="sr-only" aria-live="polite" aria-atomic="true"></div>

      <section class="kpi-summary" aria-label="Resumo de indicadores">
        <article class="kpi-card">
          <h3>Taxa de abertura</h3>
          <p id="kpi-taxa-abertura" class="kpi-value">0%</p>
          <meter id="kpi-meter-taxa" min="0" max="100" value="0"></meter>
        </article>

        <article class="kpi-card">
          <h3>Sessões</h3>
          <p id="kpi-sessoes" class="kpi-value">0</p>
          <small>Total de sessões no recorte selecionado.</small>
        </article>

        <article class="kpi-card">
          <h3>TTI estimado</h3>
          <p id="kpi-tti" class="kpi-value">0.0 s</p>
          <meter id="kpi-meter-tti" min="0" max="4" value="0"></meter>
        </article>

        <article class="kpi-card">
          <h3>INP estimado</h3>
          <p id="kpi-inp" class="kpi-value">0 ms</p>
          <meter id="kpi-meter-inp" min="0" max="350" value="0"></meter>
        </article>

        <article class="kpi-card kpi-card--ok">
          <h3>Itens concluídos</h3>
          <p id="kpi-concluidos" class="kpi-value">0</p>
        </article>

        <article class="kpi-card kpi-card--bloqueio">
          <h3>Itens com bloqueio</h3>
          <p id="kpi-bloqueios" class="kpi-value">0</p>
        </article>
      </section>

      <section class="kpi-bottlenecks" aria-label="Gargalos operacionais">
        <h3 class="kpi-bottlenecks-title">Gargalos do período</h3>
        <ul id="kpi-bottlenecks-list" class="kpi-bottlenecks-list"></ul>
      </section>

      <footer class="kpi-footer">
        <button type="button" class="btn btn-primary" id="kpi-cta">Próximos passos</button>
      </footer>
    </section>
  `;

  const periodContainer = container.querySelector('#kpi-filter-periodo');
  const statusContainer = container.querySelector('#kpi-filter-status');
  const areaSelect = container.querySelector('#kpi-area-select');
  const liveRegion = container.querySelector('#kpi-live-region');

  const taxaEl = container.querySelector('#kpi-taxa-abertura');
  const sessoesEl = container.querySelector('#kpi-sessoes');
  const ttiEl = container.querySelector('#kpi-tti');
  const inpEl = container.querySelector('#kpi-inp');
  const concluidosEl = container.querySelector('#kpi-concluidos');
  const bloqueiosEl = container.querySelector('#kpi-bloqueios');

  const meterTaxa = container.querySelector('#kpi-meter-taxa');
  const meterTTI = container.querySelector('#kpi-meter-tti');
  const meterINP = container.querySelector('#kpi-meter-inp');
  const bottlenecksList = container.querySelector('#kpi-bottlenecks-list');
  const ctaButton = container.querySelector('#kpi-cta');

  function renderChipGroup(target, options, selectedId, keyName) {
    target.innerHTML = options
      .map((option) => {
        const isActive = option.id === selectedId;
        return `
          <button
            type="button"
            class="kpi-chip ${isActive ? 'is-active' : ''}"
            data-filter-key="${keyName}"
            data-filter-id="${option.id}"
            aria-pressed="${isActive}"
          >
            ${option.label}
          </button>
        `;
      })
      .join('');
  }

  function renderAreaOptions() {
    areaSelect.innerHTML = filtros.area
      .map((item) => `<option value="${item.id}">${item.label}</option>`)
      .join('');
    areaSelect.value = state.area;
  }

  function matchesFilters(entry) {
    if (entry.periodo !== state.periodo) return false;
    if (state.area !== 'todas' && entry.area !== state.area) return false;
    if (state.status !== 'todos' && entry.status !== state.status) return false;
    return true;
  }

  function updateMetersVisualState(data) {
    meterTaxa.value = data.taxaAbertura;
    meterTTI.value = data.ttiEstimado;
    meterINP.value = data.inpEstimado;

    meterTaxa.dataset.state = classifyMetric('taxaAbertura', data.taxaAbertura);
    meterTTI.dataset.state = classifyMetric('ttiEstimado', data.ttiEstimado);
    meterINP.dataset.state = classifyMetric('inpEstimado', data.inpEstimado);
  }

  function renderBottlenecks(gargalos) {
    const items = sortBottlenecks(gargalos);
    bottlenecksList.innerHTML = items
      .map((item) => `<li><span>${item.key}</span><strong>${formatNumber(item.value)}</strong></li>`)
      .join('');
  }

  function announceSummary(data) {
    liveRegion.textContent = `Resumo atualizado: ${formatPercent(data.taxaAbertura)} de taxa de abertura e ${formatNumber(data.sessoes)} sessões.`;
  }

  function updateDashboard() {
    const filtered = registros.filter(matchesFilters);
    const aggregated = aggregateData(filtered);

    taxaEl.textContent = formatPercent(aggregated.taxaAbertura);
    sessoesEl.textContent = formatNumber(aggregated.sessoes);
    ttiEl.textContent = formatTTI(aggregated.ttiEstimado);
    inpEl.textContent = formatINP(aggregated.inpEstimado);
    concluidosEl.textContent = formatNumber(aggregated.itensConcluidos);
    bloqueiosEl.textContent = formatNumber(aggregated.itensComBloqueio);

    updateMetersVisualState(aggregated);
    renderBottlenecks(aggregated.gargalos);
    announceSummary(aggregated);

    renderChipGroup(periodContainer, filtros.periodo, state.periodo, 'periodo');
    renderChipGroup(statusContainer, filtros.status, state.status, 'status');
    areaSelect.value = state.area;
  }

  periodContainer.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('button[data-filter-key="periodo"]') : null;
    if (!button) return;
    state.periodo = button.dataset.filterId;
    updateDashboard();
  });

  statusContainer.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('button[data-filter-key="status"]') : null;
    if (!button) return;
    state.status = button.dataset.filterId;
    updateDashboard();
  });

  areaSelect.addEventListener('change', () => {
    state.area = areaSelect.value;
    updateDashboard();
  });

  ctaButton.addEventListener('click', () => {
    window.location.hash = 'encerramento';
  });

  renderAreaOptions();
  updateDashboard();
}
