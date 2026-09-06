import type { Entity } from "../ecs";
import { rgb } from "../engine/color";
import { Hunter } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { circle, popsicle } from "../utils/CanvasUtils";
import { Point } from "../utils/Point";
import { drawParts } from "../utils/SpriteUtils";

const WraithParts = {
  body: {
    path: new Path2D(
      `m 93,155 -20,12 v -20 l -8,1 5,-13 -20,-18 16,-2 -3,-8 7,-2 C 70,105 56,95 56,79 56,62 78,34 56,39 82,16 71,67 73,75 c 1,9 13,17 13,17 7,-12 -3,-13 -3,-13 10,-7 17,7 17,7 0,0 7,-13 17,-7 0,0 -11,1 -3,13 0,0 12,-8 13,-17 1,-9 -10,-59 17,-36 -22,-6 0,23 0,40 0,17 -14,26 -14,26 l 7,2 -3,8 16,2 -20,18 5,13 -8,-1 v 20 l -20,-12 -7,8 z`,
    ),
    fill: rgb(0, 0, 0),
    stroke: rgb(0, 0, 0),
  },
  face: {
    path: new Path2D(
      `m 109,126 c -4,8 -5,14 -3,15 2,1 7,-3 11,-10 4,-7 6,-15 4,-16 -2,-1 -8,3 -12,11 z m -18,0 c 4,8 5,14 3,15 -2,1 -7,-3 -11,-10 -4,-7 -6,-15 -4,-16 2,-1 8,3 12,11 z m -16,6 13,15 5,-2 7,3 7,-3 5,2 13,-15 -13,18 -5,-2 -7,5 -7,-5 -5,2 z`,
    ),
    fill: rgb(255, 69, 0),
  },
};

export function drawEnemy(e: Entity) {
  const { ctx } = Stage.setActiveLayer("game");

  const [hunterData, hunterBody]: [Hunter, DynamicBody] = e.get(
    Hunter,
    DynamicBody,
  );

  const { position, velocity } = hunterBody;
  circle(position, 5);
  const p = position.add(new Point(-100, -123));
  ctx.translate(p.x, p.y);
  // ctx.fillText(`${hunterData.distance?.toPrecision(5)}`, -size.x * 0.5, 100);
  ctx.rotate(velocity.angle() + Math.PI);
  drawParts(ctx, WraithParts);
  circle(position, 5);
  ctx.resetTransform();

  // popsicle(position, position.add(velocity), "green");
}
