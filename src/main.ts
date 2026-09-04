import ecs, { Entity } from "./ecs";
import {
  DragInput,
  Hunter,
  Prey,
  Score,
  Sprite,
  Unicorn,
  Weapon,
} from "./engine/components";
import { ElasticLine } from "./engine/ElasticLine";
import { DynamicBody, DynamicBodySystem } from "./engine/Physics2D";
import { huguesNo5 } from "./engine/sfx";
import { LayerName, Stage } from "./engine/Stage";
import {
  AttackSystem,
  DamageSystem,
  FiredProjectileSystem,
  ReloadSystem,
  Render,
  Spawner,
  TargetingSystem,
} from "./engine/systems";
import { zzfxM } from "./engine/zzfxm";
import { drawFoal } from "./entities/foal";
import { createSlingshot, SlingshotFrame } from "./entities/slingshot";
import { drawUnicorn } from "./entities/unicorn";
import { Castle } from "./scenes/Castle";
import { distribute } from "./utils/MathUtils";
import { Point } from "./utils/Point";
import {
  TIME_SCALE,
  Transform,
  TransformSystem,
  type timestamp,
} from "./utils/TimeUtils";

const { registerComponents, createWorld } = ecs;

registerComponents(
  Hunter,
  Prey,
  Score,
  DynamicBody,
  SlingshotFrame,
  DragInput,
  ElasticLine,
  Weapon,
  Unicorn,
  Transform,
  Sprite,
);

const world = createWorld();

function init() {
  Stage.init();

  Castle.draw();
  Stage.addResizeListener(Castle.draw);

  createSlingshot(world);

  const { cw, ch } = Stage.setActiveLayer("game");
  const length = 0.8;
  const offset = cw * (1 - length) * 0.5;

  distribute(offset, cw * length, 4, (x, idx) => {
    world.create().add(
      new Prey(),
      new DynamicBody(new Point(x, ch * 0.8), {
        // startVelocity: new Point((-1 + 2 * Math.random()) * 10, 0),
      }),
      new Sprite(drawFoal),
    );
  });

  const unicorn = world.create().add(
    new DynamicBody(new Point(200, ch * 0.7), {
      // startVelocity: new Point(2, 0),
    }),
    new Unicorn(),
    new Sprite(drawUnicorn),
  );

  const score = world.create().add(new Score(), new Sprite(drawTotalScore));

  const songData = zzfxM(...huguesNo5);
  // const audioNode = zzfxP(...songData);

  requestAnimationFrame(loop);
}

const pipeline = [
  new DynamicBodySystem(world),
  new TransformSystem(world),
  new TargetingSystem(world),
  new AttackSystem(world),
  new DamageSystem(world),
  new Spawner(world),
  new ReloadSystem(world),
  new FiredProjectileSystem(world),
  new Render(world),
];

let last = performance.now();

function loop(now: timestamp) {
  let delta = now - last;
  last = now;

  // Don't let delta get too big (happens e.g. when the user switches tab)
  if (delta > 1000) {
    delta = 1000 / 60;
  }

  world.update(pipeline, delta * TIME_SCALE);
  requestAnimationFrame(loop);
}

init();

function drawTotalScore(e: Entity) {
  const { totalScore }: Score = e.get(Score);
  const { ctx, ch, cw } = Stage.setActiveLayer(LayerName.Game);

  ctx.font = "bold 32px sans-serif";
  const text = `Score ${totalScore}`;
  const metrics = ctx.measureText(text);
  const margin = 10;
  const { x, y } = new Point(
    cw - metrics.width - margin,
    metrics.emHeightAscent + margin,
  );
  ctx.fillStyle = "white";
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.fillText(text, x, y);
  ctx.strokeText(text, x, y);
}
