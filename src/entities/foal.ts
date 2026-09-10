import type { Entity } from "../ecs";
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

  // shadow
  foalGroove(ctx, e);

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

export function foalGroove(ctx: CanvasRenderingContext2D) {
  const radii: [number, number] = [181, 175];
  const shadow = makeGradient(
    pt(0, 20),
    pt(0, 20),
    [BLACK.toAlpha(0), BLACK.toAlpha(0.3)],
    [60, 15],
  );

  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(0, 0, ...radii, 0, 0, Math.PI * 2);
  ctx.closePath();
  ctx.save();
  ctx.scale(1, 0.5);
  ctx.fill();
  ctx.restore();
}
