import type { Entity, World } from "../ecs";
import { drawBat, wingFling as wingFlap } from "../entities/bat";
import { drawEnemy } from "../entities/enemy";
import {
  drawRainbow,
  RAINBOW_INNER_RADIUS,
  RAINBOW_OUTER_RADIUS,
} from "../entities/rainbow";
import { drawWeapon, SlingshotFrame } from "../entities/slingshot";
import { gameCycle } from "../main";
import {
  bounce,
  clamp,
  easeIn,
  easeInBack,
  easeOut,
  lerp,
  lerp2,
  rand,
  sway,
} from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import { BLACK, PASTEL_RAINBOW } from "../utils/SpriteUtils";
import {
  Interval,
  RandomInterval,
  Transform,
  type Transformer,
} from "../utils/TimeUtils";
import { drawSquare, FadeTransform } from "./particles";
import { DynamicBody } from "./Physics2D";
import { sfx, zzfxP } from "./sfx";
import { LayerName, Stage } from "./Stage";
import { zzfxG } from "./zzfx";

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
      if (!this.dragPos || e.buttons === 0) return;
      this.onmove((this.dragPos = resolve(e)));
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
  enemyInterval: Entity;
  batInterval: Entity;
  powerupInterval: Entity;

  constructor(public world: World) {
    const durationFn = () =>
      rand(
        0.5,
        clamp(1, 2, lerp(2, 1, gameCycle.score.get(Score).totalScore / 60_000)),
      );

    this.enemyInterval = RandomInterval(world, durationFn, () => {
      const hunterData = new Hunter();

      const hunterBody = new DynamicBody(pt(Math.random() * Stage.cw, 0), {
        startVelocity: pt(rand(0, 10), 0).rotate(Math.random() * Math.PI * 2),
      });
      const exhaust = new Exhaust(world, 5, () => {
        const size = rand(20, 30);

        world.create().add(
          new DynamicBody(
            hunterBody.position.add(Point.random(pt(), pt(20))),
            // {startVelocity: pt(rand(10, 20), 0).rotate(Math.random() * Math.PI * 2),}
          ),
          FadeTransform(2),
          new Sprite((e) => drawSquare(e, size, BLACK, 0.5)),
        );
      });

      zzfxP(sfx.spawn);

      world
        .create()
        .add(hunterData, hunterBody, new Sprite(drawEnemy), exhaust);
    });

    this.batInterval = RandomInterval(world, durationFn, () => {
      const hunterData = new Hunter();

      const hunterBody = new DynamicBody(pt(Math.random() * Stage.cw, 0), {
        startVelocity: pt(rand(0, 10), 0).rotate(Math.random() * Math.PI * 2),
      });

      zzfxP(sfx.spawn);

      world
        .create()
        .add(
          hunterData,
          hunterBody,
          new Sprite(drawBat),
          new Bat(),
          new Transform(wingFlap),
        );
    });

    this.powerupInterval = Interval(world, RAINBOW_INTERVAL, () => {
      const dice = Math.random() < 0.5;
      const startY = 120;
      const offset = 60;
      const startX = dice ? -offset : Stage.cw + offset;
      const swayStartX = dice ? offset : Stage.cw - offset;
      const swayEndX = dice ? Stage.cw - offset : offset;
      const exitX = rand(Stage.cw * 0.3, Stage.cw * 0.8);

      const rainbow = world
        .create()
        .add(
          new Rainbow(),
          new DynamicBody(pt(startX, startY)),
          new Sprite(drawRainbow),
        );

      const { position }: DynamicBody = rainbow.get(DynamicBody);

      const iterations = 3; // must be odd
      const enterTransform: Transformer = {
        duration: 1,
        update(e, t) {
          position.set(lerp(startX, swayStartX, easeOut(t)), startY);
        },
        end(e) {
          if (!Rainbow.soundEmitter?.exists)
            Rainbow.soundEmitter = Interval(world, 1 / 3, () =>
              zzfxP(sfx.fairy),
            );

          const exhaust = new Exhaust(world, 60, () => {
            PASTEL_RAINBOW.forEach((color, idx) => {
              const startSize = rand(5, 8);
              const endSize = rand(10, 13);
              world.create().add(
                new DynamicBody(position.add(Point.random(pt(), pt(2))), {
                  startVelocity: pt(1, 0).rotate(Math.random() * Math.PI * 2),
                }),
                FadeTransform(2),
                new Sprite((e) => {
                  const [{ position: p }, { transparency, scale }]: [
                    DynamicBody,
                    Sprite,
                  ] = e.get(DynamicBody, Sprite);
                  const { ctx } = Stage.setActiveLayer(LayerName.Particles);
                  const size = lerp(startSize, endSize, 1 - scale);
                  ctx.fillStyle = color.toAlpha(transparency);
                  const pos = pt(
                    p.x - size / 2,
                    p.y + (PASTEL_RAINBOW.length * size) / 2 - size * idx,
                  );
                  // circle(pos, rowSize, color);
                  ctx.fillRect(pos.x, pos.y, size, size);
                }),
              );
            });
          });

          rainbow.add(exhaust);
        },
      };
      const swayTransform: Transformer = {
        duration: lerp(2, 9, Stage.cw / Stage.ch / 2), // * 0.0075,
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
          Rainbow.soundEmitter?.delete();
        },
      };

      enterTransform.next = swayTransform;
      swayTransform.next = exitTransform;
      rainbow.add(new Transform(enterTransform));
    });
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
  static soundEmitter: Entity;

  destructor() {
    Rainbow.soundEmitter?.exists?.delete();
  }
}

export class Bat {
  wingAngle = 0;
}
