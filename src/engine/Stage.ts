import { MyCanvas } from "./MyCanvas";

export type LayerName = string;

export const titleElements = document.getElementById("title");
export const gameoverElements = document.getElementById("gameover");

const CANVASES = ["bg", "game", "info", "ui"];
let BUTTONS: HTMLButtonElement[];

export class Stage {
  private static _layers: Map<LayerName, MyCanvas> = new Map();
  public static stage: HTMLElement;
  private static _activeLayer: MyCanvas;

  /**
   * Set the active layer.
   */
  public static setActiveLayer(layer: LayerName) {
    this._activeLayer = this._layers.get(layer);
  }

  public static getLayer(layer: LayerName): MyCanvas | null {
    return this._layers.get(layer) || null;
  }

  /**
   * Clear the specified layer without affecting the active layer.
   */
  public static clearLayer(layer?: LayerName) {
    const { ctx, width, height } = layer
      ? Stage.getLayer(layer)
      : Stage.activeLayer;

    ctx.clearRect(0, 0, width, height);
  }

  /**
   *  The active layer.
   */
  public static get activeLayer(): MyCanvas {
    return this._activeLayer;
  }

  /**
   *  The width of the active layer.
   */
  public static get cw(): number {
    return this.activeLayer.width;
  }

  /**
   *  The height of the active layer.
   */
  public static get ch(): number {
    return this.activeLayer.height;
  }

  /**
   *  The working context of the active layer.
   */
  public static get ctx(): CanvasRenderingContext2D {
    return this.activeLayer.ctx;
  }

  static init() {
    this.stage = document.getElementById("stage")!;

    // Draw offscreen textures
    // ...

    // Create the buttons with their textures
    // ...

    // Create the game's layers and add them to the DOM
    CANVASES.forEach((name, i) => {
      const layer = new MyCanvas(name);
      const { canvas } = layer;

      canvas.id = name;
      canvas.style.zIndex = `${i * 10}`;

      this._layers.set(name, layer);
      this.stage.appendChild(canvas);
    });

    this.fitLayersToStage();

    window.addEventListener("resize", this.fitLayersToStage.bind(this));
  }

  static newOffscreenLayer(name: string, width: number, height: number) {
    const newLayer = new MyCanvas(name, width, height);
    this._layers.set(name, newLayer);
  }

  static fitLayersToStage() {
    const [cw, ch] = [this.stage.clientWidth, this.stage.clientHeight];

    CANVASES.forEach((layer) => {
      this.getLayer(layer).setSize(cw, ch);
    });

    // Redraw backgrounds
    // ...
  }

  static debugOffscreenLayer(name: string) {
    const { canvas } = Stage.getLayer(name)!;
    Stage.stage.appendChild(canvas);
    canvas.style.border = "1px solid blue";
    canvas.style.zIndex = "9999";
  }
}
