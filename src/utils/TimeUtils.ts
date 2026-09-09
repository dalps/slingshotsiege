import type { Entity, Query, World } from "../ecs";

export type timestamp = DOMHighResTimeStamp;
export type seconds = number;

export const TIME_SCALE = 1 / 100;

const fromSeconds = (s: seconds) => s * 1000 * TIME_SCALE;

export interface Transformer {
  duration: seconds;
  update?: (e: Entity, stage: number) => void;
  end: (e: Entity) => void;
  next?: Transformer;
}

export class Transform {
  remaining: number;

  constructor(public transformer: Transformer) {
    transformer.duration = fromSeconds(transformer.duration);
    this.remaining = transformer.duration;
  }
}

export const Timeout = (
  e: Entity,
  duration: seconds,
  end: Transformer["end"],
) => e.add(new Transform({ duration, end }));

export const Interval = (duration: seconds, end: Transformer["end"]) => {
  const t = new Transform({ duration, end });
  t.transformer.next = t.transformer;
  return t;
};

export const Loop = (duration: seconds, iterations: number, update, end) => {
  const t = new Transform({ duration, end });
  const endFn = () => {
    t.transformer.next = --iterations >= 0 ? t.transformer : undefined;
    end();
  };
  t.transformer.end = endFn;
};

// From kutuluk/js13k-ecs
export class TransformSystem {
  query: Query;

  constructor(world: World) {
    this.query = world.query(Transform);
  }

  update(delta: number) {
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
