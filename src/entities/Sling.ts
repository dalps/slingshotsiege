import { Stage } from "../engine/Stage";
import { circle } from "../utils/CanvasUtils";
import { DEG2RAD } from "../utils/MathUtils";
import { Point } from "../utils/Point";

export class Sling {
  static draw() {
    Stage.setActiveLayer("game");
    const { ctx, cw, ch } = Stage;

    const size = new Point(20, 180);
    const armAngle = 70;
    const armLength = 80;
    const position = new Point(cw * 0.5 - size.x * 0.5, ch * 0.9);

    ctx.fillStyle = "#a96f3cff";

    ctx.fillRect(position.x, position.y, size.x, -size.y);

    const armPos = new Point(cw * 0.5, position.y - size.y);

    ctx.translate(cw * 0.5, armPos.y);
    ctx.rotate((180 - armAngle * 0.5) * DEG2RAD);
    ctx.fillRect(-size.x * 0.5, 0, size.x, armLength);
    ctx.rotate(armAngle * DEG2RAD);
    ctx.fillRect(-size.x * 0.5, 0, size.x, armLength);
    // circle(armPos, 5);

    const [anchor1, anchor2] = [1, -1].map((o) =>
      armPos
        .addY(armLength)
        .rotateAbout(armPos, (180 + o * armAngle * 0.5) * DEG2RAD),
    );

    // circle(anchor1, 5, "white");
    // circle(anchor2, 5, "white");
  }

  update() {}
}
