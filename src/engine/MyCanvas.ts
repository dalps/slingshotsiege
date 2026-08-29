import { Point } from "../utils/Point";

export class MyCanvas {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  private _rect: DOMRect;

  constructor(public name: string, width = 480, height = 480) {
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
    return this._rect ?? (this._rect = this.canvas.getBoundingClientRect());
  }

  resolveMousePosition(e: MouseEvent): Point {
    if (e.offsetX) {
      return new Point(e.offsetX, e.offsetY);
    }

    return new Point(e.layerX, e.layerY);
  }

  resolveTouchPosition(e: Touch): Point {
    return new Point(e.clientX - this.rect.x, e.clientY - this.rect.y);
  }
}
