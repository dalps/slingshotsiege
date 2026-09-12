import { World, type Entity, type Query } from "../ecs";
import { drawFoal } from "../entities/foal";
import { drawFarGoneWeapon, SlingshotFrame } from "../entities/slingshot";
import { gameCycle } from "../main";
import { drawText } from "../utils/CanvasUtils";
import { damp2I, distribute, RAD2DEG } from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import { RED, WHITE, YELLOW } from "../utils/SpriteUtils";
import { AsyncTimeout, Timeout, Transform } from "../utils/TimeUtils";
import {
  DragInput,
  Frozen,
  GAME_TITLE,
  GameState,
  Health,
  Hunter,
  INTRO_KEY as INTRO_DONE_KEY,
  Prey,
  Rainbow,
  Score,
  Spawner,
  Sprite,
  Unicorn,
  UnicornEmotion,
  Weapon,
  WeaponState,
} from "./components";
import { bloodParticles, deathParticles, waterParticles } from "./particles";
import { DynamicBody, Force } from "./Physics2D";
import { comboSong, deathSong, gameSong, megaKillSong, sfx } from "./sfx";
import { LayerName, Stage } from "./Stage";
import { zzfxP } from "./zzfx";

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

      if (hunter.target?.exists) {
        // Just update the distance to the target
        hunter.distance = hunterBody.position.distance(
          hunter.target.get(DynamicBody).position,
        );
        return;
      }

      // Set a new target
      let candidateTarget = null;
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

        const direction = hunter.target
          .getComponent(DynamicBody)!
          .position.sub(hunterBody.position)
          .normalize()
          .scale(hunter.speed * 10);

        damp2I(hunterBody.velocity, direction, 0.6, dt);
        // hunterBody.velocity = direction;
      }
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
        // todo: violently shake

        if (health.lives <= 0) {
          zzfxP(sfx.death);
          // this.bounties.length <= 1 && zzfxP(...endSong);

          preyEntity.delete();

          // todo: display carcass sprite

          this.unicorn.iterate(
            (e, unicornData: Unicorn, unicornBody: DynamicBody) => {
              waterParticles(this.world, unicornBody, unicornData);

              unicornData.expression = UnicornEmotion.Anguished;
              this.world.query(Prey).length > 0 &&
                Timeout(this.world, 1, () => {
                  unicornData.expression = UnicornEmotion.Furious;
                });
            },
          );
        }
      }
    });
  }
}

export class RainbowMovement {
  rainbows: Query;

  constructor(world: World) {
    this.rainbows = world.query(Sprite, Rainbow, DynamicBody);
  }

  update(dt: number) {
    this.rainbows.iterate((r, rainbowSprite: Sprite) => {
      rainbowSprite.angle += dt * 0.1;
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

  update(dt) {
    this.weapons.iterate((w, weapon: Weapon, weaponBody: DynamicBody) => {
      if (weapon.state !== WeaponState.Fired) return;

      this.rainbows.iterate((r, rainbow: Rainbow, rainbowBody: DynamicBody) => {
        const distance = weaponBody.position.distance(rainbowBody.position);

        if (distance >= rainbow.radius) return;

        zzfxP(sfx.explosion);
        zzfxP(...megaKillSong);
        deathParticles(this.world, rainbowBody.position);
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
              deathParticles(this.world, hunterBody.position);
              h.delete();

              weapon.points += FIRST_KILL_POINTS;

              showScoreForKill(
                this.world,
                FIRST_KILL_POINTS,
                hunterBody.position,
              );
            });

          // Restart spawners
          Timeout(this.world, 1, () =>
            this.world.create().add(new Spawner(this.world)),
          );
        });

        this.world
          .query(Score)
          .iterate((e, score: Score) => (score.totalScore += weapon.points));
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
          deathParticles(this.world, hunterBody.position);
          h.delete();

          weapon.points += pointsForKill;
          comboSong(Math.log2(weapon.points / 100) * 2);

          this.world
            .query(Score)
            .iterate((e, score: Score) => (score.totalScore += pointsForKill));
          weapon.lastKill = now;

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

  constructor(public world: World) {
    this.preys = world.query(Prey);
    this.spawners = world.query(Spawner);
    this.slingshot = world.query(SlingshotFrame);
    this.unicorns = world.query(Unicorn, DynamicBody);
    this.score = this.world.create().add(new Score());

    this.gameState = GameState.Title;
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

    await AsyncTimeout(this.world, 2);

    // Hide the corner score
    this.score.remove(Sprite);
    this.currentSong = zzfxP(...deathSong);
    drawText("I failed you, children...", pt(cw * 0.5, ch * 0.2));

    await AsyncTimeout(this.world, 2);

    drawText("High Scores", pt(cw * 0.5, ch * 0.4), {
      size: 28,
      fill: RED,
    });

    const cmp = (a: number, b: number) => b - a;
    const scoreData: Score = this.score.get(Score);
    const totalScore = this.score.get(Score).totalScore;
    const nScores = 5;
    const size = 24;
    const previousTop5Scores = scoreData.scores
      .sort(cmp)
      .slice(0, nScores)
      .map((n) => [n, WHITE]);

    scoreData.saveScore();

    const item = [totalScore, YELLOW];
    const currentTopScoresWithColors = [item, ...previousTop5Scores]
      .sort((a, b) => cmp(a[0], b[0]))
      .slice(0, nScores);

    currentTopScoresWithColors.forEach(async ([score, fill], idx) => {
      await AsyncTimeout(this.world, 0.5);
      drawText(`${score}`, pt(cw * 0.5, ch * 0.4 + (size + 4) * (idx + 1)), {
        size,
        fill,
      });
    });

    const text = `Final score: ${totalScore}`;
    drawText(text, pt(cw * 0.5, ch * 0.7), {
      size: 28,
      fill: YELLOW,
    });

    await AsyncTimeout(this.world, 2);

    drawText("Tap to retry", pt(cw * 0.5, ch * 0.8), {
      size: 24,
    });

    ui.onclick = this.startWave.bind(this);
  }

  startWave() {
    const [slingshotEntity, slingshotData]: [Entity, SlingshotFrame] =
      this.slingshot.first()!;

    Stage.clearLayer(LayerName.UI);
    const { canvas: ui, width: cw, height } = Stage.getLayer(LayerName.UI)!;
    ui.onclick = null;

    this.currentSong?.stop();
    this.currentSong = zzfxP(...gameSong);
    this.currentSong.loop = true;

    const scoreData: Score = this.score.get(Score);

    // Clear the score and show it in the upper-right corner
    scoreData.totalScore = 0;
    this.score.add(
      new Sprite(() =>
        drawText(`Score ${scoreData.totalScore}`, pt(cw, 0), {
          centered: false,
          size: 32,
          layer: LayerName.Scores,
        }),
      ),
    );

    // Setup slingshot controls
    slingshotData.addDragInput();

    // Setup spawners
    this.world.create().add(new Spawner(this.world));

    // Recreate foals and restore health
    this.preys.length <= 0 && spawnFoals(this.world);
    this.preys.iterate((e) => e.add(new Health()));

    this.tearEmitter?.exists?.delete();

    // Make mom angry
    this.unicorns.iterate((e, unicornData: Unicorn) => {
      unicornData.getPissed();
    });

    // Animate sky
    // ...

    this.gameState = GameState.Ongoing;
  }

  title() {
    if (this.gameState !== GameState.Title) return;

    const ui = Stage.getLayer(LayerName.UI)!.canvas;

    drawText(GAME_TITLE, pt(Stage.cw * 0.5, Stage.ch * 0.2), {
      fill: YELLOW,
      lineWidth: 2,
      size: 64,
    });

    drawText("Tap to play", pt(Stage.cw * 0.5, Stage.ch * 0.7));

    drawText(
      "Made by dalps for js13k 2026",
      pt(Stage.cw * 0.5, Stage.ch * 0.95),
      { size: 16 },
    );

    ui.onclick = async () => {
      ui.onclick = null;

      Stage.clearLayer(LayerName.UI);

      // Make mom angry
      this.unicorns.iterate((e, unicornData: Unicorn) => {
        unicornData.getPissed();
      });

      if (!window.localStorage.getItem(INTRO_DONE_KEY)) {
        await this.playIntro();
      }

      this.startWave();
    };
  }

  async playIntro() {
    await AsyncTimeout(this.world, 1);

    drawText(
      "Our fortress is under attack by evil specters! >_<",
      pt(Stage.cw * 0.5, Stage.ch * 0.2),
    );

    await AsyncTimeout(this.world, 2);

    drawText(
      "Will you help unicorn mom defend her babies?",
      pt(Stage.cw * 0.5, Stage.ch * 0.4),
    );

    await AsyncTimeout(this.world, 2);

    drawText(
      "Launch her horns towards the wraiths with the slingshot!",
      pt(Stage.cw * 0.5, Stage.ch * 0.6),
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

export function getFoalPositions(): Point[] {
  const { cw, ch } = Stage.setActiveLayer(LayerName.Game);
  const width = 0.9;
  const offset = cw * (1 - width);

  return distribute(offset, cw * width, 4).map((x) => pt(x, ch * 0.85));
}

export function spawnFoals(world: World) {
  return getFoalPositions().map((x) =>
    world.create().add(new Prey(), new DynamicBody(x), new Sprite(drawFoal)),
  );
}

// export function drawFoalShadows(foals: Entity[]) {
//   foals.forEach(
//     (e) => e.exists && drawShadow(e.get(DynamicBody).position.add(pt(0, 20))),
//   );
// }
