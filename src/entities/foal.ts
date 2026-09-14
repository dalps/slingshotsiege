import type { Entity } from "../ecs";
import { Health, START_LIVES } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { makeGradient } from "../utils/CanvasUtils";
import { distribute } from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import { BLACK, drawParts, GRAY4, GRAY6, PINK } from "../utils/SpriteUtils";
import { foal, life } from "./sprites";

export function drawFoal(e: Entity) {
  Stage.drawOnLayer(LayerName.Game, (ctx) => {
    const [health, foalBody]: [Health, DynamicBody] = e.get(
      Health,
      DynamicBody,
    );
    const { position } = foalBody;
    const spritePos = position;

    ctx.translate(spritePos.x, spritePos.y);

    drawParts(ctx, foal);

    function heart(position: Point, [fill, stroke]) {
      ctx.save();
      ctx.translate(position.x, position.y);
      ctx.lineWidth = 3;

      const heartShape = life[0][0];
      ctx.strokeStyle = fill;
      ctx.fillStyle = stroke;
      ctx.fill(heartShape);
      ctx.stroke(heartShape);
      ctx.restore();
    }

    const offset = 30;

    health &&
      distribute(-offset, +offset, START_LIVES).map((x, idx) =>
        heart(
          pt(x, 60),
          idx + 1 <= health.lives ? [BLACK, PINK] : [GRAY6, GRAY4],
        ),
      );
  });
}

export function drawShadow(position: Point, radius = 60) {
  Stage.drawOnLayer(LayerName.BrickWall, (ctx) => {
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
  });
}
