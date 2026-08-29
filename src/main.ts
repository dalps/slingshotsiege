import { Castle } from "./scenes/Castle";
import { Clock, type timestamp } from "./utils/TimeUtils";
import ecs from "./ecs";
import { Stage } from "./engine/Stage";
import { Sling } from "./entities/Sling";

const [registerComponents, createWorld] = ecs;

function init() {
  Stage.init();
  Castle.init();
  Sling.init();

  Stage.fitLayersToStage();
  Castle.draw();

  Sling.draw();

  requestAnimationFrame(draw);
}

function draw(t: timestamp) {
  requestAnimationFrame(draw);
  Clock.update(t * 0.001);

  Sling.update();
}

init();
