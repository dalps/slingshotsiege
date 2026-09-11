import type { Entity, Query, World } from "../ecs";

export type timestamp = DOMHighResTimeStamp;
export type seconds = number;

export const TIME_SCALE = 1 / 100;

const fromSeconds = (s: seconds) => s * 1000 * TIME_SCALE;
const toSeconds = (s: seconds) => s / 1000 / TIME_SCALE;

export interface Transformer {
  duration: seconds;
  update?: (e: Entity, stage: number) => void;
  end?: (e: Entity) => void;
  next?: Transformer;
}

export class Transform {
  remaining: number;

  constructor(public transformer: Transformer) {
    this.remaining = transformer.duration;
  }
}

/**
 * Spawns a dummy entity that runs the `end` callback and deletes itself after `duration` seconds.
 */
export const Timeout = (
  world: World,
  duration: seconds,
  endFn: Transformer["end"],
) =>
  world.create().add(
    new Transform({
      duration,
      end: (e) => {
        e.delete();
        endFn && endFn(e);
      },
    }),
  );

/**
 * Spawns a dummy entity that runs the `end` callback perpetually every `duration` seconds.
 */
export const Interval = (
  world: World,
  duration: seconds,
  end: Transformer["end"],
) => {
  const t = new Transform({ duration, end });
  t.transformer.next = t.transformer;
  return world.create().add(t);
};

// From kutuluk/js13k-ecs
export class TransformSystem {
  query: Query;

  constructor(world: World) {
    this.query = world.query(Transform);
  }

  update(delta: number) {
    delta = toSeconds(delta);

    this.query.iterate((entity: Entity, transform: Transform) => {
      transform.remaining -= delta;

      if (transform.remaining <= 0) {
        transform.transformer.update?.(entity, 1);
        transform.transformer.end?.(entity);
        // transform.transformer = transform.transformer.next;

        if (!transform.transformer.next) {
          // Removes the component when the animation ends
          entity.remove(Transform);
          return;
        }

        transform.transformer = transform.transformer.next;
        transform.remaining += transform.transformer.duration;
      }

      transform.transformer.update?.(
        entity,
        1 - transform.remaining / transform.transformer.duration,
      );
    });
  }
}
