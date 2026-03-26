// Cena final de encerramento com resumo de valor e próximos passos.
// Conteúdo totalmente baseado em JSON local para manter simplicidade do MVP.

function pulseElement(element) {
  if (!element) return;
  element.classList.remove('is-pulsing');
  void element.offsetWidth;
  element.classList.add('is-pulsing');
  window.setTimeout(() => element.classList.remove('is-pulsing'), 220);
}

function stepStatusLabel(status) {
  if (status === 'em andamento') return 'Em andamento';
  if (status === 'próximo') return 'Próximo';
  return 'Planejado';
}

export function renderClosingScene(container, closingData) {
  if (!container) return;

  const takeaways = closingData?.takeaways || [];
  const operacionais = closingData?.ganhosOperacionais || [];
  const gerenciais = closingData?.ganhosGerenciais || [];
  const proximosPassos = closingData?.proximosPassos || [];
  const checklist = closingData?.checklistApresentacao || [];

  if (!takeaways.length) {
    container.innerHTML = '<p class="story-lead">Sem dados de encerramento para exibir.</p>';
    return;
  }

  const state = {
    selectedTakeawayId: takeaways[0].id,
  };

  container.innerHTML = `
    <section class="closing-scene" aria-label="Encerramento da apresentação">
      <header class="closing-header">
        <h2 class="closing-title">${closingData.mensagemFinal?.titulo || 'Encerramento'}</h2>
        <p class="closing-lead">${closingData.mensagemFinal?.subtitulo || ''}</p>
      </header>

      <section class="closing-value-grid" aria-label="Resumo final de valor">
        <article class="closing-value-card">
          <h3>Ganhos operacionais</h3>
          <ul>${operacionais.map((item) => `<li>${item}</li>`).join('')}</ul>
        </article>

        <article class="closing-value-card">
          <h3>Ganhos gerenciais</h3>
          <ul>${gerenciais.map((item) => `<li>${item}</li>`).join('')}</ul>
        </article>

        <article class="closing-value-card closing-value-card--highlight">
          <h3>Status da apresentação</h3>
          <p class="closing-ready-title">Pronto para apresentação executiva</p>
          <p class="closing-ready-body">Narrativa interativa consolidada com fluxo ponta a ponta e modo apresentador disponível.</p>
        </article>
      </section>

      <section class="closing-takeaways" aria-label="Takeaways finais">
        <h3 class="closing-section-title">3 mensagens-chave</h3>
        <div id="closing-takeaway-cards" class="closing-takeaway-cards"></div>
        <aside class="closing-takeaway-detail" aria-live="polite" aria-atomic="true">
          <p class="closing-kicker">Detalhe da mensagem selecionada</p>
          <h4 id="closing-detail-title"></h4>
          <p id="closing-detail-summary"></p>
          <p id="closing-detail-body"></p>
        </aside>
      </section>

      <section class="closing-next" aria-label="Próximos passos">
        <h3 class="closing-section-title">Próximos passos</h3>
        <ol class="closing-next-list">
          ${proximosPassos
            .map(
              (step) => `
            <li class="closing-next-item">
              <p class="closing-next-head">
                <strong>${step.title}</strong>
                <span class="closing-step-status">${stepStatusLabel(step.status)}</span>
              </p>
              <p>${step.description}</p>
            </li>
          `
            )
            .join('')}
        </ol>
      </section>

      <section class="closing-checklist" aria-label="Checklist de apresentação">
        <h3 class="closing-section-title">Checklist de apresentação</h3>
        <div class="closing-checklist-box">
          ${checklist
            .map(
              (item) => `
            <details>
              <summary>${item.title}</summary>
              <p>${item.summary}</p>
              <p>${item.content}</p>
            </details>
          `
            )
            .join('')}
        </div>
      </section>

      <footer class="closing-footer">
        <button type="button" id="closing-home" class="btn">Voltar ao início</button>
        <button type="button" id="closing-presenter" class="btn btn-primary">Abrir modo apresentador</button>
      </footer>
    </section>
  `;

  const takeawayCards = container.querySelector('#closing-takeaway-cards');
  const detailTitle = container.querySelector('#closing-detail-title');
  const detailSummary = container.querySelector('#closing-detail-summary');
  const detailBody = container.querySelector('#closing-detail-body');
  const homeButton = container.querySelector('#closing-home');
  const presenterButton = container.querySelector('#closing-presenter');

  function renderTakeawayCards() {
    takeawayCards.innerHTML = takeaways
      .map((item) => {
        const isActive = item.id === state.selectedTakeawayId;
        return `
          <button
            type="button"
            class="closing-takeaway-card ${isActive ? 'is-active' : ''}"
            data-takeaway-id="${item.id}"
            aria-pressed="${isActive}"
          >
            <strong>${item.title}</strong>
            <span>${item.summary}</span>
          </button>
        `;
      })
      .join('');

    const selected = takeaways.find((item) => item.id === state.selectedTakeawayId);
    if (!selected) return;

    detailTitle.textContent = selected.title;
    detailSummary.textContent = selected.summary;
    detailBody.textContent = selected.detail;
  }

  takeawayCards.addEventListener('click', (event) => {
    const target = event.target;
    const button = target instanceof HTMLElement ? target.closest('button[data-takeaway-id]') : null;
    if (!button) return;

    state.selectedTakeawayId = button.dataset.takeawayId;
    pulseElement(button);
    renderTakeawayCards();
  });

  homeButton.addEventListener('click', () => {
    window.location.hash = 'home';
  });

  presenterButton.addEventListener('click', () => {
    const hash = '#encerramento';
    window.location.href = `${window.location.pathname}?presenter=1${hash}`;
  });

  renderTakeawayCards();
}
