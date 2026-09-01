let rainbowColors = [
  "#ff49db",
  "#bab3ff",
  "#60f6ff",
  "#afffaf",
  "#f3ffa5",
  "#ff8686ff",
];

let rainbowGradient = ctx.createLinearGradient(0, 0, w, h);

let rainbowRadialG = ctx.createRadialGradient(0, 0, 0, w, h, 50);

rainbowColors.forEach((s, i) => {
  rainbowGradient.addColorStop(i / rainbowColors.length, s);
  rainbowRadialG.addColorStop(i / rainbowColors.length, s);
});
