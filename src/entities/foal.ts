import type { Entity } from "../ecs";
import { rgb } from "../engine/color";
import { Health, Prey, START_LIVES } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { distribute } from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { BLACK, drawParts, url } from "../utils/SpriteUtils";

const FoalParts = {
  body: {
    path: new Path2D(
      `M 31,4 C 6,-3 7,16 18,21 18,21 12,18 9,19 6,20 5,27 5,27 l 6,2 2,-4 c 5,1 10,2 11,1 1,-1 0,-6 -2,-9 22,-4 15,-28 0,-30 -14,-1 -31,4 -32,0 -3,2 0,-1 -11,9 1,6 4,15 13,16 0,0 -4,7 -6,10 l -9,8 7,6 6,-12 13,-12 c 0,0 9,-1 14,2 m -31,-9 -14,5 -12,2 7,6 9,-5 14,-4 z`,
    ),
    fill: rgb(255, 250, 250),
  },
  tail: {
    path: new Path2D(
      `m 33,-6 c 6,-4 12,0 12,6 0,4 0,7 4,7 4,0 -2,7 -7,2 C 40,7 42,3 37,2 34,1 34,-3 33,-6 Z`,
    ),
    fill: url("rainbow"),
  },
  mane: {
    path: new Path2D(
      `m -11,-13 c 1,3 0,10 4,11 3,0 4,-3 5,-5 2,1 7,2 9,-3 2,1 8,1 8,-1 0,-1 -1,-4 -4,-3 0,0 -4,-4 -10,0 0,0 -5,-7 -12,1 z`,
    ),
    fill: url("rainbow"),
  },
  hooves: {
    path: new Path2D(
      `m 5,27 6,2 3,4 -9,1 z m -24,-1 6,4 -3,6 -7,-6 z m -13,-15 5,4 -6,3 -7,-6 z`,
    ),
    fill: rgb(105, 105, 105),
  },
  head: {
    path: new Path2D(
      `m -11,-16 c 4,11 -4,19 -11,18 -22,24 -32,-1 -22,-9 6,-4 8,-11 11,-15 0,0 -5,-8 1,-11 5,3 2,8 3,11 4,-1 8,-1 13,1 0,0 4,-9 11,-6 2,4 -6,11 -6,11 z`,
    ),
    fill: rgb(255, 250, 250),
  },
  nose: {
    path: new Path2D(
      `m -41,-9 c 0,0 10,7 13,16 0,2 -8,10 -18,3 -9,-7 1,-18 5,-19 z`,
    ),
    fill: rgb(255, 191, 175),
  },
  face: {
    path: new Path2D(
      `m -47,8 c 3,0 3,1 3,1 m 8,-20 c -3,2 -3,-1 -3,-1 m 18,4 c -2,3 -5,0 -5,0`,
    ),
    stroke: BLACK,
  },
  foretop: {
    path: new Path2D(
      `m -29,-22 c 0,0 -4,1 -2,4 3,3 13,0 15,-3 -1,-1 -15,-7 -13,-1 z`,
    ),
    fill: url("rainbow"),
  },
  nostril: {
    path: new Path2D(
      `m -46,0 c 0,0 0,1 -1,1 -1,0 -1,-1 -1,-1 0,0 0,-1 1,-1 1,0 1,1 1,1 z m 9,6 c 0,0 0,1 -1,1 -1,0 -1,-1 -1,-1 0,0 0,-1 1,-1 1,0 1,1 1,1 z`,
    ),
    fill: rgb(182, 145, 136),
  },
};

export function drawFoal(e: Entity) {
  const size = new Point(50);
  const { ctx } = Stage.setActiveLayer("game");

  const [preyData, health, foalBody]: [Prey, Health, DynamicBody] = e.get(
    Prey,
    Health,
    DynamicBody,
  );
  const { position } = foalBody;
  const spritePos = position;

  ctx.translate(spritePos.x, spritePos.y);
  drawParts(ctx, FoalParts);

  const heartShape = new Path2D(
    `M 0.5 7.9 C -12.1 -1.2 -9.4 -6.4 -7.1 -7.5 c 4 -1.5 6.5 1.5 6.5 1.5 0 0 2.3 -2.1 5.1 -1.9 2.7 0.4 6.1 4.6 3.6 7.8 C 5.6 3.1 1.6 4.1 0.5 7.9 Z`,
  );

  function heart(position: Point) {
    ctx.resetTransform();
    ctx.translate(position.x, position.y);
    ctx.lineWidth = 3;

    ctx.fill(heartShape);
    ctx.stroke(heartShape);
    // circle(position, 5, "blue");
  }

  const offset = 30;
  health &&
    distribute(
      position.x - offset,
      position.x + offset,
      START_LIVES,
      (x, idx) => {
        if (idx + 1 <= health.lives) {
          ctx.strokeStyle = BLACK;
          ctx.fillStyle = "#ff9ec5";
        } else {
          ctx.strokeStyle = "#666";
          ctx.fillStyle = "#444";
        }
        heart(new Point(x, position.y + 60));
      },
    );

  ctx.resetTransform();
}
