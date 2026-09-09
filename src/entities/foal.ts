import type { Entity } from "../ecs";
import { Health, Prey, START_LIVES } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { distribute } from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import { BLACK, drawParts } from "../utils/SpriteUtils";
import { foal, life } from "./sprites";

export function drawFoal(e: Entity) {
  const size = pt(50);
  const { ctx } = Stage.setActiveLayer(LayerName.Game);

  const [preyData, health, foalBody]: [Prey, Health, DynamicBody] = e.get(
    Prey,
    Health,
    DynamicBody,
  );
  const { position } = foalBody;
  const spritePos = position;

  ctx.translate(spritePos.x, spritePos.y);
  drawParts(ctx, foal);

  function heart(position: Point) {
    ctx.resetTransform();
    ctx.translate(position.x, position.y);
    ctx.lineWidth = 3;

    const heartShape = life[0][0];
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
        heart(pt(x, position.y + 60));
      },
    );

  ctx.resetTransform();
}
