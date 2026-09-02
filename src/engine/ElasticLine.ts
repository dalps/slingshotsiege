import type { Entity, World } from "../ecs";
import * as Math2D from "../utils/MathUtils";
import { Point } from "../utils/Point";
import { DynamicBody, Pull } from "./Physics2D";

const BALL_RADIUS = 5;

export class Joint extends DynamicBody {
  // public neighbors: Joint[] = [];

  constructor(
    position: Point,
    mass = 0.1,
    damping = 1,
    public attraction = 100,
  ) {
    super(position, { name: "J", mass, friction: damping });
  }

  addNeighbor(that: Joint) {
    // this.neighbors.push(t);
    // t.neighbors.push(this);

    // todo: create an entity with Pull component and add forces to it

    this.addForce(new Pull(this.position, that.position, this.attraction));
    that.addForce(new Pull(that.position, this.position, this.attraction));
  }
}

export class ElasticLine {
  public joints: Entity[] = [];
  mass: number;
  damping: number;
  jointsAttraction: number;

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
      const joint = world
        .create()
        .add(
          new Joint(
            Math2D.lerp2(start, end, i / (subdivisions - 1)),
            mass,
            damping,
            jointsAttraction,
          ),
        );

      prevJoint && joint.get(Joint).addNeighbor(prevJoint);
      this.joints.push(joint);

      // joint.addForce(GRAVITY);

      prevJoint = joint;
    }

    // fix the extremities
    this.joints.at(0)?.get(Joint).clearForces();
    this.joints.at(-1)?.get(Joint).clearForces();
    this.joints.at(0)?.get(Joint).toggleFixed();
    this.joints.at(-1)?.get(Joint).toggleFixed();
  }
}
