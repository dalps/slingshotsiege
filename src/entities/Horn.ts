import { CircleCollider } from "../engine/Collisions2D";
import { EntityManager } from "../engine/EntityManager";
import { DynamicBody, GRAVITY } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { circle, popsicle } from "../utils/CanvasUtils";
import { Point } from "../utils/Point";

export class HornManager extends EntityManager<Horn> {}

export class Horn extends DynamicBody {
  radius = 10;
  height = 80;
  id: string;

  constructor(position: Point) {
    super(position);

    this.id = crypto.randomUUID();
    this.mass = 1;
    this.friction = 0.1;
    this.attachCollider(new CircleCollider(this.position, this.radius));
  }

  draw() {
    const { ctx } = Stage.setActiveLayer("game");
    const { position: p, height, radius } = this;
    const rotation = Math.atan2(this.velocity.x, -this.velocity.y);

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
