import ecs from "./ecs";
import {
  DragInput,
  Frozen,
  Game,
  Health,
  Hunter,
  Prey,
  Rainbow,
  Score,
  Spawner,
  Sprite,
  Unicorn,
  Weapon
} from "./engine/components";
import { ElasticLine } from "./engine/ElasticLine";
import { DynamicBody, DynamicBodySystem } from "./engine/Physics2D";
import { LayerName, Stage } from "./engine/Stage";
import {
  AttackSystem,
  DamageSystem,
  FiredProjectileSystem,
  GameCycle,
  RainbowMovement,
  RainbowSystem,
  ReloadSystem,
  Render,
  spawnFoals,
  TargetingSystem,
} from "./engine/systems";
import { createSlingshot, SlingshotFrame } from "./entities/slingshot";
import { drawUnicorn } from "./entities/unicorn";
import { Castle } from "./scenes/Castle";
import { pt } from "./utils/Point";
import { initGradients } from "./utils/SpriteUtils";
import {
  TIME_SCALE,
  Transform,
  TransformSystem,
  type timestamp,
} from "./utils/TimeUtils";

// generateSprites();

const { registerComponents, createWorld } = ecs;

registerComponents(
  Hunter,
  Health,
  Frozen,
  Prey,
  Score,
  Game,
  Spawner,
  DynamicBody,
  SlingshotFrame,
  DragInput,
  ElasticLine,
  Weapon,
  Rainbow,
  Unicorn,
  Transform,
  Sprite,
);

const world = createWorld();

const gameCycle = new GameCycle(world);

function init() {
  Stage.init();
  Stage.setActiveLayer(LayerName.BG_1);
  initGradients();

  Castle.draw();
  Stage.addResizeListener(Castle.draw);

  createSlingshot(world);
  spawnFoals(world);

  const { cw, ch } = Stage.setActiveLayer(LayerName.Game);

  const unicorn = world.create().add(
    new DynamicBody(pt(200, ch * 0.7), {
      // startVelocity: pt(2, 0),
    }),
    new Unicorn(),
    new Sprite(drawUnicorn),
  );

  const game = world.create().add(new Game());

  gameCycle.menu();

  requestAnimationFrame(loop);
}

const pipeline = [
  new DynamicBodySystem(world),
  new TransformSystem(world),
  new TargetingSystem(world),
  new AttackSystem(world),
  new DamageSystem(world),
  new ReloadSystem(world),
  new RainbowSystem(world),
  new RainbowMovement(world),
  new FiredProjectileSystem(world),
  new Render(world),
  gameCycle,
];

let last = performance.now();

function loop(now: timestamp) {
  let delta = now - last;
  last = now;

  // Don't let delta get too big (happens e.g. when the user leaves the tab)
  if (delta > 1000) {
    delta = 1000 / 60;
  }

  world.update(pipeline, delta * TIME_SCALE);
  requestAnimationFrame(loop);
}

init();
