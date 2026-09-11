import type { Entity } from "../ecs";
import { Hunter } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { circle } from "../utils/CanvasUtils";
import { drawParts } from "../utils/SpriteUtils";
import { bat } from "./sprites";

export function drawBat(e: Entity) {
  const { ctx } = Stage.setActiveLayer(LayerName.Game);

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
  drawParts(ctx, bat);
  const head = 2;
  const eyes = 4;
  const body = 1;
  ctx.stroke(bat[head][0]);
  ctx.save();
  ctx.clip(bat[eyes][0]);
  ctx.stroke(bat[body][0]);
  ctx.restore();
  // circle(position, 5);
  ctx.resetTransform();

  // popsicle(position, position.add(velocity), "green");
}
