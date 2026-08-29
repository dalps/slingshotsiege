import { Castle } from "./scenes/Castle";
import { Clock, type timestamp } from "./utils/TimeUtils";
import ecs from "./ecs";
import { Stage } from "./engine/Stage";

const [registerComponents, createWorld] = ecs;

function init() {
  Stage.init();

  Castle.draw();
  Castle.init();

  // requestAnimationFrame(draw);
}

function draw(t: timestamp) {
  Clock.update(t * 0.01);

  requestAnimationFrame(draw);
}

init();
