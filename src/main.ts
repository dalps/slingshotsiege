import { Castle } from "./scenes/Castle";
import { Clock, type timestamp } from "./utils/TimeUtils";
import ecs from "./ecs";
import { Stage } from "./engine/Stage";
import { Sling } from "./entities/Sling";
import { hornMngr } from "./entities/Horn";
import { distribute, lerp, lerp2 } from "./utils/MathUtils";
import { foalMngr } from "./entities/Foal";
import { Point } from "./utils/Point";
import { circle } from "./utils/CanvasUtils";
import { enemyMngr } from "./entities/Enemy";

const [registerComponents, createWorld] = ecs;

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
    foalMngr.spawn(new Point(x, ch * 0.8));
  });

  requestAnimationFrame(draw);
}

class Spawner {
  constructor() {
    setInterval(() => {
      const { cw, ch } = Stage.setActiveLayer("game");
      enemyMngr.spawn(
        new Point(Math.random() * cw, lerp(0, -ch * 0.5, Math.random())),
      );
    }, 1000);
  }

  update() {}
}

const pipeline: { update: () => void }[] = [
  Sling,
  hornMngr,
  foalMngr,
  enemyMngr,
  new Spawner(),
];

function draw(t: timestamp) {
  Clock.update(t * 0.01);

  pipeline.forEach((s) => s.update());
  requestAnimationFrame(draw);
}

init();
