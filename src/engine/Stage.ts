export const enum LayerName {
  BG_1 = "bg'",
  BG_2 = "bg",
  Game = "game",
  Info = "info",
  UI = "ui",
}

export const titleElements = document.getElementById("title");
export const gameoverElements = document.getElementById("gameover");

const STACK: LayerName[] = [
  LayerName.BG_1,
  LayerName.BG_2,
  LayerName.Game,
  LayerName.Info,
  LayerName.UI,
];

let BUTTONS: HTMLButtonElement[];

type LayerKey = string | LayerName;

export class Stage {
  private static _layers: Map<LayerKey, CanvasHelper> = new Map();
  public static stage: HTMLElement;
  private static _activeLayer: CanvasHelper;

  /**
   * Set the active layer.
   */
  public static setActiveLayer(layer: LayerKey) {
    this._activeLayer = this._layers.get(layer)!;
    return this;
  }

  public static getLayer(layer: LayerKey): CanvasHelper | null {
    return this._layers.get(layer) || null;
  }

  /**
   * Clear the specified layer without affecting the active layer.
   */
  public static clearLayer(layer?: LayerKey) {
    const l = layer ? Stage.getLayer(layer) : Stage.activeLayer;
    if (!l) return;

    const { ctx, width, height } = l;
    ctx.clearRect(0, 0, width, height);
  }

  /**
   *  The active layer.
   */
  public static get activeLayer(): CanvasHelper {
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
    STACK.forEach((name, i) => {
      const layer = new CanvasHelper(name);
      const { canvas } = layer;

      canvas.id = name;
      canvas.style.zIndex = `${i * 10}`;

      this._layers.set(name, layer);
      this.stage.appendChild(canvas);
    });

    this.fitLayersToStage();
    this.addResizeListener(this.fitLayersToStage);
  }

  static addResizeListener(callback: Function) {
    window.addEventListener("resize", callback.bind(this));
  }

  static newOffscreenLayer(name: string, width: number, height: number) {
    const newLayer = new CanvasHelper(name, width, height);
    this._layers.set(name, newLayer);
  }

  static fitLayersToStage() {
    const [cw, ch] = [this.stage.clientWidth, this.stage.clientHeight];

    STACK.forEach((layer) => {
      this.getLayer(layer)?.setSize(cw, ch);
    });
  }

  static debugOffscreenLayer(name: string) {
    const { canvas } = Stage.getLayer(name)!;
    Stage.stage.appendChild(canvas);
    canvas.style.border = "1px solid blue";
    canvas.style.zIndex = "9999";
  }
}

import { Point } from "../utils/Point";

export class CanvasHelper {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  constructor(
    public name: LayerKey,
    width = 480,
    height = 480,
  ) {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.setSize(width, height);
  }

  get width() {
    return this.canvas.width;
  }

  set width(w: number) {
    this.canvas.width = w;
  }

  get height() {
    return this.canvas.height;
  }

  set height(h: number) {
    this.canvas.height = h;
  }

  setSize(w: number, h: number) {
    this.width = w;
    this.height = h;
  }

  get rect(): DOMRect {
    return this.canvas.getBoundingClientRect();
  }

  resolveMousePosition(e: MouseEvent): Point {
    if (e.offsetX) {
      return new Point(e.offsetX, e.offsetY);
    }

    return new Point(e.layerX, e.layerY);
  }

  resolveTouchPosition(e: TouchEvent): Point {
    const t = e.touches[0];
    return new Point(t.clientX - this.rect.x, t.clientY - this.rect.y);
  }
}
