import type { Entity, World } from "../ecs";
import { DragInput, Sprite, Weapon, WeaponState } from "../engine/components";
import { ElasticLine } from "../engine/ElasticLine";
import { DynamicBody, GRAVITY } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { DEG2RAD } from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { WHITE } from "../utils/SpriteUtils";

const GRAB_DISTANCE = 65;

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
        mass: 3.2, // makes everything slower
        damping: 1.9, // turn up for less jiggle
        jointsAttraction: 592, // turn up for stronger push and compensato for mass
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

    // Turn this into a system
    this.reload = () => {
      this.weapon = world.create().add(
        new Weapon(),
        new DynamicBody(this.handle.get(DynamicBody).position, {
          mass: 1,
          friction: 0.1,
        }),
        new Sprite(drawWeapon),
      );
    };
  }

  grabCord(pointerPos: Point) {
    const handleBody: DynamicBody = this.handle.get(DynamicBody);
    const weaponBody: DynamicBody = this.weapon?.get(DynamicBody);

    const distance = pointerPos.distance(handleBody.position);

    // Grab & follow
    // Todo: make grabbing area larger and rectangular instead of a circle
    if (distance <= GRAB_DISTANCE) {
      this.grabPos = pointerPos;
      handleBody.fixed = true;
      weaponBody && (weaponBody.fixed = true);
    }
  }

  followCord(pointerPos: Point) {
    if (!this.grabPos) return;

    const handleBody: DynamicBody = this.handle.get(DynamicBody);
    const weaponBody: DynamicBody = this.weapon?.get(DynamicBody);

    this.grabPos = pointerPos;

    handleBody && handleBody.position.set(this.grabPos.x, this.grabPos.y);
    weaponBody && weaponBody.velocity.copy(handleBody.velocity);
  }

  release() {
    if (!this.grabPos || !this.weapon) return;

    this.grabPos = null;
    this.shooting = true;

    const handleBody: DynamicBody = this.handle.get(DynamicBody);
    handleBody.fixed = false; // Let physics govern position now

    const [weaponData, weaponBody]: [Weapon, DynamicBody] = this.weapon?.get(
      Weapon,
      DynamicBody,
    );

    weaponBody.position = handleBody.position.clone();
    weaponBody.velocity = handleBody.velocity.clone();
    weaponBody.fixed = false;
    weaponBody.clearForces();
    weaponBody.addForce(GRAVITY);
    weaponData.state = WeaponState.Fired;

    this.weapon = null;
  }
}

export function createSlingshot(world: World): Entity {
  const slingshot = world
    .create()
    .add(new SlingshotFrame(world), new Sprite(drawSlingshotFrame));

  return slingshot;
}

function drawSlingshotFrame(e: Entity) {
  const { ctx, cw, ch } = Stage.setActiveLayer(LayerName.BG_3);
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
  const joints: DynamicBody[] = (e.get(ElasticLine) as ElasticLine).joints.map(
    (e) => e.get(DynamicBody),
  );
  const { ctx, cw, ch } = Stage.setActiveLayer("game");

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

  // joints.forEach((j) => {
  // circle(j.position, 5);
  //   j.debug("magenta", null , "green");
  // });
}

export function drawWeapon(e: Entity) {
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
  ctx.strokeStyle = "#ccc";
  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.moveTo(-radius, 0);
  ctx.lineTo(0, -height);
  ctx.lineTo(radius, 0);
  ctx.arcTo(0, radius * 0.5, -radius, 0, radius * 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.resetTransform();

  // weaponBody.debug("yellow");
}

export function drawFarGoneWeapon(e: Entity) {
  const weaponBody: DynamicBody = e.get(DynamicBody);

  const { ctx } = Stage.getLayer(LayerName.BG_2)!;
  // Stage.clearLayer(LayerName.BG_2);
  const [height, radius] = [60, 6];
  const { position: p, velocity: v } = weaponBody;

  ctx.translate(p.x, p.y);
  ctx.rotate(v.angle());
  ctx.lineWidth = 5;
  ctx.fillStyle = "#8493a3ff";
  ctx.beginPath();
  ctx.moveTo(-radius, 0);
  ctx.lineTo(0, -height);
  ctx.lineTo(radius, 0);
  ctx.arcTo(0, radius * 0.5, -radius, 0, radius * 2);
  ctx.closePath();
  ctx.fill();
  ctx.resetTransform();
}

export function drawScore(score: number) {}
