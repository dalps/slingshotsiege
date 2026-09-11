import type { Entity, World } from "../ecs";
import { DEG2RAD, lerp } from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import { BLACK, WHITE } from "../utils/SpriteUtils";
import { Interval, Transform } from "../utils/TimeUtils";
import { rgb } from "./color";
import { Sprite, Unicorn, UNICORN_EYES } from "./components";
import { DynamicBody, GRAVITY } from "./Physics2D";
import { LayerName, Stage } from "./Stage";

export function deathParticles(world: World, position: Point) {
  for (let i = 0; i < 20; i++) {
    const angle = lerp(0, 2 * Math.PI, Math.random());
    const startVelocity = pt(0, 1).rotate(angle).scale(20);

    world.create().add(
      new DynamicBody(position.clone(), {
        startVelocity,
      }),
      FadeTransform(1 / 3),
      new Sprite((e) => drawCircle(e, lerp(15, 40, Math.random()))),
    );
  }
}

export function bloodParticles(world: World, position: Point) {
  const color = rgb(221, 19, 19);

  for (let i = 0; i < 20; i++) {
    const angle = lerp(130 * DEG2RAD, 230 * DEG2RAD, Math.random());
    const startVelocity = pt(0, 1)
      .rotate(angle)
      .scale(lerp(10, 30, Math.random()));

    const body = new DynamicBody(position.clone(), {
      startVelocity,
    });
    body.addForce(GRAVITY);

    world
      .create()
      .add(body, FadeTransform(), new Sprite((e) => drawCircle(e, 10, color)));
  }
}

export const FadeTransform = (duration = 0.5): Transform =>
  new Transform({
    duration,
    end(e) {
      e.delete();
    },
    update(e, t) {
      const sprite: Sprite = e.get(Sprite);
      sprite.transparency = 1 - t;
      sprite.scale *= t;
    },
  });

export function waterParticles(
  world: World,
  unicornBody: DynamicBody,
  unicornData: Unicorn,
  n = 8,
) {
  const color = rgb(225, 243, 255);

  const emitter = Interval(world.create(), 1 / 8, () => {
    const angle = lerp(90 * DEG2RAD, 210 * DEG2RAD, Math.random());
    const startVelocity = pt(0, 1)
      .rotate(angle)
      .scale(lerp(10, 30, Math.random()));

    const position = unicornBody.position.add(
      unicornData.facingEast ? UNICORN_EYES : UNICORN_EYES.flip(),
    );

    const body = new DynamicBody(position.clone(), {
      startVelocity,
    });
    body.addForce(GRAVITY);

    const radius = lerp(5, 8, Math.random());

    world
      .create()
      .add(
        body,
        FadeTransform(),
        new Sprite((e) => drawCircle(e, radius, color)),
      );

    if (n-- <= 0) emitter.delete();
  });
  return emitter;
}

function rainbowParticle(e: Entity) {}

export function drawCircle(e: Entity, radius: number, color = rgb(1, 1, 1)) {
  const sprite: Sprite = e.get(Sprite);
  const b: DynamicBody = e.get(DynamicBody);
  const { position: p } = b;

  const { ctx } = Stage.setActiveLayer(LayerName.Game);

  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.closePath();

  ctx.fillStyle = color.setAlpha(sprite.transparency);
  ctx.fill();

  // b.debug("magenta");
}

export function drawSquare(e: Entity, size: number, color = WHITE) {
  const sprite: Sprite = e.get(Sprite);
  const b: DynamicBody = e.get(DynamicBody);
  const { position: p } = b;

  const { ctx } = Stage.setActiveLayer(LayerName.Game);

  ctx.fillStyle = color.setAlpha(sprite.transparency);
  ctx.fillRect(p.x - size * 0.5, p.y - size * 0.5, size, size);
}
