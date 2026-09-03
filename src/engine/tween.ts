import type { Entity, Query, World } from "../ecs";
import { damp } from "../utils/MathUtils";

const EPSILON = 0.001;

export class TweenSystem {
  private activeTweens: Query;

  constructor(world: World) {
    this.activeTweens = world.query(Tween);
  }

  update(dt: number) {
    this.activeTweens.iterate((entity: Entity, tween: Tween) => {
      tween.value = damp(tween.value, tween.targetValue, tween.speed, dt);

      tween.onUpdate && tween.onUpdate(entity, tween.value);

      if (Math.abs(tween.value - tween.targetValue) < tween.epsilon) {
        tween.onComplete && tween.onComplete(entity, tween.value);
        entity.remove(Tween);
        return;
      }
    });
  }
}

type TweenCallback = (e: Entity, t: number) => void;

/**
 * A Tween animates a one-dimensional property of an object.
 */
export class Tween {
  value: number;
  startValue: number;
  targetValue: number;
  speed: number;
  epsilon: number;

  onUpdate?: TweenCallback;
  onComplete?: TweenCallback;

  constructor({
    startValue = 0,
    finalValue = 1,
    speed = 7,
    onUpdate = (e: Entity, t: number) => {},
    onComplete = (e: Entity, t: number) => {},
    epsilon = EPSILON,
  } = {}) {
    this.value = this.startValue = startValue;
    this.targetValue = finalValue;
    this.speed = speed;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    this.epsilon = epsilon;
  }
}
