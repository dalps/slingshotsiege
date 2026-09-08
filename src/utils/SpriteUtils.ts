import { LayerName, Stage } from "../engine/Stage";

export type DrawingPart = {
  path: Path2D;
  fill: string;
  stroke: string;
};

export type Drawing = { fill: DrawingPart[]; stroke: DrawingPart[] };

export const WHITE = "#fff";
export const BLACK = "#000";
export const RED = "#f00";

export const colors = [
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
    gradients["rainbow"]
    // gradients[s];

export const makePart = (
  pathData: string,
  color: string | string[],
): DrawingPart => ({
  path: new Path2D(pathData),
  color,
});

export const makeGradient = (colors: string[]) => {
  const { ctx, cw, ch } = Stage.setActiveLayer(LayerName.BG_1);
  let g = ctx.createLinearGradient(0, 0, cw, ch);

  colors.forEach((s, i) => {
    g.addColorStop(i / colors.length, s);
  });

  return g;
};

export function initGradients() {
  gradients.rainbow = makeGradient(colors);
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
