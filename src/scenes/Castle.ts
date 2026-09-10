import { rgb } from "../engine/color";
import { LayerName, Stage } from "../engine/Stage";
import { tower } from "../entities/sprites";
import { makeGradient } from "../utils/CanvasUtils";
import { distribute } from "../utils/MathUtils";
import { Point, pt } from "../utils/Point";
import { drawParts, WHITE } from "../utils/SpriteUtils";

export let skyGradient: CanvasGradient;

/**
 * Draws the game's backdrop.
 */
function draw() {
  const { ctx, cw, ch } = Stage.setActiveLayer(LayerName.BG_1);

  const grassStart = 0.8;
  const wallStart = 0.6;
  const brickSize = pt(40, 20); // pixels

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, cw, ch);

  // sky
  skyGradient = makeGradient(pt(), pt(0, ch * grassStart), [
    rgb(77, 193, 255),
    rgb(214, 238, 255),
  ]);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, cw, grassStart * ch);

  const sunRadius = 110;
  const sunPos = pt(130);
  const sunGradient = makeGradient(
    sunPos,
    sunPos,
    [WHITE.toAlpha(0.8), WHITE.toAlpha(0)],
    [20, sunRadius],
  );

  ctx.fillStyle = sunGradient;
  ctx.beginPath();
  ctx.arc(sunPos.x, sunPos.y, sunRadius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  {
    ctx.translate(cw * 0.9, ch * 0.6);
    drawParts(ctx, tower);
    ctx.resetTransform()
    ctx.translate(cw * 0.1, ch * 0.65);
    ctx.scale(-1.2, 0.8)
    drawParts(ctx, tower);
    ctx.resetTransform()
  }

  {
    // white brick wall
    const { ctx, ch, cw } = Stage.setActiveLayer(LayerName.BG_3);
    const brickPattern = ctx.createPattern(
      drawBrickPattern(brickSize),
      "repeat",
    )!;
    const mat = new DOMMatrix().translate(0, ch * wallStart);
    brickPattern.setTransform(mat);
    ctx.fillStyle = brickPattern;
    ctx.fillRect(0, ch * wallStart, cw, ch * (grassStart - wallStart));

    const nBricks = Math.floor(cw / brickSize.x);
    const offset = (cw - brickSize.x * nBricks) / 2;

    brickPattern.setTransform(mat.translate(brickSize.x - 12, 0));
    distribute(0, cw, nBricks, (n, i) => {
      if (i % 2 === 0) {
        ctx.fillRect(
          i * brickSize.x + offset,
          ch * wallStart - brickSize.y,
          brickSize.x,
          brickSize.y + 1,
        );
      }
    });

    // grass
    const fieldGradient = makeGradient(pt(0, ch * grassStart), pt(0, ch), [
      rgb(27, 218, 27),
      rgb(10, 174, 10),
    ]);
    ctx.fillStyle = fieldGradient;
    ctx.fillRect(0, ch * grassStart, cw, grassStart * ch);
  }
}

export const Castle = { draw };

export function drawBrickPattern(
  brickSize: Point,
  nx = 2,
  ny = 2,
): CanvasImageSource {
  const layer = Stage.newOffscreenLayer(
    "b",
    brickSize.x * nx,
    brickSize.y * ny,
  );
  const { ctx } = layer;

  const grays = ["#ccc", "#ddd"];
  const mortar = "#f7f7f7";

  const drawRow = (dx, dy) => {
    for (let i = 0; i <= nx; i++) {
      ctx.fillStyle = grays[i % 2];
      ctx.lineWidth = 2;
      ctx.strokeStyle = mortar;
      const args = [dx + brickSize.x * i, dy, brickSize.x, brickSize.y];
      ctx.fillRect(...args);
      ctx.strokeRect(...args);
    }
  };

  drawRow(-10, 0);
  drawRow(-20, brickSize.y);

  // Stage.debugOffscreenLayer("b")

  return layer.canvas;
}
