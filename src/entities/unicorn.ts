import type { Entity } from "../ecs";
import { Unicorn, UnicornEmote } from "../engine/components";
import { DynamicBody } from "../engine/Physics2D";
import { LayerName, Stage } from "../engine/Stage";
import { circle } from "../utils/CanvasUtils";
import { Point } from "../utils/Point";

const WHITE = "#fff";
const BLACK = "#000";
const RED = "#f00";

const PASTEL_RAINBOW = [
  "#ff49db",
  "#bab3ff",
  "#60f6ff",
  "#afffaf",
  "#f3ffa5",
  "#ff8686",
];

const makePart = (pathData: string, color: string | string[]) => ({
  path: new Path2D(pathData),
  color,
});

const makeGradient = () => {
  const { ctx, cw, ch } = Stage;
  let rainbowGradient = ctx.createLinearGradient(0, 0, cw, ch);
  PASTEL_RAINBOW.forEach((s, i) => {
    rainbowGradient.addColorStop(i / PASTEL_RAINBOW.length, s);
  });
};

const UnicornParts = {
  body: makePart(
    `m 153,124 -8,13 -6,63
h -9
l 5,-18 -10,-43 -1,-5
h -8
c -10,1 -19,1 -29,-1
l -25,-6 -5,4
c -3,3 -6,7 -9,10
l -6,9 -3,28 1,22
h -7
l -5,-63 -5,-6
c -3,-4 -5,-9 -5,-14
v -11
c 0,-7 2,-14 7,-19
l 4,-5
C 35,74 45,70 55,71
l 33,5
c 7,0 13,0 19,-1
l 17,-4 7,-36 32,8 -3,9 -2,24 3,20
c 1,10 -2,19 -8,28
z`,
    WHITE,
  ),
  head: makePart(
    `m 131,35 14,-17 9,-11
v 12
l 13,4 22,15
c 3,2 10,9 9,12
l -1,4
c -1,2 -3,4 -5,6 -2,1 -14,-3 -14,-3
l -18,-6
z`,
    WHITE,
  ),
  tail: makePart(
    `m 34,77
v 8
c 0,6 -3,10 -7,14 -6,6 -9,18 -8,24 2,11 0,19 -3,22 -2,2 -10,10 -13,10 -2,0 -1,-5 0,-8 1,-3 2,-12 -1,-22 -3,-9 -3,-14 5,-21 5,-4 6,-7 6,-11 0,-4 -3,-18 9,-18 6,0 6,1 12,2
z`,
    PASTEL_RAINBOW,
  ),
  foretop: makePart(
    `m 154,19
c -1,1 -2,1 -2,3 0,1 1,2 2,2
h 4
c 8,1 12,10 16,10 4,0 2,-5 2,-5 3,-1 3,-5 0,-5 -7,0 -9,-5 -15,-3
v 0
c -3,-2 -7,-2 -7,-2
z`,
    PASTEL_RAINBOW,
  ),
  maneBottom: makePart(
    `m 123,39
v 6
c 0,6 -3,7 -8,11 -5,4 -6,12 -8,19
h 2
c 4,0 6,3 8,6 1,2 3,3 5,3 6,0 8,-8 10,-13 5,0 7,-4 7,-8 0,-4 -1,-15 -1,-15
l 1,-2
c 5,-10 -11,-15 -14,-12 -1,1 -2,3 -2,5
z`,
    PASTEL_RAINBOW,
  ),
  maneTop: makePart(
    `m 145,18 -15,8
c -4,2 -7,7 -7,12
v 7
c 0,3 -2,7 -3,8 -4,3 -7,5 -7,10 1,12 3,21 10,21 2,0 4,-1 5,-3
l 5,-10
c 2,0 4,-1 5,-2 2,-2 2,-4 2,-6
l -1,-15
c 4,-2 6,-7 6,-12
z`,
    PASTEL_RAINBOW,
  ),
  nose: makePart(
    `m 189,38 -11,19
c 2,2 15,10 21,-2
l 1,-3
c 3,-8 -9,-14 -11,-14
z`,
    "#ffbfaf",
  ),
  nostril: makePart(
    `m 196,46
c -1,1 -5,-2 -4,-3 1,-1 5,2 4,3
z`,
    "#b69188",
  ),
};

const UnicornExpressions: Record<
  string,
  { fill: ReturnType<typeof makePart>[]; stroke: ReturnType<typeof makePart>[] }
> = {
  happy: {
    fill: [],
    stroke: [
      makePart(
        `m 159,37
c 6,-5 3,-6 9,0

m 25,23
c 0,0 -5,0 -11,-3`,
        BLACK,
      ),
    ],
  },
  angry: {
    fill: [
      makePart(
        `m 153,29
c 0,0 10,8 20,5 -1,4 -5,7 -10,6 -9,-2 -10,-11 -10,-11
z`,
        RED,
      ),
      makePart(
        `m 163,37
c 0,-4 3,-4 3,0 0,4 -3,4 -3,0
z`,
        BLACK,
      ),
    ],
    stroke: [
      makePart(
        `m 153,29
c 0,0 10,9 20,5

m 20,26
c 0,0 -6,-9 -11,-3`,
        BLACK,
      ),
    ],
  },
  sad: {
    fill: [],
    stroke: [
      makePart(
        `m 163,42 5,-5

m -8,1 8,-1

m -6,-4 6,4

m 25,23
c 0,0 -4,-3 -11,-2`,
        BLACK,
      ),
    ],
  },
};

export function drawUnicorn(e: Entity) {
  const unicornData: Unicorn = e.get(Unicorn);
  const { position: p }: DynamicBody = e.get(DynamicBody);

  const { ctx, cw, ch } = Stage.setActiveLayer(LayerName.BG_2);
  let rainbowGradient = ctx.createLinearGradient(0, 0, cw, ch);
  PASTEL_RAINBOW.forEach((s, i) => {
    rainbowGradient.addColorStop(i / PASTEL_RAINBOW.length, s);
  });

  const size = new Point(200);
  ctx.translate(p.x, p.y);
  // const scale = 2;
  // ctx.scale(scale, scale);
  ctx.translate(-size.x * 0.5, -size.y);

  Object.entries(UnicornParts).forEach(([name, { path, color }]) => {
    ctx.fillStyle = color instanceof Array ? rainbowGradient : color;
    ctx.fill(path);
  });

  // The head and facial expression.
  const currentExpression = [...Object.values(UnicornExpressions)][
    unicornData.expression
  ];

  for (const { path, color } of currentExpression.fill) {
    ctx.fillStyle = color instanceof Array ? rainbowGradient : color;
    ctx.fill(path);
  }

  for (const { path, color } of currentExpression.stroke) {
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = color instanceof Array ? rainbowGradient : color;
    ctx.stroke(path);
  }

  // ctx.strokeStyle = "green";
  // ctx.strokeRect(0, 0, size.x, size.y);
  // circle(p, 5);
  ctx.resetTransform();
}
