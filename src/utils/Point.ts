import * as M from "./MathUtils";

export class Point {
  public x: number;
  public y: number;

  constructor(x?: number, y?: number) {
    this.x = x || 0;
    this.y = y || (y !== 0 ? this.x : 0);
  }

  static random(min = pt(0, 0), max = pt(1, 1)) {
    return new Point(
      M.lerp(min.x, max.x, Math.random()),
      M.lerp(min.y, max.y, Math.random()),
    );
  }

  set(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  copy(p: Point) {
    this.x = p.x;
    this.y = p.y;
  }

  abs(): number {
    return Math.hypot(this.x, this.y);
  }

  distance(p: Point) {
    return this.sub(p).abs();
  }

  rotate(phi: number) {
    const cos = Math.cos(phi);
    const sin = Math.sin(phi);
    return pt(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  rotateAbout(c: Point, phi: number) {
    return c.add(this.sub(c).rotate(phi));
  }

  rotateAboutI(c: Point, phi: number) {
    const rotated = c.add(this.sub(c).rotate(phi));
    this.set(rotated.x, rotated.y);
  }

  /**
   * Returns a vector on the same line with magnitude 1.
   */
  normalize(): Point {
    const l2 = this.abs();
    this.x /= l2;
    this.y /= l2;
    return this;
  }

  clone() {
    return pt(this.x, this.y);
  }

  equals(p: Point) {
    return this.x === p.x && this.y === p.y;
  }

  addI(p: Point) {
    this.x += p.x;
    this.y += p.y;
    return this;
  }

  subI(p: Point) {
    this.x -= p.x;
    this.y -= p.y;
    return this;
  }

  scaleI(n: number) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  incrY(dy: number) {
    this.y += dy;
    return this;
  }

  incrX(dx: number) {
    this.x += dx;
    return this;
  }

  add(p: Point) {
    return this.clone().addI(p);
  }

  addX(dx: number) {
    return this.clone().incrX(dx);
  }

  addY(dy: number) {
    return this.clone().incrY(dy);
  }

  sub(p: Point) {
    return this.clone().subI(p);
  }

  scale(n: number): Point {
    return this.clone().scaleI(n);
  }

  /**
   * Get a new point rotated 90 degrees counterclockwise.
   */
  perp() {
    return pt(this.y, -this.x);
  }

  dot(p: Point): number {
    return this.x * p.x + this.y * p.y;
  }

  cross(p: Point): number {
    return this.x * p.y - this.y * p.x;
  }

  onSegment(a: Point, b: Point) {
    return M.orient(a, b, this) === 0 && M.inDisk(a, b, this);
  }

  project(i: Point, j: Point) {
    return this.set(this.dot(i), this.dot(j));
  }

  /**
   * Returns the angle of the vector relative to the vertical axis.
   * The returned angle is in radians and varies from 0 to +/-Math.PI.
   * The sign is the same as the x component.
   */
  angle() {
    return Math.atan2(this.x, -this.y);
  }

  toString() {
    return `(${this.x},${this.y})`;
  }
}

export const pt = (x?: number, y?: number) => new Point(x, y);

export const ZERO = pt();
