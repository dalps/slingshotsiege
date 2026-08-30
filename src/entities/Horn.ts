import { EntityManager } from "../engine/EntityManager";
import { DynamicBody, GRAVITY } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { circle, popsicle } from "../utils/CanvasUtils";
import { Point } from "../utils/Point";

export class HornManager extends EntityManager<Horn> {}

export class Horn extends DynamicBody {
  id: string;

  constructor(position: Point) {
    super(position);

    this.id = crypto.randomUUID();
    this.mass = 1;
    this.friction = 0.1;
  }

  draw() {
    const { ctx } = Stage.setActiveLayer("game");
    const radius = 10;
    const height = 80;
    const p = this.position;
    const rotation = Math.atan2(this.velocity.x, -this.velocity.y);

    console.log(rotation);

    ctx.translate(p.x, p.y);
    ctx.rotate(rotation);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#444444ff";
    ctx.fillStyle = "#787878ff";
    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    ctx.lineTo(0, -height);
    ctx.lineTo(radius, 0);
    ctx.arcTo(0, radius * 0.5, -radius, 0, radius * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.resetTransform();

    // popsicle(this.position, this.position.add(this.velocity), "yellow");
  }

  update() {
    super.update();
    this.draw();
  }
}

export const hornMngr = new HornManager(Horn);
