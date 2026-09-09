import { LayerName, Stage } from "../engine/Stage";
import { Point } from "./Point";

export type DrawingPart = {
  path: Path2D;
  fill: string;
  stroke: string;
};

export type Drawing = { fill: DrawingPart[]; stroke: DrawingPart[] };

export const WHITE = "#fff";
export const BLACK = "#000";
export const RED = "#f00";

export const PASTEL_RAINBOW = [
  "#ff49db",
  "#bab3ff",
  "#60f6ff",
  "#afffaf",
  "#f3ffa5",
  "#ff8686",
];

export const gradients: Record<string, CanvasGradient> = {};

export const none = "none";
export const url =
  (s: string): (() => CanvasGradient) =>
  () =>
    gradients["rainbow"];
// gradients[s];

export const makePart = ([pathData, fill, stroke]): DrawingPart => ({
  path: new Path2D(pathData),
  fill,
  stroke,
});

export const makeGradient = (
  from: Point,
  to: Point,
  colors: string[],
  ctx: CanvasRenderingContext2D = Stage.getLayer(LayerName.BG_1)!.ctx,
) => {
  let g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);

  colors.forEach((s, i) => {
    g.addColorStop(i / colors.length, s);
  });

  return g;
};

export function initGradients() {
  gradients.rainbow = makeGradient(
    new Point(),
    new Point(Stage.cw, Stage.ch),
    PASTEL_RAINBOW,
  );
}

export function drawParts(
  ctx: CanvasRenderingContext2D,
  parts: Record<string, DrawingPart>,
) {
  Object.entries(parts).forEach(([name, { path, fill, stroke }]) => {
    const get = (v: any) => (typeof fill === "function" ? v() : v);

    if (fill) {
      ctx.fillStyle = get(fill);
      ctx.fill(path);
    }
    if (stroke) {
      ctx.lineCap = "round";
      ctx.lineWidth = 2;
      ctx.strokeStyle = get(stroke);
      ctx.stroke(path);
    }
  });
}
