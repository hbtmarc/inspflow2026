import { setStory, getTotalScenes } from './state.js';
import {
  buildSceneNav,
  syncRoute,
  goToNextScene,
  goToPreviousScene,
  goToSceneByIndex,
  goToSceneById,
  subscribeSceneChange,
} from './router.js';
import { initPresenterMode } from './presenter.js';

function isSecureHost() {
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!isSecureHost()) return;

  const toast = document.getElementById('update-toast');
  const refreshBtn = document.getElementById('update-refresh');
  const dismissBtn = document.getElementById('update-dismiss');
  let waitingWorker = null;
  let refreshing = false;

  const showToast = () => {
    if (!toast) return;
    toast.hidden = false;
  };

  const hideToast = () => {
    if (!toast) return;
    toast.hidden = true;
  };

  const trackWaitingWorker = (worker) => {
    if (!worker) return;
    waitingWorker = worker;
    showToast();
  };

  navigator.serviceWorker.register('./sw.js').then((registration) => {
    if (registration.waiting) {
      trackWaitingWorker(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          trackWaitingWorker(newWorker);
        }
      });
    });
  }).catch((error) => {
    console.warn('Não foi possível registrar o service worker.', error);
  });

  refreshBtn?.addEventListener('click', () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    hideToast();
  });

  dismissBtn?.addEventListener('click', hideToast);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

async function loadStory() {
  const response = await fetch('./data/story.json');
  if (!response.ok) {
    throw new Error('Falha ao carregar data/story.json');
  }
  return response.json();
}

function bindControls() {
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const homeBtn = document.getElementById('btn-home');
  const endBtn = document.getElementById('btn-end');
  const presenterBtn = document.getElementById('btn-presenter');

  prevBtn.addEventListener('click', goToPreviousScene);
  nextBtn.addEventListener('click', goToNextScene);
  homeBtn.addEventListener('click', () => goToSceneByIndex(0));
  endBtn.addEventListener('click', () => goToSceneByIndex(getTotalScenes() - 1));

  presenterBtn.addEventListener('click', () => {
    presenterBtn.setAttribute('aria-pressed', 'true');
    const params = new URLSearchParams(window.location.search);
    params.set('presenter', '1');
    params.delete('present');
    const hash = window.location.hash || '#home';
    window.location.href = `${window.location.pathname}?${params.toString()}${hash}`;
  });
}

function bindKeyboard() {
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToNextScene();
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToPreviousScene();
    }

    if (event.key === 'Home') {
      event.preventDefault();
      goToSceneByIndex(0);
    }

    if (event.key === 'End') {
      event.preventDefault();
      goToSceneByIndex(getTotalScenes() - 1);
    }
  });
}

async function init() {
  try {
    const story = await loadStory();
    setStory(story);
    buildSceneNav();
    bindControls();
    bindKeyboard();

    initPresenterMode({
      goToNextScene,
      goToPreviousScene,
      goToSceneByIndex,
      goToSceneById,
      subscribeSceneChange,
    });

    window.addEventListener('hashchange', syncRoute);

    if (!window.location.hash) {
      window.location.hash = 'home';
    }
    syncRoute();

    registerServiceWorker();
  } catch (error) {
    const root = document.getElementById('scene-root');
    root.innerHTML = `<article class="story-card"><h1 class="story-title">Erro ao iniciar</h1><p class="story-lead">${error.message}</p></article>`;
  }
}

init();
