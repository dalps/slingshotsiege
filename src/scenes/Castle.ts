import { LayerName, Stage } from "../engine/Stage";
import { makeGradient } from "../utils/CanvasUtils";
import { distribute } from "../utils/MathUtils";
import { Point } from "../utils/Point";

/**
 * Draws the game's backdrop.
 */
function draw() {
  const { ctx, cw, ch } = Stage.setActiveLayer(LayerName.BG_1);

  const grassStart = 0.8;
  const wallStart = 0.6;
  const brickSize = new Point(40, 20); // pixels

  ctx.fillStyle = "hsla(0, 0%, 100%, 1.00)";
  ctx.fillRect(0, 0, cw, ch);

  // sky
  const skyGradient = makeGradient(new Point(), new Point(0, ch * grassStart), [
    "hsla(201, 100%, 65%, 1.00)",
    "hsla(205, 100%, 92%, 1.00)",
  ]);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, cw, grassStart * ch);

  {
    // white brick wall
    const { ctx, ch, cw } = Stage.setActiveLayer(LayerName.BG_3);
    ctx.fillStyle = "#e8e8e8ff";
    ctx.fillRect(0, ch * wallStart, cw, ch * (grassStart - wallStart));

    const nBricks = Math.floor(cw / brickSize.x);
    const offset = (cw - brickSize.x * nBricks) / 2;

    distribute(0, cw, nBricks, (n, i) => {
      if (i % 2 === 0) {
        ctx.fillRect(
          i * brickSize.x + offset,
          ch * wallStart - brickSize.y + 5,
          brickSize.x,
          brickSize.y,
        );
      }
    });

    // grass
    const fieldGradient = makeGradient(
      new Point(0, ch * grassStart),
      new Point(0, ch),
      ["hsla(120, 78%, 48%, 1.00)", "hsla(120, 89%, 36%, 1.00)"],
    );
    ctx.fillStyle = fieldGradient;
    ctx.fillRect(0, ch * grassStart, cw, grassStart * ch);
  }
}

export const Castle = { draw };
