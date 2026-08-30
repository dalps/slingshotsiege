import { EntityManager } from "../engine/EntityManager";
import { DynamicBody, GRAVITY } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { circle, popsicle } from "../utils/CanvasUtils";
import { Point } from "../utils/Point";

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

    ctx.lineWidth = 5;
    ctx.strokeStyle = "#444444ff";
    ctx.fillStyle = "#787878ff";
    ctx.beginPath();
    ctx.moveTo(p.x - radius, p.y);
    ctx.lineTo(p.x, p.y - height);
    ctx.lineTo(p.x + radius, p.y);
    ctx.arcTo(p.x, p.y + radius * 0.5, p.x - radius, p.y, radius * 2);
    ctx.fill();
    ctx.stroke();

    // popsicle(this.position, this.position.add(this.velocity), "yellow");
  }

  update() {
    super.update();
    this.draw();
  }
}
