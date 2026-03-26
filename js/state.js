const state = {
  story: null,
  currentIndex: 0,
};

export function setStory(story) {
  state.story = story;
}

export function getStory() {
  return state.story;
}

export function getScenes() {
  return state.story?.scenes ?? [];
}

export function setCurrentIndex(index) {
  state.currentIndex = index;
}

export function getCurrentIndex() {
  return state.currentIndex;
}

export function getCurrentScene() {
  return getScenes()[state.currentIndex] ?? null;
}

export function getTotalScenes() {
  return getScenes().length;
}
