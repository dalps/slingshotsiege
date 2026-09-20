import { World, type Entity, type Query } from "../ecs";
import { drawBat, FLAP_INTERVAL, wingFlap } from "../entities/bat";
import { drawEnemy } from "../entities/enemy";
import {
  goToHeaven,
  drawCarcass,
  drawFoal,
  trembleTransform,
} from "../entities/foal";
import { drawRainbow } from "../entities/rainbow";
import {
  drawFarGoneWeapon,
  GRAB_DISTANCE,
  SlingshotFrame,
} from "../entities/slingshot";
import { gameCycle } from "../main";
import { ConeTransition, drawText, FadeTransition } from "../utils/CanvasUtils";
import {
  bounce,
  clamp,
  damp2I,
  distribute,
  easeIn,
  easeInBack,
  easeOut,
  lerp,
  RAD2DEG,
  rand,
  sway,
} from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import {
  BLACK,
  PASTEL_RAINBOW,
  RED,
  WHITE,
  YELLOW,
} from "../utils/SpriteUtils";
import {
  AsyncTimeout,
  Interval,
  Timeout,
  Transform,
  type Transformer,
} from "../utils/TimeUtils";
import {
  Bat,
  Blood,
  DragInput,
  Exhaust,
  Foal,
  Frozen,
  GAME_TITLE,
  GameState,
  Health,
  Hunter,
  INTRO_KEY as INTRO_DONE_KEY,
  Prey,
  Rainbow,
  RAINBOW_INTERVAL,
  Score,
  Spawner,
  Sprite,
  START_SPEED,
  Unicorn,
  UnicornEmotion,
  Weapon,
  WeaponState,
  Wraith,
} from "./components";
import {
  bloodParticles,
  drawSquare,
  explosionParticles,
  FadeTransform,
  sleepyParticle,
  waterParticles,
} from "./particles";
import { ContactForce, DynamicBody, Force, GRAVITY } from "./Physics2D";
import {
  comboSong,
  gameOverSong,
  megaKillSong,
  sfx,
  themeSong1,
  themeSong2,
} from "./sfx";
import { LayerName, Stage } from "./Stage";
import { zzfxP, zzfxR, zzfxX } from "./zzfx";

const BAT_INTERVAL = 10;
const FIRST_KILL_POINTS = 100;

/**
 * Selects a unicorn foal for each foe to prey on and directs the foe towards it.
 */
export class TargetingSystem {
  hunters: Query;
  bounties: Query;

  constructor(world: World) {
    this.bounties = world.query(Prey, DynamicBody);
    this.hunters = world.query(Hunter, DynamicBody);
  }

  update(dt: number) {
    this.hunters.iterate((h, hunter: Hunter, hunterBody: DynamicBody) => {
      if (hunterBody.position.y > Stage.ch * 1.5) {
        h.delete();
        return;
      }

      if (hunter.target?.exists && hunter.target.get(Prey)) {
        // Just update the distance to the target
        hunter.distance = hunterBody.position.distance(
          hunter.target.get(DynamicBody).position,
        );
        return;
      }

      // Set a new target
      let candidateTarget: Entity | null = null;
      let candidateDistance = Infinity;

      this.bounties.iterate((b, bounty: Prey, bountyBody: DynamicBody) => {
        const dist = hunterBody.position.distance(bountyBody.position);
        if (dist < candidateDistance) {
          candidateDistance = dist;
          candidateTarget = b;
        }
      });

      if (candidateTarget) {
        hunter.target = candidateTarget as Entity;
        hunter.distance = candidateDistance;
      }
    });
  }
}

/**
 * Updates the hunters' velocities with the total score and their direction.
 */
export class WraithMotion {
  wraiths: Query;

  constructor(world: World) {
    this.wraiths = world.query(Hunter, DynamicBody, Wraith);
  }

  update(dt: number) {
    this.wraiths.iterate((h, hunter: Hunter, hunterBody: DynamicBody) => {
      hunter.speed =
        START_SPEED + (gameCycle.score.get(Score) as Score).totalScore * 0.0125;

      if (hunter.target?.exists) {
        hunter.direction =
          hunter.target
            .getComponent(DynamicBody)!
            .position.sub(hunterBody.position)
            .normalize()
            .scale(hunter.speed * 0.1) ?? pt(0, 1);
      }

      damp2I(hunterBody.velocity, hunter.direction, 0.1, dt);
    });
  }
}

export class DamageSystem {
  world: World;
  hunters: Query;
  bounties: Query;
  unicorn: Query;

  constructor(world: World) {
    this.world = world;
    this.bounties = world.query(Prey, Health, DynamicBody);
    this.hunters = world.query(Hunter, DynamicBody);
    this.unicorn = this.world.query(Unicorn, DynamicBody);
  }

  update() {
    this.hunters.iterate((h, hunter: Hunter, hunterBody: DynamicBody) => {
      if (hunter.target?.exists && hunter.distance! < 20) {
        const preyEntity = hunter.target;

        const [preyData, health, preyBody]: [Prey, Health, DynamicBody] =
          preyEntity.get(Prey, Health, DynamicBody)!;

        h.delete();

        this.unicorn.iterate((e, unicornData: Unicorn) => {
          unicornData.getPissed();
        });

        health.lives = Math.max(0, health.lives - 1);
        bloodParticles(this.world, preyBody.position);
        zzfxP(sfx.damage);
        preyEntity.add(new Transform(trembleTransform));

        if (health.lives <= 0) {
          zzfxP(sfx.death);
          preyEntity.remove(Prey, Health, Exhaust).add(new Sprite(drawCarcass));
          goToHeaven(this.world, preyEntity);

          // todo: display carcass sprite

          if (this.bounties.length <= 1) {
            gameCycle.playSong(themeSong2);
          }

          // Make unicorn mom cry for a bit
          this.unicorn.iterate(
            (e, unicornData: Unicorn, unicornBody: DynamicBody) => {
              waterParticles(this.world, unicornBody, unicornData);

              unicornData.expression = UnicornEmotion.Anguished;

              Timeout(this.world, 1, () => {
                // Game could have ended in the meantime, if so don't set the emote.
                gameCycle.gameState === GameState.Ongoing &&
                  (unicornData.expression = UnicornEmotion.Furious);
              });
            },
          );
        }
      }
    });
  }
}

export class RainbowSystem {
  weapons: Query;
  rainbows: Query;
  hunter: Query;
  spawners: Query;
  world: World;

  constructor(world: World) {
    this.world = world;
    this.weapons = world.query(Weapon, DynamicBody);
    this.rainbows = world.query(Rainbow, DynamicBody);
    this.hunter = world.query(Hunter, DynamicBody);
    this.spawners = world.query(Spawner);
  }

  update(dt: number) {
    this.rainbows.iterate((r) => (r.get(Sprite).angle += dt * 0.1));

    this.weapons.iterate((w, weapon: Weapon, weaponBody: DynamicBody) => {
      if (weapon.state !== WeaponState.Fired) return;

      this.rainbows.iterate((r, rainbow: Rainbow, rainbowBody: DynamicBody) => {
        const distance = weaponBody.position.distance(rainbowBody.position);

        if (distance >= rainbow.radius) return;

        zzfxP(sfx.explosion);
        zzfxP(...megaKillSong);
        explosionParticles(this.world, rainbowBody.position, WHITE);
        r.delete();

        // Doesn't increase the score

        this.world.query(Unicorn).iterate((e, unicorn: Unicorn) => {
          ((unicorn.expression = UnicornEmotion.Content),
            Timeout(this.world, 4, () => unicorn.getPissed()));
        });

        // todo: pause slingshot reload too

        // Pause spawners
        this.spawners.iterate((e) => e.delete());

        // Stop and disarm all foes
        this.hunter.iterate((h, hunter: Hunter, hunterBody: DynamicBody) => {
          hunterBody.velocity.set(0, 0);
          h.remove(Hunter); // Disable weapon interaction
          h.add(new Frozen());
        });

        Timeout(this.world, 2, () => {
          // Kill all foes after a short timeout
          zzfxP(sfx.explosion);

          this.world
            .query(Frozen, DynamicBody)
            .iterate((h, _, hunterBody: DynamicBody) => {
              explosionParticles(this.world, hunterBody.position);
              h.delete();

              weapon.points += FIRST_KILL_POINTS;

              showScoreForKill(
                this.world,
                FIRST_KILL_POINTS,
                hunterBody.position,
              );
            });

          // Update total score
          this.world
            .query(Score)
            .iterate((e, score: Score) => (score.totalScore += weapon.points));

          // Restart spawners
          Timeout(this.world, 1, () => gameCycle.createSpawners());
        });
      });
    });
  }
}

/**
 * Makes travelling horns kill the foes.
 */
export class AttackSystem {
  comboMaxDelay = 100;
  damageRadius = 50;

  weapons: Query;
  hunter: Query;
  world: World;

  constructor(world: World) {
    this.world = world;
    this.weapons = world.query(Weapon, DynamicBody);
    this.hunter = world.query(Hunter, DynamicBody);
  }

  update(dt: number) {
    this.weapons.iterate((w, weapon: Weapon, weaponBody: DynamicBody) => {
      if (weapon.state !== WeaponState.Fired) return;

      this.hunter.iterate((h, hunter: Hunter, hunterBody: DynamicBody) => {
        const distance = weaponBody.position.distance(hunterBody.position);

        if (distance < this.damageRadius) {
          const now = performance.now();

          // 100 --> 200 --> 400 --> 800
          const pointsForKill = weapon.points
            ? weapon.points
            : FIRST_KILL_POINTS;

          zzfxP(sfx.explosion);
          explosionParticles(this.world, hunterBody.position);
          h.delete();

          weapon.points += pointsForKill;
          comboSong(Math.log2(weapon.points / 100) * 2);

          this.world
            .query(Score)
            .iterate((e, score: Score) => (score.totalScore += pointsForKill));

          showScoreForKill(this.world, weapon.points, hunterBody.position);
        }
      });
    });
  }
}

function showScoreForKill(world: World, score: number, position: Point) {
  const scoreText = `${score}`;

  world.create().add(
    new DynamicBody(position, {
      startVelocity: pt(0, -10),
    }),
    new Sprite(() =>
      drawText(scoreText, position, {
        fill: YELLOW,
        size: 36,
        layer: LayerName.Scores,
      }),
    ),
    new Transform({ duration: 1, end: (e) => e.delete() }),
  );
}

export class Render {
  sprites: Query;

  constructor(public world: World) {
    this.sprites = this.world.query(Sprite);
  }

  update() {
    [
      LayerName.Unicorn,
      LayerName.Projectiles,
      LayerName.Particles,
      LayerName.Game,
      LayerName.Scores,
    ].forEach((l) => Stage.clearLayer(l));

    this.sprites.iterate((entity, sprite: Sprite) => {
      sprite.draw(entity);
    });
  }
}

/**
 * Responsible for cleaning up fired projectiles and animating the background with those that are traveling downwards.
 */
export class FiredProjectileSystem {
  firedWeapons: Query;

  constructor(public world: World) {
    this.firedWeapons = world.query(Weapon, DynamicBody);
  }

  update() {
    this.firedWeapons.iterate(
      (entity, weapon: Weapon, weaponBody: DynamicBody) => {
        if (weapon.state !== WeaponState.Fired) return;

        const { position, velocity } = weaponBody;

        if (position.y > Stage.ch * 1.5) {
          entity.delete();
        }

        const angle = velocity.angle() * RAD2DEG; // 0 points up, -180 (anticlockwise) and 180 (clockwise) both point down

        // Make sure it's traveling straight down, to an extent, before deleting it
        if (position.y < -Stage.ch * 0.5 && Math.abs(angle) - 180 < 25) {
          // Replace the sprite
          // console.log("Replacing sprite...");
          weapon.state = WeaponState.Used;
          weaponBody.clearForces();
          weaponBody.addForce(new Force(pt(0, 1), 5));
          entity.remove(Sprite);
          entity.add(new Sprite(drawFarGoneWeapon));
        }
        // todo: Remove when below the screen area
      },
    );
  }
}

export class GameCycle {
  totalLives = 0;
  preys: Query;
  gameState: GameState;
  spawners: Query;
  slingshot: Query;
  unicorns: Query;
  score: Entity;
  tearEmitter: Entity | null = null;
  currentSong: AudioBufferSourceNode | null = null;
  wave = 0;

  gainNode: GainNode;

  constructor(public world: World) {
    this.preys = world.query(Prey);
    this.spawners = world.query(Spawner);
    this.slingshot = world.query(SlingshotFrame);
    this.unicorns = world.query(Unicorn, DynamicBody);
    this.score = this.world.create().add(new Score());

    this.gameState = GameState.Title;

    this.gainNode = zzfxX.createGain();
    this.gainNode.connect(zzfxX.destination);
  }

  update(dt: number) {
    switch (this.gameState) {
      case GameState.Title: {
        break;
      }
      case GameState.Ongoing: {
        let totalLives = 0;

        this.preys.iterate((e, preyData: Prey) => {
          const health: Health = e.get(Health);
          if (health) totalLives += health.lives;
        });

        this.totalLives = totalLives;

        if (totalLives <= 0) {
          this.gameOver();
        }
        break;
      }
      case GameState.Over: {
        break;
      }
    }
  }

  createSpawners() {
    this.world.create().add(new Spawner(this.world, durationFn, spawnWraith));
    this.world.create().add(new Spawner(this.world, BAT_INTERVAL, spawnBat));
    this.world
      .create()
      .add(new Spawner(this.world, RAINBOW_INTERVAL, spawnRainbow));
  }

  async gameOver() {
    this.gameState = GameState.Over;
    this.currentSong?.stop();

    const [slingshotEntity, slingshotData]: [Entity, SlingshotFrame] =
      this.slingshot.first()!;

    // Disable slingshot
    slingshotData.fire();
    slingshotData.handle?.exists?.remove(DragInput);

    // Stop hunting
    this.world.query(Hunter).iterate((e) => e.remove(Hunter));

    // Stop spawning
    this.spawners.iterate((e, spawner: Spawner) => e.delete());

    const { ch, cw } = Stage.setActiveLayer(LayerName.Scores);

    // Make mom shed tears indefinitely
    this.unicorns.iterate(
      (e, unicornData: Unicorn, unicornBody: DynamicBody) => {
        unicornData.expression = UnicornEmotion.Anguished;

        this.tearEmitter = waterParticles(
          this.world,
          unicornBody,
          unicornData,
          Infinity,
        );
      },
    );

    const ui = Stage.getLayer(LayerName.UI)!.canvas;
    ui.onclick = null;

    await AsyncTimeout(this.world, 2);

    // Hide the corner score
    this.score.remove(Sprite);
    this.playSong(gameOverSong, false);
    const centerX = cw / 2;
    drawText("I failed you, children...", pt(centerX, ch * 0.15));

    await AsyncTimeout(this.world, 2);
    const totalScore = this.score.get(Score).totalScore;

    const highScoresY = ch * 0.3;
    drawText("High Scores", pt(centerX, highScoresY), {
      size: 28,
      fill: RED,
    });

    const text = `Final score: ${totalScore}`;
    drawText(text, pt(centerX, ch * 0.6), {
      size: 28,
      fill: YELLOW,
    });

    const cmp = (a: number, b: number) => b - a;
    const scoreData: Score = this.score.get(Score);
    const nScores = 5;
    const size = 24;
    let top5Scores = scoreData.scores
      .sort(cmp)
      .slice(0, nScores)
      .map((n) => [n, WHITE]);

    if (scoreData.totalScore > 0) {
      scoreData.saveScore();

      top5Scores.push([totalScore, YELLOW]);
      top5Scores = top5Scores.sort((a, b) => cmp(a[0], b[0])).slice(0, nScores);
    }

    for (let i = 0; i < top5Scores.length; i++) {
      const [score, fill] = top5Scores[i];
      await AsyncTimeout(this.world, 0.5);
      drawText(
        `${score}`,
        pt(centerX, highScoresY + 10 + (size + 4) * (i + 1)),
        {
          size,
          fill,
        },
      );
    }

    await AsyncTimeout(this.world, 2);

    const tapToRetry = swellingText(
      this.world,
      "Tap to retry",
      pt(centerX, ch * 0.85),
      24,
      28,
    );

    ui.onclick = ui.ontouchend = async () => {
      tapToRetry.delete();
      ui.onclick = null;
      if (this.currentSong) {
        this.world.create().add(
          new Transform({
            duration: 1,
            end: (e) => {
              this.currentSong?.stop();
              e.delete();
            },
            update: (e, stage) => {
              this.gainNode.gain.setValueAtTime(1 - stage, 0);
            },
          }),
        );
      }
      await FadeTransition(this.world);
      this.startSiege();
    };
  }

  playSong(song: number[][], loop = true) {
    this.currentSong?.stop();

    // Adapted from zzfxP's code
    let makeSourceNode = (...t) => {
      let e = zzfxX.createBufferSource(),
        f = zzfxX.createBuffer(t.length, t[0].length, zzfxR);
      t.map((d, i) => f.getChannelData(i).set(d));
      e.buffer = f;
      return e;
    };
    const node = makeSourceNode(...song);

    node.connect(this.gainNode);
    this.gainNode.gain.setValueAtTime(1, 0); // reset gain
    this.currentSong = node;
    this.currentSong.loop = loop;
    this.currentSong.start();
  }

  async startSiege(first = false) {
    const [slingshotEntity, slingshotData]: [Entity, SlingshotFrame] =
      this.slingshot.first()!;

    const scoreData: Score = this.score.get(Score);

    // Clear the score and show it in the upper-right corner
    scoreData.totalScore = 0;
    this.score.add(
      new Sprite(() =>
        drawText(`Score ${scoreData.totalScore}`, pt(Stage.cw, 0), {
          centered: false,
          size: 32,
          layer: LayerName.Scores,
        }),
      ),
    );

    // Clean up carcasses and enemies
    this.killAll(Foal, Bat, Wraith, Blood);
    this.tearEmitter?.exists?.delete();

    // Recreate foals and restore health
    this.preys.length <= 0 && spawnFoals(this.world);
    this.preys.iterate((e) => e.add(new Health()));

    // Make mom angry
    this.unicorns.iterate((e, unicornData: Unicorn) => {
      unicornData.getPissed();
    });

    // Wait for transition...
    !first &&
      (await ConeTransition(this.world, {
        endRadius: Math.max(Stage.cw, Stage.ch) * 0.75,
      }));

    this.playSong(themeSong1);

    // Setup slingshot controls
    slingshotData.addDragInput();

    // Setup spawners
    this.createSpawners();

    // Animate sky
    // ...

    this.gameState = GameState.Ongoing;
  }

  killAll(...classes: any[]) {
    classes.forEach((C) => this.world.query(C).iterate((e) => e.delete()));
  }

  title() {
    if (this.gameState !== GameState.Title) return;

    const ui = Stage.getLayer(LayerName.UI)!.canvas;

    drawText(GAME_TITLE, pt(Stage.cw / 2, Stage.ch * 0.2), {
      fill: YELLOW,
      lineWidth: 2,
      size: 64,
    });

    const tapToStart = swellingText(
      this.world,
      "Tap to play",
      pt(Stage.cw / 2, Stage.ch * 0.7),
    );

    drawText(
      "Made by dalps for js13k 2026",
      pt(Stage.cw / 2, Stage.ch * 0.95),
      { size: 16, fill: "#ccc" },
    );

    ui.onclick = ui.ontouchend = async () => {
      ui.onclick = ui.ontouchend = null;

      tapToStart.delete();

      Stage.clearLayer(LayerName.UI);

      // Make mom angry
      this.unicorns.iterate((e, unicornData: Unicorn) => {
        unicornData.getPissed();
      });

      if (!window.localStorage.getItem(INTRO_DONE_KEY)) {
        await this.playIntro();
      }

      this.startSiege(true);
    };
  }

  async playIntro() {
    const size = 16;
    await AsyncTimeout(this.world, 1);

    drawText(
      "The fortress is under attack by evil ghosts! >_<",
      pt(Stage.cw / 2, Stage.ch * 0.2),
      { size },
    );

    await AsyncTimeout(this.world, 2);

    drawText(
      "Help unicorn mom protect her babies!",
      pt(Stage.cw / 2, Stage.ch * 0.4),
      { size },
    );

    await AsyncTimeout(this.world, 2);

    drawText(
      "Shoot her horns with the slingshot to destroy the ghosts.",
      pt(Stage.cw / 2, Stage.ch * 0.6),
      { size },
    );

    await AsyncTimeout(this.world, 5);

    Stage.clearLayer(LayerName.UI);
    window.localStorage.setItem(INTRO_DONE_KEY, "1");
  }
}

/**
 * Responsible for reloading the slingshot with weapons supplied by the unicorns.
 */
export class ReloadSystem {
  slingshot: Query;
  unicorn: Query;

  constructor(public world: World) {
    this.slingshot = world.query(SlingshotFrame); // singleton
    this.unicorn = world.query(Unicorn);
  }

  update() {
    this.slingshot.iterate((s, slingshot: SlingshotFrame) =>
      this.unicorn.iterate((u, unicorn: Unicorn) => {
        if (
          gameCycle.gameState === GameState.Ongoing &&
          !unicorn.horn &&
          !slingshot.weapon
        ) {
          unicorn.passHornToSlingshot(this.world, u, s);
        }
      }),
    );
  }
}

export class CursorSystem {
  slingshot: Query;
  handle: Query;

  constructor(world: World) {
    this.slingshot = world.query(SlingshotFrame);
    this.handle = world.query(DragInput);
  }

  update(dt: number) {
    this.slingshot.iterate((s, frame: SlingshotFrame) => {
      this.handle.iterate((h, input: DragInput) => {
        if (!input.pointerPos) return;

        const uiLayer = Stage.getLayer(LayerName.UI)!;

        if (input.dragPos && frame.grabPos) {
          uiLayer.canvas.style.cursor = "grabbing";
          return;
        }

        const inGrabArea =
          input.pointerPos.distance(frame.midpoint) < GRAB_DISTANCE;

        uiLayer.canvas.style.cursor = inGrabArea ? "grab" : "default";
      });
    });
  }
}

export function getFoalPositions(): Point[] {
  const { cw, ch } = Stage.setActiveLayer(LayerName.Game);
  const width = 0.9;
  const offset = cw * (1 - width);

  return distribute(offset, cw * width, 4).map((x) => pt(x, ch * 0.85));
}

export function spawnFoals(world: World) {
  return getFoalPositions().map((x, idx) =>
    world
      .create()
      .add(
        new Prey(),
        new DynamicBody(x),
        new Sprite(drawFoal),
        new Exhaust(world, 0.5, () => sleepyParticle(world, x.add(pt(-30)))),
        new Foal(idx),
      ),
  );
}

// export function drawFoalShadows(foals: Entity[]) {
//   foals.forEach(
//     (e) => e.exists && drawShadow(e.get(DynamicBody).position.add(pt(0, 20))),
//   );
// }

export function spawnRainbow(world: World) {
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
        Rainbow.soundEmitter = Interval(world, 1 / 3, () => zzfxP(sfx.fairy));

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
}

export function spawnBat(world: World) {
  const hunterData = new Hunter();

  const hunterBody = new DynamicBody(pt(Math.random() * Stage.cw, 0), {
    startVelocity: pt(rand(0, 10), 0).rotate(Math.random() * Math.PI * 2),
  });

  zzfxP(sfx.bat);

  const batData = new Bat();
  const magnitude = 52;

  batData.velocityNoise = Interval(world, FLAP_INTERVAL, () => {
    hunterBody.addForce(new ContactForce(pt(0, -1), magnitude, 1));
  });

  hunterBody.addForce(GRAVITY);

  world
    .create()
    .add(
      hunterData,
      hunterBody,
      new Sprite(drawBat),
      new Bat(),
      new Transform(wingFlap),
    );
}

export function spawnWraith(world: World) {
  const hunterData = new Hunter();

  const hunterBody = new DynamicBody(pt(Math.random() * Stage.cw, 0), {
    startVelocity: pt(rand(0, 10), 0).rotate(Math.random() * Math.PI * 2),
  });
  const exhaust = new Exhaust(world, 5, () => {
    const size = rand(20, 30);

    world
      .create()
      .add(
        new DynamicBody(hunterBody.position.add(Point.random(pt(), pt(20)))),
        FadeTransform(2),
        new Sprite((e) => drawSquare(e, size, BLACK, 0.5)),
      );
  });

  zzfxP(sfx.spawn);

  world
    .create()
    .add(hunterData, hunterBody, new Sprite(drawEnemy), exhaust, new Wraith());
}

const durationFn = () =>
  rand(
    0.5,
    clamp(1, 2, lerp(2, 1, gameCycle.score.get(Score).totalScore / 60_000)),
  );

const swelling = new Transform({
  duration: 2,
  // end(e) {},
  update(e, t) {
    const sprite: Sprite = e.get(Sprite);
    // sprite.transparency = Math.ceil(Math.cos(t * Math.PI));
    sprite.scale = t;
  },
});

swelling.transformer.next = swelling.transformer;

const swellingText = (
  world: World,
  text: string,
  position: Point,
  startSize = 30,
  endsize = 36,
) =>
  world.create().add(
    new Sprite((e) => {
      const { transparency, scale }: Sprite = e.get(Sprite);
      drawText(text, position, {
        fill: WHITE.toAlpha(transparency),
        stroke: BLACK.toAlpha(transparency),
        size: lerp(startSize, endsize, sway(scale, 2)),
        layer: LayerName.Scores,
      });
    }),
    swelling,
  );
