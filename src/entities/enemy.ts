import type { Entity } from "../ecs";
import { Hunter } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { drawParts } from "../utils/SpriteUtils";
import { wraith } from "./sprites";

export function drawEnemy(e: Entity) {
  const { ctx } = Stage.setActiveLayer(LayerName.Game);

  const [hunterData, hunterBody]: [Hunter, DynamicBody] = e.get(
    Hunter,
    DynamicBody,
  );

  const { position: p, velocity } = hunterBody;
  ctx.translate(p.x, p.y);
  // ctx.fillText(`${hunterData.distance?.toPrecision(5)}`, -size.x * 0.5, 100);
  ctx.rotate(velocity.angle() + Math.PI);
  drawParts(ctx, wraith);
  // circle(position, 5);
  ctx.resetTransform();

  // popsicle(position, position.add(velocity), "green");
}
