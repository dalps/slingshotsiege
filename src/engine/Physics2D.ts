import type { Query, World } from "../ecs";
import { popsicle } from "../utils/CanvasUtils";
import { Point } from "../utils/Point";

/**
 * A persistent force that can be applied to a dynamic body.
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
 * A pull towards another body in space.
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
    startPosition: Point,
    {
      name = "DB",
      mass = 1,
      friction = 0,
      orientation = 0,
      angularVelocity = 0,
      startVelocity = new Point(0, 0),
    } = {},
  ) {
    this.name = name;
    this.position = startPosition;
    this.velocity = startVelocity;
    this.mass = mass;
    this.friction = friction;
    this.orientation = orientation;
    this.angularVelocity = angularVelocity;
  }

  addForce(force: Force) {
    !this.fixed && this._forces.push(force);
  }

  clearForces() {
    this._forces = [];
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

  debugVelocity(color = "yellow") {
    popsicle(this.position, this.position.add(this.velocity), color);
  }

  debugAcceleration(color = "green") {
    popsicle(this.position, this.position.add(this.acceleration), color);
  }

  debugForce(color = "red") {
    popsicle(this.position, this.position.add(this.totalForce), color);
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

      const o = orientation + angularVelocity * dt;
      body.orientation = o > Math.PI * 2 ? 0 : o;

      velocity.x += acceleration.x * dt;
      velocity.y += acceleration.y * dt;

      if (fixed) return;

      if (!lockedX) {
        position.x += velocity.x * dt + acceleration.x * dt * dt * 0.5;
      }

      if (!lockedY) {
        position.y += velocity.y * dt + acceleration.y * dt * dt * 0.5;
      }
    });
  }
}

export const GRAVITY = new Force(new Point(0, 1), 9.81);
