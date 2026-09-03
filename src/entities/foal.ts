import type { Entity } from "../ecs";
import { Prey, START_LIVES } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { circle } from "../utils/CanvasUtils";
import { distribute } from "../utils/MathUtils";
import { Point } from "../utils/Point";

export function drawFoal(e: Entity) {
  const size = new Point(50);
  const { ctx } = Stage.setActiveLayer("game");

  const [preyData, foalBody]: [Prey, DynamicBody] = e.get(Prey, DynamicBody);
  const { position } = foalBody;
  ctx.translate(position.x, position.y);
  ctx.fillStyle = "white";
  ctx.fillRect(-size.x * 0.5, -size.y * 0.5, size.x, size.y);

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
  distribute(
    position.x - offset,
    position.x + offset,
    START_LIVES,
    (x, idx) => {
      if (idx + 1 <= preyData.lives) {
        ctx.strokeStyle = "black";
        ctx.fillStyle = "#ff9ec5";
      } else {
        ctx.strokeStyle = "#666";
        ctx.fillStyle = "#444";
      }
      heart(new Point(x, position.y + 60));
    },
  );

  ctx.resetTransform();

  circle(position, 5);
}
