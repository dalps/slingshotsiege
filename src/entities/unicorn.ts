import type { Entity } from "../ecs";
import { Unicorn } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { pt } from "../utils/Point";
import { drawParts } from "../utils/SpriteUtils";
import { adult, expressions } from "./sprites";

export function drawUnicorn(e: Entity) {
  const unicornData: Unicorn = e.get(Unicorn);
  const { position: p }: DynamicBody = e.get(DynamicBody);

  const { ctx, cw, ch } = Stage.setActiveLayer(LayerName.BG_2);

  const size = pt(200);
  ctx.translate(p.x, p.y);
  !unicornData.facingEast && ctx.transform(-1, 0, 0, 1, 0, 0);
  ctx.translate(-size.x * 0.5, -size.y);

  drawParts(ctx, adult);
  drawParts(ctx, expressions[unicornData.expression]);

  // ctx.strokeStyle = "green";
  // ctx.strokeRect(0, 0, size.x, size.y);
  // circle(p, 5);
  ctx.resetTransform();
}
