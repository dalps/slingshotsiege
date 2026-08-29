import { ElasticLine, Joint } from "../engine/ElasticLine";
import { Stage } from "../engine/Stage";
import { circle } from "../utils/CanvasUtils";
import { DEG2RAD } from "../utils/MathUtils";
import { Point } from "../utils/Point";

class Rope extends ElasticLine {}

export class Sling {
  static handle: Joint;
  static anchorLeft: Point;
  static anchorRight: Point;
  static rope: Rope;
  static size = new Point(20, 180);
  static armAngle = 70;
  static armLength = 80;
  static position: Point;
  static armPos: Point;

  static init() {
    Stage.setActiveLayer("bg");
    const { ctx, cw, ch } = Stage;

    this.position = new Point(cw * 0.5 - this.size.x * 0.5, ch * 0.9);
    this.armPos = new Point(cw * 0.5, this.position.y - this.size.y);
    const { armAngle, armLength, armPos } = this;
    const [anchor1, anchor2] = [1, -1].map((o) =>
      armPos
        .addY(armLength)
        .rotateAbout(armPos, (180 + o * armAngle * 0.5) * DEG2RAD),
    );

    this.anchorLeft = anchor1;
    this.anchorRight = anchor2;
    Sling.rope = new Rope(this.anchorRight, this.anchorLeft, 5, {
      mass: 1,
      damping: 1,
      jointsAttraction: 100,
    });

    this.handle = Sling.rope.joints[2];
  }

  static draw() {
    Stage.setActiveLayer("bg");
    const { ctx, cw, ch } = Stage;
    const { position, size, armAngle, armLength, armPos } = this;

    ctx.fillStyle = "#a96f3cff";

    ctx.fillRect(position.x, position.y, size.x, -size.y);

    ctx.translate(cw * 0.5, armPos.y);
    ctx.rotate((180 - armAngle * 0.5) * DEG2RAD);
    ctx.fillRect(-size.x * 0.5, 0, size.x, armLength);
    ctx.rotate(armAngle * DEG2RAD);
    ctx.fillRect(-size.x * 0.5, 0, size.x, armLength);
    // circle(armPos, 5);

    ctx.resetTransform();
    // circle(anchor1, 5, "white");
    // circle(anchor2, 5, "white");
  }

  static update() {
    const { rope } = Sling;
    rope.update();

    // Draw a line from each of the anchor points to the handle point.

    const { ctx, cw, ch } = Stage.setActiveLayer("game");

    ctx.clearRect(0, 0, cw, ch);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#fff";

    ctx.beginPath();
    ctx.moveTo(rope.joints[0].position.x, rope.joints[0].position.y);
    rope.joints.forEach((j) => {
      ctx.lineTo(j.position.x, j.position.y);
    });
    ctx.stroke();
    rope.joints.forEach((j) => {
      circle(j.position, 5);
    });
  }
}
