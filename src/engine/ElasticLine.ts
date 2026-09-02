import type { Entity, World } from "../ecs";
import * as Math2D from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { DynamicBody, GRAVITY, Pull } from "./Physics2D";

export class ElasticLine {
  public joints: Entity[] = [];
  mass: number;
  damping: number;
  jointsAttraction: number;

  addMutualPull(a: Entity, b: Entity) {
    const aBody: DynamicBody = a.get(DynamicBody);
    const bBody: DynamicBody = b.get(DynamicBody);

    aBody.addForce(
      new Pull(aBody.position, bBody.position, this.jointsAttraction),
    );
    bBody.addForce(
      new Pull(bBody.position, aBody.position, this.jointsAttraction),
    );
  }

  constructor(
    world: World,
    start: Point,
    end: Point,
    subdivisions: number,
    { mass = 1, damping = 1, jointsAttraction = 100 } = {},
  ) {
    this.mass = mass;
    this.damping = damping;
    this.jointsAttraction = jointsAttraction;

    let prevJoint: Entity | undefined = undefined;

    for (let i = 0; i < subdivisions; i++) {
      const jointEntity = world.create().add(
        new DynamicBody(Math2D.lerp2(start, end, i / (subdivisions - 1)), {
          mass,
          friction: damping,
        }),
      );

      prevJoint && this.addMutualPull(prevJoint, jointEntity);
      this.joints.push(jointEntity);

      jointEntity.add(GRAVITY);

      prevJoint = jointEntity;
    }

    // fix the extremities
    this.joints.at(0)?.get(DynamicBody).clearForces();
    this.joints.at(-1)?.get(DynamicBody).clearForces();
    this.joints.at(0)?.get(DynamicBody).toggleFixed();
    this.joints.at(-1)?.get(DynamicBody).toggleFixed();
  }
}
