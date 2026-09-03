import ecs from "./ecs";
import { DragInput, Hunter, Prey, Sprite, Weapon } from "./engine/components";
import { ElasticLine } from "./engine/ElasticLine";
import { DynamicBody, DynamicBodySystem } from "./engine/Physics2D";
import { Stage } from "./engine/Stage";
import {
  AttackSystem,
  DamageSystem,
  FiredProjectileSystem,
  Render,
  Spawner,
  TargetingSystem,
} from "./engine/systems";
import { Tween, TweenSystem } from "./engine/tween";
import { drawFoal } from "./entities/foal";
import { createSlingshot, SlingshotFrame } from "./entities/slingshot";
import { Castle } from "./scenes/Castle";
import { distribute } from "./utils/MathUtils";
import { Point } from "./utils/Point";
import { type timestamp } from "./utils/TimeUtils";

const { registerComponents, createWorld } = ecs;

registerComponents(
  Hunter,
  Prey,
  DynamicBody,
  SlingshotFrame,
  DragInput,
  ElasticLine,
  Weapon,
  Tween,
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

  requestAnimationFrame(loop);
}

const pipeline = [
  new DynamicBodySystem(world),
  new TweenSystem(world),
  new TargetingSystem(world),
  new AttackSystem(world),
  new DamageSystem(world),
  new Spawner(world),
  new FiredProjectileSystem(world),
  new Render(world),
];

let last = performance.now();

function loop(now: timestamp) {
  const delta = now - last;
  last = now;

  world.update(pipeline, delta * 0.01);
  requestAnimationFrame(loop);
}

init();
