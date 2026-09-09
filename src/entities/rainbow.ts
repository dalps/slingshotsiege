import type { Entity } from "../ecs";
import { Rainbow } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { makeGradient } from "../utils/CanvasUtils";
import { Point } from "../utils/Point";
import {
  BLACK,
  drawParts,
  makePart,
  PASTEL_RAINBOW,
  WHITE,
  type DrawingPart,
} from "../utils/SpriteUtils";

const face: DrawingPart[] = [
  makePart([
    `m -10 0
c 0 5 -1 10 -3 10
  -2 0 -3 -5 -3 -10
  0 -5 1 -10 3 -10
  2 0 3 5 3 10
z
m 26 0
c 0 5 -1 10 -3 10
  -2 0 -3 -5 -3 -10
  0 -5 1 -10 3 -10
  2 0 3 5 3 10
z`,
    BLACK,
    ,
  ]),
  makePart([
    `m -5 20
c 5 7 10 0 10 0`,
    ,
    BLACK,
  ]),
];

export const RAINBOW_INNER_RADIUS = 40;
export const RAINBOW_OUTER_RADIUS = 50;

export function drawRainbow(e: Entity) {
  const [rainbow, rainbowBody]: [Rainbow, DynamicBody] = e.get(
    Rainbow,
    DynamicBody,
  );
  const { position: center } = rainbowBody;
  const { innerRadius, outerRadius, angle } = rainbow;

  // Rounded star
  const points = 8;
  const cpLength = -9.5;
  const { ctx } = Stage.setActiveLayer(LayerName.Game);
  const dphi = (Math.PI * 2) / (points * 2);

  ctx.translate(center.x, center.y);

  let start = new Point(1, 0).scale(outerRadius).rotate(angle);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);

  let lastR = null;
  for (let i = 0, phi = 0; i <= points * 2; i++, phi += dphi) {
    const r = new Point(Math.cos(phi), Math.sin(phi)).rotate(angle);
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

  drawParts(ctx, face);
  ctx.resetTransform();
}
