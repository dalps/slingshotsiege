import type { World } from "../ecs";
import { LayerName, Stage } from "../engine/Stage";
import { Color } from "../engine/color";
import { FadeTransform } from "../engine/particles";
import { easeInOut, easeOut, lerp } from "../utils/MathUtils";
import { Point, pt } from "./Point";
import { BLACK, WHITE } from "./SpriteUtils";
import { Transform } from "./TimeUtils";

export function drawText(
  text: string,
  position: Point,
  {
    fill = WHITE,
    stroke = BLACK,
    lineWidth = 2,
    size = 36,
    bold = true,
    centered = true,
    layer = LayerName.UI,
  } = {},
) {
  const { ctx } = Stage.setActiveLayer(layer);

  const screenFactor = lerp(0.5, 1, Math.min(1, Stage.cw / Stage.ch));
  ctx.font = `${bold ? "bold" : "normal"} ${screenFactor * size}px sans-serif`;
  const metrics = ctx.measureText(text);
  const margin = 10;
  const center = centered ? 0.5 : 1;
  const { x, y } = pt(
    position.x - metrics.width * center - margin,
    position.y + metrics.actualBoundingBoxAscent * center + margin,
  );
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

export function makeGradient(
  cp1: Point,
  cp2: Point,
  colors: (Color | string)[],
  radii: [number, number] | null = null,
) {
  const { ctx } = Stage;
  const g = radii
    ? ctx.createRadialGradient(cp1.x, cp1.y, radii[0], cp2.x, cp2.y, radii[1])
    : ctx.createLinearGradient(cp1.x, cp1.y, cp2.x, cp2.y);

  colors.forEach((c, idx) => g.addColorStop(idx / (colors.length - 1), c));

  return g;
}

export function popsicle(from: Point, to: Point, color = "black") {
  const { ctx } = Stage;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  const arrowSize = 4;

  ctx.beginPath();
  ctx.arc(from.x, from.y, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(to.x, to.y, arrowSize, 0, Math.PI * 2);
  ctx.fill();
}

export function circle(p: Point, r: number = 5, color = "blue") {
  const { ctx } = Stage;

  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
}

function helper(
  world: World,
  duration: number,
  drawFn: (stage: number, ctx, cw, ch) => void,
  layer = LayerName.UI,
) {
  return new Promise((resolve) => {
    world.create().add(
      new Transform({
        duration,
        end(e) {
          e.delete();
          resolve(null);
        },
        update(e, t) {
          Stage.drawOnLayer(layer, (...args) => drawFn(t, ...args));
        },
      }),
    );
  });
}

export const FadeTransition = (
  world: World,
  { start = 0, end = 1, duration = 2, targetColor = BLACK } = {},
) =>
  helper(world, duration, (t, ctx, cw, ch) => {
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = targetColor.toAlpha(lerp(start, end, t));
    ctx.fillRect(0, 0, cw, ch);
  });

export const ConeTransition = (
  world: World,
  { startRadius = 0, endRadius = 100, duration = 3, ease = easeOut } = {},
) =>
  helper(world, duration, (t, ctx, cw, ch) => {
    ctx.clearRect(0, 0, cw, ch);

    const r = lerp(startRadius, endRadius, ease(t));
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.arc(cw / 2, ch / 2, r, 0, Math.PI * 2, true); // counterclockwise

    // ctx.ellipse(cw / 2, ch / 2, t, t, 0, 0, Math.PI * 2, true); // counterclockwise
    // ctx.clip(clipPath);

    ctx.fillStyle = BLACK;
    ctx.fill();
  });
