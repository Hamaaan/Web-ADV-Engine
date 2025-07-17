export class GameInitializer {
  constructor() {
    this.canvas = document.getElementById("application-canvas");
    this.app = new pc.Application(this.canvas, {});

    this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);

    window.addEventListener("resize", () => this.app.resizeCanvas());

    const camera = new pc.Entity("camera");
    camera.addComponent("camera", {
      clearColor: new pc.Color(0.1, 0.1, 0.1),
    });
    this.app.root.addChild(camera);
    camera.setPosition(0, 0, 3);

    this.app.start();
  }

  async fetchStory() {
    try {
      const response = await fetch("story.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Could not load story:", error);
      return null;
    }
  }
}
