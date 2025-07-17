export class GameState {
  constructor(storyData) {
    this.story = storyData;
    this.currentSceneId = "start";
    this.currentEventIndex = 0;
  }
  getCurrentScene() {
    // Ensure the scene exists before returning
    if (!this.story.scenes || !this.story.scenes[this.currentSceneId]) {
      console.error(`Scene with ID '${this.currentSceneId}' not found.`);
      return null; // Return null if scene not found
    }
    return this.story.scenes[this.currentSceneId];
  }
  getCurrentEvent() {
    const currentScene = this.getCurrentScene();
    if (
      !currentScene ||
      !currentScene.events ||
      this.currentEventIndex >= currentScene.events.length
    ) {
      return null; // No current scene, or no more events in the current scene
    }
    return currentScene.events[this.currentEventIndex];
  }
  advanceToNextEvent() {
    this.currentEventIndex++;
  }
  goToScene(sceneId) {
    this.currentSceneId = sceneId;
    this.currentEventIndex = 0;
    const currentScene = this.getCurrentScene();
    if (currentScene && currentScene.background) {
      document.getElementById(
        "background-image"
      ).style.backgroundImage = `url(${currentScene.background})`;
    }
  }
}
