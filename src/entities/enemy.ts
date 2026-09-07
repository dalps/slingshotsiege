import type { Entity } from "../ecs";
import { rgb } from "../engine/color";
import { Hunter } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { circle } from "../utils/CanvasUtils";
import { drawParts } from "../utils/SpriteUtils";

const WraithParts = {
  body: {
    path: new Path2D(
      `M -7,30 -27,42 V 22 l -8,1 5,-13 -20,-18 16,-2 -3,-8 7,-2 c 0,0 -14,-10 -14,-26 0,-17 22,-45 0,-40 26,-23 15,28 17,36 1,9 13,17 13,17 7,-12 -3,-13 -3,-13 10,-7 17,7 17,7 0,0 7,-13 17,-7 0,0 -11,1 -3,13 0,0 12,-8 13,-17 1,-9 -10,-59 17,-36 -22,-6 0,23 0,40 0,17 -14,26 -14,26 l 7,2 -3,8 16,2 -20,18 5,13 -8,-1 V 42 L 7,30 0,38 Z`,
    ),
    fill: rgb(0, 0, 0),
    stroke: rgb(255, 69, 0),
  },
  face: {
    path: new Path2D(
      `M 9,1 C 5,9 4,15 6,16 8,17 13,13 17,6 21,-1 23,-9 21,-10 19,-11 13,-7 9,1 Z M -9,1 c 4,8 5,14 3,15 -2,1 -7,-3 -11,-10 -4,-7 -6,-15 -4,-16 2,-1 8,3 12,11 z m -16,6 13,15 5,-2 7,3 7,-3 5,2 13,-15 -13,18 -5,-2 -7,5 -7,-5 -5,2 z`,
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
  const p = position;
  ctx.translate(p.x, p.y);
  // ctx.fillText(`${hunterData.distance?.toPrecision(5)}`, -size.x * 0.5, 100);
  ctx.rotate(velocity.angle() + Math.PI);
  drawParts(ctx, WraithParts);
  // circle(position, 5);
  ctx.resetTransform();

  // popsicle(position, position.add(velocity), "green");
}
