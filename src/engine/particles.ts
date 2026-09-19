import type { Entity, World } from "../ecs";
import { drawText } from "../utils/CanvasUtils";
import { DEG2RAD, easeIn, lerp, rand, sway } from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import { BLACK, WHITE } from "../utils/SpriteUtils";
import { Interval, Transform, type Transformer } from "../utils/TimeUtils";
import { rgb } from "./color";
import { Sprite, Unicorn, UNICORN_EYES } from "./components";
import { DynamicBody, GRAVITY } from "./Physics2D";
import { LayerName, Stage } from "./Stage";

export function explosionParticles(
  world: World,
  position: Point,
  color = BLACK,
) {
  for (let i = 0; i < 20; i++) {
    const angle = rand(0, 2 * Math.PI);
    const startVelocity = pt(0, 1).rotate(angle).scale(20);

    world.create().add(
      new DynamicBody(position.clone(), {
        startVelocity,
      }),
      FadeTransform(1 / 3),
      new Sprite((e) => drawCircle(e, rand(15, 40), color)),
    );
  }
}

export function bloodParticles(world: World, position: Point) {
  const color = rgb(221, 19, 19);

  for (let i = 0; i < 20; i++) {
    const angle = rand(130 * DEG2RAD, 230 * DEG2RAD);
    const startVelocity = pt(0, 1).rotate(angle).scale(rand(10, 30));

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
      sprite.scale = easeIn(1 - t);
    },
  });

export function sleepyParticle(world: World, position: Point) {
  const angle = rand(135 * DEG2RAD, 165 * DEG2RAD);
  const startVelocity = pt(0, 0.8).rotate(angle);

  const body = new DynamicBody(position.clone(), {
    startVelocity,
  });

  world.create().add(
    body,
    FadeTransform(6),
    new Sprite((e) => {
      const { transparency, scale }: Sprite = e.get(Sprite);
      const alpha = sway(transparency, 2);
      drawText("Z", body.position, {
        size: lerp(8, 22, sway(scale, 2)),
        fill: BLACK.toAlpha(alpha),
        stroke: WHITE.toAlpha(alpha),
        layer: LayerName.Scores,
      });
    }),
  );
}

export function waterParticles(
  world: World,
  unicornBody: DynamicBody,
  unicornData: Unicorn,
  n = 8,
) {
  const color = rgb(225, 243, 255);

  const emitter = Interval(world, 1 / 8, () => {
    const angle = rand(90 * DEG2RAD, 210 * DEG2RAD);
    const startVelocity = pt(0, 1).rotate(angle).scale(rand(10, 30));

    const position = unicornBody.position.add(
      unicornData.facingEast ? UNICORN_EYES : UNICORN_EYES.flip(),
    );

    const body = new DynamicBody(position.clone(), {
      startVelocity,
    });
    body.addForce(GRAVITY);

    const radius = rand(5, 8);

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

export function drawCircle(e: Entity, radius: number, color = rgb(1, 1, 1)) {
  const sprite: Sprite = e.get(Sprite);
  const b: DynamicBody = e.get(DynamicBody);
  const { position: p } = b;

  const { ctx } = Stage.setActiveLayer(LayerName.Game);

  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.closePath();

  ctx.fillStyle = color.toAlpha(sprite.transparency);
  ctx.fill();

  // b.debug("magenta");
}

export function drawSquare(
  e: Entity,
  size: number,
  color = WHITE,
  startAlpha = 1,
  endAlpha = 0,
) {
  const [{ position: p }, { transparency, scale }]: [DynamicBody, Sprite] =
    e.get(DynamicBody, Sprite);

  const { ctx } = Stage.setActiveLayer(LayerName.Particles);

  ctx.fillStyle = color.toAlpha(lerp(startAlpha, endAlpha, transparency));
  ctx.fillRect(p.x - size * 0.5, p.y - size * 0.5, size * scale, size * scale);
}
