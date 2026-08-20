import { playMelody, playSynth } from "./audio";
import "./style.css";

document
  .querySelector<HTMLButtonElement>("#b")!
  .addEventListener("click", () => {
    playSynth();
  });

document
  .querySelector<HTMLButtonElement>("#m")!
  .addEventListener("click", () => {
    playMelody();
  });
