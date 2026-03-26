import { getScenes, getTotalScenes, setCurrentIndex } from './state.js';
import { announce, updateAriaCurrent } from './a11y.js';
import { renderClickableDemo } from './components/clickable-demo.js';
import { renderFlowMap } from './components/flow-map.js';
import { renderKpiPanel } from './components/kpi-panel.js';
import { renderEquipTeam } from './components/equip-team.js';
import { renderPlannerCompare } from './components/planner-compare.js';
import { renderClosingScene } from './components/closing-scene.js';

const sceneRoot = document.getElementById('scene-root');
const progressBar = document.getElementById('progress-value');
const statusLabel = document.getElementById('status-label');
const sceneChangeListeners = new Set();
let demoHotspotsCache = null;
let inspectionFlowCache = null;
let endFlowCache = null;
let kpiSampleCache = null;
let equipmentSampleCache = null;
let teamSampleCache = null;
let plannerCompareCache = null;
let plannerScenariosCache = null;
let closingSampleCache = null;

async function loadDemoHotspots() {
  if (demoHotspotsCache) return demoHotspotsCache;

  const response = await fetch('./data/demo.hotspots.json');
  if (!response.ok) {
    throw new Error('Falha ao carregar data/demo.hotspots.json');
  }

  demoHotspotsCache = await response.json();
  return demoHotspotsCache;
}

async function loadInspectionFlow() {
  if (inspectionFlowCache) return inspectionFlowCache;

  const response = await fetch('./data/inspection.flow.json');
  if (!response.ok) {
    throw new Error('Falha ao carregar data/inspection.flow.json');
  }

  inspectionFlowCache = await response.json();
  return inspectionFlowCache;
}

async function loadEndFlow() {
  if (endFlowCache) return endFlowCache;

  const response = await fetch('./data/end.flow.json');
  if (!response.ok) {
    throw new Error('Falha ao carregar data/end.flow.json');
  }

  endFlowCache = await response.json();
  return endFlowCache;
}

async function loadKpiSample() {
  if (kpiSampleCache) return kpiSampleCache;

  const response = await fetch('./data/kpis.sample.json');
  if (!response.ok) {
    throw new Error('Falha ao carregar data/kpis.sample.json');
  }

  kpiSampleCache = await response.json();
  return kpiSampleCache;
}

async function loadEquipmentSample() {
  if (equipmentSampleCache) return equipmentSampleCache;

  const response = await fetch('./data/equipment.sample.json');
  if (!response.ok) {
    throw new Error('Falha ao carregar data/equipment.sample.json');
  }

  equipmentSampleCache = await response.json();
  return equipmentSampleCache;
}

async function loadTeamSample() {
  if (teamSampleCache) return teamSampleCache;

  const response = await fetch('./data/team.sample.json');
  if (!response.ok) {
    throw new Error('Falha ao carregar data/team.sample.json');
  }

  teamSampleCache = await response.json();
  return teamSampleCache;
}

async function loadPlannerCompare() {
  if (plannerCompareCache) return plannerCompareCache;

  const response = await fetch('./data/planner.compare.json');
  if (!response.ok) {
    throw new Error('Falha ao carregar data/planner.compare.json');
  }

  plannerCompareCache = await response.json();
  return plannerCompareCache;
}

async function loadPlannerScenarios() {
  if (plannerScenariosCache) return plannerScenariosCache;

  const response = await fetch('./data/planner.scenarios.json');
  if (!response.ok) {
    throw new Error('Falha ao carregar data/planner.scenarios.json');
  }

  plannerScenariosCache = await response.json();
  return plannerScenariosCache;
}

async function loadClosingSample() {
  if (closingSampleCache) return closingSampleCache;

  const response = await fetch('./data/closing.sample.json');
  if (!response.ok) {
    throw new Error('Falha ao carregar data/closing.sample.json');
  }

  closingSampleCache = await response.json();
  return closingSampleCache;
}

function buildPlaceholderSVG(label) {
  return `
  <svg class="placeholder-svg" viewBox="0 0 640 360" role="img" aria-label="Placeholder visual da cena">
    <rect x="0" y="0" width="640" height="360" fill="#edf3fa"></rect>
    <rect x="28" y="30" width="584" height="300" rx="14" fill="#ffffff" stroke="#c3d3e7"></rect>
    <rect x="54" y="64" width="196" height="14" rx="7" fill="#dbe7f5"></rect>
    <rect x="54" y="92" width="420" height="12" rx="6" fill="#eaf2fb"></rect>
    <rect x="54" y="116" width="390" height="12" rx="6" fill="#eaf2fb"></rect>
    <rect x="54" y="152" width="256" height="120" rx="10" fill="#f4f8fe" stroke="#d8e5f4"></rect>
    <rect x="326" y="152" width="256" height="120" rx="10" fill="#f4f8fe" stroke="#d8e5f4"></rect>
    <circle cx="72" cy="302" r="8" fill="#1f8a4d"></circle>
    <text x="90" y="308" fill="#34537b" font-size="16" font-family="Arial, sans-serif">${label}</text>
  </svg>`;
}

function renderDefaultScene(scene) {
  sceneRoot.innerHTML = `
    <article class="story-card" aria-labelledby="scene-title">
      <div>
        <p class="story-meta">${scene.kicker}</p>
        <h1 id="scene-title" class="story-title">${scene.titulo}</h1>
        <p class="story-lead">${scene.lead}</p>
      </div>
      <div class="story-layout">
        <ul class="story-points">
          ${scene.pontos.map((ponto) => `<li>${ponto}</li>`).join('')}
        </ul>
        <figure class="placeholder-block" aria-label="Bloco visual neutro">
          ${buildPlaceholderSVG(scene.placeholder)}
        </figure>
      </div>
    </article>
  `;
}

async function renderDemoMenuScene(scene) {
  sceneRoot.innerHTML = `
    <article class="story-card" aria-labelledby="scene-title">
      <div>
        <p class="story-meta">${scene.kicker}</p>
        <h1 id="scene-title" class="story-title">${scene.titulo}</h1>
        <p class="story-lead">${scene.lead}</p>
      </div>
      <div id="demo-menu-component"></div>
    </article>
  `;

  const target = document.getElementById('demo-menu-component');

  try {
    const hotspots = await loadDemoHotspots();
    renderClickableDemo(target, {
      imageSrc: './assets/img/inspflow/menu-atividades.svg',
      hotspots,
      ctaLabel: 'Simular jornada do operador',
      ctaRoute: '#fluxo-inspecao',
    });
  } catch (error) {
    target.innerHTML = `<p class="story-lead">${error.message}</p>`;
  }
}

async function renderFlowScene(scene, flowLoader) {
  sceneRoot.innerHTML = `
    <article class="story-card" aria-labelledby="scene-title">
      <div>
        <p class="story-meta">${scene.kicker}</p>
        <h1 id="scene-title" class="story-title">${scene.titulo}</h1>
        <p class="story-lead">${scene.lead}</p>
      </div>
      <div id="flow-map-component"></div>
    </article>
  `;

  const target = document.getElementById('flow-map-component');

  try {
    const flowData = await flowLoader();
    renderFlowMap(target, flowData);
  } catch (error) {
    target.innerHTML = `<p class="story-lead">${error.message}</p>`;
  }
}

async function renderKpiScene(scene) {
  sceneRoot.innerHTML = `
    <article class="story-card" aria-labelledby="scene-title">
      <div>
        <p class="story-meta">${scene.kicker}</p>
        <h1 id="scene-title" class="story-title">${scene.titulo}</h1>
        <p class="story-lead">${scene.lead}</p>
      </div>
      <div id="kpi-panel-component"></div>
    </article>
  `;

  const target = document.getElementById('kpi-panel-component');

  try {
    const kpiData = await loadKpiSample();
    renderKpiPanel(target, kpiData);
  } catch (error) {
    target.innerHTML = `<p class="story-lead">${error.message}</p>`;
  }
}

async function renderEquipTeamScene(scene) {
  sceneRoot.innerHTML = `
    <article class="story-card" aria-labelledby="scene-title">
      <div>
        <p class="story-meta">${scene.kicker}</p>
        <h1 id="scene-title" class="story-title">${scene.titulo}</h1>
        <p class="story-lead">${scene.lead}</p>
      </div>
      <div id="equip-team-component"></div>
    </article>
  `;

  const target = document.getElementById('equip-team-component');

  try {
    const [equipmentData, teamData] = await Promise.all([loadEquipmentSample(), loadTeamSample()]);
    renderEquipTeam(target, equipmentData, teamData);
  } catch (error) {
    target.innerHTML = `<p class="story-lead">${error.message}</p>`;
  }
}

async function renderPlannerScene(scene) {
  sceneRoot.innerHTML = `
    <article class="story-card" aria-labelledby="scene-title">
      <div>
        <p class="story-meta">${scene.kicker}</p>
        <h1 id="scene-title" class="story-title">${scene.titulo}</h1>
        <p class="story-lead">${scene.lead}</p>
      </div>
      <div id="planner-compare-component"></div>
    </article>
  `;

  const target = document.getElementById('planner-compare-component');

  try {
    const [compareData, scenariosData] = await Promise.all([
      loadPlannerCompare(),
      loadPlannerScenarios(),
    ]);

    renderPlannerCompare(target, compareData, scenariosData);
  } catch (error) {
    target.innerHTML = `<p class="story-lead">${error.message}</p>`;
  }
}

async function renderClosingSceneRoute(scene) {
  sceneRoot.innerHTML = `
    <article class="story-card" aria-labelledby="scene-title">
      <div>
        <p class="story-meta">${scene.kicker}</p>
        <h1 id="scene-title" class="story-title">${scene.titulo}</h1>
        <p class="story-lead">${scene.lead}</p>
      </div>
      <div id="closing-scene-component"></div>
    </article>
  `;

  const target = document.getElementById('closing-scene-component');

  try {
    const closingData = await loadClosingSample();
    renderClosingScene(target, closingData);
  } catch (error) {
    target.innerHTML = `<p class="story-lead">${error.message}</p>`;
  }
}

function updateSceneChrome(scene, index) {
  const totalScenes = getTotalScenes();
  const percent = ((index + 1) / totalScenes) * 100;
  progressBar.style.width = `${percent}%`;
  statusLabel.textContent = `Cena ${index + 1} de ${totalScenes}`;

  updateAriaCurrent(scene.id);
  announce(`Cena ${index + 1}: ${scene.titulo}`);

  sceneChangeListeners.forEach((listener) => {
    listener({ scene, index, total: totalScenes });
  });
}

async function renderScene(scene, index) {
  if (scene.id === 'demo-menu') {
    await renderDemoMenuScene(scene);
  } else if (scene.id === 'fluxo-inspecao') {
    await renderFlowScene(scene, loadInspectionFlow);
  } else if (scene.id === 'fluxo-end') {
    await renderFlowScene(scene, loadEndFlow);
  } else if (scene.id === 'equipamentos-equipe') {
    await renderEquipTeamScene(scene);
  } else if (scene.id === 'visao-planejador') {
    await renderPlannerScene(scene);
  } else if (scene.id === 'painel-gerencial') {
    await renderKpiScene(scene);
  } else if (scene.id === 'encerramento') {
    await renderClosingSceneRoute(scene);
  } else {
    renderDefaultScene(scene);
  }

  updateSceneChrome(scene, index);
}

function getHashId() {
  const hashValue = window.location.hash.replace('#', '').trim();
  return hashValue || 'home';
}

export function goToSceneByIndex(index) {
  const scenes = getScenes();
  if (!scenes.length) return;

  const safeIndex = Math.min(Math.max(index, 0), scenes.length - 1);
  const scene = scenes[safeIndex];
  if (!scene) return;

  if (window.location.hash !== `#${scene.id}`) {
    window.location.hash = scene.id;
    return;
  }

  setCurrentIndex(safeIndex);
  renderScene(scene, safeIndex);
}

export function goToSceneById(sceneId) {
  const scenes = getScenes();
  const index = scenes.findIndex((scene) => scene.id === sceneId);
  if (index === -1) return;
  goToSceneByIndex(index);
}

export function goToNextScene() {
  const scenes = getScenes();
  const currentId = getHashId();
  const index = scenes.findIndex((scene) => scene.id === currentId);
  const nextIndex = index < scenes.length - 1 ? index + 1 : scenes.length - 1;
  goToSceneByIndex(nextIndex);
}

export function goToPreviousScene() {
  const scenes = getScenes();
  const currentId = getHashId();
  const index = scenes.findIndex((scene) => scene.id === currentId);
  const previousIndex = index > 0 ? index - 1 : 0;
  goToSceneByIndex(previousIndex);
}

export function syncRoute() {
  const scenes = getScenes();
  if (!scenes.length) return;

  const sceneId = getHashId();
  const sceneIndex = scenes.findIndex((scene) => scene.id === sceneId);

  if (sceneIndex === -1) {
    window.location.hash = 'home';
    return;
  }

  setCurrentIndex(sceneIndex);
  renderScene(scenes[sceneIndex], sceneIndex);
}

export function buildSceneNav() {
  const nav = document.getElementById('scene-nav');
  const scenes = getScenes();

  nav.innerHTML = scenes
    .map(
      (scene) =>
        `<a class="nav-chip" data-scene-link href="#${scene.id}" aria-current="false">${scene.rotulo}</a>`
    )
    .join('');
}

export function subscribeSceneChange(listener) {
  sceneChangeListeners.add(listener);
  return () => {
    sceneChangeListeners.delete(listener);
  };
}
