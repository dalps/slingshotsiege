import { LayerName, Stage } from "../engine/Stage";
import { HSLColor } from "../engine/color";
import { lerp } from "../utils/MathUtils";
import { Point } from "./Point";
import { BLACK, WHITE } from "./SpriteUtils";

export function drawText(
  text: string,
  position: Point,
  {
    fill = WHITE,
    stroke = BLACK,
    lineWidth = 2,
    size = 36,
    bold = true,
    centered = true,
    layer = LayerName.UI,
  } = {},
) {
  const { ctx } = Stage.setActiveLayer(layer);

  const screenFactor = lerp(0.5, 1, Math.min(1, Stage.cw / Stage.ch));
  ctx.font = `${bold ? "bold" : "normal"} ${screenFactor * size}px sans-serif`;
  const metrics = ctx.measureText(text);
  const margin = 10;
  const center = centered ? 0.5 : 1;
  const { x, y } = new Point(
    position.x - metrics.width * center - margin,
    position.y + metrics.actualBoundingBoxAscent * center + margin,
  );
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

export function makeGradient(
  cp1: Point,
  cp2: Point,
  colors: (HSLColor | string)[],
  radii: [number, number] | null = null,
) {
  const { ctx } = Stage;
  const g = radii
    ? ctx.createRadialGradient(cp1.x, cp1.y, radii[0], cp2.x, cp2.y, radii[1])
    : ctx.createLinearGradient(cp1.x, cp1.y, cp2.x, cp2.y);

  colors.forEach((c, idx) => g.addColorStop(idx / (colors.length - 1), c));

  return g;
}

export function popsicle(from: Point, to: Point, color = "black") {
  const { ctx } = Stage;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  const arrowSize = 4;

  ctx.beginPath();
  ctx.arc(from.x, from.y, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(to.x, to.y, arrowSize, 0, Math.PI * 2);
  ctx.fill();
}

export function circle(p: Point, r: number = 5, color = "blue") {
  const { ctx } = Stage;

  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();
}

export function imageToBase64(url: string) {
  const img = new Image();
  img.src = url;

  img.onload = () => {
    const { width, height } = img;
    Stage.newOffscreenLayer("base64ify", width, height);
    const { ctx, activeLayer } = Stage;
    // Stage.debugOffscreenLayer("base64ify");

    ctx.drawImage(img, 0, 0);
    console.log(url);
    console.log(activeLayer.canvas.toDataURL());
  };
}
