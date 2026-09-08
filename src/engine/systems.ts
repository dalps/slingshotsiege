import { World, type Entity, type Query } from "../ecs";
import { drawBat } from "../entities/bat";
import { drawEnemy } from "../entities/enemy";
import {
  createSlingshot,
  drawFarGoneWeapon,
  SlingshotFrame,
} from "../entities/slingshot";
import { skyGradient } from "../scenes/Castle";
import { drawText } from "../utils/CanvasUtils";
import { damp2I, lerp, RAD2DEG } from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { BLACK, WHITE } from "../utils/SpriteUtils";
import { Interval, Timeout, Transform } from "../utils/TimeUtils";
import { rgba } from "./color";
import {
  DragInput,
  Game,
  GameState,
  Hunter,
  Prey,
  Score,
  Spawner,
  Sprite,
  Unicorn,
  UnicornEmotion,
  Weapon,
  WeaponState,
} from "./components";
import { bloodParticles, deathParticles } from "./particles";
import { DynamicBody, Force } from "./Physics2D";
import { comboSound, SoundLibrary } from "./sfx";
import { LayerName, Stage } from "./Stage";
import { zzfxP } from "./zzfx";

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

        hunterBody.velocity = damp2I(hunterBody.velocity, direction, 1, dt);
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
    this.bounties = world.query(Prey, DynamicBody);
    this.hunters = world.query(Hunter, DynamicBody);
    this.unicorn = this.world.query(Unicorn);
  }

  update() {
    this.hunters.iterate((h, hunter: Hunter, hunterBody: DynamicBody) => {
      if (hunter.target?.exists && hunter.distance! < 20) {
        const preyEntity = hunter.target!;
        const [preyData, preyBody]: [Prey, DynamicBody] = preyEntity.get(
          Prey,
          DynamicBody,
        )!;

        h.delete();

        this.unicorn.iterate((e, unicornData: Unicorn) => {
          unicornData.getPissed();
        });

        preyData.lives = Math.max(0, preyData.lives - 1);
        bloodParticles(this.world, preyBody.position);
        zzfxP(SoundLibrary.damage);
        // todo: violently shake + blood particles

        if (preyData.lives <= 0) {
          zzfxP(SoundLibrary.death);
          preyEntity.delete();
          // todo: display carcass sprite

          this.unicorn.iterate((e, unicornData: Unicorn) => {
            unicornData.expression = UnicornEmotion.Anguished;
            e.add(
              Timeout(1, () => {
                unicornData.expression = UnicornEmotion.Furious;
              }),
            );
          });
        }
      }
    });
  }
}

/**
 * Makes travelling horns kill the foes.
 */
export class AttackSystem {
  comboMaxDelay = 100;
  damageRadius = 50;
  firstKillPoints = 100;

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
            : this.firstKillPoints;

          zzfxP(SoundLibrary.explosion);
          deathParticles(this.world, hunterBody.position);
          h.delete();

          weapon.points += pointsForKill;
          comboSound(Math.log2(weapon.points / 100) * 2);

          this.world
            .query(Score)
            .iterate((e, score: Score) => (score.totalScore += pointsForKill));
          weapon.lastKill = now;

          const scoreText = `${weapon.points}`;

          this.world.create().add(
            new DynamicBody(hunterBody.position, {
              startVelocity: new Point(0, -10),
            }),
            new Sprite((e: Entity) => {
              const {
                position: { x, y },
              }: DynamicBody = e.get(DynamicBody);

              const { ctx } = Stage.setActiveLayer(LayerName.Game);
              ctx.strokeStyle = "black";
              ctx.lineWidth = 2;
              ctx.fillStyle = "yellow";
              ctx.font = "bold 36px sans-serif";
              const length = ctx.measureText(scoreText).width * 0.5;
              // const { x, y } = hunterBody.position;
              ctx.fillText(scoreText, x - length, y);
              ctx.strokeText(scoreText, x - length, y);
            }),
            new Transform({ duration: 1, end: (e) => e.delete() }),
          );
        }
      });
    });
  }
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
          weaponBody.addForce(new Force(new Point(0, 1), 5));
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
  gameState: Query;
  spawners: Query;
  slingshot: Query;

  constructor(public world: World) {
    this.preys = world.query(Prey);
    this.gameState = world.query(Game);
    this.spawners = world.query(Spawner);
    this.slingshot = world.query(SlingshotFrame);
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
          totalLives += preyData.lives;
        });

        this.totalLives = totalLives;

        console.log(totalLives);
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

    game.state = GameState.Over;
    const [slingshotEntity, slingshotData]: [Entity, SlingshotFrame] =
      this.slingshot.first()!;
    slingshotEntity.remove(DragInput);
    this.spawners.iterate((e, spawner: Spawner) => e.delete());

    const ui = Stage.getLayer(LayerName.UI)!.canvas;

    const text = this.world.create().add(
      new Sprite(() => {
        const text = "Goodbye, children...";
        const { ch, cw } = Stage.setActiveLayer(LayerName.Game);
        drawText(text, new Point(cw * 0.5, ch * 0.5));
      }),
    );

    ui.onclick = () => {
      text.delete();
      createSlingshot(this.world);
      this.startWave();
    };
  }

  startWave() {
    const [_, game]: [Entity, Game] = this.gameState.first()!;
    const [slingshotEntity, slingshotData]: [Entity, SlingshotFrame] =
      this.slingshot.first()!;

    const { canvas: ui } = Stage.getLayer(LayerName.UI)!;
    ui.onclick = null;

    const score = this.world
      .create()
      .add(new Score(), new Sprite(drawTotalScore));

    // Setup slingshot
    slingshotData.addDragInput();

    // Setup spawners
    this.world.create().add(new Spawner(this.world));

    // Sky transition
    game.state = GameState.Ongoing;
  }

  menu() {
    const ui = Stage.getLayer(LayerName.UI)!.canvas;

    const title = this.world.create().add(
      new Sprite(() => {
        const { ch, cw } = Stage.setActiveLayer(LayerName.Game);
        drawText("Sling The Horn", new Point(cw * 0.5, ch * 0.2), {
          fill: rgba(179, 255, 0, 1),
          lineWidth: 2,
          size: 64,
        });
      }),
    );

    const text = this.world.create().add(
      new Sprite(() => {
        const { ch, cw } = Stage.setActiveLayer(LayerName.Game);
        drawText("Tap to start", new Point(cw * 0.5, ch * 0.5));
      }),
    );

    ui.onclick = () => {
      text.delete();
      title.delete();
      createSlingshot(this.world);
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
    this.slingshot.iterate((s, slingshot: SlingshotFrame) =>
      this.unicorn.iterate((u, unicorn: Unicorn) => {
        if (!unicorn.horn && !slingshot.weapon) {
          unicorn.passHornToSlingshot(this.world, u, s);
        }
      }),
    );
  }
}

function drawTotalScore(e: Entity) {
  const { totalScore }: Score = e.get(Score);
  const { ctx, ch, cw } = Stage.setActiveLayer(LayerName.Game);

  ctx.font = "bold 32px sans-serif";
  const text = `Score ${totalScore}`;
  const metrics = ctx.measureText(text);
  const margin = 10;
  const { x, y } = new Point(
    cw - metrics.width - margin,
    metrics.emHeightAscent + margin,
  );
  ctx.fillStyle = WHITE;
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = 1;
  ctx.fillText(text, x, y);
  ctx.strokeText(text, x, y);
}
