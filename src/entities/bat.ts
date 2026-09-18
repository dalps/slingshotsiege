import type { Entity } from "../ecs";
import { Bat, Hunter } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { popsicle } from "../utils/CanvasUtils";
import { bounce, DEG2RAD } from "../utils/MathUtils";
import { pt } from "../utils/Point";
import { drawParts } from "../utils/SpriteUtils";
import type { Transformer } from "../utils/TimeUtils";
import { bat, batLeftWing } from "./sprites";

export const FLAP_INTERVAL = 0.5;

export const wingFlap: Transformer = {
  duration: FLAP_INTERVAL,
  update(e, stage) {
    const batData: Bat | null = e.get(Bat);
    batData &&
      (batData.wingAngle = -30 * DEG2RAD + bounce(stage, 1, Math.PI / 5));
  },
};

wingFlap.next = wingFlap;

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
    ctx.rotate(hunterData ? hunterData.direction.angle() + Math.PI : 0);

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

    // popsicle(pt(), hunterBody.acceleration, "aliceblue");
    // popsicle(pt(), velocity, "green");
  });
}
