import { World, type Entity, type Query } from "../ecs";
import { drawEnemy } from "../entities/enemy";
import { drawFarGoneWeapon } from "../entities/slingshot";
import { damp2I, lerp, RAD2DEG } from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { Interval, Timeout, Transform } from "../utils/TimeUtils";
import {
  Hunter,
  Prey,
  Score,
  Sprite,
  Unicorn,
  UnicornEmote,
  Weapon,
  WeaponState,
} from "./components";
import { bloodParticles, deathParticles } from "./particles";
import { DynamicBody, Force } from "./Physics2D";
import { SoundLibrary } from "./sfx";
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
        // todo: violently shake + blood particles

        if (preyData.lives <= 0) {
          preyEntity.delete();
          // todo: display carcass sprite

          this.unicorn.iterate((e, unicornData: Unicorn) => {
            unicornData.expression = UnicornEmote.Anguished;
            e.add(
              Timeout(1, () => {
                unicornData.expression = UnicornEmote.Furious;
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

export class Spawner {
  interval: Entity;

  constructor(public world: World) {
    this.interval = world.create().add(
      Interval(1, () => {
        const { cw, ch } = Stage.setActiveLayer("game");
        world
          .create()
          .add(
            new Hunter(),
            new DynamicBody(
              new Point(Math.random() * cw, lerp(0, -ch * 0.5, Math.random())),
            ),
            new Sprite(drawEnemy),
          );
      }),
    );
  }

  stop() {
    this.interval.delete();
  }

  update() {
    // Stop spawning foes when all preys are dead
    this.world.query(Prey).length === 0 && this.stop();
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

export const enum GameState {
  Menu,
  Ongoing,
  Over,
}

export class GameCycle {
  totalLives = 0;
  preys: Query;
  gameState = GameState.Ongoing;

  constructor(world: World) {
    this.preys = world.query(Prey);
  }

  update(dt: number) {
    let totalLives = 0;

    this.preys.iterate((e, preyData: Prey) => {
      totalLives += preyData.lives;
    });

    this.totalLives = totalLives;

    if (totalLives <= 0) {
      this.gameState = GameState.Over;
    }
  }
}

/**
 * Responsible for reloading the slingshot with weapons.
 */
export class ReloadSystem {}
