import { ElasticLine, Joint } from "../engine/ElasticLine";
import { GRAVITY } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { circle, popsicle } from "../utils/CanvasUtils";
import { DEG2RAD } from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { Horn } from "./Horn";

class Rope extends ElasticLine {}

const GRAB_DISTANCE = 20;
const GRAB_MARGIN = 2;

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
  static grabPos: Point | null = null;
  static shooting: boolean = false;
  static releasing: boolean = false;
  static loaded: Horn | null = null;
  static pointerPos: Point | null = null;

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
    Sling.rope = new Rope(this.anchorRight, this.anchorLeft, 3, {
      mass: 10.5,
      damping: 7,
      jointsAttraction: 10000,
    });

    this.handle = Sling.rope.joints[1];

    this.load();

    const uiLayer = Stage.getLayer("ui")!;
    const { canvas: ui } = uiLayer;

    function handleMouseDown(e: MouseEvent) {
      e.preventDefault();

      const pointerPos = uiLayer.resolveMousePosition(e);

      const distance = pointerPos.distance(Sling.handle.position);

      // Grab & follow
      // Todo: make grabbing area larger and rectangular instead of a circle
      if (distance <= GRAB_DISTANCE)
        Sling.grabPos = uiLayer.resolveMousePosition(e);
    }

    function handleMouseMove(e: MouseEvent) {
      e.preventDefault();

      const { grabPos: mouseDown, handle } = Sling;

      if (!mouseDown || e.buttons === 0) return;

      Sling.grabPos = uiLayer.resolveMousePosition(e);
    }

    function handleMouseUp(e: MouseEvent) {
      e.preventDefault();

      Sling.release();
    }

    ui.addEventListener("mousedown", handleMouseDown, false);
    ui.addEventListener("mousemove", handleMouseMove, false);
    ui.addEventListener("mouseup", handleMouseUp, false);
    window.addEventListener("mousemove", (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      const { bottom, top, left, right } = uiLayer.rect;

      if (x < left || x > right || y < top || y > bottom) {
        Sling.grabPos = null;
        Sling.shooting = true;
      }
    });
  }

  static release() {
    Sling.grabPos = null;
    Sling.shooting = true;

    if (!this.loaded) return;

    this.loaded.position = this.handle.position.clone();
    this.loaded.velocity = this.handle.velocity.clone();
    // this.loaded = null;
    this.loaded?.clearForces();
    this.loaded.addForce(GRAVITY);
  }

  static followPointer() {
    this.grabPos &&
      this.handle &&
      this.handle.position.set(this.grabPos.x, this.grabPos.y);
  }

  static load() {
    this.loaded = new Horn(this.handle.position);
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

    this.followPointer();

    // Draw a line from each of the anchor points to the handle point.
    const { ctx, cw, ch } = Stage.setActiveLayer("game");

    ctx.clearRect(0, 0, cw, ch);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#fff";

    ctx.beginPath();
    ctx.moveTo(rope.joints[0].position.x, rope.joints[0].position.y);
    rope.joints.forEach((j) => {
      ctx.lineTo(j.position.x, j.position.y);
    });
    ctx.stroke();

    // Draw the horn if the slingshot is loaded
    if (this.loaded) {
      this.loaded.update();
    }

    // rope.joints.forEach((j) => {
    //   circle(j.position, 5);
    // });

    // popsicle(
    //   this.handle.position,
    //   this.handle.position.add(this.handle.velocity),
    //   "red",
    // );

    // popsicle(
    //   this.handle.position,
    //   this.handle.position.add(this.handle.acceleration),
    //   "magenta",
    // );
  }
}
