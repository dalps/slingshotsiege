import ecs from "./ecs";
import {
  CircleCollider,
  Enemy,
  Hunter,
  Position,
  Prey,
  Sprite,
  Velocity,
  Weapon,
} from "./engine/components";
import { Stage } from "./engine/Stage";
import {
  AttackSystem,
  DamageSystem,
  MovementSystem,
  Render,
  Spawner,
} from "./engine/systems";
import { Sling } from "./entities/Sling";
import { Castle } from "./scenes/Castle";
import { distribute } from "./utils/MathUtils";
import { Clock, type timestamp } from "./utils/TimeUtils";

const { registerComponents, createWorld } = ecs;

registerComponents(
  Position,
  Velocity,
  Hunter,
  Prey,
  CircleCollider,
  Weapon,
  Enemy,
  Sprite,
);

const world = createWorld();

function init() {
  Stage.init();
  Castle.init();
  Sling.init();

  Stage.fitLayersToStage();
  Castle.draw();

  Sling.draw();

  const { cw, ch } = Stage.setActiveLayer("game");
  const length = 0.8;
  const offset = cw * (1 - length) * 0.5;

  distribute(offset, cw * length, 4, (x, idx) => {
    world
      .create()
      .add(new Prey(), new CircleCollider(), new Position(x, ch * 0.8));
  });

  requestAnimationFrame(loop);
}

const pipeline = [
  new MovementSystem(world),
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

  world.update(pipeline, delta);
  requestAnimationFrame(loop);
}

init();
