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
    `M 69.5 66.3 L 65.9 71.9 L 63.6 100 L 59.6 100 L 61.6 91.8 L 57.4 72.8 L 56.7 70.5 L 53.3 70.8 C 49 71.2 44.6 70.9 40.3 70 L 29.4 67.7 L 27.2 69.4 C 25.6 70.7 24.2 72.2 23 73.8 L 20.4 77.6 L 19 90 L 19.5 100 L 16.5 100 L 14.2 71.8 L 12 69.1 C 10.6 67.4 9.8 65.3 9.8 63.1 L 9.7 58.1 C 9.6 55 10.6 52 12.6 49.7 L 14.5 47.5 C 17.3 44 21.8 42.2 26.3 42.8 L 40.9 44.7 C 43.8 45 46.6 44.9 49.4 44.2 L 56.7 42.5 L 59.9 26.6 L 74.1 30 L 72.8 34 L 73 43.7 L 73.2 53.6 C 73.3 58.1 72 62.5 69.5 66.3 Z`,
    WHITE,
  ),
  head: makePart(
    `M 59.9 26.6 L 70.5 14.2 L 70.5 19.6 L 76.3 21.6 L 88.9 30.2 C 90.1 31 90.6 32.5 90.2 33.9 L 89.7 35.5 C 89.3 36.6 88.5 37.5 87.5 38 C 86.4 38.5 85.3 38.6 84.2 38.2 L 72.8 34 Z`,
    WHITE,
  ),
  tail: makePart(
    `M 17.1 45.1 L 17.1 48.7 C 17.2 50.3 16.6 51.8 15.5 53 L 13.9 54.9 C 11.2 57.9 10 61.9 10.5 65.8 L 11 69.4 C 11.3 71.6 10.6 73.8 9 75.4 L 3.8 80.7 C 3.5 81 3.1 81 2.7 80.8 C 2.4 80.6 2.2 80.2 2.3 79.8 L 3.2 76.6 C 4 73.8 4 70.9 3.3 68.2 L 2 63.4 C 1.6 61.6 2.2 59.7 3.6 58.4 L 5 57.3 C 6.5 56 7.4 54.2 7.5 52.2 L 7.6 47.8 C 7.6 46.8 8 45.9 8.7 45.3 C 9.4 44.6 10.4 44.3 11.4 44.4 Z`,
    PASTEL_RAINBOW,
  ),
  foretop: makePart(
    `M 70.5 19.6 L 69.6 20.7 C 69.4 21 69.4 21.3 69.6 21.6 C 69.7 21.8 70 22 70.3 22 L 72.1 21.9 C 72.9 21.9 73.6 22.1 74.2 22.6 L 77.8 25.9 C 78.2 26.2 78.6 26.3 79 26.2 C 79.5 26 79.8 25.6 79.8 25.2 L 80 24.1 L 80.7 23.2 C 80.9 23 80.9 22.7 80.8 22.5 C 80.7 22.2 80.5 22 80.2 22 L 78.7 21.8 C 77.1 21.7 75.5 21.3 74 20.8 L 73.4 20.6 L 73.4 20.6 Z`,
    PASTEL_RAINBOW,
  ),
  maneBottom: makePart(
    `M 56.5 28.1 L 56.6 31.1 C 56.7 32.4 56.1 33.6 55.1 34.5 L 53.2 36 C 52.2 36.8 51.4 37.7 50.8 38.8 L 47.7 44.6 L 50.3 44.4 C 51.8 44.3 53.2 45.1 53.8 46.5 L 54 46.8 C 54.4 47.7 55.3 48.3 56.2 48.3 C 57.2 48.4 58.1 47.8 58.6 47 L 60.9 42.4 C 61.8 42.6 62.7 42.3 63.3 41.7 C 64 41 64.3 40.1 64.1 39.2 L 63.6 32.4 L 64 31.5 C 64.4 30.6 64.5 29.7 64.2 28.8 C 63.8 27.9 63.2 27.2 62.3 26.9 L 59.8 25.8 C 59.1 25.5 58.2 25.6 57.6 26 C 56.9 26.5 56.5 27.3 56.5 28.1 Z`,
    PASTEL_RAINBOW,
  ),
  maneTop: makePart(
    `M 66.3 19.1 L 59.7 22.6 C 57.7 23.6 56.4 25.8 56.5 28.1 L 56.6 31.1 C 56.7 32.4 56.1 33.6 55.1 34.5 L 53.2 36 C 52.3 36.7 51.8 37.9 52 39 L 52.8 44.2 L 54 46.8 C 54.4 47.7 55.3 48.3 56.2 48.3 C 57.2 48.4 58.1 47.8 58.6 47 L 60.9 42.4 C 61.8 42.6 62.7 42.3 63.3 41.7 C 64 41 64.3 40.1 64.1 39.2 L 63.6 32.4 C 65.4 31.3 66.4 29.3 66.2 27.3 Z`,
    PASTEL_RAINBOW,
  ),
  nose: makePart(
    `M 86.2 28.4 L 80.8 36.9 L 84.1 38.2 C 86.5 39.1 89.1 38 90.1 35.7 L 90.6 34.6 C 91.4 32.8 90.6 30.6 88.9 29.7 Z`,
    "#ffbfaf",
  ),
  nostril: makePart(
    `M 89.1 31.9 C 88.9 32.1 88.3 32 87.8 31.5 C 87.2 31.1 87 30.5 87.3 30.2 C 87.5 29.9 88.1 30.1 88.6 30.6 C 89.1 31 89.4 31.6 89.1 31.9 Z`,
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
        `m 72.7,27.6
c 2.8,-2.2 1.2,-2.5 4,0.2

M 87.9,37.8
c 0,0 -2.1,-0.2 -4.8,-1.4`,
        BLACK,
      ),
    ],
  },
  angry: {
    fill: [
      makePart(
        `m 70,23.8
c 0,0 4.5,3.8 8.7,2.2 -0.6,1.9 -2.3,3.1 -4.2,2.7 -3.9,-0.9 -4.5,-4.9 -4.5,-4.9
z`,
        RED,
      ),
      makePart(
        `m 75.6,27.4
a 0.6,1.3 0 0 1 -0.6,1.3 0.6,1.3 0 0 1 -0.6,-1.3 0.6,1.3 0 0 1 0.6,-1.3 0.6,1.3 0 0 1 0.6,1.3
z`,
        BLACK,
      ),
    ],
    stroke: [
      makePart(
        `m 70,23.8
c 0,0 4.5,3.8 8.7,2.2

m 9.2,11.8
c 0,0 -2.7,-4 -4.8,-1.4`,
        BLACK,
      ),
    ],
  },
  sad: {
    fill: [],
    stroke: [
      makePart(
        `m 74.5,29.4 2.4,-2
  
  m -3.7,0.4 3.7,-0.4
  
  m -2.9,-1.9 2.9,1.9
  
  M 87.9,37.8
  c 0,0 -1.6,-1.8 -4.8,-1.4`,
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

  const size = new Point(100);
  ctx.translate(p.x, p.y);
  const scale = 2;
  ctx.scale(scale, scale);
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
    ctx.lineWidth = 1;
    ctx.strokeStyle = color instanceof Array ? rainbowGradient : color;
    ctx.stroke(path);
  }

  ctx.strokeStyle = "green";
  ctx.strokeRect(0, 0, size.x, size.y);
  circle(p, 5);
  ctx.resetTransform();
}
