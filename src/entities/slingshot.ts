import type { Entity, World } from "../ecs";
import { DragInput, Sprite, Weapon, WeaponState } from "../engine/components";
import { ElasticLine } from "../engine/ElasticLine";
import { DynamicBody, GRAVITY } from "../engine/Physics2D";
import { sfx } from "../engine/sfx";
import { LayerName, Stage } from "../engine/Stage";
import { zzfxP } from "../engine/zzfx";
import { DEG2RAD } from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import { DARK_WOOD, LIGHT_WOOD, WHITE } from "../utils/SpriteUtils";
import { drawShadow } from "./foal";

const GRAB_DISTANCE = 65;
const size = pt(20, 180);
const armAngle = 70; // degrees
const armLength = 80;

// Make it into a system which queries DragInput
export class SlingshotFrame {
  handle: Entity;
  rope: Entity;
  weapon: Entity | null = null;

  reload: Function;

  anchorLeft: Point;
  anchorRight: Point;
  position: Point;
  armPos: Point;
  grabPos: Point | null = null;
  pointerPos: Point | null = null;

  constructor(world: World) {
    const { cw, ch } = Stage;

    this.position = pt(cw * 0.5 - size.x * 0.5, ch * 0.9);
    this.armPos = pt(cw * 0.5, this.position.y - size.y);
    const { armPos } = this;
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

  addDragInput() {
    this.handle.add(
      new DragInput({
        onclick: this.grabCord.bind(this),
        onmove: this.followCord.bind(this),
        onrelease: this.release.bind(this),
      }),
    );
  }

  grabCord(pointerPos: Point) {
    const handleBody: DynamicBody = this.handle.get(DynamicBody);
    const weaponBody: DynamicBody = this.weapon?.get(DynamicBody);

    const distance = pointerPos.distance(handleBody.position);

    // Grab & follow
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

    zzfxP(sfx.shoot2);

    this.weapon = null;
  }
}

export function createSlingshot(world: World): Entity {
  const slingshot = world.create().add(new SlingshotFrame(world));

  drawSlingshotFrame(slingshot);

  return slingshot;
}

function drawSlingshotFrame(e: Entity) {
  const { ctx, cw } = Stage.setActiveLayer(LayerName.BG_3);
  const { position, armPos } = e.get(SlingshotFrame) as SlingshotFrame;

  drawShadow(position.add(pt(size.x / 2, 0)), 30);

  ctx.fillStyle = DARK_WOOD;
  ctx.fillRect(position.x, position.y, size.x, -size.y);

  ctx.translate(cw / 2, armPos.y);

  [180 - armAngle / 2, armAngle].forEach((angle) => {
    ctx.rotate(angle * DEG2RAD);
    ctx.fillRect(-size.x / 2, 0, size.x, armLength);
    ctx.fillStyle = LIGHT_WOOD;
    ctx.beginPath();
    ctx.ellipse(0, armLength, size.x / 2, size.x / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = DARK_WOOD;
    ctx.beginPath();
    ctx.ellipse(0, armLength, size.x / 4, size.x / 8, 0, 0, Math.PI * 2);
    ctx.fill();
  });

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
  const { ctx } = Stage.setActiveLayer(LayerName.Game);

  ctx.lineWidth = 5;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.strokeStyle = WHITE;

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
  const [sprite, weaponData, weaponBody]: [Sprite, Weapon, DynamicBody] = e.get(
    Sprite,
    Weapon,
    DynamicBody,
  );

  const { ctx } = Stage.setActiveLayer(LayerName.Game);
  const { height, radius } = weaponData;
  const { position: p, velocity: v } = weaponBody;

  ctx.translate(p.x, p.y);
  ctx.rotate(v.angle());
  ctx.scale(sprite.scale, sprite.scale);
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

  const { ctx } = Stage.setActiveLayer(LayerName.BG_2);
  // Stage.clearLayer(LayerName.BG_2);
  const [height, radius] = [60, 6];
  const { position: p, velocity: v } = weaponBody;

  ctx.translate(p.x, p.y);
  ctx.rotate(v.angle());
  ctx.lineWidth = 5;
  ctx.fillStyle = "#8493a3";
  ctx.beginPath();
  ctx.moveTo(-radius, 0);
  ctx.lineTo(0, -height);
  ctx.lineTo(radius, 0);
  ctx.arcTo(0, radius * 0.5, -radius, 0, radius * 2);
  ctx.closePath();
  ctx.fill();
  ctx.resetTransform();
}
