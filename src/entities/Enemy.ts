import type { Entity } from "../ecs";
import { Hunter } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { popsicle } from "../utils/CanvasUtils";
import { Point } from "../utils/Point";

export function drawEnemy(e: Entity) {
  const { ctx } = Stage.setActiveLayer("game");

  const [hunterData, hunterBody]: [Hunter, DynamicBody] = e.get(
    Hunter,
    DynamicBody,
  );

  const { position, velocity } = hunterBody;
  const size = new Point(50, 70);

  ctx.fillStyle = "#222";

  ctx.translate(position.x, position.y);
  ctx.fillText(`${hunterData.distance?.toPrecision(5)}`, -size.x * 0.5, 100);
  ctx.rotate(velocity.angle());
  ctx.fillRect(-size.x * 0.5, -size.y * 0.5, size.x, size.y);
  ctx.resetTransform();

  popsicle(position, position.add(velocity), "green");
}
