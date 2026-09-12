import type { Entity, World } from "../ecs";
import { drawEnemy } from "../entities/enemy";
import {
  drawRainbow,
  RAINBOW_INNER_RADIUS,
  RAINBOW_OUTER_RADIUS,
} from "../entities/rainbow";
import { drawWeapon, SlingshotFrame } from "../entities/slingshot";
import {
  bounce,
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
  Transform,
  type timestamp,
  type Transformer,
} from "../utils/TimeUtils";
import { FadeTransform } from "./particles";
import { DynamicBody } from "./Physics2D";
import { sfx, zzfxP } from "./sfx";
import { LayerName, Stage } from "./Stage";

type DrawFn = (entity: Entity) => void;

export const GAME_TITLE = "Slingshot Siege";
export const RAINBOW_INTERVAL = 10;
export const START_LIVES = 3;

export class Position extends Point {}

export class Health {
  lives = START_LIVES;
}

export class Prey {
  radius = 40;

  constructor(public targeted = true) {}
}

export class Hunter {
  target: Entity | null = null;
  distance: number | null = null;
  speed: number = 20;
  particleEmitter: Entity | null = null;

  destructor() {
    this.particleEmitter?.delete();
  }
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

export class Score {
  constructor(public totalScore = 0) {}
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

export class Spawner {
  enemyInterval: Entity;
  powerupInterval: Entity;

  constructor(public world: World) {
    this.enemyInterval = Interval(world, 1, () => {
      const hunterData = new Hunter();
      const hunterBody = new DynamicBody(pt(Math.random() * Stage.cw, 0));

      world.create().add(hunterData, hunterBody, new Sprite(drawEnemy));

      hunterData.particleEmitter = Interval(world, 1 / 5, () => {
        const size = rand(20, 30);

        world.create().add(
          new DynamicBody(hunterBody.position.add(Point.random(pt(), pt(20))), {
            // startVelocity: pt(rand(10, 20), 0).rotate(Math.random() * Math.PI * 2),
          }),
          FadeTransform(2),
          new Sprite((e) => {
            const [{ position: p }, { transparency, scale }]: [
              DynamicBody,
              Sprite,
            ] = e.get(DynamicBody, Sprite);
            const { ctx } = Stage.setActiveLayer(LayerName.Projectiles);
            ctx.save();
            ctx.resetTransform();
            ctx.fillStyle = BLACK.toAlpha(lerp(0.5, 0, transparency));

            // circle(pos, rowSize, color);
            ctx.fillRect(p.x, p.y, size * scale, size * scale);
            ctx.restore();
          }),
        );
      });
    });

    this.powerupInterval = Interval(world, 30, () => {
      const dice = Math.random() < 0.5;
      const startY = 120;
      const offset = 60;
      const startX = dice ? -offset : Stage.cw + offset;
      const swayStartX = dice ? offset : Stage.cw - offset;
      const swayEndX = dice ? Stage.cw - offset : offset;
      const exitX = rand(Stage.cw * 0.3, Stage.cw * 0.8);

      const rainbowData = new Rainbow();
      const rainbow = world
        .create()
        .add(
          rainbowData,
          new DynamicBody(pt(startX, startY)),
          new Sprite((e) => drawRainbow(e, world)),
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
              zzfxP(sfx.rainbow2),
            );

          rainbowData.particleEmitter = Interval(world, 1 / 60, () => {
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
                  const { ctx } = Stage.setActiveLayer(LayerName.Projectiles);
                  ctx.save();
                  const size = lerp(startSize, endSize, 1 - scale);
                  ctx.fillStyle = color.setAlpha(transparency);
                  const pos = pt(
                    p.x - size * 0.5,
                    p.y + PASTEL_RAINBOW.length * size * 0.5 - size * idx,
                  );
                  // circle(pos, rowSize, color);
                  ctx.fillRect(pos.x, pos.y, size, size);
                  ctx.restore();
                }),
              );
            });
          });
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
  particleEmitter: Entity | null = null;
  static soundEmitter: Entity;

  destructor() {
    this.particleEmitter?.delete();
    Rainbow.soundEmitter?.exists?.delete();
  }
}
