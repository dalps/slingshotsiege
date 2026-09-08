import type { Entity } from "../ecs";
import { rgb } from "../engine/color";
import { Hunter } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { circle } from "../utils/CanvasUtils";
import { BLACK, drawParts } from "../utils/SpriteUtils";

const VIOLET = rgb(94, 50, 147);

const BatParts = {
  wings: {
    path: new Path2D(
      `M -23 -17 C -48 -16 -49 0 -49 0 C -46 -2 -38 0 -38 10 C -31 5 -26 10 -26 16 C -23 12 -17 13 -15 19 C -6 21 8 6 0 -2 C 0 -2 -19 0 -23 -17 Z M 23 -17 C 48 -16 49 0 49 0 C 46 -2 38 0 38 10 C 31 5 26 10 26 16 C 23 12 17 13 15 19 C 6 21 -8 6 0 -2 C 0 -2 19 0 23 -17 Z`,
    ),
    fill: VIOLET,
    stroke: BLACK,
  },
  body: {
    path: new Path2D(`M 0 20 C -10 20 -14 -7 0 -7 C 14 -7 10 20 0 20 Z`),
    fill: VIOLET,
    stroke: BLACK,
  },
  head: {
    path: new Path2D(
      `M -3 -24 C -5 -21 -19 -15 -10 -10 C -16 -4 -8 3 0 3 C 8 3 16 -4 10 -10 C 19 -15 5 -21 3 -24 C 4 -15 3 -11 3 -11 L 0 -11 L -3 -11 C -3 -11 -4 -15 -3 -24 Z`,
    ),
    fill: VIOLET,
    // stroke: BLACK,
  },
  feet: {
    path: new Path2D(
      `M -3 24 C -3 25 -8 20 -8 20 C -8 20 -15 19 -15 18 L -8 17 L -5 10 C -4 11 -5 18 -5 18 C -5 18 -2 24 -3 24 Z M 3 24 C 3 25 8 20 8 20 C 8 20 15 19 15 18 L 8 17 L 5 10 C 4 11 5 18 5 18 C 5 18 2 24 3 24 Z`,
    ),
    fill: VIOLET,
    stroke: BLACK,
  },
  eyes: {
    path: new Path2D(
      `M -10 -10 L -2 -2 C -9 -2 -11 -5 -10 -10 Z M 10 -10 L 2 -2 C 9 -2 11 -5 10 -10 Z`,
    ),
    fill: rgb(130, 255, 82),
  },
  ears: {
    path: new Path2D(
      `M -3 -24 C -5 -18 -12 -14 -9 -12 C -6 -10 -3 -11 -3 -11 C -5 -16 -3 -24 -3 -24 Z M 3 -24 C 5 -18 12 -14 9 -12 C 6 -10 3 -11 3 -11 C 5 -16 3 -24 3 -24 Z`,
    ),
    fill: rgb(255, 37, 255),
  },
  fangs: {
    path: new Path2D(
      `M -7 1 C -8 2 -7 4 -7 4 C -7 4 -6 2 -5 2 Z M 7 1 C 8 2 7 4 7 4 C 7 4 6 2 5 2 Z`,
    ),
    fill: rgb(255, 37, 255),
  },
  nose: {
    path: new Path2D(
      `M 2,0 C 2,1 1,1 0,1 -1,1 -2,1 -2,0 c 0,-1 1,-1 2,-1 1,0 2,0 2,1 z`,
    ),
    fill: rgb(255, 37, 255),
  },
};

export function drawBat(e: Entity) {
  const { ctx } = Stage.setActiveLayer("game");

  const [hunterData, hunterBody]: [Hunter, DynamicBody] = e.get(
    Hunter,
    DynamicBody,
  );

  // todo: animate wings

  const { position, velocity } = hunterBody;
  circle(position, 5);
  const p = position;
  ctx.translate(p.x, p.y);
  // ctx.rotate(velocity.angle() + Math.PI);
  drawParts(ctx, BatParts);
  ctx.stroke(BatParts.head.path);
  ctx.save();
  ctx.clip(BatParts.eyes.path);
  ctx.stroke(BatParts.body.path);
  ctx.restore();
  // circle(position, 5);
  ctx.resetTransform();

  // popsicle(position, position.add(velocity), "green");
}
