// Componente reutilizável de Equipamentos + Equipe.
// Estrutura simples, orientada a dados locais em JSON.

function statusLabel(status) {
  if (status === 'operacional') return 'Operacional';
  if (status === 'atencao') return 'Atenção';
  return 'Bloqueado';
}

function roleLabel(roleId, roleMap) {
  return roleMap.get(roleId) || roleId;
}

function pulseElement(element) {
  if (!element) return;
  element.classList.remove('is-pulsing');
  void element.offsetWidth;
  element.classList.add('is-pulsing');
  window.setTimeout(() => element.classList.remove('is-pulsing'), 220);
}

export function renderEquipTeam(container, equipmentData, teamData) {
  if (!container) return;

  const equipmentList = equipmentData?.equipamentos || [];
  const teamList = teamData?.members || [];
  const typeOptions = equipmentData?.tipos || [];
  const statusOptions = equipmentData?.status || [];
  const roleOptions = teamData?.roles || [];

  if (!equipmentList.length || !teamList.length) {
    container.innerHTML = '<p class="story-lead">Sem dados de equipamentos/equipe para exibir.</p>';
    return;
  }

  const roleMap = new Map(roleOptions.map((item) => [item.id, item.label]));

  const state = {
    type: typeOptions[0]?.id || 'todos',
    status: statusOptions[0]?.id || 'todos',
    search: '',
    sort: 'progresso-desc',
    selectedEquipmentId: equipmentList[0].id,
    role: roleOptions[0]?.id || 'todos',
    selectedMemberId: teamList[0].id,
  };

  container.innerHTML = `
    <section class="equip-team" aria-label="Equipamentos e equipe">
      <section class="equip-section" aria-labelledby="equip-title">
        <header class="equip-head">
          <h2 id="equip-title" class="equip-title">Equipamentos</h2>
          <p class="equip-lead">Filtre, busque e priorize ativos antes de distribuir atividades para a equipe.</p>
        </header>

        <div class="equip-filters">
          <div class="equip-filter-group" role="group" aria-label="Filtro por tipo">
            <span class="equip-filter-label">Tipo</span>
            <div id="equip-type-chips" class="equip-chip-row"></div>
          </div>

          <div class="equip-filter-group" role="group" aria-label="Filtro por status">
            <span class="equip-filter-label">Status</span>
            <div id="equip-status-chips" class="equip-chip-row"></div>
          </div>

          <div class="equip-filter-group">
            <label class="equip-filter-label" for="equip-search">Busca</label>
            <input id="equip-search" class="equip-search" type="search" placeholder="Buscar por TAG ou nome" autocomplete="off">
          </div>

          <div class="equip-filter-group">
            <label class="equip-filter-label" for="equip-sort">Ordenar por</label>
            <select id="equip-sort" class="equip-sort">
              <option value="progresso-desc">Maior progresso</option>
              <option value="progresso-asc">Menor progresso</option>
              <option value="tag-asc">TAG (A-Z)</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        <div class="equip-layout">
          <div id="equip-card-list" class="equip-card-list" role="list" aria-label="Lista de equipamentos"></div>

          <aside class="equip-summary" aria-live="polite" aria-atomic="true">
            <p class="equip-summary-kicker">Selecionado</p>
            <h3 id="equip-summary-title" class="equip-summary-title"></h3>
            <p id="equip-summary-meta" class="equip-summary-meta"></p>
            <p id="equip-summary-desc" class="equip-summary-desc"></p>
            <p id="equip-summary-scope" class="equip-summary-scope"></p>
            <button id="equip-to-team" type="button" class="btn">Ir para Equipe</button>
          </aside>
        </div>
      </section>

      <section class="team-section" id="team-section" aria-labelledby="team-title">
        <header class="team-head">
          <h2 id="team-title" class="equip-title">Equipe</h2>
          <p class="equip-lead">Selecione função e membro para entender responsabilidades e escopo de atuação.</p>
        </header>

        <div class="equip-filter-group" role="group" aria-label="Filtro por função">
          <span class="equip-filter-label">Função</span>
          <div id="team-role-chips" class="equip-chip-row"></div>
        </div>

        <div class="team-layout">
          <div id="team-member-list" class="team-member-list" role="list" aria-label="Membros da equipe"></div>

          <aside class="team-detail" aria-live="polite" aria-atomic="true">
            <p class="equip-summary-kicker">Detalhes do membro</p>
            <h3 id="team-detail-name" class="equip-summary-title"></h3>
            <p id="team-detail-role" class="equip-summary-meta"></p>
            <p id="team-detail-scope" class="equip-summary-desc"></p>
            <ul id="team-detail-resp" class="team-detail-resp"></ul>
          </aside>
        </div>

        <footer class="team-footer">
          <button id="equip-main-cta" type="button" class="btn btn-primary">Seguir para visão do planejador</button>
        </footer>
      </section>
    </section>
  `;

  const typeChips = container.querySelector('#equip-type-chips');
  const statusChips = container.querySelector('#equip-status-chips');
  const searchInput = container.querySelector('#equip-search');
  const sortSelect = container.querySelector('#equip-sort');
  const cardList = container.querySelector('#equip-card-list');

  const summaryTitle = container.querySelector('#equip-summary-title');
  const summaryMeta = container.querySelector('#equip-summary-meta');
  const summaryDesc = container.querySelector('#equip-summary-desc');
  const summaryScope = container.querySelector('#equip-summary-scope');
  const toTeamBtn = container.querySelector('#equip-to-team');

  const roleChips = container.querySelector('#team-role-chips');
  const memberList = container.querySelector('#team-member-list');
  const detailName = container.querySelector('#team-detail-name');
  const detailRole = container.querySelector('#team-detail-role');
  const detailScope = container.querySelector('#team-detail-scope');
  const detailResp = container.querySelector('#team-detail-resp');
  const mainCta = container.querySelector('#equip-main-cta');

  function renderChipGroup(target, options, selectedId, key) {
    target.innerHTML = options
      .map((option) => {
        const isActive = option.id === selectedId;
        return `
          <button
            type="button"
            class="equip-chip ${isActive ? 'is-active' : ''}"
            data-chip-key="${key}"
            data-chip-id="${option.id}"
            aria-pressed="${isActive}"
          >
            ${option.label}
          </button>
        `;
      })
      .join('');
  }

  function filterAndSortEquipment() {
    let items = equipmentList.filter((item) => {
      if (state.type !== 'todos' && item.tipo !== state.type) return false;
      if (state.status !== 'todos' && item.status !== state.status) return false;

      const query = state.search.trim().toLowerCase();
      if (!query) return true;

      return item.tag.toLowerCase().includes(query) || item.nome.toLowerCase().includes(query);
    });

    items = [...items].sort((a, b) => {
      if (state.sort === 'progresso-asc') return a.progresso - b.progresso;
      if (state.sort === 'tag-asc') return a.tag.localeCompare(b.tag, 'pt-BR');
      if (state.sort === 'status') return statusLabel(a.status).localeCompare(statusLabel(b.status), 'pt-BR');
      return b.progresso - a.progresso;
    });

    return items;
  }

  function ensureSelectedEquipment(filtered) {
    const exists = filtered.some((item) => item.id === state.selectedEquipmentId);
    if (!exists) {
      state.selectedEquipmentId = filtered[0]?.id || null;
    }
  }

  function renderEquipmentSummary(selected) {
    if (!selected) {
      summaryTitle.textContent = 'Nenhum equipamento no filtro';
      summaryMeta.textContent = '';
      summaryDesc.textContent = 'Ajuste os filtros para visualizar ativos.';
      summaryScope.textContent = '';
      return;
    }

    summaryTitle.textContent = `${selected.tag} · ${selected.nome}`;
    summaryMeta.textContent = `${statusLabel(selected.status)} · ${roleLabel(selected.papelResponsavel, roleMap)}`;
    summaryDesc.textContent = selected.resumo;
    summaryScope.textContent = `Escopo: ${selected.escopo}`;
  }

  function renderEquipmentCards() {
    const filtered = filterAndSortEquipment();
    ensureSelectedEquipment(filtered);

    cardList.innerHTML = filtered
      .map((item) => {
        const isActive = item.id === state.selectedEquipmentId;
        return `
          <button
            type="button"
            class="equip-card ${isActive ? 'is-active' : ''}"
            data-equipment-id="${item.id}"
            aria-pressed="${isActive}"
            role="listitem"
          >
            <div class="equip-card-head">
              <strong>${item.tag}</strong>
              <span class="equip-status equip-status--${item.status}">${statusLabel(item.status)}</span>
            </div>
            <p class="equip-name">${item.nome}</p>
            <p class="equip-meta">${item.tipo} · ${roleLabel(item.papelResponsavel, roleMap)}</p>
            <div class="equip-progress-wrap">
              <meter min="0" max="100" value="${item.progresso}"></meter>
              <span>${item.progresso}%</span>
            </div>
          </button>
        `;
      })
      .join('');

    const selected = filtered.find((item) => item.id === state.selectedEquipmentId);
    renderEquipmentSummary(selected);
  }

  function filterTeam() {
    return teamList.filter((member) => {
      if (state.role === 'todos') return true;
      return member.role === state.role;
    });
  }

  function ensureSelectedMember(filteredMembers) {
    const exists = filteredMembers.some((member) => member.id === state.selectedMemberId);
    if (!exists) {
      state.selectedMemberId = filteredMembers[0]?.id || null;
    }
  }

  function renderTeamDetail(member) {
    if (!member) {
      detailName.textContent = 'Nenhum membro disponível';
      detailRole.textContent = '';
      detailScope.textContent = 'Ajuste o filtro de função para visualizar membros.';
      detailResp.innerHTML = '';
      return;
    }

    detailName.textContent = member.nome;
    detailRole.textContent = roleLabel(member.role, roleMap);
    detailScope.textContent = member.escopo;
    detailResp.innerHTML = (member.responsabilidades || []).map((item) => `<li>${item}</li>`).join('');
  }

  function renderTeamList() {
    const filteredMembers = filterTeam();
    ensureSelectedMember(filteredMembers);

    memberList.innerHTML = filteredMembers
      .map((member) => {
        const isActive = member.id === state.selectedMemberId;
        return `
          <button
            type="button"
            class="team-member-btn ${isActive ? 'is-active' : ''}"
            data-member-id="${member.id}"
            aria-pressed="${isActive}"
            role="listitem"
          >
            <strong>${member.nome}</strong>
            <small>${roleLabel(member.role, roleMap)}</small>
          </button>
        `;
      })
      .join('');

    const selected = filteredMembers.find((member) => member.id === state.selectedMemberId);
    renderTeamDetail(selected);
  }

  function updateEquipmentUI() {
    renderChipGroup(typeChips, typeOptions, state.type, 'type');
    renderChipGroup(statusChips, statusOptions, state.status, 'status');
    sortSelect.value = state.sort;
    renderEquipmentCards();
  }

  function updateTeamUI() {
    renderChipGroup(roleChips, roleOptions, state.role, 'role');
    renderTeamList();
  }

  typeChips.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('button[data-chip-key="type"]') : null;
    if (!button) return;

    state.type = button.dataset.chipId;
    pulseElement(button);
    updateEquipmentUI();
  });

  statusChips.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('button[data-chip-key="status"]') : null;
    if (!button) return;

    state.status = button.dataset.chipId;
    pulseElement(button);
    updateEquipmentUI();
  });

  searchInput.addEventListener('input', () => {
    state.search = searchInput.value;
    renderEquipmentCards();
  });

  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    renderEquipmentCards();
  });

  cardList.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('button[data-equipment-id]') : null;
    if (!button) return;

    state.selectedEquipmentId = button.dataset.equipmentId;
    pulseElement(button);
    renderEquipmentCards();
  });

  roleChips.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('button[data-chip-key="role"]') : null;
    if (!button) return;

    state.role = button.dataset.chipId;
    pulseElement(button);
    updateTeamUI();
  });

  memberList.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('button[data-member-id]') : null;
    if (!button) return;

    state.selectedMemberId = button.dataset.memberId;
    pulseElement(button);
    renderTeamList();
  });

  toTeamBtn.addEventListener('click', () => {
    document.getElementById('team-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  mainCta.addEventListener('click', () => {
    window.location.hash = 'visao-planejador';
  });

  updateEquipmentUI();
  updateTeamUI();
}
