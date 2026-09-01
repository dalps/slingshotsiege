import type { Entity } from "../ecs";
import { Point } from "../utils/Point";
import type { Force } from "./Physics2D";
import { Stage } from "./Stage";

type DrawFn = (entity: Entity) => void;

export const START_LIVES = 3;

export class Prey {
  lives = START_LIVES;
  radius = 40;

  constructor(public targeted = true) {}
}

export class Hunter {
  target: Entity | null = null;
  distance: number | null = null;
  speed: number = 20;

  constructor() {}
}

export class Weapon {
  constructor(public fired = false) {}
}

export class Sprite {
  constructor(public draw: DrawFn) {}
}

export class DragInput {
  dragPos: Point | null = null;
  destructor: () => void;

  constructor() {
    const uiLayer = Stage.getLayer("ui")!;
    const { canvas: ui } = uiLayer;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();

      this.dragPos = uiLayer.resolveTouchPosition(e);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      this.dragPos = uiLayer.resolveTouchPosition(e);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();

      this.dragPos = null;
    };

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();

      this.dragPos = uiLayer.resolveMousePosition(e);
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      if (!this.dragPos || e.buttons === 0) return;
      this.dragPos = uiLayer.resolveMousePosition(e);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();

      this.dragPos = null;
    };

    ui.onmousedown = handleMouseDown;
    ui.onmousemove = handleMouseMove;
    ui.onmouseup = handleMouseUp;
    ui.ontouchstart = handleTouchStart;
    ui.ontouchmove = handleTouchMove;
    ui.ontouchend = handleTouchEnd;

    window.onmousemove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      const { bottom, top, left, right } = uiLayer.rect;

      if (x < left || x > right || y < top || y > bottom) {
        this.dragPos = null;
      }
    };

    this.destructor = () => {
      ui.removeEventListener("mousedown", handleMouseDown);
      ui.removeEventListener("mousemove", handleMouseMove);
      ui.removeEventListener("mouseup", handleMouseUp);
      ui.removeEventListener("touchstart", handleTouchStart);
      ui.removeEventListener("touchmove", handleTouchMove);
      ui.removeEventListener("touchend", handleTouchEnd);
    };
  }
}
