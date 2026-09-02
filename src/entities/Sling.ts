import type { Entity, World } from "../ecs";
import { DragInput, Sprite, Weapon } from "../engine/components";
import { ElasticLine, Joint } from "../engine/ElasticLine";
import { DynamicBody, GRAVITY } from "../engine/Physics2D";
import { Stage } from "../engine/Stage";
import { DEG2RAD } from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { Horn } from "./Horn";

const GRAB_DISTANCE = 20;
const GRAB_MARGIN = 2;

// Make it into a system which queries DragInput
export class SlingshotFrame {
  handle: Entity;
  rope: Entity;
  reload: Function;
  loaded: Entity | null = null;

  anchorLeft: Point;
  anchorRight: Point;
  size = new Point(20, 180);
  armAngle = 70;
  armLength = 80;
  position: Point;
  armPos: Point;
  grabPos: Point | null = null;
  shooting: boolean = false;
  releasing: boolean = false;
  pointerPos: Point | null = null;

  constructor(world: World) {
    const { cw, ch } = Stage;

    Stage.setActiveLayer("bg");

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

    this.rope = world.create().add(
      new ElasticLine(world, this.anchorRight, this.anchorLeft, 3, {
        mass: 10.5,
        damping: 7,
        jointsAttraction: 10000,
      }),
      new Sprite(drawSlingshotStrips),
    );

    this.handle = (this.rope.get(ElasticLine) as ElasticLine).joints[1];

    this.handle.add(new DragInput(this.followCord.bind(this)));

    this.reload = () => {
      world
        .create()
        .add(
          new Weapon(),
          new DynamicBody(this.handle.get(DynamicBody).position),
        );
    };
  }

  followCord(pointerPos: Point) {
    if (!this.grabPos) return;

    this.grabPos = pointerPos;
  }

  followPointer() {
    this.grabPos &&
      this.handle &&
      this.handle.position.set(this.grabPos.x, this.grabPos.y);

    this.loaded && this.loaded.velocity.copy(this.handle.velocity);
  }

  release() {
    this.grabPos = null;
    this.shooting = true;

    if (!this.loaded) return;

    this.loaded.position = this.handle.position.clone();
    this.loaded.velocity = this.handle.velocity.clone();
    this.loaded.clearForces();
    this.loaded.addForce(GRAVITY);

    this.reload();
  }

  grabCord(pointerPos: Point) {
    const distance = pointerPos.distance(this.handle.position);

    // Grab & follow
    // Todo: make grabbing area larger and rectangular instead of a circle
    if (distance <= GRAB_DISTANCE) this.grabPos = pointerPos;
  }
}

export function createSlingshot(world: World): Entity {
  const slingshot = world
    .create()
    .add(new SlingshotFrame(world), new Sprite(drawSlingshotFrame));

  return slingshot;
}

function drawSlingshotFrame(e: Entity) {
  Stage.setActiveLayer("bg");
  const { ctx, cw, ch } = Stage;
  const { position, size, armAngle, armLength, armPos } = e.get(
    SlingshotFrame,
  ) as SlingshotFrame;

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

/**
 * Draws a line connecting the points that make up the slingshot strip.
 */
function drawSlingshotStrips(e: Entity) {
  const joints: Joint[] = (e.get(ElasticLine) as ElasticLine).joints.map((e) =>
    e.get(Joint),
  );
  const { ctx, cw, ch } = Stage.setActiveLayer("game");

  ctx.clearRect(0, 0, cw, ch);
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#fff";

  ctx.beginPath();
  ctx.moveTo(joints[0].position.x, joints[0].position.y);
  joints.forEach((j) => {
    ctx.lineTo(j.position.x, j.position.y);
  });
  ctx.stroke();

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
