import type { Entity, World } from "../ecs";
import { drawEnemy } from "../entities/enemy";
import {
  drawRainbow,
  RAINBOW_INNER_RADIUS,
  RAINBOW_OUTER_RADIUS,
} from "../entities/rainbow";
import { drawFarGoneWeapon, SlingshotFrame } from "../entities/slingshot";
import {
  bounce,
  easeIn,
  easeInBack,
  easeOut,
  lerp,
  lerp2,
  PI,
  sway,
} from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import {
  Interval,
  Transform,
  type timestamp,
  type Transformer,
} from "../utils/TimeUtils";
import { DynamicBody } from "./Physics2D";
import { LayerName, Stage } from "./Stage";

type DrawFn = (entity: Entity) => void;

export const GAME_TITLE = "Slingshot Siege";
export const RAINBOW_INTERVAL = 10;
export const START_LIVES = 3;

export class Health {
  lives = START_LIVES;
}

export class Prey {
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
        this.onrelease(this.dragPos!);
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

export const UNICORN_EYES = pt(55, -175);

export class Unicorn {
  expression = UnicornEmotion.Content;
  headTilt = 0;
  boundingBoxSize = pt(200);
  horn: Entity | null = null;
  hornProgress = 0;
  hornOrigin = pt(60, -178);

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

export const enum GameState {
  Menu,
  Ongoing,
  Over,
}

export class Game {
  state: GameState = GameState.Menu;
  wave = 0;
}

export class Frozen {}

export class Spawner {
  enemyInterval: Entity;
  powerupInterval: Entity;

  constructor(public world: World) {
    this.enemyInterval = world
      .create()
      .add(
        Interval(1, () =>
          world
            .create()
            .add(
              new Hunter(),
              new DynamicBody(pt(Math.random() * Stage.cw, 0)),
              new Sprite(drawEnemy),
            ),
        ),
      );

    this.powerupInterval = world.create().add(
      Interval(30, () => {
        const dice = Math.random() < 0.5;
        const startY = 120;
        const startX = dice ? -100 : Stage.cw + 100;
        const swayStartX = dice ? 100 : Stage.cw - 100;
        const swayEndX = dice ? Stage.cw - 100 : 100;
        const exitX = lerp(Stage.cw * 0.3, Stage.cw * 0.8, Math.random());

        const rainbow = world
          .create()
          .add(
            new Rainbow(),
            new DynamicBody(pt(startX, startY)),
            new Sprite(drawRainbow),
          );

        const { position }: DynamicBody = rainbow.get(DynamicBody);

        const iterations = 5; // must be odd
        const enterTransform: Transformer = {
          duration: 1,
          update(e, t) {
            position.set(lerp(startX, swayStartX, easeOut(t)), startY);
          },
        };
        const swayTransform: Transformer = {
          duration: 10,
          update(e, t) {
            position.set(
              lerp(swayStartX, swayEndX, sway(t, iterations)),
              startY - bounce(t, iterations, 50),
            );
          },
        };
        const exitTransform: Transformer = {
          duration: 1,
          update(e, t) {
            position.set(
              lerp(swayEndX, exitX, easeIn(t)),
              lerp(startY, -100, easeInBack(t)),
            );
          },
          end(e) {
            e.delete();
          },
        };

        enterTransform.next = swayTransform;
        swayTransform.next = exitTransform;
        rainbow.add(new Transform(enterTransform));
      }),
    );
  }

  destructor() {
    this.enemyInterval.delete();
    this.powerupInterval.delete();
  }
}

export class Rainbow {
  innerRadius = RAINBOW_INNER_RADIUS;
  outerRadius = RAINBOW_OUTER_RADIUS;
  radius = 40;
  angle = 0;
  gradientAngle = 0;
  particleEmitter: Entity;

  constructor(world: World) {
    // this.particleEmitter = world.create().add(new Interval(1 / 8, () => world.create().add(new Sprite(dra))));
  }
}
