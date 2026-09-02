import type { Query, World } from "../ecs";

// A monotonically increasing number
export type timestamp = DOMHighResTimeStamp;

// A very small number
export type instant = number;
export type milliseconds = number;

export class Timer {
  elapsed = 0;

  constructor(
    public delay: milliseconds,
    public callback: () => void,
  ) {}
}

export class Interval extends Timer {}

export class ClockSystem {
  last: timestamp = 0;
  timers: Query;
  intervals: Query;

  constructor(world: World) {
    this.timers = world.query(Timer);
    this.intervals = world.query(Interval);
  }

  get now() {
    return performance.now();
  }

  update() {
    const dt = this.now - this.last;
    this.last = this.now;

    this.timers.iterate((timer, t: Timer) => {
      t.elapsed += dt;

      if (t.elapsed >= t.delay) {
        t.callback();
        timer.delete();
      }
    });

    this.intervals.iterate((_, t: Interval) => {
      t.elapsed += dt;

      if (t.elapsed >= t.delay) {
        t.callback();
        t.elapsed = 0;
      }
    });
  }
}
