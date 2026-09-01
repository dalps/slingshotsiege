import type { Query, World } from "../ecs";
import { Point } from "../utils/Point";
import { Clock } from "../utils/TimeUtils";
import { CollisionManager, type Collider } from "./Collisions2D";

/**
 * A permanent force that can be applied to a dynamic body
 */
export class Force {
  constructor(
    protected _direction: Point = new Point(0, 0),
    protected _magnitude: number = 1,
  ) {}

  set magnitude(v) {
    this._magnitude = v;
  }

  set direction(v) {
    this._direction = v;
  }

  get magnitude(): number {
    return this._magnitude;
  }

  get direction(): Point {
    return this._direction;
  }
}

/**
 * A pull towards another body in space
 */
export class Pull extends Force {
  constructor(
    public from: Point,
    public to: Point,
    public strength = 1,
  ) {
    super();
  }

  override get magnitude(): number {
    return this.strength + this.to.sub(this.from).abs();
  }

  override get direction(): Point {
    return this.to.sub(this.from).normalize();
  }
}

export class DynamicBody {
  public name?: string;
  public position: Point;
  public velocity: Point;
  public orientation: number;
  public angularVelocity: number;
  public mass: number;
  public friction: number;
  public locks = { x: false, y: false };
  public fixed = false;

  private _forces: Force[] = [];
  private _aux = new Point(0, 0);

  constructor(
    position: Point,
    {
      name = "DB",
      mass = 1,
      friction = 1,
      orientation = 0,
      angularVelocity = 0,
    } = {},
  ) {
    this.name = name;
    this.position = position;
    this.velocity = new Point(0, 0);
    this.mass = mass;
    this.friction = friction;
    this.orientation = orientation;
    this.angularVelocity = angularVelocity;
  }

  die() {
    CollisionManager.unregisterBody(this);
  }

  addForce(force: Force) {
    !this.fixed && this._forces.push(force);
  }

  clearForces() {
    this._forces = [];
  }

  attachCollider(c: Collider) {
    this.collider = c;
  }

  public get totalForce() {
    this._aux.set(0, 0);
    this._forces.forEach((f) => this._aux.addI(f.direction.scale(f.magnitude)));
    return this._aux;
  }

  public get acceleration(): Point {
    return this.totalForce
      .scaleI(1 / this.mass)
      .subI(this.velocity.scale(this.friction));
  }

  toggleX() {
    this.locks.x = !this.locks.x;
  }

  toggleY() {
    this.locks.y = !this.locks.y;
  }

  toggleFixed() {
    this.fixed = !this.fixed;
  }
}

export class DynamicBodySystem {
  query: Query;

  constructor(world: World) {
    this.query = world.query(DynamicBody);
  }

  update(dt: number) {
    this.query.iterate((e, body: DynamicBody) => {
      const {
        position,
        velocity,
        acceleration,
        orientation,
        angularVelocity,
        fixed,
        locks: { x: lockedX, y: lockedY },
      } = body;

      if (fixed) return;

      const o = orientation + angularVelocity * dt;
      body.orientation = o > Math.PI * 2 ? 0 : o;

      if (!lockedX) {
        velocity.x += acceleration.x * dt;
        position.x += velocity.x * dt + acceleration.x * dt * dt * 0.5;
      }

      if (!lockedY) {
        velocity.y += acceleration.y * dt;
        position.y += velocity.y * dt + acceleration.y * dt * dt * 0.5;
      }
    });
  }
}

export const GRAVITY = new Force(new Point(0, 1), 9.81);
