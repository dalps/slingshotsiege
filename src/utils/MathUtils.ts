import { Point } from "./Point";

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

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
  cb: (n: number, i: number) => void = () => {}
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
  dt: number
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
  return new Point(lerp(min.x, max.x, t), lerp(min.y, max.y, t));
}

export function lerp2I(min: Point, max: Point, t: number): Point {
  min.x = lerp(min.x, max.x, t);
  min.y = lerp(min.y, max.y, t);
  return min;
}

export function damp2I(
  current: Point,
  target: Point,
  lambda: number,
  dt: number
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

const assertTruthy = b => {
  if (!b) {
    throw new Error("Assertion failed.");
  }
};

function testLineIntersection() {
  const check = () => {
    const res = properInter(p1, p2, p3, p4);
    console.log(
      `Checking intersection between (${p1}~~${p2}) and ${p3}~~${p4}: ${res}`
    );
    return res;
  };

  let p1 = new Point(0, 0);
  let p2 = new Point(1, 1);
  let p3 = new Point(0.5, 1);
  let p4 = new Point(0.5, -1);
  assertTruthy(check());

  p1 = new Point(25, 526);
  p2 = new Point(62, 424);
  p3 = new Point(4, 454);
  p4 = new Point(307, 462);
  assertTruthy(check());
}

function testSegPointDistance() {
  const checkLessThan = n => {
    const res = segPointDistance(p1, p2, p3);
    console.log(
      `Checking intersection between (${p1}~~${p2}) and ${p3}: ${res} <= ${n} = ${
        res <= n
      }`
    );
    return res <= n;
  };

  let p1 = new Point(0, 0);
  let p2 = new Point(1, 1);
  let p3 = new Point(0.5, 1);
  assertTruthy(checkLessThan(1));

  p1 = new Point(25, 500);
  p2 = new Point(25, 400);
  p3 = new Point(25, 350);
  assertTruthy(checkLessThan(50));

  p1 = new Point(25, 500);
  p2 = new Point(25, 400);
  p3 = new Point(0, 500);
  assertTruthy(checkLessThan(50));
}
