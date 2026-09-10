import type { Entity } from "../ecs";
import { Rainbow, Sprite } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { makeGradient } from "../utils/CanvasUtils";
import { pt } from "../utils/Point";
import { drawParts, PASTEL_RAINBOW, WHITE } from "../utils/SpriteUtils";
import { rainbowFace } from "./sprites";

export const RAINBOW_INNER_RADIUS = 40;
export const RAINBOW_OUTER_RADIUS = 50;

export function drawRainbow(e: Entity) {
  const [{ angle }, rainbowData, rainbowBody]: [Sprite, Rainbow, DynamicBody] =
    e.get(Sprite, Rainbow, DynamicBody);
  const { position: center } = rainbowBody;
  const { innerRadius, outerRadius } = rainbowData;

  // Rounded star
  const points = 8;
  const cpLength = -9.5;
  const { ctx } = Stage.setActiveLayer(LayerName.Game);
  const dphi = (Math.PI * 2) / (points * 2);

  ctx.translate(center.x, center.y);

  let start = pt(1, 0).scale(outerRadius).rotate(angle);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);

  let lastR = null;
  for (let i = 0, phi = 0; i <= points * 2; i++, phi += dphi) {
    const r = pt(Math.cos(phi), Math.sin(phi)).rotate(angle);
    let p = r.scale(i % 2 === 0 ? outerRadius : innerRadius);
    // p = p.rotate(angle);

    let cp1 = (lastR || r).perp().scale(cpLength).add(start);
    let cp2 = r.perp().scale(-cpLength).add(p);

    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);

    lastR = r;
    start = p;
  }

  ctx.closePath();

  const g = makeGradient(start, start.scale(-1), PASTEL_RAINBOW);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = g;
  ctx.stroke();

  drawParts(ctx, rainbowFace);
  ctx.resetTransform();
}
