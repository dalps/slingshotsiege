import type { Entity, Query, World } from "../ecs";
import { damp2I, lerp } from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { Hunter, Prey, Sprite, Weapon } from "./components";
import { DynamicBody } from "./Physics2D";
import { Stage } from "./Stage";

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
      if (hunter.target?.exists) return;

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
          .scale(hunter.speed);

        hunterBody.velocity = damp2I(hunterBody.velocity, direction, 1, dt);
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
    this.hunters.iterate((entity, hunter: Hunter, hunterBody: DynamicBody) => {
      if (hunter.target?.exists || hunter.distance! < 20) {
        const preyEntity = hunter.target!;
        const preyData = preyEntity.get(Prey)! as Prey;

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

          h.delete();

          weapon.points += pointsForKill;
          weapon.lastKill = now;
        }
      });
    });
  }
}

export class ElasticLineSystem {
  joints: Entity[];
}

export class DraggingSystem {
  grab() {}

  release() {}
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
    this.sprites.iterate((entity, sprite: Sprite) => {
      sprite.draw(entity);
    });
  }
}

export class SlingshotSystem {}
