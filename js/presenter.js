import { getScenes } from './state.js';

const CHANNEL_NAME = 'inspflow-presenter';

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getModeFromQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('presenter') === '1') return 'presenter';
  if (params.get('present') === '1') return 'audience';
  return 'standard';
}

export function initPresenterMode(api) {
  const {
    goToNextScene,
    goToPreviousScene,
    goToSceneByIndex,
    goToSceneById,
    subscribeSceneChange,
  } = api;

  const mode = getModeFromQuery();
  document.body.dataset.mode = mode;

  const presenterConsole = document.getElementById('presenter-console');
  const presenterTimer = document.getElementById('presenter-timer');
  const presenterTimerState = document.getElementById('presenter-timer-state');
  const presenterSceneTitle = document.getElementById('presenter-scene-title');
  const presenterNotes = document.getElementById('presenter-notes');
  const presenterSceneList = document.getElementById('presenter-scene-list');
  const presenterFullscreenBtn = document.getElementById('pc-fullscreen');

  let cleanupSceneSubscription = null;
  let channel = null;
  let applyingRemoteNavigation = false;
  const senderId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  let timerSeconds = 0;
  let timerInterval = null;
  let pausedByVisibility = false;

  function updateTimerLabel() {
    if (!presenterTimer || !presenterTimerState) return;
    presenterTimer.textContent = formatTime(timerSeconds);
    presenterTimerState.textContent = pausedByVisibility ? 'Pausado (aba oculta)' : 'Em execução';
  }

  function startTimer() {
    if (mode !== 'presenter') return;
    timerInterval = window.setInterval(() => {
      if (pausedByVisibility) return;
      timerSeconds += 1;
      updateTimerLabel();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function setupVisibilityListener() {
    if (mode !== 'presenter') return;

    document.addEventListener('visibilitychange', () => {
      pausedByVisibility = document.hidden;
      updateTimerLabel();
    });
  }

  function updateFullscreenButton() {
    if (!presenterFullscreenBtn) return;

    const isFullscreen = Boolean(document.fullscreenElement);
    presenterFullscreenBtn.textContent = isFullscreen ? 'Sair da tela cheia' : 'Tela cheia';
    presenterFullscreenBtn.setAttribute('aria-pressed', String(isFullscreen));
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      // Falha silenciosa mantém navegação funcional sem quebrar UI.
      console.warn('Não foi possível alternar tela cheia.', error);
    }
    updateFullscreenButton();
  }

  function broadcastScene(sceneId) {
    if (!channel) return;

    channel.postMessage({
      type: 'scene-change',
      sceneId,
      senderId,
    });
  }

  function setupChannel() {
    if (!('BroadcastChannel' in window)) return;

    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message', (event) => {
      const payload = event.data;
      if (!payload || payload.type !== 'scene-change') return;
      if (payload.senderId === senderId) return;
      if (typeof payload.sceneId !== 'string') return;

      applyingRemoteNavigation = true;
      goToSceneById(payload.sceneId);
      window.setTimeout(() => {
        applyingRemoteNavigation = false;
      }, 0);
    });
  }

  function updatePresenterPanel(scene, index) {
    if (mode !== 'presenter') return;
    if (!presenterSceneTitle || !presenterNotes || !presenterSceneList) return;

    presenterSceneTitle.textContent = scene.titulo;
    presenterNotes.textContent = scene.notas || 'Sem notas desta cena.';

    const buttons = presenterSceneList.querySelectorAll('button[data-scene-id]');
    buttons.forEach((button) => {
      const isActive = button.dataset.sceneId === scene.id;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-current', String(isActive));
    });

    const activeButton = presenterSceneList.querySelector(`button[data-scene-index="${index}"]`);
    if (activeButton) {
      activeButton.scrollIntoView({ block: 'nearest' });
    }
  }

  function renderPresenterSceneList() {
    if (mode !== 'presenter') return;
    if (!presenterSceneList) return;

    const scenes = getScenes();
    presenterSceneList.innerHTML = scenes
      .map(
        (scene, index) =>
          `<li><button type="button" class="presenter-scene-btn" data-scene-id="${scene.id}" data-scene-index="${index}" aria-current="false">${index + 1}. ${scene.rotulo}</button></li>`
      )
      .join('');

    presenterSceneList.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      const sceneId = target.dataset.sceneId;
      if (!sceneId) return;
      goToSceneById(sceneId);
    });
  }

  function bindPresenterControls() {
    const prevBtn = document.getElementById('pc-prev');
    const nextBtn = document.getElementById('pc-next');
    const homeBtn = document.getElementById('pc-home');
    const endBtn = document.getElementById('pc-end');
    const helpersBtn = document.getElementById('pc-helpers');

    prevBtn?.addEventListener('click', goToPreviousScene);
    nextBtn?.addEventListener('click', goToNextScene);
    homeBtn?.addEventListener('click', () => goToSceneByIndex(0));
    endBtn?.addEventListener('click', () => goToSceneByIndex(getScenes().length - 1));
    presenterFullscreenBtn?.addEventListener('click', toggleFullscreen);

    helpersBtn?.addEventListener('click', () => {
      document.body.classList.toggle('helpers-hidden');
      const active = !document.body.classList.contains('helpers-hidden');
      helpersBtn.setAttribute('aria-pressed', String(active));
    });

    document.addEventListener('fullscreenchange', updateFullscreenButton);
  }

  function bindGlobalShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        toggleFullscreen();
      }

      if (event.key.toLowerCase() === 'p' && mode === 'presenter') {
        event.preventDefault();
        document.body.classList.toggle('helpers-hidden');
      }
    });
  }

  function activateModeLayouts() {
    if (mode === 'presenter') {
      if (presenterConsole) {
        presenterConsole.hidden = false;
      }
      renderPresenterSceneList();
      bindPresenterControls();
      setupVisibilityListener();
      updateTimerLabel();
      startTimer();
    }

    bindGlobalShortcuts();
  }

  cleanupSceneSubscription = subscribeSceneChange(({ scene, index }) => {
    if (!applyingRemoteNavigation && (mode === 'presenter' || mode === 'audience')) {
      broadcastScene(scene.id);
    }

    updatePresenterPanel(scene, index);
  });

  setupChannel();
  activateModeLayouts();

  return {
    mode,
    destroy() {
      stopTimer();
      cleanupSceneSubscription?.();
      if (channel) {
        channel.close();
      }
    },
  };
}
