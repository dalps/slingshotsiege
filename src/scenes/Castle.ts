import { rgb } from "../engine/color";
import { LayerName, Stage } from "../engine/Stage";
import { makeGradient } from "../utils/CanvasUtils";
import { distribute } from "../utils/MathUtils";
import { pt } from "../utils/Point";
import { WHITE } from "../utils/SpriteUtils";

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

  {
    // white brick wall
    const { ctx, ch, cw } = Stage.setActiveLayer(LayerName.BG_3);
    ctx.fillStyle = "#e8e8e8";
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
    const fieldGradient = makeGradient(pt(0, ch * grassStart), pt(0, ch), [
      rgb(27, 218, 27),
      rgb(10, 174, 10),
    ]);
    ctx.fillStyle = fieldGradient;
    ctx.fillRect(0, ch * grassStart, cw, grassStart * ch);
  }
}

export const Castle = { draw };
