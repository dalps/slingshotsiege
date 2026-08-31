import { EntityManager } from "../engine/EntityManager";
import { DynamicBody } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { circle, popsicle } from "../utils/CanvasUtils";
import { Point } from "../utils/Point";
import { foalMngr, type Foal } from "./Foal";

export class EnemyManager extends EntityManager<Enemy> {}

export class Enemy extends DynamicBody {
  target: Foal | null = null;

  constructor(public position: Point) {
    super(position);
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

    console.log("found target", candidate[1]);

    if (candidate) {
      const [dist, target] = candidate;

      if (dist < 60) {
        target.damage();
        this.die();
      }

      this.target = target as Foal;
      const direction = this.target.position.sub(this.position);

      this.velocity = direction.normalize().scale(10);
    }
  }

  die() {
    super.die();
    enemyMngr.delete(this);
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

  update() {
    super.update();
    // Move towards the prey
    this.hunt();
  }
}

export const enemyMngr = new EnemyManager(Enemy);
