import { Point, pt } from "./Point";

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const { PI, sin, cos } = Math;

export const easeInBack = (x: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;

  return c3 * x * x * x - c1 * x * x;
};
export const easeIn = (t: number) => Math.cos(t * Math.PI * 0.5 + Math.PI) + 1;
export const easeOut = (t: number) => Math.sin(t * Math.PI * 0.5);

export const sway = (t: number, iterations = 5) =>
  Math.cos(t * iterations * PI - PI) * 0.5 + 0.5;

export const bounce = (t: number, period = 10, height = 5) =>
  Math.abs(Math.sin(t * period * Math.PI)) * height;

export function pickRandom(options: any[]): any {
  return options[Math.floor(Math.random() * options.length)];
}

export function clamp(min: number, max: number, n: number) {
  return Math.max(min, Math.min(n, max));
}

export function lerp(min: number, max: number, t: number) {
  return min * (1 - t) + max * t;
}

export function distribute(
  min: number,
  max: number,
  subs: number,
  cb: (n: number, i: number) => void = () => {},
) {
  if (subs <= 1) return [lerp(min, max, 0.5)];

  const points: number[] = [];
  for (let i = 0; i < subs; i++) {
    const n = lerp(min, max, i / (subs - 1));
    points.push(n);
    cb(n, i);
  }
  return points;
}

export function damp(
  current: number,
  target: number,
  lambda: number,
  dt: number,
) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/**
 * Does `p` lie in the disk spanning the diameter `ab`?
 */
export function inDisk(a: Point, b: Point, p: Point) {
  return a.sub(p).dot(b.sub(p)) <= 0;
}

/**
 * Does `p` lie on segment `ab`?
 */
export function onSegment(a: Point, b: Point, p: Point) {
  return orient(a, b, p) === 0 && inDisk(a, b, p);
}

export function lerp2(min: Point, max: Point, t: number): Point {
  return pt(lerp(min.x, max.x, t), lerp(min.y, max.y, t));
}

export function damp2I(
  current: Point,
  target: Point,
  lambda: number,
  dt: number,
): Point {
  current.x = damp(current.x, target.x, lambda, dt);
  current.y = damp(current.y, target.y, lambda, dt);
  return current;
}

/**
 * Compare the projections of `p` and `q` on the line of direction `v`
 */
export function cmpProj(v: Point, p: Point, q: Point) {
  return v.dot(p) < v.dot(q);
}

/**
 * The distance between the point `p` and the segment `ab`
 */
export function segPointDistance(a: Point, b: Point, p: Point) {
  if (!a.equals(b)) {
    const v = b.sub(a); // direction

    // Is `p` closest to its projection on `ab`?
    if (cmpProj(v, a, p) && cmpProj(v, p, b)) {
      return Math.abs(v.cross(p) - v.cross(a)) / v.abs(); // distance to line: see Lecomte p. 57
    }
  }

  return Math.min(p.sub(a).abs(), p.sub(b).abs());
}

/**
 * Returns a positive number if `c` is to the left of the segment `ab`, negative if `c` is to the right, zero if the three are collinear.
 */
export function orient(a: Point, b: Point, c: Point) {
  return b.sub(a).cross(c.sub(a));
}

/**
 * Do segments `ab` and `cd` intersect?
 */
export function properInter(a: Point, b: Point, c: Point, d: Point) {
  let oa = orient(c, d, a);
  let ob = orient(c, d, b);
  let oc = orient(a, b, c);
  let od = orient(a, b, d);

  if (oa * ob < 0 && oc * od < 0) {
    return a
      .scale(ob)
      .sub(b.scale(oa))
      .scale(1 / (ob - oa));
  }

  return undefined;
}
