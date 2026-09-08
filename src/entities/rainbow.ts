import type { Entity } from "../ecs";
import { Rainbow } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { circle } from "../utils/CanvasUtils";
import { Point } from "../utils/Point";
import {
  BLACK,
  drawParts,
  makePart,
  WHITE,
  type DrawingPart,
} from "../utils/SpriteUtils";

const body = makePart([
  `M 85 65
C 81 73 88 77 83 83
C 77 89 73 82 65 85
C 57 89 59 96 50 96
C 41 96 43 89 35 85
C 27 81 23 89 17 83
C 11 77 18 73 15 65
C 11 57 4 59 4 50
C 4 41 11 43 15 35
C 19 27 11 23 17 17
C 23 11 26 18 35 15
C 43 11 41 4 50 4
C 59 4 57 11 65 15
C 73 19 77 11 83 17
C 89 23 82 27 85 35
C 89 43 96 41 96 50
C 96 59 89 57 85 65
Z`,
  ,
  WHITE,
]);
const face: DrawingPart[] = [
  makePart([
    `m 40 50
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
    `m 45 70
c 5 7 10 0 10 0`,
    ,
    BLACK,
  ]),
];

export function drawRainbow(e: Entity) {
  const [rainbow, rainbowBody]: [Rainbow, DynamicBody] = e.get(
    Rainbow,
    DynamicBody,
  );
  const { position: center } = rainbowBody;
  const { innerRadius, outerRadius } = rainbow;

  const angle = 0;
  const points = 8;
  const { ctx } = Stage.setActiveLayer(LayerName.Game);
  const dphi = (Math.PI * 2) / (points * 2);

  ctx.translate(center.x, center.y);
  
  const start = new Point(1, 0).scale(outerRadius);
  circle(start, 5)
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);

  for (let i = 0, phi = 0; i < points * 2; i++, phi += dphi) {
    const r = new Point(Math.cos(phi), Math.sin(phi));
    const q = r.scale(i % 2 === 0 ? outerRadius : innerRadius);
    // p = p.rotate(angle);
    const p = q;

    const cpLength = 0.5;
    let cp1 = r.perp().scale(cpLength);
    let cp2 = r.perp().scale(-cpLength);

    ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p.x, p.y);
  }

  ctx.closePath();

  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.strokeStyle = BLACK;
  ctx.stroke();

  drawParts(ctx, face);
  ctx.resetTransform();
}
