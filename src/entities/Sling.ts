import type { Entity, Query, World } from "../ecs";
import { DragInput, Sprite, Weapon } from "../engine/components";
import { ElasticLine, Joint } from "../engine/ElasticLine";
import { DynamicBody, GRAVITY } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { circle, popsicle } from "../utils/CanvasUtils";
import { DEG2RAD } from "../utils/MathUtils";
import { Point } from "../utils/Point";

const GRAB_DISTANCE = 20;
const GRAB_MARGIN = 2;

// Make it into a system which queries DragInput
export class SlingshotFrame {
  handle: Entity;
  rope: Entity;
  weapon: Entity | null = null;

  reload: Function;

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

    this.handle.add(
      new DragInput({
        onclick: this.grabCord.bind(this),
        onmove: this.followCord.bind(this),
        onrelease: this.release.bind(this),
      }),
    );

    this.reload = () => {
      this.weapon = world.create().add(
        new Weapon(),
        new DynamicBody(this.handle.get(Joint).position, {
          mass: 1,
          friction: 0.1,
        }),
        new Sprite(drawWeapon),
      );
    };

    this.reload();
  }

  grabCord(pointerPos: Point) {
    const handleBody: DynamicBody = this.handle.get(Joint);
    const weaponBody: DynamicBody = this.weapon?.get(DynamicBody);

    const distance = pointerPos.distance(handleBody.position);

    // Grab & follow
    // Todo: make grabbing area larger and rectangular instead of a circle
    if (distance <= GRAB_DISTANCE) {
      this.grabPos = pointerPos;
      handleBody.fixed = weaponBody.fixed = true;
    }
  }

  followCord(pointerPos: Point) {
    if (!this.grabPos) return;

    const handleBody: DynamicBody = this.handle.get(Joint);
    const weaponBody: DynamicBody = this.weapon?.get(DynamicBody);

    this.grabPos = pointerPos;

    handleBody && handleBody.position.set(this.grabPos.x, this.grabPos.y);
  }

  followPointer() {
    this.grabPos &&
      this.handle &&
      this.handle.position.set(this.grabPos.x, this.grabPos.y);

    this.weapon && this.weapon.velocity.copy(this.handle.velocity);
  }

  release() {
    this.grabPos = null;
    this.shooting = true;

    // if (!this.weapon) return;

    const handleBody: DynamicBody = this.handle.get(Joint);
    const weaponBody: DynamicBody = this.weapon?.get(DynamicBody);

    weaponBody.position = handleBody.position.clone();
    weaponBody.velocity = handleBody.velocity.clone();
    weaponBody.clearForces();
    weaponBody.addForce(GRAVITY);

    this.reload();
  }
}

export class SlingshotSystem {
  handle: Query;
  slingshot: Query;

  constructor(world: World) {
    this.handle = world.query(DragInput, Joint);
    this.slingshot = world.query(SlingshotFrame);
  }

  update(dt) {
    this.handle.iterate((e, input: DragInput, joint: Joint) => {
      if (input.dragPos) {
        this.handle && this.handle.position.set(this.grabPos.x, this.grabPos.y);

        this.weapon && this.weapon.velocity.copy(this.handle.velocity);
      }
    });
  }
}

export function createSlingshot(world: World): Entity {
  const slingshot = world
    .create()
    .add(new SlingshotFrame(world), new Sprite(drawSlingshotFrame));

  return slingshot;
}

function drawSlingshotFrame(e: Entity) {
  const { ctx, cw, ch } = Stage.setActiveLayer("bg");
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

  joints.forEach((j) => {
    circle(j.position, 5);
    j.debugVelocity("magenta");
    j.debugForce();
  });
}

function drawWeapon(e: Entity) {
  const [weaponData, weaponBody]: [Weapon, DynamicBody] = e.get(
    Weapon,
    DynamicBody,
  );

  const { ctx } = Stage.setActiveLayer(LayerName.Game);
  const { height, radius } = weaponData;
  const { position: p, velocity: v } = weaponBody;

  ctx.translate(p.x, p.y);
  ctx.rotate(v.angle());
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

  weaponBody.debugVelocity();
}
