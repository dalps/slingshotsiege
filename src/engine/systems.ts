import type { Entity, Query, World } from "../ecs";
import { drawEnemy } from "../entities/Enemy";
import { drawFarGoneWeapon } from "../entities/Sling";
import { damp2I, lerp, RAD2DEG } from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { Hunter, Prey, Sprite, Weapon } from "./components";
import { DynamicBody, Force, GRAVITY } from "./Physics2D";
import { LayerName, Stage } from "./Stage";

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
  hunters: Query;
  bounties: Query;

  constructor(world: World) {
    this.bounties = world.query(Prey, DynamicBody);
    this.hunters = world.query(Hunter, DynamicBody);
  }

  update() {
    this.hunters.iterate((h, hunter: Hunter, hunterBody: DynamicBody) => {
      if (hunter.target?.exists && hunter.distance! < 20) {
        const preyEntity = hunter.target!;
        const preyData = preyEntity.get(Prey)! as Prey;

        h.delete();

        preyData.lives = Math.max(0, preyData.lives - 1);
        // todo: violently shake + blood particles

        if (preyData.lives <= 0) {
          preyEntity.delete();
          // todo: display carcass sprite
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

  constructor(world: World) {
    this.weapons = world.query(Weapon, DynamicBody);
    this.hunter = world.query(Hunter, DynamicBody);
  }

  update(dt: number) {
    this.weapons.iterate((w, weapon: Weapon, weaponBody: DynamicBody) => {
      if (!weapon.fired) return;

      this.hunter.iterate((h, hunter: Hunter, hunterBody: DynamicBody) => {
        const distance = weaponBody.position.distance(hunterBody.position);

        if (distance < this.damageRadius) {
          const now = performance.now();

          // 100 --> 200 --> 400 --> 800
          const pointsForKill = weapon.points
            ? weapon.points
            : this.firstKillPoints;

          console.log("Impaled!!!");
          h.delete();

          weapon.points += pointsForKill;
          weapon.lastKill = now;
        }
      });
    });
  }
}

export class Spawner {
  interval: number;

  constructor(public world: World) {
    this.interval = setInterval(() => {
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
    }, 1000);
  }

  stop() {
    clearInterval(this.interval);
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
        if (!weapon.fired) return;

        const { position, velocity } = weaponBody;
        const angle = velocity.angle() * RAD2DEG; // 0 points up, -180 (anticlockwise) and 180 (clockwise) both point down

        // Make sure it's traveling straight down, to an extent, before deleting it
        if (position.y < -Stage.ch * 0.5 && Math.abs(angle) - 180 < 25) {
          // Replace the sprite
          // console.log("Replacing sprite...");
          weaponBody.clearForces()
          weaponBody.addForce(new Force(new Point(0,1), 5))
          entity.remove(Sprite);
          entity.add(new Sprite(drawFarGoneWeapon));
        }
        // todo: Remove when below the screen area
      },
    );
  }
}

/**
 * Responsible for reloading the slingshot with weapons.
 */
export class ReloadSystem {}
