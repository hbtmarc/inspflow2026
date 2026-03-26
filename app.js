/* ═══════════════════════════════════════════════════
   InspFlow Revitalização — app.js
   Single-file SPA: state, a11y, components, router,
   presenter mode and service worker registration.
   ═══════════════════════════════════════════════════ */

/* ── State ──────────────────────────────────────── */
const state = { story: null, currentIndex: 0 };
function setStory(s) { state.story = s; }
function getScenes() { return state.story?.scenes ?? []; }
function getTotalScenes() { return getScenes().length; }
function setCurrentIndex(i) { state.currentIndex = i; }

/* ── Accessibility helpers ──────────────────────── */
const liveRegion = document.getElementById('sr-live');

function announce(msg) {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  setTimeout(() => { liveRegion.textContent = msg; }, 20);
}

function updateAriaCurrent(activeId) {
  document.querySelectorAll('[data-scene-link]').forEach((el) => {
    el.setAttribute('aria-current', String(el.getAttribute('href') === `#${activeId}`));
  });
}

/* ── Shared UI helpers ──────────────────────────── */
function pulse(el) {
  if (!el) return;
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
  setTimeout(() => el.classList.remove('pulse'), 200);
}

function renderChips(target, options, activeId, key) {
  target.innerHTML = options.map((o) => {
    const on = o.id === activeId;
    return `<button type="button" class="chip ${on ? 'active' : ''}" data-key="${key}" data-id="${o.id}" aria-pressed="${on}">${o.label}</button>`;
  }).join('');
}

function onChipClick(container, key, callback) {
  container.addEventListener('click', (e) => {
    const btn = e.target.closest(`button[data-key="${key}"]`);
    if (!btn) return;
    pulse(btn);
    callback(btn.dataset.id);
  });
}

function buildPlaceholderSVG(label) {
  return `<svg viewBox="0 0 640 360" role="img" aria-label="Visual ilustrativo: ${label}">
    <rect width="640" height="360" fill="#f0f2f6"/>
    <rect x="28" y="30" width="584" height="300" rx="16" fill="#fff" stroke="#dbe3f0"/>
    <rect x="54" y="64" width="200" height="14" rx="7" fill="#dbe7f5"/>
    <rect x="54" y="92" width="420" height="10" rx="5" fill="#eaf0f8"/>
    <rect x="54" y="112" width="380" height="10" rx="5" fill="#eaf0f8"/>
    <rect x="54" y="150" width="256" height="120" rx="12" fill="#f4f8fe" stroke="#e0e8f2"/>
    <rect x="326" y="150" width="256" height="120" rx="12" fill="#f4f8fe" stroke="#e0e8f2"/>
    <circle cx="72" cy="302" r="7" fill="#1a8754"/>
    <text x="88" y="307" fill="#475569" font-size="14" font-family="system-ui,sans-serif">${label}</text>
  </svg>`;
}

/* ═══════════════════════════════════════════════════
   Component: Clickable Demo
   ═══════════════════════════════════════════════════ */
function renderClickableDemo(el, hotspots) {
  if (!el || !hotspots?.length) return;
  let selectedId = hotspots[0].id;

  el.innerHTML = `
    <section class="demo-layout" aria-label="Demonstração interativa do menu">
      <div class="demo-frame">
        <img src="./assets/img/inspflow/menu-atividades.svg" alt="Tela mock do menu InspFlow" loading="lazy" decoding="async">
        <div class="demo-hotspot-layer" role="group" aria-label="Áreas interativas"></div>
      </div>
      <aside class="panel" aria-live="polite" aria-atomic="true">
        <p class="panel-kicker">Área selecionada</p>
        <h3 class="panel-title" id="dp-title"></h3>
        <p class="panel-body" id="dp-body"></p>
        <p class="panel-meta" id="dp-next" hidden></p>
        <button type="button" class="btn btn--primary" id="dp-cta">Simular jornada do operador</button>
      </aside>
    </section>`;

  const layer = el.querySelector('.demo-hotspot-layer');
  const pTitle = el.querySelector('#dp-title');
  const pBody = el.querySelector('#dp-body');
  const pNext = el.querySelector('#dp-next');
  const cta = el.querySelector('#dp-cta');

  function show(h) {
    pTitle.textContent = h.title;
    pBody.textContent = h.body;
    if (h.routeNext) { pNext.textContent = `Próxima etapa: ${h.routeNext}`; pNext.hidden = false; }
    else { pNext.textContent = ''; pNext.hidden = true; }
  }

  function activate(id) {
    selectedId = id;
    layer.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.id === id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    show(hotspots.find((h) => h.id === id) || hotspots[0]);
  }

  hotspots.forEach((h) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'demo-hotspot';
    b.dataset.id = h.id;
    b.setAttribute('aria-label', h.ariaLabel || h.title);
    b.setAttribute('aria-pressed', 'false');
    Object.assign(b.style, { left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` });
    b.addEventListener('click', () => { activate(h.id); pulse(b); });
    layer.appendChild(b);
  });

  activate(selectedId);
  cta.addEventListener('click', () => { location.hash = '#fluxo-inspecao'; });
}

/* ═══════════════════════════════════════════════════
   Component: Flow Map
   ═══════════════════════════════════════════════════ */
const flowStatusText = (s) => s === 'concluido' ? 'Concluído' : s === 'bloqueio' ? 'Bloqueio' : 'Andamento';
const flowStatusIcon = (s) => s === 'concluido' ? '✓' : s === 'bloqueio' ? '!' : '•';

function renderFlowMap(el, flowData) {
  if (!el) return;
  const { titulo, descricao, layout, stages, cta } = flowData || {};
  if (!stages?.length) { el.innerHTML = '<p class="lead">Fluxo sem etapas.</p>'; return; }
  let idx = 0;

  el.innerHTML = `
    <section class="flow flow--${layout || 'stepper'}" aria-label="${titulo}">
      <header class="flow-head">
        <h2 class="flow-title">${titulo}</h2>
        <p class="flow-desc">${descricao}</p>
      </header>
      <div class="flow-body">
        <div class="flow-track" role="group" aria-label="Etapas"></div>
        <aside class="panel" aria-live="polite" aria-atomic="true">
          <p class="panel-kicker">Etapa selecionada</p>
          <h3 class="panel-title" id="fp-title"></h3>
          <p class="panel-status" id="fp-status"></p>
          <p class="panel-body" id="fp-resumo"></p>
          <p class="panel-body" id="fp-det"></p>
          <div class="trava-box" id="fp-trava-box">
            <span class="filter-label">O que trava?</span>
            <p class="panel-body" id="fp-trava"></p>
          </div>
          <div>
            <span class="filter-label">Critérios</span>
            <ul class="panel-criteria" id="fp-crit"></ul>
          </div>
        </aside>
      </div>
      <footer class="flow-controls">
        <button type="button" class="btn" data-fa="prev">Anterior</button>
        <button type="button" class="btn" data-fa="next">Próxima</button>
        <button type="button" class="btn btn--primary" data-fa="cta">${cta?.label || 'Continuar'}</button>
      </footer>
    </section>`;

  const track = el.querySelector('.flow-track');
  const fpTitle = el.querySelector('#fp-title');
  const fpStatus = el.querySelector('#fp-status');
  const fpResumo = el.querySelector('#fp-resumo');
  const fpDet = el.querySelector('#fp-det');
  const fpTrava = el.querySelector('#fp-trava');
  const fpTravaBox = el.querySelector('#fp-trava-box');
  const fpCrit = el.querySelector('#fp-crit');
  const prevBtn = el.querySelector('[data-fa="prev"]');
  const nextBtn = el.querySelector('[data-fa="next"]');

  function showPanel() {
    const s = stages[idx];
    fpTitle.textContent = s.label;
    fpStatus.textContent = `Status: ${flowStatusText(s.status)}`;
    fpStatus.dataset.s = s.status;
    fpResumo.textContent = s.resumo || '';
    fpDet.textContent = s.detalhes || '';
    if (s.oQueTrava) { fpTrava.textContent = s.oQueTrava; fpTravaBox.hidden = false; }
    else { fpTrava.textContent = ''; fpTravaBox.hidden = true; }
    fpCrit.innerHTML = (s.criterios || []).map((c) => `<li>${c}</li>`).join('');
  }

  function select(i, doPulse) {
    if (i < 0 || i >= stages.length) return;
    idx = i;
    track.querySelectorAll('button').forEach((b, bi) => {
      b.classList.toggle('active', bi === idx);
      b.setAttribute('aria-pressed', String(bi === idx));
    });
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === stages.length - 1;
    showPanel();
    if (doPulse) pulse(track.querySelector(`[data-si="${idx}"]`));
  }

  track.innerHTML = stages.map((s, i) => `
    <button type="button" class="step" data-si="${i}" aria-pressed="false" aria-label="${s.label}, ${flowStatusText(s.status)}">
      <span class="step-icon step-icon--${s.status}" aria-hidden="true">${flowStatusIcon(s.status)}</span>
      <span class="step-text"><strong>${s.label}</strong><small>${flowStatusText(s.status)}</small></span>
    </button>`).join('');

  track.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-si]');
    if (b) select(Number(b.dataset.si), true);
  });

  prevBtn.addEventListener('click', () => select(idx - 1, true));
  nextBtn.addEventListener('click', () => select(idx + 1, true));
  el.querySelector('[data-fa="cta"]').addEventListener('click', () => { if (cta?.route) location.hash = cta.route; });
  select(0, false);
}

/* ═══════════════════════════════════════════════════
   Component: KPI Panel
   ═══════════════════════════════════════════════════ */
function classifyKpi(k, v) {
  if (k === 'taxaAbertura') return v >= 80 ? 'ok' : v >= 65 ? 'atencao' : 'bloqueio';
  if (k === 'ttiEstimado') return v <= 2 ? 'ok' : v <= 2.8 ? 'atencao' : 'bloqueio';
  if (k === 'inpEstimado') return v <= 180 ? 'ok' : v <= 260 ? 'atencao' : 'bloqueio';
  return 'ok';
}

function aggregateKpi(records) {
  const base = { taxaAbertura: 0, sessoes: 0, ttiEstimado: 0, inpEstimado: 0, itensConcluidos: 0, itensComBloqueio: 0, gargalos: { aprovacao: 0, recurso: 0, qualidade: 0 } };
  if (!records.length) return base;
  let wT = 0, wTTI = 0, wINP = 0;
  records.forEach((r) => {
    const w = r.sessoes || 0;
    base.sessoes += w;
    base.itensConcluidos += r.itensConcluidos || 0;
    base.itensComBloqueio += r.itensComBloqueio || 0;
    wT += (r.taxaAbertura || 0) * w;
    wTTI += (r.ttiEstimado || 0) * w;
    wINP += (r.inpEstimado || 0) * w;
    const g = r.gargalos || {};
    base.gargalos.aprovacao += g.aprovacao || 0;
    base.gargalos.recurso += g.recurso || 0;
    base.gargalos.qualidade += g.qualidade || 0;
  });
  const tw = Math.max(base.sessoes, 1);
  base.taxaAbertura = wT / tw;
  base.ttiEstimado = wTTI / tw;
  base.inpEstimado = wINP / tw;
  return base;
}

const fmtPct = (v) => `${Math.round(v)}%`;
const fmtNum = (v) => new Intl.NumberFormat('pt-BR').format(Math.round(v));
const fmtTTI = (v) => `${v.toFixed(1)} s`;
const fmtINP = (v) => `${Math.round(v)} ms`;

function renderKpiPanel(el, kpis) {
  if (!el) return;
  const filtros = kpis?.filtros;
  const registros = kpis?.registros || [];
  if (!filtros || !registros.length) { el.innerHTML = '<p class="lead">Sem dados de KPI.</p>'; return; }
  const f = { periodo: filtros.periodo[0]?.id, area: filtros.area[0]?.id, status: filtros.status[0]?.id };

  el.innerHTML = `
    <section class="kpi" aria-label="Painel gerencial">
      <header class="et-head">
        <h2 class="et-title">Painel gerencial de execução</h2>
        <p class="et-lead">Indicadores com filtros por período, área e status.</p>
      </header>
      <div class="filters filters--wide">
        <div class="filter-group" role="group" aria-label="Período">
          <span class="filter-label">Período</span>
          <div class="chip-row" id="kf-per"></div>
        </div>
        <div class="filter-group">
          <label class="filter-label" for="kf-area">Área</label>
          <select id="kf-area" class="filter-input"></select>
        </div>
        <div class="filter-group" role="group" aria-label="Status">
          <span class="filter-label">Status</span>
          <div class="chip-row" id="kf-st"></div>
        </div>
      </div>
      <div id="kf-sr" class="sr-only" aria-live="polite" aria-atomic="true"></div>
      <section class="kpi-grid" aria-label="Indicadores">
        <article class="kpi-card"><h3>Taxa de abertura</h3><p class="kpi-value" id="kv-taxa">0%</p><meter id="km-taxa" min="0" max="100" value="0"></meter></article>
        <article class="kpi-card"><h3>Sessões</h3><p class="kpi-value" id="kv-sess">0</p><small>Total no recorte.</small></article>
        <article class="kpi-card"><h3>TTI estimado</h3><p class="kpi-value" id="kv-tti">0.0 s</p><meter id="km-tti" min="0" max="4" value="0"></meter></article>
        <article class="kpi-card"><h3>INP estimado</h3><p class="kpi-value" id="kv-inp">0 ms</p><meter id="km-inp" min="0" max="350" value="0"></meter></article>
        <article class="kpi-card kpi-card--ok"><h3>Itens concluídos</h3><p class="kpi-value" id="kv-ok">0</p></article>
        <article class="kpi-card kpi-card--bloqueio"><h3>Itens com bloqueio</h3><p class="kpi-value" id="kv-bl">0</p></article>
      </section>
      <section class="bottlenecks" aria-label="Gargalos">
        <h3>Gargalos do período</h3>
        <ul class="bottleneck-list" id="kv-gar"></ul>
      </section>
      <footer class="section-footer"><button type="button" class="btn btn--primary" id="kpi-cta">Próximos passos</button></footer>
    </section>`;

  const perC = el.querySelector('#kf-per'), stC = el.querySelector('#kf-st'), areaS = el.querySelector('#kf-area');
  const sr = el.querySelector('#kf-sr');
  const eTaxa = el.querySelector('#kv-taxa'), eSess = el.querySelector('#kv-sess'), eTTI = el.querySelector('#kv-tti');
  const eINP = el.querySelector('#kv-inp'), eOk = el.querySelector('#kv-ok'), eBl = el.querySelector('#kv-bl');
  const mT = el.querySelector('#km-taxa'), mTTI = el.querySelector('#km-tti'), mINP = el.querySelector('#km-inp');
  const garList = el.querySelector('#kv-gar');

  areaS.innerHTML = filtros.area.map((a) => `<option value="${a.id}">${a.label}</option>`).join('');
  areaS.value = f.area;

  function refresh() {
    const filtered = registros.filter((r) => r.periodo === f.periodo && (f.area === 'todas' || r.area === f.area) && (f.status === 'todos' || r.status === f.status));
    const d = aggregateKpi(filtered);
    eTaxa.textContent = fmtPct(d.taxaAbertura); eSess.textContent = fmtNum(d.sessoes);
    eTTI.textContent = fmtTTI(d.ttiEstimado); eINP.textContent = fmtINP(d.inpEstimado);
    eOk.textContent = fmtNum(d.itensConcluidos); eBl.textContent = fmtNum(d.itensComBloqueio);
    mT.value = d.taxaAbertura; mT.dataset.state = classifyKpi('taxaAbertura', d.taxaAbertura);
    mTTI.value = d.ttiEstimado; mTTI.dataset.state = classifyKpi('ttiEstimado', d.ttiEstimado);
    mINP.value = d.inpEstimado; mINP.dataset.state = classifyKpi('inpEstimado', d.inpEstimado);
    const gar = [{ k: 'Aprovação pendente', v: d.gargalos.aprovacao }, { k: 'Dependência de recurso', v: d.gargalos.recurso }, { k: 'Ajuste de qualidade', v: d.gargalos.qualidade }].sort((a, b) => b.v - a.v);
    garList.innerHTML = gar.map((g) => `<li><span>${g.k}</span><strong>${fmtNum(g.v)}</strong></li>`).join('');
    sr.textContent = `Resumo: ${fmtPct(d.taxaAbertura)} de taxa, ${fmtNum(d.sessoes)} sessões.`;
    renderChips(perC, filtros.periodo, f.periodo, 'per');
    renderChips(stC, filtros.status, f.status, 'st');
    areaS.value = f.area;
  }

  onChipClick(perC, 'per', (id) => { f.periodo = id; refresh(); });
  onChipClick(stC, 'st', (id) => { f.status = id; refresh(); });
  areaS.addEventListener('change', () => { f.area = areaS.value; refresh(); });
  el.querySelector('#kpi-cta').addEventListener('click', () => { location.hash = 'encerramento'; });
  refresh();
}

/* ═══════════════════════════════════════════════════
   Component: Equipment & Team
   ═══════════════════════════════════════════════════ */
const etStatusLabel = (s) => s === 'operacional' ? 'Operacional' : s === 'atencao' ? 'Atenção' : 'Bloqueado';
const etStatusClass = (s) => s === 'operacional' ? 'ok' : s === 'atencao' ? 'warn' : 'error';

function renderEquipTeam(el, equipment, team) {
  if (!el) return;
  const eqList = equipment?.equipamentos || [];
  const tmList = team?.members || [];
  const typeOpts = equipment?.tipos || [];
  const statusOpts = equipment?.status || [];
  const roleOpts = team?.roles || [];
  if (!eqList.length || !tmList.length) { el.innerHTML = '<p class="lead">Sem dados.</p>'; return; }
  const roleMap = new Map(roleOpts.map((r) => [r.id, r.label]));
  const rl = (id) => roleMap.get(id) || id;

  const s = { type: typeOpts[0]?.id, status: statusOpts[0]?.id, search: '', sort: 'progresso-desc', eqId: eqList[0].id, role: roleOpts[0]?.id, memId: tmList[0].id };

  el.innerHTML = `
    <section class="et" aria-label="Equipamentos e equipe">
      <section class="et-section" aria-labelledby="eq-t">
        <header class="et-head"><h2 id="eq-t" class="et-title">Equipamentos</h2><p class="et-lead">Filtre e priorize ativos antes de distribuir atividades.</p></header>
        <div class="filters filters--2col">
          <div class="filter-group" role="group" aria-label="Tipo"><span class="filter-label">Tipo</span><div class="chip-row" id="eq-tc"></div></div>
          <div class="filter-group" role="group" aria-label="Status"><span class="filter-label">Status</span><div class="chip-row" id="eq-sc"></div></div>
          <div class="filter-group"><label class="filter-label" for="eq-search">Busca</label><input id="eq-search" class="filter-input" type="search" placeholder="TAG ou nome" autocomplete="off"></div>
          <div class="filter-group"><label class="filter-label" for="eq-sort">Ordenar</label><select id="eq-sort" class="filter-input"><option value="progresso-desc">Maior progresso</option><option value="progresso-asc">Menor progresso</option><option value="tag-asc">TAG (A-Z)</option><option value="status">Status</option></select></div>
        </div>
        <div class="et-layout">
          <div class="et-card-list" id="eq-list" role="list"></div>
          <aside class="panel" aria-live="polite" aria-atomic="true">
            <p class="panel-kicker">Selecionado</p>
            <h3 class="panel-title" id="eq-sTitle"></h3>
            <p class="panel-meta" id="eq-sMeta"></p>
            <p class="panel-body" id="eq-sDesc"></p>
            <p class="panel-body" id="eq-sScope"></p>
            <button id="eq-toTeam" type="button" class="btn">Ir para Equipe</button>
          </aside>
        </div>
      </section>
      <section class="et-section" id="team-section" aria-labelledby="tm-t">
        <header class="et-head"><h2 id="tm-t" class="et-title">Equipe</h2><p class="et-lead">Selecione função e membro para entender responsabilidades.</p></header>
        <div class="filter-group" role="group" aria-label="Função"><span class="filter-label">Função</span><div class="chip-row" id="tm-rc"></div></div>
        <div class="et-layout">
          <div class="et-member-list" id="tm-list" role="list"></div>
          <aside class="panel" aria-live="polite" aria-atomic="true">
            <p class="panel-kicker">Membro</p>
            <h3 class="panel-title" id="tm-name"></h3>
            <p class="panel-meta" id="tm-role"></p>
            <p class="panel-body" id="tm-scope"></p>
            <ul class="team-resp" id="tm-resp"></ul>
          </aside>
        </div>
        <footer class="section-footer"><button id="et-cta" type="button" class="btn btn--primary">Seguir para visão do planejador</button></footer>
      </section>
    </section>`;

  const tcC = el.querySelector('#eq-tc'), scC = el.querySelector('#eq-sc');
  const searchI = el.querySelector('#eq-search'), sortS = el.querySelector('#eq-sort');
  const cardList = el.querySelector('#eq-list');
  const eqSTitle = el.querySelector('#eq-sTitle'), eqSMeta = el.querySelector('#eq-sMeta');
  const eqSDesc = el.querySelector('#eq-sDesc'), eqSScope = el.querySelector('#eq-sScope');
  const rcC = el.querySelector('#tm-rc'), memList = el.querySelector('#tm-list');
  const tmName = el.querySelector('#tm-name'), tmRole = el.querySelector('#tm-role');
  const tmScope = el.querySelector('#tm-scope'), tmResp = el.querySelector('#tm-resp');

  function filterEq() {
    let items = eqList.filter((i) => {
      if (s.type !== 'todos' && i.tipo !== s.type) return false;
      if (s.status !== 'todos' && i.status !== s.status) return false;
      const q = s.search.trim().toLowerCase();
      return !q || i.tag.toLowerCase().includes(q) || i.nome.toLowerCase().includes(q);
    });
    return [...items].sort((a, b) => {
      if (s.sort === 'progresso-asc') return a.progresso - b.progresso;
      if (s.sort === 'tag-asc') return a.tag.localeCompare(b.tag, 'pt-BR');
      if (s.sort === 'status') return etStatusLabel(a.status).localeCompare(etStatusLabel(b.status), 'pt-BR');
      return b.progresso - a.progresso;
    });
  }

  function showEqDetail(eq) {
    if (!eq) { eqSTitle.textContent = 'Nenhum'; eqSMeta.textContent = ''; eqSDesc.textContent = 'Ajuste filtros.'; eqSScope.textContent = ''; return; }
    eqSTitle.textContent = `${eq.tag} · ${eq.nome}`;
    eqSMeta.textContent = `${etStatusLabel(eq.status)} · ${rl(eq.papelResponsavel)}`;
    eqSDesc.textContent = eq.resumo;
    eqSScope.textContent = `Escopo: ${eq.escopo}`;
  }

  function renderEq() {
    const filtered = filterEq();
    if (!filtered.some((i) => i.id === s.eqId)) s.eqId = filtered[0]?.id || null;
    cardList.innerHTML = filtered.map((i) => {
      const on = i.id === s.eqId;
      return `<button type="button" class="item ${on ? 'active' : ''}" data-eid="${i.id}" aria-pressed="${on}" role="listitem">
        <div class="et-card-head"><strong>${i.tag}</strong><span class="badge badge--${etStatusClass(i.status)}">${etStatusLabel(i.status)}</span></div>
        <p class="et-name">${i.nome}</p><p class="et-meta">${i.tipo} · ${rl(i.papelResponsavel)}</p>
        <div class="et-progress"><meter min="0" max="100" value="${i.progresso}"></meter><span>${i.progresso}%</span></div>
      </button>`;
    }).join('');
    showEqDetail(filtered.find((i) => i.id === s.eqId));
  }

  function showTmDetail(m) {
    if (!m) { tmName.textContent = 'Nenhum'; tmRole.textContent = ''; tmScope.textContent = ''; tmResp.innerHTML = ''; return; }
    tmName.textContent = m.nome; tmRole.textContent = rl(m.role);
    tmScope.textContent = m.escopo;
    tmResp.innerHTML = (m.responsabilidades || []).map((r) => `<li>${r}</li>`).join('');
  }

  function renderTm() {
    const filtered = tmList.filter((m) => s.role === 'todos' || m.role === s.role);
    if (!filtered.some((m) => m.id === s.memId)) s.memId = filtered[0]?.id || null;
    memList.innerHTML = filtered.map((m) => {
      const on = m.id === s.memId;
      return `<button type="button" class="item ${on ? 'active' : ''}" data-mid="${m.id}" aria-pressed="${on}" role="listitem"><strong>${m.nome}</strong><small style="color:var(--muted)">${rl(m.role)}</small></button>`;
    }).join('');
    showTmDetail(filtered.find((m) => m.id === s.memId));
  }

  function updateEqUI() { renderChips(tcC, typeOpts, s.type, 'eqt'); renderChips(scC, statusOpts, s.status, 'eqs'); sortS.value = s.sort; renderEq(); }
  function updateTmUI() { renderChips(rcC, roleOpts, s.role, 'tmr'); renderTm(); }

  onChipClick(tcC, 'eqt', (id) => { s.type = id; updateEqUI(); });
  onChipClick(scC, 'eqs', (id) => { s.status = id; updateEqUI(); });
  searchI.addEventListener('input', () => { s.search = searchI.value; renderEq(); });
  sortS.addEventListener('change', () => { s.sort = sortS.value; renderEq(); });
  cardList.addEventListener('click', (e) => { const b = e.target.closest('[data-eid]'); if (b) { s.eqId = b.dataset.eid; pulse(b); renderEq(); } });
  onChipClick(rcC, 'tmr', (id) => { s.role = id; updateTmUI(); });
  memList.addEventListener('click', (e) => { const b = e.target.closest('[data-mid]'); if (b) { s.memId = b.dataset.mid; pulse(b); renderTm(); } });
  el.querySelector('#eq-toTeam').addEventListener('click', () => document.getElementById('team-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  el.querySelector('#et-cta').addEventListener('click', () => { location.hash = 'visao-planejador'; });
  updateEqUI(); updateTmUI();
}

/* ═══════════════════════════════════════════════════
   Component: Planner Compare
   ═══════════════════════════════════════════════════ */
const planStatus = (s) => s === 'alinhado' ? 'Alinhado' : s === 'atencao' ? 'Atenção' : 'Divergente';
const planBadge = (s) => s === 'alinhado' ? 'ok' : s === 'atencao' ? 'warn' : 'error';
const planRowCls = (s) => s === 'alinhado' ? 'ok' : s === 'atencao' ? 'warn' : 'err';

function renderPlannerCompare(el, planner) {
  if (!el) return;
  const scenarios = planner?.scenarios || [];
  const byScenario = planner?.itemsByScenario || {};
  const defS = planner?.defaultScenario || scenarios[0]?.id;
  if (!scenarios.length) { el.innerHTML = '<p class="lead">Sem cenários.</p>'; return; }

  const statusOpts = [{ id: 'todos', label: 'Todos' }, { id: 'alinhado', label: 'Alinhados' }, { id: 'atencao', label: 'Atenção' }, { id: 'divergente', label: 'Divergentes' }];
  const f = { scenario: defS, status: 'todos', selId: null };

  el.innerHTML = `
    <section class="plan" aria-label="Reconciliação SAP x InspFlow">
      <header class="plan-head">
        <h2 class="plan-title">Reconciliação SAP x InspFlow</h2>
        <p class="plan-lead">Compare cenário, identifique divergências e priorize decisões.</p>
      </header>
      <div class="filters filters--2col">
        <div class="filter-group" role="group" aria-label="Cenário"><span class="filter-label">Cenário</span><div class="chip-row" id="pl-sc"></div></div>
        <div class="filter-group" role="group" aria-label="Filtro"><span class="filter-label">Filtro</span><div class="chip-row" id="pl-st"></div></div>
      </div>
      <div class="pill-strip" id="pl-pills" aria-live="polite"></div>
      <div class="plan-col-head" aria-hidden="true"><span>Item</span><span>SAP</span><span>InspFlow</span></div>
      <div class="plan-list" id="pl-list" role="list"></div>
      <aside class="panel" aria-live="polite" aria-atomic="true">
        <p class="panel-kicker">Detalhe</p>
        <h3 class="panel-title" id="pl-dTitle"></h3>
        <p class="panel-meta" id="pl-dMeta"></p>
        <p class="panel-body" id="pl-dImpact"></p>
        <details class="plan-detail-box" open><summary>Explicação</summary><p id="pl-dExpl"></p></details>
        <details class="plan-detail-box" open><summary>Recomendação</summary><p id="pl-dRec"></p></details>
      </aside>
      <footer class="section-footer"><button type="button" class="btn btn--primary" id="pl-cta">Ir para painel gerencial</button></footer>
    </section>`;

  const scC = el.querySelector('#pl-sc'), stC = el.querySelector('#pl-st');
  const pills = el.querySelector('#pl-pills'), list = el.querySelector('#pl-list');
  const dTitle = el.querySelector('#pl-dTitle'), dMeta = el.querySelector('#pl-dMeta');
  const dImpact = el.querySelector('#pl-dImpact'), dExpl = el.querySelector('#pl-dExpl'), dRec = el.querySelector('#pl-dRec');

  function items() { return byScenario[f.scenario] || []; }
  function filtered() { const all = items(); return f.status === 'todos' ? all : all.filter((i) => i.status === f.status); }

  function showDetail(item) {
    if (!item) { dTitle.textContent = 'Nenhum'; dMeta.textContent = ''; dImpact.textContent = ''; dExpl.textContent = ''; dRec.textContent = ''; return; }
    dTitle.textContent = item.title;
    dMeta.textContent = `${item.category} · ${planStatus(item.status)}`;
    dMeta.dataset.status = item.status;
    dImpact.textContent = `Impacto: ${item.impact}`;
    dExpl.textContent = item.explanation;
    dRec.textContent = item.recommendation;
  }

  function refresh() {
    const all = items(), fi = filtered();
    if (!fi.some((i) => i.id === f.selId)) f.selId = fi[0]?.id || null;
    renderChips(scC, scenarios, f.scenario, 'pls');
    renderChips(stC, statusOpts, f.status, 'plf');
    const cnt = all.reduce((a, i) => { a[i.status] = (a[i.status] || 0) + 1; return a; }, {});
    pills.innerHTML = `<span class="pill pill--ok">Alinhados: <strong>${cnt.alinhado || 0}</strong></span><span class="pill pill--warn">Atenção: <strong>${cnt.atencao || 0}</strong></span><span class="pill pill--err">Divergentes: <strong>${cnt.divergente || 0}</strong></span>`;
    list.innerHTML = fi.map((i) => {
      const on = i.id === f.selId;
      return `<button type="button" class="plan-row ${on ? 'active' : ''} plan-row--${planRowCls(i.status)}" data-pid="${i.id}" aria-pressed="${on}" role="listitem">
        <span class="plan-cell"><strong>${i.title}</strong><small>${i.category}</small><span class="badge badge--${planBadge(i.status)}">${planStatus(i.status)}</span></span>
        <span class="plan-cell plan-cell--side">${i.sapValue}</span>
        <span class="plan-cell plan-cell--side">${i.inspflowValue}</span>
      </button>`;
    }).join('');
    showDetail(fi.find((i) => i.id === f.selId));
  }

  onChipClick(scC, 'pls', (id) => { f.scenario = id; f.selId = null; refresh(); });
  onChipClick(stC, 'plf', (id) => { f.status = id; f.selId = null; refresh(); });
  list.addEventListener('click', (e) => { const b = e.target.closest('[data-pid]'); if (b) { f.selId = b.dataset.pid; pulse(b); refresh(); } });
  el.querySelector('#pl-cta').addEventListener('click', () => { location.hash = 'painel-gerencial'; });
  refresh();
}

/* ═══════════════════════════════════════════════════
   Component: Closing Scene
   ═══════════════════════════════════════════════════ */
const stepLabel = (s) => s === 'em andamento' ? 'Em andamento' : s === 'próximo' ? 'Próximo' : 'Planejado';

function renderClosingScene(el, closing) {
  if (!el) return;
  const tk = closing?.takeaways || [];
  const ops = closing?.ganhosOperacionais || [];
  const ger = closing?.ganhosGerenciais || [];
  const next = closing?.proximosPassos || [];
  const checks = closing?.checklistApresentacao || [];
  if (!tk.length) { el.innerHTML = '<p class="lead">Sem dados.</p>'; return; }

  const s = { selId: tk[0].id };

  el.innerHTML = `
    <section class="close" aria-label="Encerramento">
      <header class="close-header">
        <h2 class="close-title">${closing.mensagemFinal?.titulo || 'Encerramento'}</h2>
        <p class="close-lead">${closing.mensagemFinal?.subtitulo || ''}</p>
      </header>
      <section class="value-grid" aria-label="Resumo de valor">
        <article class="value-card"><h3>Ganhos operacionais</h3><ul>${ops.map((i) => `<li>${i}</li>`).join('')}</ul></article>
        <article class="value-card"><h3>Ganhos gerenciais</h3><ul>${ger.map((i) => `<li>${i}</li>`).join('')}</ul></article>
        <article class="value-card value-card--highlight"><h3>Status</h3><p class="close-ready-title">Pronto para apresentação executiva</p><p class="close-ready-body">Narrativa interativa consolidada com fluxo ponta a ponta.</p></article>
      </section>
      <section class="takeaways" aria-label="Takeaways">
        <div>
          <h3 style="margin:0 0 .75rem;font-size:1rem;font-weight:700">3 mensagens-chave</h3>
          <div class="takeaway-cards" id="cl-cards"></div>
        </div>
        <aside class="panel" aria-live="polite" aria-atomic="true">
          <p class="panel-kicker">Detalhe</p>
          <h4 class="panel-title" id="cl-dTitle"></h4>
          <p class="panel-meta" id="cl-dSum"></p>
          <p class="panel-body" id="cl-dBody"></p>
        </aside>
      </section>
      <section class="next-steps" aria-label="Próximos passos">
        <h3>Próximos passos</h3>
        <ol class="next-steps-list">${next.map((n) => `<li class="next-step-item"><p class="next-step-head"><strong>${n.title}</strong><span class="step-status">${stepLabel(n.status)}</span></p><p>${n.description}</p></li>`).join('')}</ol>
      </section>
      <section class="checklist" aria-label="Checklist">
        <h3>Checklist de apresentação</h3>
        ${checks.map((c) => `<details><summary>${c.title}</summary><p>${c.summary}</p><p>${c.content}</p></details>`).join('')}
      </section>
      <footer class="close-footer">
        <button type="button" class="btn" id="cl-home">Voltar ao início</button>
        <button type="button" class="btn btn--primary" id="cl-pres">Abrir modo apresentador</button>
      </footer>
    </section>`;

  const cards = el.querySelector('#cl-cards');
  const dTitle = el.querySelector('#cl-dTitle'), dSum = el.querySelector('#cl-dSum'), dBody = el.querySelector('#cl-dBody');

  function renderCards() {
    cards.innerHTML = tk.map((t) => {
      const on = t.id === s.selId;
      return `<button type="button" class="takeaway-card ${on ? 'active' : ''}" data-tid="${t.id}" aria-pressed="${on}"><strong>${t.title}</strong><span>${t.summary}</span></button>`;
    }).join('');
    const sel = tk.find((t) => t.id === s.selId);
    if (sel) { dTitle.textContent = sel.title; dSum.textContent = sel.summary; dBody.textContent = sel.detail; }
  }

  cards.addEventListener('click', (e) => { const b = e.target.closest('[data-tid]'); if (b) { s.selId = b.dataset.tid; pulse(b); renderCards(); } });
  el.querySelector('#cl-home').addEventListener('click', () => { location.hash = 'home'; });
  el.querySelector('#cl-pres').addEventListener('click', () => { location.href = `${location.pathname}?presenter=1#encerramento`; });
  renderCards();
}

/* ═══════════════════════════════════════════════════
   Router
   ═══════════════════════════════════════════════════ */
const sceneRoot = document.getElementById('main');
const progressBar = document.getElementById('progress-bar');
const statusLabel = document.getElementById('status-label');
const sceneChangeListeners = new Set();

function renderDefaultScene(scene) {
  sceneRoot.innerHTML = `
    <article class="card" aria-labelledby="st">
      <div class="hero">
        <p class="kicker">${scene.kicker}</p>
        <h1 id="st" class="scene-title">${scene.titulo}</h1>
        <p class="lead">${scene.lead}</p>
      </div>
      ${scene.pontos?.length ? `
      <div class="story-layout">
        <ul class="points">${scene.pontos.map((p) => `<li>${p}</li>`).join('')}</ul>
        <figure class="placeholder" aria-label="Bloco visual">${buildPlaceholderSVG(scene.placeholder)}</figure>
      </div>` : `
      <figure class="placeholder" aria-label="Bloco visual">${buildPlaceholderSVG(scene.placeholder)}</figure>`}
    </article>`;
}

function sceneShell(scene) {
  sceneRoot.innerHTML = `
    <article class="card" aria-labelledby="st">
      <div class="hero">
        <p class="kicker">${scene.kicker}</p>
        <h1 id="st" class="scene-title">${scene.titulo}</h1>
        <p class="lead">${scene.lead}</p>
      </div>
      <div id="scene-component"></div>
    </article>`;
  return document.getElementById('scene-component');
}

function updateChrome(scene, index) {
  const total = getTotalScenes();
  progressBar.style.width = `${((index + 1) / total) * 100}%`;
  statusLabel.textContent = `Cena ${index + 1} de ${total}`;
  updateAriaCurrent(scene.id);
  announce(`Cena ${index + 1}: ${scene.titulo}`);
  sceneChangeListeners.forEach((fn) => fn({ scene, index, total }));
}

async function renderScene(scene, index) {
  const data = state.story;
  if (scene.id === 'demo-menu') {
    const target = sceneShell(scene);
    renderClickableDemo(target, data.demoHotspots);
  } else if (scene.id === 'fluxo-inspecao') {
    const target = sceneShell(scene);
    renderFlowMap(target, data.flows.inspecao);
  } else if (scene.id === 'fluxo-end') {
    const target = sceneShell(scene);
    renderFlowMap(target, data.flows.end);
  } else if (scene.id === 'equipamentos-equipe') {
    const target = sceneShell(scene);
    renderEquipTeam(target, data.equipment, data.team);
  } else if (scene.id === 'visao-planejador') {
    const target = sceneShell(scene);
    renderPlannerCompare(target, data.planner);
  } else if (scene.id === 'painel-gerencial') {
    const target = sceneShell(scene);
    renderKpiPanel(target, data.kpis);
  } else if (scene.id === 'encerramento') {
    const target = sceneShell(scene);
    renderClosingScene(target, data.closing);
  } else {
    renderDefaultScene(scene);
  }
  updateChrome(scene, index);
}

function getHashId() { return (location.hash.replace('#', '').trim()) || 'home'; }

function goToSceneByIndex(index) {
  const scenes = getScenes();
  if (!scenes.length) return;
  const safe = Math.min(Math.max(index, 0), scenes.length - 1);
  const scene = scenes[safe];
  if (!scene) return;
  if (location.hash !== `#${scene.id}`) { location.hash = scene.id; return; }
  setCurrentIndex(safe);
  renderScene(scene, safe);
}

function goToSceneById(id) {
  const i = getScenes().findIndex((s) => s.id === id);
  if (i !== -1) goToSceneByIndex(i);
}

function goToNextScene() {
  const scenes = getScenes();
  const i = scenes.findIndex((s) => s.id === getHashId());
  goToSceneByIndex(i < scenes.length - 1 ? i + 1 : scenes.length - 1);
}

function goToPreviousScene() {
  const scenes = getScenes();
  const i = scenes.findIndex((s) => s.id === getHashId());
  goToSceneByIndex(i > 0 ? i - 1 : 0);
}

function syncRoute() {
  const scenes = getScenes();
  if (!scenes.length) return;
  const id = getHashId();
  const i = scenes.findIndex((s) => s.id === id);
  if (i === -1) { location.hash = 'home'; return; }
  setCurrentIndex(i);
  renderScene(scenes[i], i);
}

function buildSceneNav() {
  const nav = document.getElementById('scene-nav');
  nav.innerHTML = getScenes().map((s) =>
    `<a data-scene-link href="#${s.id}" aria-current="false">${s.rotulo}</a>`
  ).join('');
}

function subscribeSceneChange(fn) {
  sceneChangeListeners.add(fn);
  return () => sceneChangeListeners.delete(fn);
}

/* ═══════════════════════════════════════════════════
   Presenter Mode
   ═══════════════════════════════════════════════════ */
const CHANNEL = 'inspflow-presenter';

function formatTime(sec) {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

function initPresenterMode() {
  const params = new URLSearchParams(location.search);
  const mode = params.get('presenter') === '1' ? 'presenter' : params.get('present') === '1' ? 'audience' : 'standard';
  document.body.dataset.mode = mode;

  const console_ = document.getElementById('presenter-console');
  const timerEl = document.getElementById('console-timer');
  const timerState = document.getElementById('console-timer-state');
  const pTitle = document.getElementById('console-scene-title');
  const pNotes = document.getElementById('console-notes');
  const pList = document.getElementById('console-scene-list');
  const fsBtn = document.getElementById('pc-fullscreen');
  const senderId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let channel = null, applyingRemote = false;
  let timerSec = 0, timerInt = null, paused = false;

  function updateTimer() {
    if (timerEl) timerEl.textContent = formatTime(timerSec);
    if (timerState) timerState.textContent = paused ? 'Pausado' : 'Em execução';
  }

  function startTimer() {
    if (mode !== 'presenter') return;
    timerInt = setInterval(() => { if (!paused) { timerSec++; updateTimer(); } }, 1000);
  }

  function updatePanel(scene, index) {
    if (mode !== 'presenter') return;
    if (pTitle) pTitle.textContent = scene.titulo;
    if (pNotes) pNotes.textContent = scene.notas || 'Sem notas.';
    pList?.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.sid === scene.id;
      b.classList.toggle('active', on);
      b.setAttribute('aria-current', String(on));
    });
  }

  function broadcast(sceneId) {
    channel?.postMessage({ type: 'scene-change', sceneId, senderId });
  }

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL);
    channel.addEventListener('message', (ev) => {
      const d = ev.data;
      if (d?.type !== 'scene-change' || d.senderId === senderId) return;
      applyingRemote = true;
      goToSceneById(d.sceneId);
      setTimeout(() => { applyingRemote = false; }, 0);
    });
  }

  subscribeSceneChange(({ scene, index }) => {
    if (!applyingRemote && mode !== 'standard') broadcast(scene.id);
    updatePanel(scene, index);
  });

  if (mode === 'presenter') {
    if (console_) console_.hidden = false;
    const scenes = getScenes();
    if (pList) {
      pList.innerHTML = scenes.map((s, i) =>
        `<li><button type="button" class="console-scene-btn" data-sid="${s.id}" data-si="${i}" aria-current="false">${i + 1}. ${s.rotulo}</button></li>`
      ).join('');
      pList.addEventListener('click', (e) => { const b = e.target.closest('[data-sid]'); if (b) goToSceneById(b.dataset.sid); });
    }

    document.getElementById('pc-prev')?.addEventListener('click', goToPreviousScene);
    document.getElementById('pc-next')?.addEventListener('click', goToNextScene);
    document.getElementById('pc-home')?.addEventListener('click', () => goToSceneByIndex(0));
    document.getElementById('pc-end')?.addEventListener('click', () => goToSceneByIndex(scenes.length - 1));
    fsBtn?.addEventListener('click', async () => {
      try { document.fullscreenElement ? await document.exitFullscreen() : await document.documentElement.requestFullscreen(); } catch {}
      if (fsBtn) { const fs = !!document.fullscreenElement; fsBtn.textContent = fs ? 'Sair da tela cheia' : 'Tela cheia'; fsBtn.setAttribute('aria-pressed', String(fs)); }
    });
    document.getElementById('pc-helpers')?.addEventListener('click', () => {
      document.body.classList.toggle('helpers-hidden');
    });
    document.addEventListener('fullscreenchange', () => {
      if (fsBtn) { const fs = !!document.fullscreenElement; fsBtn.textContent = fs ? 'Sair da tela cheia' : 'Tela cheia'; fsBtn.setAttribute('aria-pressed', String(fs)); }
    });
    document.addEventListener('visibilitychange', () => { paused = document.hidden; updateTimer(); });
    updateTimer();
    startTimer();
  }

  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key.toLowerCase() === 'f') { e.preventDefault(); fsBtn?.click(); }
    if (e.key.toLowerCase() === 'p' && mode === 'presenter') { e.preventDefault(); document.body.classList.toggle('helpers-hidden'); }
  });
}

/* ═══════════════════════════════════════════════════
   Service Worker
   ═══════════════════════════════════════════════════ */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

  const toast = document.getElementById('update-toast');
  const refreshBtn = document.getElementById('update-refresh');
  const dismissBtn = document.getElementById('update-dismiss');
  let waiting = null, refreshing = false;

  const show = () => { if (toast) toast.hidden = false; };
  const hide = () => { if (toast) toast.hidden = true; };

  navigator.serviceWorker.register('./sw.js').then((reg) => {
    if (reg.waiting) { waiting = reg.waiting; show(); }
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) { waiting = nw; show(); }
      });
    });
  }).catch(() => {});

  refreshBtn?.addEventListener('click', () => { if (waiting) { waiting.postMessage({ type: 'SKIP_WAITING' }); hide(); } });
  dismissBtn?.addEventListener('click', hide);
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!refreshing) { refreshing = true; location.reload(); } });
}

/* ═══════════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════════ */
async function init() {
  try {
    const resp = await fetch('./story.json');
    if (!resp.ok) throw new Error('Falha ao carregar story.json');
    const story = await resp.json();
    setStory(story);
    buildSceneNav();

    // Controls
    document.getElementById('btn-prev').addEventListener('click', goToPreviousScene);
    document.getElementById('btn-next').addEventListener('click', goToNextScene);
    document.getElementById('btn-home').addEventListener('click', () => goToSceneByIndex(0));
    document.getElementById('btn-end').addEventListener('click', () => goToSceneByIndex(getTotalScenes() - 1));
    document.getElementById('btn-presenter').addEventListener('click', () => {
      const p = new URLSearchParams(location.search);
      p.set('presenter', '1'); p.delete('present');
      location.href = `${location.pathname}?${p.toString()}${location.hash || '#home'}`;
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); goToNextScene(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToPreviousScene(); }
      if (e.key === 'Home') { e.preventDefault(); goToSceneByIndex(0); }
      if (e.key === 'End') { e.preventDefault(); goToSceneByIndex(getTotalScenes() - 1); }
    });

    initPresenterMode();
    window.addEventListener('hashchange', syncRoute);
    if (!location.hash) location.hash = 'home';
    syncRoute();
    registerSW();
  } catch (err) {
    sceneRoot.innerHTML = `<article class="card"><h1 class="scene-title">Erro ao iniciar</h1><p class="lead">${err.message}</p></article>`;
  }
}

init();
