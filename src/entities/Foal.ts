import { EntityManager } from "../engine/EntityManager";
import { Stage } from "../engine/Stage";
import { circle } from "../utils/CanvasUtils";
import { distribute } from "../utils/MathUtils";
import { Point } from "../utils/Point";

export const START_LIVES = 3;

export class FoalManager extends EntityManager<Foal> {}

const size = new Point(50);

export class Foal {
  lives = START_LIVES;

  constructor(public position: Point) {}

  draw() {
    const { ctx } = Stage.setActiveLayer("game");
    ctx.translate(this.position.x, this.position.y);
    ctx.fillStyle = "white";
    ctx.fillRect(-size.x * 0.5, -size.y * 0.5, size.x, size.y);

    const heartShape = new Path2D(`M 0.5 7.9
      C -12.1 -1.2 -9.4 -6.4 -7.1 -7.5
      c 4 -1.5 6.5 1.5 6.5 1.5
      0 0 2.3 -2.1 5.1 -1.9
      2.7 0.4 6.1 4.6 3.6 7.8
      C 5.6 3.1 1.6 4.1 0.5 7.9
      Z`);

    function heart(position: Point) {
      ctx.resetTransform();
      ctx.translate(position.x, position.y);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "black";
      ctx.fillStyle = "#ff9ec5";

      ctx.fill(heartShape);
      ctx.stroke(heartShape);
      // circle(position, 5, "blue");
    }

    const offset = 30;
    distribute(
      this.position.x - offset,
      this.position.x + offset,
      START_LIVES,
      (x) => heart(new Point(x, this.position.y + 60)),
    );

    ctx.resetTransform();

    circle(this.position, 5);
  }

  damage() {
    this.lives = Math.max(0, this.lives - 1);
  }

  update() {}
}

export const foalMngr = new FoalManager(Foal);
