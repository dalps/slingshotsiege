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
