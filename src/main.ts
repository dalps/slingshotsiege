import ecs from "./ecs";
import { Hunter, Prey, Sprite, Weapon } from "./engine/components";
import { ElasticLine } from "./engine/ElasticLine";
import { DynamicBody, DynamicBodySystem } from "./engine/Physics2D";
import { Stage } from "./engine/Stage";
import {
  AttackSystem,
  DamageSystem,
  Render,
  Spawner,
  TargetingSystem,
} from "./engine/systems";
import { createSlingshot, Sling } from "./entities/Sling";
import { Castle } from "./scenes/Castle";
import { distribute } from "./utils/MathUtils";
import { Point } from "./utils/Point";
import { Clock, type timestamp } from "./utils/TimeUtils";

const { registerComponents, createWorld } = ecs;

registerComponents(Hunter, Prey, DynamicBody, Weapon, Sprite);

const world = createWorld();

function init() {
  Stage.init();
  Castle.init();

  Stage.fitLayersToStage();
  Castle.draw();

  createSlingshot(world);

  const { cw, ch } = Stage.setActiveLayer("game");
  const length = 0.8;
  const offset = cw * (1 - length) * 0.5;

  distribute(offset, cw * length, 4, (x, idx) => {
    world.create().add(new Prey(), new DynamicBody(new Point(x, ch * 0.8)));
  });

  requestAnimationFrame(loop);
}

const pipeline = [
  new DynamicBodySystem(world),
  new TargetingSystem(world),
  new AttackSystem(world),
  new DamageSystem(world),
  new Spawner(world),
  new Render(world),
];

let last = performance.now();

function loop(now: timestamp) {
  Clock.update(now * 0.01);
  const delta = now - last;
  last = now;

  world.update(pipeline, delta * 0.001);
  requestAnimationFrame(loop);
}

init();
