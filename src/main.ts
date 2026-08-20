import { playSynth } from "./audio";
import "./style.css";

let btn = document.querySelector("#b")! as HTMLButtonElement;

btn.addEventListener("click", () => {
  playSynth();
});
