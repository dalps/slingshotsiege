import type { Entity, World } from "../ecs";
import { DEG2RAD, lerp } from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { Transform } from "../utils/TimeUtils";
import { rgba } from "./color";
import { Sprite } from "./components";
import { DynamicBody, GRAVITY } from "./Physics2D";
import { LayerName, Stage } from "./Stage";

export function deathParticles(world: World, position: Point) {
  function drawCircle(e: Entity) {
    const sprite: Sprite = e.get(Sprite);
    const b: DynamicBody = e.get(DynamicBody);
    const { position: p } = b;

    const { ctx } = Stage.setActiveLayer(LayerName.Game);
    const color = rgba(1, 1, 1, 1);
    ctx.beginPath();
    ctx.arc(p.x, p.y, lerp(15, 40, Math.random()), 0, Math.PI * 2);
    ctx.closePath();

    ctx.fillStyle = color.setAlpha(sprite.transparency);
    ctx.fill();

    // b.debug("magenta");
  }

  for (let i = 0; i < 20; i++) {
    const angle = lerp(0, 2 * Math.PI, Math.random());
    const startVelocity = new Point(0, 1).rotate(angle).scale(20);

    world.create().add(
      new DynamicBody(position.clone(), {
        startVelocity,
      }),
      new Transform({
        duration: 1 / 3,
        end(e) {
          e.delete();
        },
        update(e, t) {
          const sprite: Sprite = e.get(Sprite);
          sprite.transparency = 1 - t;
          sprite.scale *= t;
        },
      }),
      new Sprite(drawCircle),
    );
  }
}

export function bloodParticles(world: World, position: Point) {
  function drawCircle(e: Entity) {
    const sprite: Sprite = e.get(Sprite);
    const b: DynamicBody = e.get(DynamicBody);
    const { position: p } = b;

    const { ctx } = Stage.setActiveLayer(LayerName.Game);
    const color = rgba(221, 19, 19, 1);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.closePath();

    ctx.fillStyle = color.setAlpha(sprite.transparency);
    ctx.fill();

    // b.debug("magenta");
  }

  for (let i = 0; i < 20; i++) {
    const angle = lerp(130 * DEG2RAD, 230 * DEG2RAD, Math.random());
    const startVelocity = new Point(0, 1)
      .rotate(angle)
      .scale(lerp(10, 30, Math.random()));

    const body = new DynamicBody(position.clone(), {
      startVelocity,
    });
    body.addForce(GRAVITY);

    world.create().add(
      body,
      new Transform({
        duration: 0.5,
        end(e) {
          e.delete();
        },
        update(e, t) {
          const sprite: Sprite = e.get(Sprite);
          sprite.transparency = 1 - t;
          sprite.scale *= t;
        },
      }),
      new Sprite(drawCircle),
    );
  }
}

function drawSquare(e: Entity) {}
