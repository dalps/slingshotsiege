import type { Entity } from "../ecs";
import { Bat, Hunter } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { bounce, DEG2RAD } from "../utils/MathUtils";
import { drawParts } from "../utils/SpriteUtils";
import type { Transformer } from "../utils/TimeUtils";
import { bat, batLeftWing } from "./sprites";

export const wingFling: Transformer = {
  duration: 0.2,
  update(e, stage) {
    const batData: Bat | null = e.get(Bat);
    batData &&
      (batData.wingAngle = -30 * DEG2RAD + bounce(stage, 1, Math.PI / 5));
  },
};

wingFling.next = wingFling;

export function drawBat(e: Entity) {
  Stage.drawOnLayer(LayerName.Game, (ctx) => {
    const [hunterData, batData, hunterBody]: [Hunter, Bat, DynamicBody] = e.get(
      Hunter,
      Bat,
      DynamicBody,
    );

    const { position, velocity } = hunterBody;
    // circle(position, 5);
    const p = position;
    ctx.translate(p.x, p.y);
    ctx.rotate(velocity.angle() + Math.PI);

    // The wings
    {
      ctx.save();
      ctx.rotate(batData.wingAngle);
      drawParts(ctx, batLeftWing);
      ctx.restore();
    }
    {
      ctx.save();
      ctx.transform(-1, 0, 0, 1, 0, 0);
      ctx.rotate(batData.wingAngle);
      drawParts(ctx, batLeftWing);
      ctx.restore();
    }

    drawParts(ctx, bat);

    // The eyes
    const body = 0;
    const head = 1;
    const eyes = 3;
    ctx.stroke(bat[head][0]);
    ctx.save();
    ctx.clip(bat[eyes][0]);
    ctx.stroke(bat[body][0]);
    ctx.restore();
  });

  // circle(position, 5);

  // popsicle(position, position.add(velocity), "green");
}
