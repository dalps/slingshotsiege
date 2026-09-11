import { World, type Entity, type Query } from "../ecs";
import { drawFoal } from "../entities/foal";
import { drawFarGoneWeapon, SlingshotFrame } from "../entities/slingshot";
import { drawText } from "../utils/CanvasUtils";
import { damp2I, distribute, RAD2DEG } from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import { Timeout, Transform } from "../utils/TimeUtils";
import { rgb } from "./color";
import {
  DragInput,
  Frozen,
  Game,
  GAME_TITLE,
  GameState,
  Health,
  Hunter,
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
import { comboSound, megaKillSound, sfx, SongLibrary } from "./sfx";
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
        const preyEntity = hunter.target!;
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
          preyEntity.delete();

          // todo: display carcass sprite

          this.unicorn.iterate(
            (e, unicornData: Unicorn, unicornBody: DynamicBody) => {
              waterParticles(this.world, unicornBody, unicornData);

              unicornData.expression = UnicornEmotion.Anguished;
              this.world.query(Prey).length > 0 &&
                Timeout(e, 1, () => {
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
        zzfxP(...megaKillSound);
        deathParticles(this.world, rainbowBody.position);
        r.delete();

        weapon.lastKill = performance.now();
        weapon.points += FIRST_KILL_POINTS;
        showScoreForKill(this.world, FIRST_KILL_POINTS, rainbowBody.position);

        this.world.query(Unicorn).iterate((e, unicorn: Unicorn) => {
          ((unicorn.expression = UnicornEmotion.Content),
            Timeout(this.world.create(), 4, () => unicorn.getPissed()));
        });

        // Pause spawners
        this.spawners.iterate((e) => e.delete());

        // Stop and disarm all foes
        this.hunter.iterate((h, hunter: Hunter, hunterBody: DynamicBody) => {
          hunterBody.velocity.set(0, 0);
          h.remove(Hunter); // Disable weapon interaction
          h.add(new Frozen());
        });

        Timeout(this.world.create(), 2, () => {
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
          Timeout(this.world.create(), 1, () =>
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
          comboSound(Math.log2(weapon.points / 100) * 2);

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
    new Sprite(() => drawText(scoreText, position, { fill: YELLOW, size: 36 })),
    new Transform({ duration: 1, end: (e) => e.delete() }),
  );
}

export class Render {
  sprites: Query;

  constructor(public world: World) {
    this.sprites = this.world.query(Sprite);
  }

  update() {
    Stage.clearLayer(LayerName.Game);
    Stage.clearLayer(LayerName.BG_2);
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

const YELLOW = rgb(179, 255, 0);
export class GameCycle {
  totalLives = 0;
  preys: Query;
  gameState: Query;
  spawners: Query;
  slingshot: Query;
  unicorns: Query;
  score: Entity;
  tearEmitter: Entity | null = null;
  currentSong: AudioBufferSourceNode | null = null;

  constructor(public world: World) {
    this.preys = world.query(Prey);
    this.gameState = world.query(Game);
    this.spawners = world.query(Spawner);
    this.slingshot = world.query(SlingshotFrame);
    this.unicorns = world.query(Unicorn, DynamicBody);
    this.score = this.world.create().add(new Score());
  }

  update(dt: number) {
    const [_, game]: [Entity, Game] = this.gameState.first()!;

    switch (game.state) {
      case GameState.Menu: {
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

  gameOver() {
    const [_, game]: [Entity, Game] = this.gameState.first()!;

    this.currentSong?.stop();

    game.state = GameState.Over;
    const [slingshotEntity, slingshotData]: [Entity, SlingshotFrame] =
      this.slingshot.first()!;

    // Disable slingshot
    slingshotData.handle.remove(DragInput);

    // Stop hunting
    this.world.query(Hunter).iterate((e) => e.remove(Hunter));

    // Stop spawning
    this.spawners.iterate((e, spawner: Spawner) => e.delete());

    const { ch, cw } = Stage.setActiveLayer(LayerName.Info);

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

    Timeout(this.world.create(), 2, () => {
      const ui = Stage.getLayer(LayerName.UI)!.canvas;

      this.currentSong = zzfxP(...SongLibrary.death);

      const goodbye = this.world
        .create()
        .add(
          new Sprite(() =>
            drawText("I failed you, children...", pt(cw * 0.5, ch * 0.3)),
          ),
        );

      this.score.add(
        new Sprite(() => {
          const text = `Final score: ${this.score.get(Score).totalScore}`;
          drawText(text, pt(cw * 0.5, ch * 0.4), {
            size: 28,
            fill: YELLOW,
          });
        }),
      );

      Timeout(this.world.create(), 2, () => {
        const retry = this.world.create().add(
          new Sprite(() =>
            drawText("Tap to retry", pt(cw * 0.5, ch * 0.7), {
              size: 24,
            }),
          ),
        );

        ui.onclick = () => {
          goodbye.delete();
          retry.delete();
          this.startWave();
        };
      });
    });
  }

  startWave() {
    const [_, game]: [Entity, Game] = this.gameState.first()!;
    const [slingshotEntity, slingshotData]: [Entity, SlingshotFrame] =
      this.slingshot.first()!;

    const { canvas: ui, width: cw, height } = Stage.getLayer(LayerName.UI)!;
    ui.onclick = null;

    this.currentSong?.stop();
    this.currentSong = zzfxP(...SongLibrary.game);
    this.currentSong.loop = true;

    this.score.add(
      new Sprite(() => {
        const text = `Score ${this.score.get(Score).totalScore}`;
        drawText(text, pt(cw, 0), {
          centered: false,
          size: 32,
        });
      }),
    );

    // Setup slingshot
    slingshotData.addDragInput();

    // Setup spawners
    this.world.create().add(new Spawner(this.world));

    // Recreate foals and restore health
    this.preys.length <= 0 && spawnFoals(this.world);
    this.preys.iterate((e) => e.add(new Health()));

    this.tearEmitter?.exists && this.tearEmitter.delete();

    // Make mom angry
    this.unicorns.iterate((e, unicornData: Unicorn) => {
      unicornData.expression = UnicornEmotion.Furious;
    });

    // Sky transition
    game.state = GameState.Ongoing;
  }

  menu() {
    const ui = Stage.getLayer(LayerName.UI)!.canvas;

    const title = this.world.create().add(
      new Sprite(() => {
        const { cw, ch } = Stage.setActiveLayer(LayerName.Game);
        drawText(GAME_TITLE, pt(cw * 0.5, ch * 0.2), {
          fill: YELLOW,
          lineWidth: 2,
          size: 64,
        });
      }),
    );

    const text = this.world.create().add(
      new Sprite(() => {
        const { cw, ch } = Stage.setActiveLayer(LayerName.Game);
        drawText("Tap to play", pt(cw * 0.5, ch * 0.5));
      }),
    );

    ui.onclick = () => {
      text.delete();
      title.delete();
      this.startWave();
    };
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

  update(dt) {
    this.slingshot.iterate(
      (s, slingshot: SlingshotFrame) =>
        // Check that slingshot input is enabled
        slingshot.handle.get(DragInput) &&
        this.unicorn.iterate((u, unicorn: Unicorn) => {
          if (!unicorn.horn && !slingshot.weapon) {
            unicorn.passHornToSlingshot(this.world, u, s);
          }
        }),
    );
  }
}

export function spawnFoals(world: World) {
  const { cw, ch } = Stage.setActiveLayer(LayerName.Game);
  const width = 0.9;
  const offset = cw * (1 - width);

  return distribute(offset, cw * width, 4).map((x, idx) =>
    world
      .create()
      .add(new Prey(), new DynamicBody(pt(x, ch * 0.85)), new Sprite(drawFoal)),
  );
}
