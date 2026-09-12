import { rgb, type Color } from "../engine/color";
import { LayerName, Stage } from "../engine/Stage";
import { makeGradient } from "./CanvasUtils";
import { pt } from "./Point";

type color = string | Color | undefined | CanvasGradient | Function;

export type RawDrawingPart = [string, color, color];

export type DrawingPart = [Path2D, color, color];

export type Drawing = DrawingPart[];

export const WHITE = rgb(255, 255, 255);
export const BLACK = rgb(0, 0, 0);
export const RED = "#f00";
export const VIOLET = rgb(94, 50, 147);
export const YELLOW = rgb(179, 255, 0);
export const DARK_WOOD = "#a96f3c";
export const LIGHT_WOOD = "#f3c39a";

export const PASTEL_RAINBOW = [
  rgb(255, 73, 219),
  rgb(186, 179, 255),
  rgb(96, 246, 255),
  rgb(175, 255, 175),
  rgb(243, 255, 165),
  rgb(243, 223, 149),
  rgb(255, 134, 134),
];

export const gradients: Record<string, CanvasGradient> = {};

export const none = "none";
export const RAINBOW = () => gradients.rainbow;

export const sprite = (rawData: RawDrawingPart[]): Drawing =>
  rawData.map(
    ([pathData, fill, stroke]): DrawingPart => [
      new Path2D(pathData),
      fill,
      stroke,
    ],
  );

export function initGradients() {
  Stage.setActiveLayer(LayerName.Backdrop);
  // Used for the mane only
  gradients.rainbow = makeGradient(
    pt(),
    pt(Stage.cw, Stage.ch),
    PASTEL_RAINBOW,
  );
}

export function drawParts(ctx: CanvasRenderingContext2D, parts: Drawing) {
  parts.forEach(([path, fill, stroke]) => {
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
