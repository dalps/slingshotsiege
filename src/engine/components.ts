import type { Entity, World } from "../ecs";
import {
  RAINBOW_INNER_RADIUS,
  RAINBOW_OUTER_RADIUS,
} from "../entities/rainbow";
import { drawWeapon, SlingshotFrame } from "../entities/slingshot";
import { easeInBack, lerp, lerp2 } from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import {
  Interval,
  RandomInterval,
  Transform,
  type Transformer,
} from "../utils/TimeUtils";
import { DynamicBody } from "./Physics2D";
import { LayerName, Stage } from "./Stage";

type DrawFn = (entity: Entity) => void;

export const GAME_TITLE = "Slingshot Siege";
export const START_LIVES = 3;
export const START_SPEED = 50;
export const RAINBOW_INTERVAL = 30;
export const ENEMY_INTERVAL = 1;

export class Health {
  lives = START_LIVES;
}

export class Prey {
  radius = 40;
}

export class Hunter {
  target: Entity | null = null;
  distance: number | null = null;
  direction = pt(0, 1);
  speed = START_SPEED;
}

export const enum WeaponState {
  Ready,
  Fired,
  Used,
}

export class Weapon {
  state = WeaponState.Ready;
  points = 0;
  radius = 10;
  height = 80;
}

export class Sprite {
  transparency = 1;
  scale = 1;
  angle = 0;
  translation = pt();

  constructor(public draw: DrawFn) {}
}

type DragEventHandler = (pointerPos: Point) => void;

export class DragInput {
  /**
   * Current pointer position in the UI
   */
  pointerPos: Point | null = null;
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
    const uiLayer = Stage.getLayer(LayerName.UI)!;
    const { canvas: ui } = uiLayer;
    this.onmove = onmove;
    this.onclick = onclick;
    this.onrelease = onrelease;

    const handleClick = (resolve: (e: Event) => Point) => (e: Event) => {
      e.preventDefault();
      this.onclick((this.dragPos = resolve(e)));
    };

    const handleMove = (resolve: (e: Event) => Point) => (e: Event) => {
      e.preventDefault();

      const p = resolve(e);
      this.pointerPos = p;

      if (!this.dragPos || e.buttons === 0) return;
      this.onmove((this.dragPos = p));
    };

    const handleRelease = (e: Event) => {
      e.preventDefault();
      this.onrelease(this.dragPos!);
      this.dragPos = null;
    };

    ui.onmousedown = handleClick(uiLayer.resolveMousePosition.bind(uiLayer));
    ui.onmousemove = handleMove(uiLayer.resolveMousePosition.bind(uiLayer));
    ui.onmouseup = handleRelease;
    ui.ontouchstart = handleClick(uiLayer.resolveTouchPosition.bind(uiLayer));
    ui.ontouchmove = handleMove(uiLayer.resolveTouchPosition.bind(uiLayer));
    ui.ontouchend = handleRelease;

    window.onmousemove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      const { bottom, top, left, right } = uiLayer.rect;

      if (x < left || x >= right || y < top || y >= bottom) {
        this.onrelease(this.dragPos!);
        this.dragPos = null;
      }
    };

    this.destructor = () => {
      ui.removeEventListener("mousedown", ui.onmousedown!);
      ui.removeEventListener("mousemove", ui.onmousemove!);
      ui.removeEventListener("mouseup", ui.onmouseup!);
      ui.removeEventListener("touchstart", ui.ontouchstart!);
      ui.removeEventListener("touchmove", ui.ontouchmove!);
      ui.removeEventListener("touchend", ui.ontouchend!);
      ui.style.cursor = "default";
    };
  }
}

export const RECORDS_KEY = "dalps.siege";
export const SCORES_KEY = RECORDS_KEY + ".scores";
export const INTRO_KEY = RECORDS_KEY + ".intro";

export class Score {
  constructor(public totalScore = 0) {}

  get scores(): number[] {
    const stored = window.localStorage.getItem(SCORES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  saveScore() {
    window.localStorage.setItem(
      SCORES_KEY,
      JSON.stringify([this.totalScore, ...this.scores]),
    );
  }
}

export const enum UnicornEmotion {
  Content,
  Anguished,
  Furious,
}

export const UNICORN_EYES = pt(55, -175);
export const UNICORN_HORN_ORIGIN = pt(60, -178);

export class Unicorn {
  expression = UnicornEmotion.Content;
  headTilt = 0;
  boundingBoxSize = pt(200);
  horn: Entity | null = null;
  hornProgress = 0;
  facingEast = true;

  flip() {
    this.facingEast = !this.facingEast;
  }

  getPissed() {
    this.expression = UnicornEmotion.Furious;
  }

  passHornToSlingshot(world: World, unicorn: Entity, slingshot: Entity) {
    // if (!this.horn || !this.horn?.exists)
    //   throw Error("Failure: no horn on unicorn.");
    // if (this.hornProgress <= 1) {
    //   // Horn still growing
    //   return;
    // }

    const [unicornData, unicornBody]: [Unicorn, DynamicBody] = unicorn.get(
      Unicorn,
      DynamicBody,
    );
    const slingshotData: SlingshotFrame = slingshot.get(SlingshotFrame);

    const startPos = unicornBody.position.add(
      unicornData.facingEast ? UNICORN_HORN_ORIGIN : UNICORN_HORN_ORIGIN.flip(),
    );
    const destPos = slingshotData.midpoint;

    const fakeWeapon = world.create().add(
      new Weapon(),
      new DynamicBody(startPos, {
        mass: 1,
        friction: 0.1,
      }),
      new Sprite(drawWeapon),
    );

    this.horn = fakeWeapon;

    // slingshotData.weapon = fakeWeapon;
    const fakeWeaponBody: DynamicBody = fakeWeapon.get(DynamicBody);
    fakeWeapon.add(
      new Transform({
        duration: 0.7,
        update: (e, t) => {
          const sprite: Sprite = e.get(Sprite);
          sprite.scale = lerp(0.3, 0.7, t);
          fakeWeaponBody.position = lerp2(startPos, destPos, t, {
            easeY: easeInBack,
          });
        },
        end: (e) => {
          // Horn landed on rope
          this.horn = null;
          fakeWeapon.delete();
          slingshotData.reload();
        },
      }),
    );
  }
}

export class Foal {
  /** Used to identify the foal when resizing the canvas. */

  constructor(public index: number) {}
}

export const enum GameState {
  Title,
  Ongoing,
  Over,
}

export class Frozen {}

export class Exhaust {
  particleEmitter: Entity | null;

  constructor(
    world: World,
    particlesPerSecond: number,
    draw: Transformer["end"],
  ) {
    this.particleEmitter = Interval(world, 1 / particlesPerSecond, draw);
  }

  destructor() {
    this.particleEmitter?.exists?.delete();
  }
}

export class Spawner {
  interval: Entity;

  constructor(
    public world: World,
    duration: number | (() => number),
    spawnFn: (world: World) => void,
  ) {
    this.interval =
      typeof duration === "function"
        ? RandomInterval(world, duration, () => spawnFn(world))
        : Interval(world, duration, () => spawnFn(world));
  }

  destructor() {
    this.interval.delete();
  }
}

export class Rainbow {
  innerRadius = RAINBOW_INNER_RADIUS;
  outerRadius = RAINBOW_OUTER_RADIUS;
  radius = 40;
  static soundEmitter: Entity;

  destructor() {
    Rainbow.soundEmitter?.exists?.delete();
  }
}

export class Wraith {}

export class Bat {
  wingAngle = 0;
  velocityNoise: Entity | null = null;

  destructor() {
    this.velocityNoise?.exists?.delete();
  }
}
