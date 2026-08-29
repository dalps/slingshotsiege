import { Castle } from "./scenes/Castle";
import { Clock, type timestamp } from "./utils/TimeUtils";
import ecs from "./ecs";

const [registerComponents, createWorld] = ecs;

let stage = document.querySelector<HTMLCanvasElement>("#stage")!;
let ctx = stage.getContext("2d")!;

function init() {
  Castle.draw();
  Castle.init();

  // requestAnimationFrame(draw);
}

function draw(t: timestamp) {
  Clock.update(t * 0.01);

  requestAnimationFrame(draw);
}

init();
