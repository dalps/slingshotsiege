import type { Entity } from "../ecs";
import { rgb, rgba } from "../engine/color";
import { Health, Prey, START_LIVES } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { makeGradient } from "../utils/CanvasUtils";
import { distribute } from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import { BLACK, drawParts } from "../utils/SpriteUtils";
import { foal, life } from "./sprites";

export function drawFoal(e: Entity) {
  const size = pt(50);
  const { ctx } = Stage.setActiveLayer(LayerName.Game);

  const [health, foalBody]: [Health, DynamicBody] = e.get(Health, DynamicBody);
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
    distribute(position.x - offset, position.x + offset, START_LIVES).map(
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

export function drawShadow(position: Point, radius = 60) {
  const { ctx } = Stage.setActiveLayer(LayerName.BG_3);

  ctx.save();
  ctx.translate(position.x, position.y);

  const shadow = makeGradient(
    pt(),
    pt(),
    [BLACK.toAlpha(0), BLACK.toAlpha(0.3)], // rgba(19, 131, 19, 1).toAlpha(0.5)
    [radius, 0],
  );

  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.scale(1, 0.5);
  ctx.fill();
  ctx.restore();
}
