import { DynamicBody } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { popsicle } from "../utils/CanvasUtils";
import { damp2I } from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { Clock } from "../utils/TimeUtils";
import { foalMngr, type Foal } from "./Foal";


export class Enemy extends DynamicBody {
  target: Foal | null = null;
  speed = 20;

  constructor(public position: Point) {
    super(position);
    this.velocity.set(0, this.speed);
  }

  hunt() {
    // const candidates = foalMngr.list.map((e) => [
    //   this.position.distance(e.position),
    //   e,
    // ]);
    let candidate: [number, Foal] | null = null;

    for (const f of foalMngr.list) {
      const dist = this.position.distance(f.position);
      if (!candidate || (candidate[0] as number) > dist) {
        candidate = [dist, f];
      }
    }

    if (candidate) {
      const [dist, target] = candidate;

      if (dist < 60) {
        target.damage();
        this.die();
      }

      this.target = target as Foal;
      const direction = this.target.position
        .sub(this.position)
        .normalize()
        .scale(this.speed);

      this.velocity = damp2I(this.velocity, direction, 1, Clock.dt);
    }
  }



  draw() {
    const { ctx } = Stage.setActiveLayer("game");

    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.velocity.angle());
    ctx.fillStyle = "#222";
    const size = new Point(50, 70);
    ctx.fillRect(-size.x * 0.5, -size.y * 0.5, size.x, size.y);
    ctx.resetTransform();

    popsicle(this.position, this.position.add(this.velocity), "green");
  }
}
