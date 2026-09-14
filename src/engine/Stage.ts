export const enum LayerName {
  Backdrop,
  Projectiles,
  Unicorn,
  BrickWall,
  Particles,
  Game,
  Scores,
  UI,
}

const STACK: LayerName[] = [
  LayerName.Backdrop,
  LayerName.Projectiles,
  LayerName.Unicorn,
  LayerName.BrickWall,
  LayerName.Particles,
  LayerName.Game,
  LayerName.Scores,
  LayerName.UI,
];

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
    return this.stage.clientWidth;
  }

  /**
   *  The height of the active layer.
   */
  public static get ch(): number {
    return this.stage.clientHeight;
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
    return newLayer;
  }

  /**
   * Resizes the canvases to match the stage's dimensions
   * and scales their contextes to match the device pixel density.
   *
   * See https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
   */
  static fitLayersToStage() {
    const scale = window.devicePixelRatio;
    const [cw, ch] = [this.stage.clientWidth, this.stage.clientHeight];

    STACK.forEach((name) => {
      const layer = this.getLayer(name)!;

      layer.canvas.style.width = `${cw}px`;
      layer.canvas.style.height = `${ch}px`;

      layer.setSize(Math.floor(cw * scale), Math.floor(ch * scale));

      layer.ctx.scale(scale, scale);
    });
  }

  static drawOnLayer(
    name: LayerName,
    drawFn: (ctx: CanvasRenderingContext2D, cw: number, ch: number) => void,
  ) {
    const { ctx, cw, ch } = Stage.setActiveLayer(name);
    ctx.save();
    drawFn(ctx, cw, ch);
    ctx.restore();
  }

  static debugOffscreenLayer(name: string) {
    const { canvas } = Stage.getLayer(name)!;
    Stage.stage.appendChild(canvas);
    canvas.style.border = "1px solid blue";
    canvas.style.zIndex = "9999";
  }
}

import { Point, pt } from "../utils/Point";

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

  /**
   * Width of the canvas in device pixels.
   *
   * WARNING: this is not the same as the Stage's width due to the adjustment performed by `Stage.fitLayersToStage`.
   * Don't use this for drawing.
   */
  get width() {
    return this.canvas.width;
  }

  set width(w: number) {
    this.canvas.width = w;
  }

  /**
   * Height of the canvas in device pixels.
   *
   * WARNING: this is not the same as the Stage's height due to the adjustment performed by `Stage.fitLayersToStage`.
   * Don't use this for drawing.
   */
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
      return pt(e.offsetX, e.offsetY);
    }

    return pt(e.layerX, e.layerY);
  }

  resolveTouchPosition(e: TouchEvent): Point {
    const t = e.touches[0];
    return pt(t.clientX - this.rect.x, t.clientY - this.rect.y);
  }
}
