import { circle, popsicle } from "../utils/CanvasUtils";
import * as Math2D from "../utils/MathUtils";
import { Point } from "../utils/Point";
import PALETTE from "./color";
import { ContactForce, State, type DynamicBody } from "./Physics2D";
import { Stage } from "./Stage";

interface CollisionOptions {
  sensor?: boolean;
  contactForceFactor?: number;
  filter?: (b1: DynamicBody, b2: DynamicBody) => boolean;
  cb?: Function;
}

interface CollisionPair extends CollisionOptions {
  id1: string;
  id2: string;
  ref1: WeakRef<DynamicBody>;
  ref2: WeakRef<DynamicBody>;
}

export class CollisionManager {
  private static counter = 0;
  private static pairs: Set<CollisionPair> = new Set();

  static getId(b: DynamicBody) {
    if (!b.collider || b.state !== State.Alive) return undefined;
    if (!b.collisionID) b.collisionID = `${b.name}${this.counter++}`;
    return b.collisionID;
  }

  static register(
    b1: DynamicBody,
    b2: DynamicBody,
    options: CollisionOptions = {}
  ): void {
    const id1 = this.getId(b1);
    const id2 = this.getId(b2);

    if (!id1 || !id2) return;

    this.pairs.add({
      id1,
      id2,
      ref1: new WeakRef(b1),
      ref2: new WeakRef(b2),
      ...options,
    });
  }

  static unregisterBody(b: DynamicBody) {
    [...this.pairs.values()]
      .filter(({ id1, id2 }) => b.collisionID === id1 || b.collisionID === id2)
      .forEach(v => {
        this.pairs.delete(v);
      });
  }

  static update() {
    this.pairs.forEach(
      ({
        ref1: r1,
        ref2: r2,
        filter,
        cb,
        sensor = false,
        contactForceFactor = 300,
      }) => {
        const b1 = r1.deref();
        const b2 = r2.deref();
        const c1 = b1?.collider;
        const c2 = b2?.collider;

        if (
          !b1 ||
          !b2 ||
          !c1 ||
          !c2 ||
          b1.state !== State.Alive ||
          b2.state !== State.Alive ||
          (filter && !filter(b1, b2)) ||
          !c1.checkContact(c2)
        )
          return;

        if (!sensor) {
          b1.addForce(this.collide(b1, b2, contactForceFactor));
          b2.addForce(this.collide(b2, b1, contactForceFactor));
        }

        cb && cb();
      }
    );
  }

  static collide(
    body: DynamicBody,
    against: DynamicBody,
    factor = 1
  ): ContactForce {
    const massFactor = (2 * against.mass) / (body.mass + against.mass);
    const sep = body.collider.center.sub(against.collider.center);

    return new ContactForce(sep.normalize(), massFactor * factor);
  }
}

function segSeg(c1: SegmentCollider, c2: SegmentCollider) {
  return Math2D.properInter(c1.a, c1.b, c2.a, c2.b) !== undefined;
}

function circleSegment(c1: CircleCollider, c2: SegmentCollider) {
  const d = Math2D.segPointDistance(c2.a, c2.b, c1.center);

  // popsicle(c2.center, c1.center, PALETTE.fuchsia);
  // drawText(`${d.toFixed(0)}`, { pos: Math2D.lerp2(c1.center, c2.center, 0.5) });

  return d <= c1.radius;
}

function circleCircle(c1: CircleCollider, c2: CircleCollider) {
  const sep = c2.center.sub(c1.center);
  const d = sep.abs();

  // popsicle(c2.center, c1.center, PALETTE.chartreuse);
  // drawText(`${d.toFixed(0)}`, { pos: Math2D.lerp2(c1.center, c2.center, 0.5) });

  return d <= c1.radius + c2.radius;
}

enum ColliderType {
  Circle,
  Segment,
}

export abstract class Collider {
  public abstract center: Point;
  constructor(public type: ColliderType) {}
  abstract checkContact(c2: Collider): boolean;
}

export class CircleCollider extends Collider {
  constructor(public center: Point, public radius: number) {
    super(ColliderType.Circle);
  }

  checkContact(that: Collider) {
    switch (that.type) {
      case ColliderType.Circle:
        return circleCircle(this, that as CircleCollider);
      case ColliderType.Segment:
        return circleSegment(this, that as SegmentCollider);
    }
  }

  draw() {
    const { ctx } = Stage;
    ctx.lineWidth = 1;
    ctx.strokeStyle = PALETTE.chartreuse;
    circle(this.center, this.radius);
    ctx.stroke();
  }
}

export class SegmentCollider extends Collider {
  static fromEndPoints(a: Point, b: Point) {
    const sep = a.sub(b);

    new SegmentCollider(
      Math2D.lerp2(a, b, 0.5),
      sep.abs(),
      Math.atan2(sep.y, sep.x)
    );
  }

  constructor(public center: Point, public length: number, public dir = 0) {
    super(ColliderType.Segment);
  }

  get a(): Point {
    return this.center.add(
      new Point(1, 0).scale(this.length * 0.5).rotate(this.dir)
    );
  }

  get b(): Point {
    return this.center.add(
      new Point(1, 0).scale(this.length * -0.5).rotate(this.dir)
    );
  }

  checkContact(that: CircleCollider) {
    return circleSegment(that, this);
  }

  draw() {
    popsicle(this.center, this.a, PALETTE.chartreuse);
    popsicle(this.center, this.b, PALETTE.chartreuse);
  }
}

/**
 * Rejects collisions when the first body is not in descending motion
 * and strictly above the second body
 */
export function downwardFilter(b1: DynamicBody, b2: DynamicBody) {
  const descending = b2.velocity.y >= 0;
  const above = b2.position.y < b1.position.y;
  return descending && above;
}
