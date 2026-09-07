import type { Entity, World } from "../ecs";
import { drawFarGoneWeapon, SlingshotFrame } from "../entities/slingshot";
import { lerp2 } from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { Transform, type timestamp } from "../utils/TimeUtils";
import { DynamicBody } from "./Physics2D";
import { Stage } from "./Stage";

type DrawFn = (entity: Entity) => void;

export const START_LIVES = 3;

export class Prey {
  lives = START_LIVES;
  radius = 40;

  constructor(public targeted = true) {}

  // destructor() {
  //   console.log("Prey killed.");
  // }
}

export class Hunter {
  target: Entity | null = null;
  distance: number | null = null;
  speed: number = 20;

  // destructor() {
  //   console.log("Killed a hunter.");
  // }
}

export const enum WeaponState {
  Ready,
  Fired,
  Used,
}

export class Weapon {
  lastKill: timestamp = NaN;
  state = WeaponState.Ready;
  points = 0;
  radius = 10;
  height = 80;
}

export class Sprite {
  transparency = 1;
  scale = 1;

  constructor(public draw: DrawFn) {}
}

type DragEventHandler = (pointerPos: Point) => void;

export class DragInput {
  /**
   * Non-null when dragging.
   */
  dragPos: Point | null = null;
  destructor: () => void;
  onclick: DragEventHandler;
  onmove: DragEventHandler;
  onrelease: DragEventHandler;

  constructor({
    onrelease = (_: Point) => {},
    onmove = (_: Point) => {},
    onclick = (_: Point) => {},
  } = {}) {
    const uiLayer = Stage.getLayer("ui")!;
    const { canvas: ui } = uiLayer;
    this.onmove = onmove;
    this.onclick = onclick;
    this.onrelease = onrelease;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();

      this.dragPos = uiLayer.resolveTouchPosition(e);
      this.onclick(this.dragPos);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      this.dragPos = uiLayer.resolveTouchPosition(e);
      this.onmove(this.dragPos);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();

      this.onrelease(this.dragPos!);
      this.dragPos = null;
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();

      this.dragPos = uiLayer.resolveMousePosition(e);
      this.onclick(this.dragPos);
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      if (!this.dragPos || e.buttons === 0) return;
      this.dragPos = uiLayer.resolveMousePosition(e);
      this.onmove(this.dragPos);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();

      this.onrelease(this.dragPos!);
      this.dragPos = null;
    };

    ui.onmousedown = handleMouseDown;
    ui.onmousemove = handleMouseMove;
    ui.onmouseup = handleMouseUp;
    ui.ontouchstart = handleTouchStart;
    ui.ontouchmove = handleTouchMove;
    ui.ontouchend = handleTouchEnd;

    window.onmousemove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      const { bottom, top, left, right } = uiLayer.rect;

      if (x < left || x > right || y < top || y > bottom) {
        this.dragPos = null;
      }
    };

    this.destructor = () => {
      ui.removeEventListener("mousedown", handleMouseDown);
      ui.removeEventListener("mousemove", handleMouseMove);
      ui.removeEventListener("mouseup", handleMouseUp);
      ui.removeEventListener("touchstart", handleTouchStart);
      ui.removeEventListener("touchmove", handleTouchMove);
      ui.removeEventListener("touchend", handleTouchEnd);
    };
  }
}

export class Score {
  constructor(public totalScore = 0) {}
}

export const enum UnicornEmotion {
  Content,
  Anguished,
  Furious,
}

export class Unicorn {
  expression = UnicornEmotion.Content;
  headTilt = 0;
  boundingBoxSize = new Point(200);
  horn: Entity | null = null;
  hornProgress = 0;
  hornOrigin = new Point(60, -178);

  getPissed() {
    this.expression = UnicornEmotion.Furious;
  }

  /**
   * Spawns a new horn
   */
  growHorn(world: World) {
    world.create().add(
      new Transform({
        duration: 1,
        update: (e, stage) => {
          this.hornProgress = stage;
        },
        end: (e) => {
          this.hornProgress = 1;
          // world
          //   .query(SlingshotFrame)
          //   .iterate((slingshot) => this.passHornToSlingshot(world, slingshot));
        },
      }),
    );
  }

  /**
   * Passes ownership of the horn
   */
  passHornToSlingshot(world: World, unicorn: Entity, target: Entity) {
    // if (!this.horn || !this.horn?.exists)
    //   throw Error("Failure: no horn on unicorn.");
    // if (this.hornProgress <= 1) {
    //   // Horn still growing
    //   return;
    // }

    const unicornBody: SlingshotFrame = unicorn.get(DynamicBody);
    const slingshotData: SlingshotFrame = target.get(SlingshotFrame);
    const handlePosition = slingshotData.handle.get(DynamicBody).position;

    const startPosition = unicornBody.position.add(this.hornOrigin);

    const fakeWeapon = world.create().add(
      new Weapon(),
      new DynamicBody(startPosition, {
        mass: 1,
        friction: 0.1,
      }),
      new Sprite(drawFarGoneWeapon),
    );
    this.horn = fakeWeapon;

    slingshotData.weapon = fakeWeapon;
    const weaponBody: DynamicBody = fakeWeapon.get(DynamicBody);
    // todo: Remove state from points. State sharing is making this so confusing, make sure points are never updated
    fakeWeapon.add(
      new Transform({
        duration: 0.5,
        update: (e, t) => {
          weaponBody.position = lerp2(startPosition, handlePosition, t);
        },
        end: () => {
          this.horn = null;
          fakeWeapon.delete();
          slingshotData.reload();
        },
      }),
    );

    // let { horn } = this;
    // this.hornProgress = 0;
    // return horn;
  }
}
