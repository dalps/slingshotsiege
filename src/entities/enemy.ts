import type { Entity } from "../ecs";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { drawParts } from "../utils/SpriteUtils";
import { wraith } from "./sprites";

export function drawEnemy(e: Entity) {
  Stage.drawOnLayer(LayerName.Game, (ctx) => {
    const { position: p, velocity } = e.get(DynamicBody);
    ctx.translate(p.x, p.y);
    // ctx.fillText(`${hunterData.distance?.toPrecision(5)}`, -size.x * 0.5, 100);
    ctx.rotate(velocity.angle() + Math.PI);
    drawParts(ctx, wraith);
    // circle(position, 5);
    // popsicle(p, p.add(velocity), "green");
  });
}
