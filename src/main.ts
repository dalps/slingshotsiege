import { M3, M4, M5, playMelody, playSynth } from "./audio";
import "./style.css";

document
  .querySelector<HTMLButtonElement>("#a")!
  .addEventListener("click", () => {
    playMelody(M3);
  });

document
  .querySelector<HTMLButtonElement>("#b")!
  .addEventListener("click", () => {
    playMelody(M4);
  });

document
  .querySelector<HTMLButtonElement>("#c")!
  .addEventListener("click", () => {
    playMelody(M5);
  });

let stage = document.querySelector<HTMLCanvasElement>("#stage")!;
let ctx = stage.getContext("2d")!;

function main() {
  requestAnimationFrame(draw);
}

function draw(t: number) {
  t /= 100;

  let pBody = new Path2D(
    `M 75 33
C 74 33 70 10 66 11
  61 12 67 30 64 30
  46 24 13 15 13 26
c 0 5 25 9 23 13
  -1 0 -22 -4 -19 5
  1 4 19 7 29 13
  11 6 14 16 14 16
  0 0 -33 -3 -39 5
  -4 6 37 9 36 11
  -1 1 -21 25 -21 28
  1 12 37 -21 37 -21
  0 0 4 12 47 11
  0 0 -19 26 -15 33
  5 7 20 -17 36 -22
  16 -5 21 -14 24 -21
  0 0 -3 16 -1 25
  -7 7 4 12 4 12
  0 0 14 -9 1 -14
  0 -9 0 -28 0 -28
  1 -6 -3 -18 -22 -22
C 139 69 94 68 94 48
  94 13 76 33 75 33
Z`,
  );

  let pEye = new Path2D(`m 59 39 c 4 13 14 4 14 4`);

  let w = 400;
  let h = 300;

  let rainbowColors = [
    "#ff49db",
    "#bab3ff",
    "#60f6ff",
    "#afffaf",
    "#f3ffa5",
    "#ff8686ff",
  ];

  let rainbowGradient = ctx.createLinearGradient(0, 0, w, h);
  rainbowColors.forEach((s, i) =>
    rainbowGradient.addColorStop(i / rainbowColors.length, s),
  );

  stage.width = w;
  stage.height = h;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 400, 300);

  ctx.fillStyle = "yellow";
  ctx.strokeStyle = "black";
  ctx.fill(pBody);
  ctx.stroke(pEye);
  ctx.stroke(pBody);

  requestAnimationFrame(draw);
}

main();
